/**
 * EnrichmentService
 *
 * Enriches company records with structured data (employee count, industry,
 * specialties, about) using web search grounding via Tavily + LLM extraction,
 * with LLM-only (parametric memory) as fallback.
 *
 * Uses generateText directly from Vercel AI SDK (not AIService) to avoid
 * AsyncLocalStorage context issues in post-multer request handling.
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logger } from '../lib/logger.js'
import { tavilyClient } from '../lib/tavily.js'
import type { EnrichmentSource } from '../types/customer.js'

// =============================================================================
// Types
// =============================================================================

export interface CompanyEnrichmentData {
  employee_count: string
  about: string
  industry: string
  specialties: string[]
}

export interface EnrichmentResult {
  data: CompanyEnrichmentData
  source: EnrichmentSource
}

// =============================================================================
// Constants
// =============================================================================

const ENRICHMENT_MODEL = 'claude-haiku-4-5-20251001'
const CALL_DELAY_MS = 500
const STALE_THRESHOLD_DAYS = 30
const MAX_ABOUT_LENGTH = 300
const MAX_SPECIALTIES = 5
const MAX_CONTEXT_LENGTH = 2000
const MIN_CONTEXT_LENGTH = 50
const MIN_TAVILY_SCORE = 0.4

const MEMORY_SYSTEM_PROMPT = `You are a business data assistant. Given a company name, return structured data about that company as JSON.

Return ONLY a JSON object with these fields:
- "employee_count": string — approximate employee count range (e.g., "51-200", "1001-5000", "11-50"). Use LinkedIn-style ranges.
- "about": string — brief company description (max 300 characters)
- "industry": string — primary industry (e.g., "Software Development", "Financial Services", "Healthcare")
- "specialties": array of strings — up to 5 key specialties or focus areas

If you do not know the company or cannot provide reliable data, return an empty object: {}

Do NOT hallucinate or guess. Only return data you are confident about based on well-known companies.
Return ONLY valid JSON, no markdown fences, no explanation.`

const GROUNDED_SYSTEM_PROMPT = `You are a business data assistant. Extract structured company data from the provided web search results.

Return ONLY a JSON object with these fields:
- "employee_count": string — employee count range from the search results (e.g., "51-200", "1001-5000", "11-50"). Use LinkedIn-style ranges.
- "about": string — company description synthesized from search results (max 300 characters)
- "industry": string — primary industry (e.g., "Software Development", "Financial Services", "Healthcare")
- "specialties": array of strings — up to 5 key specialties or focus areas

Extract ONLY from the provided search context. If the search results don't contain enough information for a field, leave it as empty string or empty array.
Return ONLY valid JSON, no markdown fences, no explanation.`

// =============================================================================
// Pure Helpers
// =============================================================================

/**
 * Parse LLM text output into validated CompanyEnrichmentData.
 * Shared by both grounded and memory-based enrichment paths.
 */
const parseAndValidateJson = (text: string): CompanyEnrichmentData | null => {
  // Strip markdown fences if present (```json ... ```)
  let jsonText = text.trim()
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return null
  }

  // Empty object = unknown company
  if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
    return null
  }

  // Validate and sanitize
  const obj = parsed as Record<string, unknown>
  const result: CompanyEnrichmentData = {
    employee_count: typeof obj.employee_count === 'string'
      ? obj.employee_count.slice(0, 50)
      : '',
    about: typeof obj.about === 'string'
      ? obj.about.slice(0, MAX_ABOUT_LENGTH)
      : '',
    industry: typeof obj.industry === 'string'
      ? obj.industry.slice(0, 100)
      : '',
    specialties: Array.isArray(obj.specialties)
      ? obj.specialties
          .filter((s: unknown) => typeof s === 'string')
          .slice(0, MAX_SPECIALTIES)
          .map((s: string) => s.slice(0, 100))
      : [],
  }

  // If all fields are empty after validation, treat as unknown
  if (!result.employee_count && !result.about && !result.industry && result.specialties.length === 0) {
    return null
  }

  return result
}

// =============================================================================
// Service
// =============================================================================

export class EnrichmentService {
  /**
   * Check if enrichment data is stale (>30 days or missing)
   */
  static isStale(enrichment?: { updated_at?: string }): boolean {
    if (!enrichment?.updated_at) return true
    const updatedAt = new Date(enrichment.updated_at)
    const now = new Date()
    const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays > STALE_THRESHOLD_DAYS
  }

  /**
   * Delay for rate limiting between enrichment calls
   */
  static async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, CALL_DELAY_MS))
  }

  /**
   * Enrich a company using web search grounding (preferred) or LLM memory (fallback).
   * @param companyName - Company name to enrich
   * @param linkedinCompanyUrl - Optional LinkedIn company page URL
   * @param industryHint - Optional industry/vertical hint for disambiguation (e.g. "SaaS", "Software")
   */
  async enrichCompany(companyName: string, linkedinCompanyUrl?: string, industryHint?: string): Promise<EnrichmentResult | null> {
    // Try grounded enrichment via Tavily + LLM
    if (tavilyClient.isConfigured()) {
      const context = await this.buildSearchContext(companyName, linkedinCompanyUrl, industryHint)

      if (context.length >= MIN_CONTEXT_LENGTH) {
        const data = await this.extractEnrichmentFromContext(companyName, context)
        if (data) return { data, source: 'tavily_grounded' }
      }
    }

    // Fallback to LLM parametric memory
    const data = await this.enrichFromMemory(companyName, industryHint)
    if (data) return { data, source: 'llm_enrichment' }

    return null
  }

  // ===========================================================================
  // Private: Tavily Search
  // ===========================================================================

  /**
   * Build grounding context from web search results.
   * Strategy A (has LinkedIn URL): parallel LinkedIn + general search.
   * Strategy B (no URL): single broad search with optional industry hint.
   */
  private async buildSearchContext(companyName: string, linkedinCompanyUrl?: string, industryHint?: string): Promise<string> {
    try {
      const allResults = linkedinCompanyUrl
        ? await this.searchWithLinkedIn(companyName)
        : await this.searchBroad(companyName, industryHint)

      // Filter by relevance score
      const relevant = allResults.filter(r => r.score >= MIN_TAVILY_SCORE)

      if (relevant.length === 0) {
        logger.debug('[EnrichmentService] No relevant Tavily results', {
          companyNameLength: companyName.length,
          totalResults: allResults.length,
          strategy: linkedinCompanyUrl ? 'linkedin' : 'broad',
        })
        return ''
      }

      // Build context string from results, truncated
      let context = ''
      for (const r of relevant) {
        const entry = `${r.title}\n${r.content}\n\n`
        if (context.length + entry.length > MAX_CONTEXT_LENGTH) break
        context += entry
      }

      logger.debug('[EnrichmentService] Search context built', {
        companyNameLength: companyName.length,
        resultCount: relevant.length,
        contextLength: context.length,
        strategy: linkedinCompanyUrl ? 'linkedin' : 'broad',
      })

      return context
    } catch (error) {
      logger.debug('[EnrichmentService] Tavily search failed, falling back', {
        companyNameLength: companyName.length,
        hasError: true,
      })
      return ''
    }
  }

  private async searchWithLinkedIn(companyName: string) {
    const [linkedinResults, generalResults] = await Promise.all([
      tavilyClient.search(companyName, {
        includeDomains: ['linkedin.com'],
        maxResults: 3,
        includeRawContent: false,
      }),
      tavilyClient.search(`${companyName} company about employees industry`, {
        excludeDomains: ['linkedin.com'],
        maxResults: 3,
        includeRawContent: false,
      }),
    ])
    return [...linkedinResults, ...generalResults]
  }

  private async searchBroad(companyName: string, industryHint?: string) {
    const hint = industryHint ? ` ${industryHint}` : ''
    return tavilyClient.search(`${companyName}${hint} company about employees industry specialties`, {
      maxResults: 5,
      includeRawContent: false,
    })
  }

  // ===========================================================================
  // Private: LLM Extraction
  // ===========================================================================

  /**
   * Extract enrichment data from web search context using grounded LLM.
   */
  private async extractEnrichmentFromContext(
    companyName: string,
    searchContext: string,
  ): Promise<CompanyEnrichmentData | null> {
    try {
      const { text } = await generateText({
        model: anthropic(ENRICHMENT_MODEL),
        system: GROUNDED_SYSTEM_PROMPT,
        prompt: `Company: "${companyName}"\n\nSearch Results:\n${searchContext}`,
        maxOutputTokens: 500,
      })

      const data = parseAndValidateJson(text)
      if (!data) {
        logger.debug('[EnrichmentService] Grounded parse returned no data', {
          companyNameLength: companyName.length,
        })
      }
      return data
    } catch (error) {
      logger.error('[EnrichmentService] Grounded extraction failed', {
        hasError: true,
        companyNameLength: companyName.length,
      })
      return null
    }
  }

  /**
   * Enrich using LLM parametric memory only (fallback path).
   */
  private async enrichFromMemory(companyName: string, industryHint?: string): Promise<CompanyEnrichmentData | null> {
    try {
      const hint = industryHint ? `\nIndustry context: ${industryHint}` : ''
      const { text } = await generateText({
        model: anthropic(ENRICHMENT_MODEL),
        system: MEMORY_SYSTEM_PROMPT,
        prompt: `Company name: "${companyName}"${hint}`,
        maxOutputTokens: 500,
      })

      const data = parseAndValidateJson(text)
      if (!data) {
        logger.debug('[EnrichmentService] LLM memory returned no data', {
          companyNameLength: companyName.length,
        })
      }
      return data
    } catch (error) {
      logger.error('[EnrichmentService] Memory enrichment failed', {
        hasError: true,
        companyNameLength: companyName.length,
      })
      return null
    }
  }
}
