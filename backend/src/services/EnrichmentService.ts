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
import * as cheerio from 'cheerio'
import { logger } from '../lib/logger.js'
import { assertPublicUrl } from '../lib/urlSecurity.js'
import { tavilyClient } from '../lib/tavily.js'
import type { EnrichmentSource, TeamRoleFilter } from '../types/customer.js'

// =============================================================================
// Types
// =============================================================================

export interface CompanyEnrichmentData {
  employee_count: string
  about: string
  industry: string
  specialties: string[]
  persona?: string
  icp?: string
  website_url?: string
}

export interface EnrichmentResult {
  data: CompanyEnrichmentData
  source: EnrichmentSource
}

export interface LinkedInEnrichmentResult {
  type: 'company' | 'person'
  name: string
  about: string
  vertical: string
  enrichment: CompanyEnrichmentData
  team_member?: {
    name: string
    role?: string
    linkedin_url: string
  }
  linkedin_company_url?: string
  website_url?: string
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
- "persona": string — description of the company's target user/buyer persona (max 300 characters). Who buys or uses their product/service?
- "icp": string — the company's ideal customer profile (max 300 characters). What type of companies or individuals are their best-fit customers?

If you do not know the company or cannot provide reliable data, return an empty object: {}

Do NOT hallucinate or guess. Only return data you are confident about based on well-known companies.
Return ONLY valid JSON, no markdown fences, no explanation.`

const GROUNDED_SYSTEM_PROMPT = `You are a business data assistant. Extract structured company data from the provided web search results.

Return ONLY a JSON object with these fields:
- "employee_count": string — employee count range from the search results (e.g., "51-200", "1001-5000", "11-50"). Use LinkedIn-style ranges.
- "about": string — company description synthesized from search results (max 300 characters)
- "industry": string — primary industry (e.g., "Software Development", "Financial Services", "Healthcare")
- "specialties": array of strings — up to 5 key specialties or focus areas
- "persona": string — description of the company's target user/buyer persona (max 300 characters). Who buys or uses their product/service?
- "icp": string — the company's ideal customer profile (max 300 characters). What type of companies or individuals are their best-fit customers?
- "website_url": string or null — the company's official website URL if found in search results

Extract ONLY from the provided search context. If the search results don't contain enough information for a field, leave it as empty string or empty array.
Return ONLY valid JSON, no markdown fences, no explanation.`

const LINKEDIN_URL_SYSTEM_PROMPT = `You are a business data assistant. Extract structured data from web search results about a LinkedIn profile or company page.

Return ONLY a JSON object with these fields:
- "type": "company" or "person" — based on the URL type
- "name": string — company name (if company URL) or the person's company name (if person URL)
- "about": string — brief company description (max 300 characters)
- "vertical": string — primary industry (e.g., "Software Development", "Financial Services")
- "employee_count": string — approximate employee count range (e.g., "51-200", "1001-5000")
- "industry": string — primary industry
- "specialties": array of strings — up to 5 key specialties or focus areas
- "person_name": string or null — the person's full name (only for person URLs, null for companies)
- "person_role": string or null — the person's job title (only for person URLs, null for companies)

Extract ONLY from the provided search context. If insufficient data, use empty string/array.
Return ONLY valid JSON, no markdown fences.`

const WEBSITE_URL_SYSTEM_PROMPT = `You are a business data assistant. Extract structured company data from the provided website content.

Return ONLY a JSON object with these fields:
- "name": string — company name
- "about": string — brief company description (max 300 characters)
- "vertical": string — primary industry (e.g., "Software Development", "Financial Services")
- "employee_count": string — approximate employee count range if mentioned (e.g., "51-200"). Leave empty if not found.
- "industry": string — primary industry
- "specialties": array of strings — up to 5 key specialties or focus areas
- "persona": string — description of the company's target user/buyer persona (max 300 characters). Who buys or uses their product/service?
- "icp": string — the company's ideal customer profile (max 300 characters). What type of companies or individuals are their best-fit customers?

Extract ONLY from the provided content. If insufficient data for a field, use empty string or empty array.
Return ONLY valid JSON, no markdown fences.`

const WEB_FETCH_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const WEB_FETCH_TIMEOUT_MS = 15_000

const LINKEDIN_PEOPLE_SYSTEM_PROMPT = `You are a business data assistant. Extract a list of people and their job titles from LinkedIn company search results.

Return ONLY a JSON object with a "people" array. Each person should have:
- "name": string — full name
- "role": string — job title / position
- "linkedin_url": string or null — LinkedIn profile URL if found

Extract ALL people mentioned in the search results with their titles.
Return ONLY valid JSON, no markdown fences, no explanation.

Example:
{"people": [{"name": "Jane Smith", "role": "CEO", "linkedin_url": "https://linkedin.com/in/janesmith"}, {"name": "John Doe", "role": "VP Engineering", "linkedin_url": null}]}`

const ROLE_FILTER_SYSTEM_PROMPT = `You are a role-matching assistant. Given a list of people with their job titles, determine which ones match the ALLOWED role categories and do NOT match the EXCLUDED roles.

A role MATCHES if the person's title is semantically equivalent to any pattern in the allowed categories. For example:
- "Chief Executive Officer" matches "ceo"
- "VP of Product Management" matches "vp"
- "Senior Product Designer" matches "product designer"
- "Director, User Experience" matches "ux designer"

A role is EXCLUDED if it matches any excluded pattern, even if it also matches an allowed category.

Return ONLY a JSON object with a "matches" array containing the INDEX numbers of people who match.
Example: {"matches": [0, 2, 5]}

Return ONLY valid JSON, no markdown fences.`

// Default role filters used when no per-account configuration exists
export const DEFAULT_ROLE_FILTERS: TeamRoleFilter[] = [
  { category: 'founder', patterns: ['founder', 'co-founder', 'cofounder', 'owner'] },
  { category: 'c_level', patterns: ['chief', 'ceo', 'cto', 'cmo', 'coo', 'cro', 'ciso', 'cfo', 'cpo', 'cdo'] },
  { category: 'vp', patterns: ['vp', 'vice president', 'svp', 'evp'] },
  { category: 'director', patterns: ['director', 'managing director'] },
  { category: 'head_of', patterns: ['head of', 'head'] },
  { category: 'product_management', patterns: ['product manager', 'product lead', 'group product manager', 'senior product manager', 'principal product manager'] },
  { category: 'product_design', patterns: ['product designer', 'ux designer', 'ui designer', 'ux/ui', 'experience designer', 'design lead', 'design director', 'senior designer'] },
  { category: 'sales_leadership', patterns: ['sales leader', 'sales director', 'head of sales', 'vp sales', 'chief revenue'] },
  { category: 'engineering_leadership', patterns: ['engineering manager', 'engineering lead', 'head of engineering', 'principal engineer', 'staff engineer', 'architect'] },
]

export const DEFAULT_ROLE_EXCLUSIONS: string[] = [
  'hr', 'human resources', 'people operations', 'talent', 'recruiting', 'recruiter',
  'talent acquisition', 'people partner', 'hr business partner',
]

// =============================================================================
// Pure Helpers
// =============================================================================

/**
 * Strip markdown fences and parse JSON text into a plain object.
 * Returns null on malformed input or empty objects.
 */
const stripFencesAndParse = (text: string): Record<string, unknown> | null => {
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

  if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
    return null
  }

  return parsed as Record<string, unknown>
}

/**
 * Parse LLM text output into validated CompanyEnrichmentData.
 * Shared by both grounded and memory-based enrichment paths.
 */
const parseAndValidateJson = (text: string): CompanyEnrichmentData | null => {
  const obj = stripFencesAndParse(text)
  if (!obj) return null
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
    persona: typeof obj.persona === 'string'
      ? obj.persona.slice(0, MAX_ABOUT_LENGTH)
      : undefined,
    icp: typeof obj.icp === 'string'
      ? obj.icp.slice(0, MAX_ABOUT_LENGTH)
      : undefined,
    website_url: typeof obj.website_url === 'string' && obj.website_url.startsWith('http')
      ? obj.website_url.slice(0, 500)
      : undefined,
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
   * Extract company slug from various LinkedIn URL formats.
   */
  static extractCompanySlug(url: string): string | null {
    const match = url.match(/linkedin\.com\/company\/([^\/\?#]+)/)
    return match ? match[1] : null
  }

  /**
   * Enrich a company using web search grounding (preferred) or LLM memory (fallback).
   * @param companyName - Company name to enrich
   * @param linkedinCompanyUrl - Optional LinkedIn company page URL
   * @param industryHint - Optional industry/vertical hint for disambiguation (e.g. "SaaS", "Software")
   * @param websiteUrl - Optional company website URL for direct content extraction
   */
  async enrichCompany(companyName: string, linkedinCompanyUrl?: string, industryHint?: string, websiteUrl?: string): Promise<EnrichmentResult | null> {
    // Try grounded enrichment via Tavily + LLM
    if (tavilyClient.isConfigured()) {
      const context = await this.buildSearchContext(companyName, linkedinCompanyUrl, industryHint)

      // If website URL provided, fetch its content for additional context
      let websiteContext = ''
      if (websiteUrl) {
        websiteContext = await this.fetchWebContent(websiteUrl)
      }

      const combinedContext = [context, websiteContext].filter(Boolean).join('\n\n---\n\n')

      if (combinedContext.length >= MIN_CONTEXT_LENGTH) {
        const data = await this.extractEnrichmentFromContext(companyName, combinedContext)
        if (data) return { data, source: 'tavily_grounded' }
      }
    } else if (websiteUrl) {
      // No Tavily but have website URL — use website content directly
      const websiteContext = await this.fetchWebContent(websiteUrl)
      if (websiteContext.length >= MIN_CONTEXT_LENGTH) {
        const data = await this.extractEnrichmentFromContext(companyName, websiteContext)
        if (data) return { data, source: 'tavily_grounded' }
      }
    }

    // Fallback to LLM parametric memory
    const data = await this.enrichFromMemory(companyName, industryHint)
    if (data) return { data, source: 'llm_enrichment' }

    return null
  }

  /**
   * Enrich a customer record from a raw LinkedIn URL (company or person).
   * Uses Tavily web search for grounding; returns null if Tavily is not
   * configured, URL type is unrecognised, or insufficient data is found.
   * @param linkedinUrl - Full LinkedIn URL (e.g. https://linkedin.com/company/acme or /in/johndoe)
   */
  async enrichFromLinkedInUrl(linkedinUrl: string): Promise<LinkedInEnrichmentResult | null> {
    const isCompany = linkedinUrl.includes('/company/')
    const isPerson = linkedinUrl.includes('/in/')

    if (!isCompany && !isPerson) return null
    if (!tavilyClient.isConfigured()) return null

    try {
      // Parallel search: LinkedIn domain-scoped + general web
      const [linkedinResults, webResults] = await Promise.all([
        tavilyClient.search(linkedinUrl, {
          includeDomains: ['linkedin.com'],
          maxResults: 3,
          includeRawContent: false,
        }),
        tavilyClient.search(`${linkedinUrl} company about employees`, {
          excludeDomains: ['linkedin.com'],
          maxResults: 3,
          includeRawContent: false,
        }),
      ])

      const allResults = [...linkedinResults, ...webResults]
        .filter(r => r.score >= MIN_TAVILY_SCORE)

      if (allResults.length === 0) return null

      // Build context string, truncated to MAX_CONTEXT_LENGTH
      let context = ''
      for (const r of allResults) {
        const entry = `${r.title}\n${r.content}\n\n`
        if (context.length + entry.length > MAX_CONTEXT_LENGTH) break
        context += entry
      }

      if (context.length < MIN_CONTEXT_LENGTH) return null

      const { text } = await generateText({
        model: anthropic(ENRICHMENT_MODEL),
        system: LINKEDIN_URL_SYSTEM_PROMPT,
        prompt: `LinkedIn URL: ${linkedinUrl}\nURL Type: ${isCompany ? 'company' : 'person'}\n\nSearch Results:\n${context}`,
        maxOutputTokens: 500,
      })

      const parsed = stripFencesAndParse(text)
      if (!parsed) return null

      const result: LinkedInEnrichmentResult = {
        type: isCompany ? 'company' : 'person',
        name: typeof parsed.name === 'string' ? parsed.name.slice(0, 200) : '',
        about: typeof parsed.about === 'string' ? parsed.about.slice(0, MAX_ABOUT_LENGTH) : '',
        vertical: typeof parsed.vertical === 'string'
          ? parsed.vertical.slice(0, 100)
          : typeof parsed.industry === 'string'
            ? parsed.industry.slice(0, 100)
            : '',
        enrichment: {
          employee_count: typeof parsed.employee_count === 'string' ? parsed.employee_count.slice(0, 50) : '',
          about: typeof parsed.about === 'string' ? parsed.about.slice(0, MAX_ABOUT_LENGTH) : '',
          industry: typeof parsed.industry === 'string' ? parsed.industry.slice(0, 100) : '',
          specialties: Array.isArray(parsed.specialties)
            ? parsed.specialties.filter((s: unknown) => typeof s === 'string').slice(0, MAX_SPECIALTIES).map((s: string) => s.slice(0, 100))
            : [],
        },
      }

      if (isCompany) {
        result.linkedin_company_url = linkedinUrl
      }

      if (isPerson && typeof parsed.person_name === 'string' && parsed.person_name) {
        result.team_member = {
          name: parsed.person_name.slice(0, 200),
          role: typeof parsed.person_role === 'string' ? parsed.person_role.slice(0, 200) : undefined,
          linkedin_url: linkedinUrl,
        }
      }

      // Guard: if all meaningful fields are empty, treat as no data
      if (!result.name && !result.about && !result.vertical) return null

      return result
    } catch (error) {
      logger.error('[EnrichmentService] LinkedIn URL enrichment failed', {
        hasError: true,
        urlType: isCompany ? 'company' : 'person',
      })
      return null
    }
  }

  /**
   * Enrich a customer record from a company website URL.
   * Fetches the page HTML, extracts text, and uses LLM to parse company data.
   * Optionally supplements with Tavily web search for richer context.
   */
  async enrichFromWebsiteUrl(websiteUrl: string): Promise<LinkedInEnrichmentResult | null> {
    try {
      const pageContent = await this.fetchWebContent(websiteUrl)

      // Also try Tavily supplementary search if configured
      let searchContext = ''
      if (tavilyClient.isConfigured()) {
        try {
          const results = await tavilyClient.search(`${websiteUrl} company about`, {
            maxResults: 3,
            includeRawContent: false,
          })
          const relevant = results.filter(r => r.score >= MIN_TAVILY_SCORE)
          for (const r of relevant) {
            const entry = `${r.title}\n${r.content}\n\n`
            if (searchContext.length + entry.length > 1000) break
            searchContext += entry
          }
        } catch {
          // Tavily supplement is best-effort
        }
      }

      const combinedContent = [pageContent, searchContext].filter(Boolean).join('\n\n---\n\n')
      if (combinedContent.length < MIN_CONTEXT_LENGTH) return null

      const { text } = await generateText({
        model: anthropic(ENRICHMENT_MODEL),
        system: WEBSITE_URL_SYSTEM_PROMPT,
        prompt: `Website URL: ${websiteUrl}\n\nWebsite Content & Search Results:\n${combinedContent.slice(0, MAX_CONTEXT_LENGTH)}`,
        maxOutputTokens: 500,
      })

      const parsed = stripFencesAndParse(text)
      if (!parsed) return null

      const result: LinkedInEnrichmentResult = {
        type: 'company',
        name: typeof parsed.name === 'string' ? parsed.name.slice(0, 200) : '',
        about: typeof parsed.about === 'string' ? parsed.about.slice(0, MAX_ABOUT_LENGTH) : '',
        vertical: typeof parsed.vertical === 'string'
          ? parsed.vertical.slice(0, 100)
          : typeof parsed.industry === 'string'
            ? parsed.industry.slice(0, 100)
            : '',
        enrichment: {
          employee_count: typeof parsed.employee_count === 'string' ? parsed.employee_count.slice(0, 50) : '',
          about: typeof parsed.about === 'string' ? parsed.about.slice(0, MAX_ABOUT_LENGTH) : '',
          industry: typeof parsed.industry === 'string' ? parsed.industry.slice(0, 100) : '',
          specialties: Array.isArray(parsed.specialties)
            ? parsed.specialties.filter((s: unknown) => typeof s === 'string').slice(0, MAX_SPECIALTIES).map((s: string) => s.slice(0, 100))
            : [],
        },
        website_url: websiteUrl,
      }

      if (!result.name && !result.about && !result.vertical) return null

      return result
    } catch (error) {
      logger.error('[EnrichmentService] Website URL enrichment failed', {
        hasError: true,
      })
      return null
    }
  }

  // ===========================================================================
  // LinkedIn People Scraping + Role Filtering
  // ===========================================================================

  /**
   * Scrape LinkedIn People page via Tavily search.
   * Returns list of people with name + role title.
   */
  async scrapeLinkedInPeople(companySlug: string): Promise<Array<{ name: string; role: string; linkedin_url?: string }>> {
    if (!tavilyClient.isConfigured()) return []

    try {
      const peopleUrl = `https://www.linkedin.com/company/${companySlug}/people/`
      // Derive human-readable company name from slug for broader web search
      const companyName = companySlug.replace(/-/g, ' ')

      const [linkedinResults, webResults, teamPageResults] = await Promise.all([
        // Search 1: LinkedIn individual profiles at this company
        tavilyClient.search(`"${companyName}" site:linkedin.com/in`, {
          includeDomains: ['linkedin.com'],
          searchDepth: 'advanced',
          maxResults: 10,
          includeRawContent: false,
        }),
        // Search 2: LinkedIn company people page
        tavilyClient.search(`${peopleUrl} team members`, {
          includeDomains: ['linkedin.com'],
          maxResults: 5,
          includeRawContent: false,
        }),
        // Search 3: Company's own website team/about page
        tavilyClient.search(`"${companyName}" team leadership about`, {
          excludeDomains: ['linkedin.com'],
          maxResults: 5,
          includeRawContent: true,
        }),
      ])

      logger.info('[EnrichmentService] Tavily search results', {
        linkedinResultsCount: linkedinResults.length,
        webResultsCount: webResults.length,
        teamPageResultsCount: teamPageResults.length,
        linkedinTitles: linkedinResults.map(r => r.title?.substring(0, 80)),
        webTitles: webResults.map(r => r.title?.substring(0, 80)),
        teamPageTitles: teamPageResults.map(r => r.title?.substring(0, 80)),
      })

      // Separate individual profile results from company/article results
      const allResults = [...linkedinResults, ...webResults, ...teamPageResults]
        .filter(r => r.score >= 0.3)

      // Deduplicate by URL
      const seen = new Set<string>()
      const deduplicated = allResults.filter(r => {
        const key = r.url?.replace(/\/$/, '')?.toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Categorize results
      const profileResults = deduplicated.filter(r => r.url?.includes('linkedin.com/in/'))
      const teamPages = deduplicated.filter(r => !r.url?.includes('linkedin.com/in/') && !r.url?.includes('linkedin.com/company'))
      const companyPages = deduplicated.filter(r => r.url?.includes('linkedin.com/company'))

      // Identify team/org page URLs worth direct scraping (have structured role data)
      const teamPageUrls = deduplicated
        .filter(r => {
          const url = r.url?.toLowerCase() || ''
          const title = r.title?.toLowerCase() || ''
          return !url.includes('linkedin.com') && (
            url.includes('team') || url.includes('about') || url.includes('management') ||
            url.includes('leadership') || url.includes('org-chart') || url.includes('theorg.com') ||
            title.includes('team') || title.includes('management') || title.includes('org chart')
          )
        })
        .map(r => r.url)
        .filter((u): u is string => !!u)
        .slice(0, 3)

      logger.info('[EnrichmentService] After dedup & prioritize', {
        totalBeforeFilter: linkedinResults.length + webResults.length + teamPageResults.length,
        afterScoreFilter: allResults.length,
        afterDedup: deduplicated.length,
        profileResults: profileResults.length,
        teamPages: teamPages.length,
        companyPages: companyPages.length,
        directScrapeUrls: teamPageUrls,
      })

      if (deduplicated.length === 0) return []

      // Direct-scrape team page URLs for structured content (names + roles)
      const directScrapes = await Promise.all(
        teamPageUrls.map(async (url) => {
          const content = await this.fetchWebContent(url)
          return content ? `[Direct scrape: ${url}]\n${content}` : ''
        })
      )
      const directContent = directScrapes.filter(Boolean).join('\n\n')

      logger.info('[EnrichmentService] Direct scrape results', {
        urlsAttempted: teamPageUrls.length,
        successCount: directScrapes.filter(Boolean).length,
        directContentLength: directContent.length,
        directContentPreview: directContent.substring(0, 500),
      })

      // Build context — direct scrapes first (structured roles), then team pages, then profiles, then company pages
      const CONTEXT_LIMIT = 10000
      let context = directContent ? directContent + '\n\n' : ''

      // Prioritize: team/org pages (have roles) → profiles → company overview
      const prioritized = [...teamPages, ...profileResults, ...companyPages]
      for (const r of prioritized) {
        const body = r.rawContent || r.content
        const entry = `${r.title}\n${body}\n\n`
        if (context.length + entry.length > CONTEXT_LIMIT) {
          const remaining = CONTEXT_LIMIT - context.length
          if (remaining > 200) {
            context += `${r.title}\n${body.substring(0, remaining - r.title.length - 10)}\n\n`
          }
          break
        }
        context += entry
      }

      logger.info('[EnrichmentService] Context built for AI extraction', {
        contextLength: context.length,
        contextPreview: context.substring(0, 500),
        hasDirectContent: directContent.length > 0,
      })

      if (context.length < 30) return []

      const { text } = await generateText({
        model: anthropic(ENRICHMENT_MODEL),
        system: LINKEDIN_PEOPLE_SYSTEM_PROMPT,
        prompt: `Company LinkedIn slug: ${companySlug}\nPeople page URL: ${peopleUrl}\n\nSearch Results:\n${context}`,
        maxOutputTokens: 2000,
      })

      logger.info('[EnrichmentService] AI extraction raw response', {
        responseLength: text.length,
        responsePreview: text.substring(0, 500),
      })

      const parsed = stripFencesAndParse(text)
      if (!parsed || !Array.isArray(parsed.people)) {
        logger.warn('[EnrichmentService] AI extraction failed to parse', {
          hasParsed: !!parsed,
          hasPeopleArray: parsed ? Array.isArray(parsed.people) : false,
        })
        return []
      }

      // Accept people even with missing roles (use "Unknown" as fallback)
      const extracted = (parsed.people as Array<Record<string, unknown>>)
        .filter((p) => typeof p.name === 'string' && p.name)
        .map((p) => ({
          name: String(p.name).slice(0, 200),
          role: (typeof p.role === 'string' && p.role) ? String(p.role).slice(0, 200) : 'Unknown',
          linkedin_url: typeof p.linkedin_url === 'string' ? p.linkedin_url.slice(0, 500) : undefined,
        }))

      logger.info('[EnrichmentService] People extracted from AI', {
        rawPeopleCount: (parsed.people as unknown[]).length,
        validPeopleCount: extracted.length,
        people: extracted.map(p => ({ name: p.name, role: p.role })),
      })

      return extracted
    } catch (error) {
      logger.error('[EnrichmentService] LinkedIn people scrape failed', { hasError: true })
      return []
    }
  }

  /**
   * Filter a list of scraped people by role relevance using a SINGLE Haiku request.
   * Returns only people whose roles match the allowed categories.
   */
  async filterTeamByRoles(
    people: Array<{ name: string; role: string; linkedin_url?: string }>,
    roleFilters: TeamRoleFilter[],
    exclusions: string[],
  ): Promise<Array<{ name: string; role: string; linkedin_url?: string }>> {
    if (people.length === 0) return []

    try {
      const allowedCategories = roleFilters.map(f => `${f.category}: ${f.patterns.join(', ')}`).join('\n')
      const excludePatterns = exclusions.join(', ')

      logger.info('[EnrichmentService] Role filter input', {
        peopleCount: people.length,
        people: people.map(p => ({ name: p.name, role: p.role })),
        categories: roleFilters.map(f => f.category),
        exclusions,
      })

      const { text } = await generateText({
        model: anthropic(ENRICHMENT_MODEL),
        system: ROLE_FILTER_SYSTEM_PROMPT,
        prompt: `ALLOWED ROLE CATEGORIES:\n${allowedCategories}\n\nEXCLUDED ROLES:\n${excludePatterns}\n\nPEOPLE TO FILTER:\n${JSON.stringify(people.map((p, i) => ({ index: i, name: p.name, role: p.role })))}`,
        maxOutputTokens: 500,
      })

      logger.info('[EnrichmentService] Role filter AI response', {
        responsePreview: text.substring(0, 300),
      })

      const parsed = stripFencesAndParse(text)
      if (!parsed || !Array.isArray(parsed.matches)) {
        logger.warn('[EnrichmentService] Role filter parse failed', {
          hasParsed: !!parsed,
          hasMatchesArray: parsed ? Array.isArray(parsed.matches) : false,
        })
        return []
      }

      const filtered = (parsed.matches as unknown[])
        .filter((idx): idx is number => typeof idx === 'number' && idx >= 0 && idx < people.length)
        .map((idx) => people[idx])

      logger.info('[EnrichmentService] Role filter result', {
        inputCount: people.length,
        matchedIndices: parsed.matches,
        outputCount: filtered.length,
        kept: filtered.map(p => ({ name: p.name, role: p.role })),
        removed: people.filter((_, i) => !(parsed.matches as number[]).includes(i)).map(p => ({ name: p.name, role: p.role })),
      })

      return filtered
    } catch (error) {
      logger.error('[EnrichmentService] Role filtering failed', { hasError: true })
      return []
    }
  }

  // ===========================================================================
  // Private: Web Content Fetching
  // ===========================================================================

  /**
   * Fetch and extract text content from a web page using Cheerio.
   * Returns combined OG/meta tags + body text, truncated to MAX_CONTEXT_LENGTH.
   */
  private async fetchWebContent(url: string): Promise<string> {
    try {
      assertPublicUrl(url)
      const response = await fetch(url, {
        signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
        redirect: 'follow',
        headers: {
          'User-Agent': WEB_FETCH_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })

      if (!response.ok) return ''
      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract OG/meta tags (high-value summary data)
      const metaParts: string[] = []
      const ogTitle = $('meta[property="og:title"]').attr('content')
      const ogDesc = $('meta[property="og:description"]').attr('content')
      const metaDesc = $('meta[name="description"]').attr('content')
      const twitterTitle = $('meta[name="twitter:title"]').attr('content')
      const twitterDesc = $('meta[name="twitter:description"]').attr('content')
      if (ogTitle) metaParts.push(`Title: ${ogTitle}`)
      if (ogDesc) metaParts.push(`Description: ${ogDesc}`)
      else if (metaDesc) metaParts.push(`Description: ${metaDesc}`)
      if (twitterTitle && twitterTitle !== ogTitle) metaParts.push(`Twitter Title: ${twitterTitle}`)
      if (twitterDesc && twitterDesc !== ogDesc) metaParts.push(`Twitter Description: ${twitterDesc}`)

      // Remove junk elements
      $('script, style, nav, header, footer, aside, button, svg, img, noscript').remove()
      $('[class*="comment"], [class*="sidebar"], [class*="menu"], [class*="nav"]').remove()

      // Extract body text
      const bodyText = $('main, article, [role="main"]').text().trim()
        || $('body').text().trim()

      // Clean whitespace
      const cleanBody = bodyText.replace(/\s+/g, ' ').slice(0, 1500)
      const metaContent = metaParts.join('\n')

      return [metaContent, cleanBody].filter(Boolean).join('\n\n').slice(0, MAX_CONTEXT_LENGTH)
    } catch {
      logger.debug('[EnrichmentService] Failed to fetch web content', { hasError: true })
      return ''
    }
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

  // ===========================================================================
  // Smart Merge (LLM-based)
  // ===========================================================================

  /**
   * Merge existing and new enrichment text using a lightweight LLM call.
   * Preserves ALL existing content and only adds genuinely new information.
   * Returns the existing text unchanged if no new info is found.
   */
  static async mergeEnrichmentText(
    fieldName: string,
    existingText: string,
    newText: string,
  ): Promise<string> {
    try {
      const { text } = await generateText({
        model: anthropic(ENRICHMENT_MODEL),
        system: `You merge company information fields. Rules:
- The existing data MUST be fully preserved — never remove, shorten, or rephrase existing content.
- Only add genuinely new information from the new data that is not already covered.
- If the new data adds nothing beyond what already exists, return the existing text exactly as-is.
- Keep the same tone and style as the existing text.
- Return ONLY the merged text. No explanation, no labels, no quotes.`,
        prompt: `Field: ${fieldName}\n\nExisting (MUST keep all):\n${existingText}\n\nNew info:\n${newText}`,
        maxOutputTokens: 500,
      })

      return text.trim() || existingText
    } catch (error) {
      logger.error('[EnrichmentService] mergeEnrichmentText failed, keeping existing', {
        sourceCode: 'mergeEnrichmentText',
        hasError: true,
      })
      // On failure, preserve existing data
      return existingText
    }
  }
}
