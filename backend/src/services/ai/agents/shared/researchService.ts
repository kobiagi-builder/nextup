// @ts-nocheck
/**
 * Shared Research Service
 *
 * Extracted from portfolio/tools/researchTools.ts for reuse across agents.
 * Provides query generation, Tavily web search execution, and result storage.
 */

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { tavilyClient, type TavilySearchOptions } from '../../../../lib/tavily.js'
import { logger } from '../../../../lib/logger.js'
import { mockService } from '../../mocks/index.js'

// =============================================================================
// Types
// =============================================================================

export type PMResearchType = 'competitive' | 'market' | 'persona' | 'growth' | 'general'

export type PMSourceType =
  | 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack'
  | 'web' | 'news' | 'g2' | 'capterra' | 'crunchbase'
  | 'user_provided'

export interface ResearchResult {
  source_type: PMSourceType
  source_name: string
  source_url?: string
  excerpt: string
  relevance_score: number
}

export interface ResearchOptions {
  researchType: PMResearchType
  maxResults?: number
  searchDepth?: 'basic' | 'advanced'
}

export interface StoredResearchResult extends ResearchResult {
  artifact_id: string
}

// =============================================================================
// Research Type Configurations
// =============================================================================

interface ResearchTypeConfig {
  domains: string[]
  sourceType: PMSourceType
  searchDepth: 'basic' | 'advanced'
  queryPrompt: string
}

const RESEARCH_TYPE_CONFIGS: Record<PMResearchType, ResearchTypeConfig[]> = {
  competitive: [
    { domains: ['g2.com'], sourceType: 'g2', searchDepth: 'advanced', queryPrompt: 'competitor reviews and ratings' },
    { domains: ['capterra.com'], sourceType: 'capterra', searchDepth: 'advanced', queryPrompt: 'software comparisons' },
    { domains: ['crunchbase.com'], sourceType: 'crunchbase', searchDepth: 'basic', queryPrompt: 'company funding and overview' },
    { domains: [], sourceType: 'news', searchDepth: 'basic', queryPrompt: 'recent competitor news and announcements' },
    { domains: [], sourceType: 'web', searchDepth: 'advanced', queryPrompt: 'competitor product features and pricing' },
  ],
  market: [
    { domains: [], sourceType: 'web', searchDepth: 'advanced', queryPrompt: 'market size and trends' },
    { domains: [], sourceType: 'news', searchDepth: 'basic', queryPrompt: 'industry news and developments' },
    { domains: ['linkedin.com'], sourceType: 'linkedin', searchDepth: 'basic', queryPrompt: 'industry insights and analysis' },
    { domains: ['medium.com', 'substack.com'], sourceType: 'medium', searchDepth: 'basic', queryPrompt: 'market analysis and reports' },
    { domains: ['reddit.com'], sourceType: 'reddit', searchDepth: 'basic', queryPrompt: 'community discussions and trends' },
  ],
  persona: [
    { domains: ['reddit.com'], sourceType: 'reddit', searchDepth: 'advanced', queryPrompt: 'user experiences and pain points' },
    { domains: ['quora.com'], sourceType: 'quora', searchDepth: 'basic', queryPrompt: 'user questions and challenges' },
    { domains: ['linkedin.com'], sourceType: 'linkedin', searchDepth: 'basic', queryPrompt: 'professional roles and responsibilities' },
    { domains: [], sourceType: 'web', searchDepth: 'basic', queryPrompt: 'user demographics and behavior' },
    { domains: ['g2.com', 'capterra.com'], sourceType: 'g2', searchDepth: 'basic', queryPrompt: 'user reviews and satisfaction' },
  ],
  growth: [
    { domains: [], sourceType: 'web', searchDepth: 'advanced', queryPrompt: 'growth strategies and case studies' },
    { domains: ['medium.com', 'substack.com'], sourceType: 'medium', searchDepth: 'basic', queryPrompt: 'growth tactics and frameworks' },
    { domains: ['linkedin.com'], sourceType: 'linkedin', searchDepth: 'basic', queryPrompt: 'growth benchmarks and metrics' },
    { domains: ['reddit.com'], sourceType: 'reddit', searchDepth: 'basic', queryPrompt: 'growth channel discussions' },
    { domains: [], sourceType: 'news', searchDepth: 'basic', queryPrompt: 'industry growth trends' },
  ],
  general: [
    { domains: [], sourceType: 'web', searchDepth: 'advanced', queryPrompt: 'general information' },
    { domains: ['reddit.com'], sourceType: 'reddit', searchDepth: 'basic', queryPrompt: 'community perspectives' },
    { domains: ['linkedin.com'], sourceType: 'linkedin', searchDepth: 'basic', queryPrompt: 'professional insights' },
    { domains: ['medium.com', 'substack.com'], sourceType: 'medium', searchDepth: 'basic', queryPrompt: 'analysis and commentary' },
    { domains: [], sourceType: 'news', searchDepth: 'basic', queryPrompt: 'recent news' },
  ],
}

// =============================================================================
// Query Generation
// =============================================================================

/**
 * Generate research-type-specific queries using Haiku for speed.
 * Each research type gets a tailored prompt for better query quality.
 */
export async function generateResearchQueries(
  topic: string,
  researchType: PMResearchType,
  context?: string,
): Promise<string[]> {
  const typePrompts: Record<PMResearchType, string> = {
    competitive: `Generate 6-8 search queries for competitive analysis research.
Focus on: competitor products, features, pricing pages, G2/Capterra reviews, funding rounds, market positioning, recent announcements.
Include queries for: direct competitors, indirect competitors, market leaders, pricing comparison, feature comparison.`,

    market: `Generate 6-8 search queries for market research.
Focus on: market size (TAM/SAM/SOM), growth rates, industry trends, emerging technologies, regulatory changes, market segmentation.
Include queries for: industry reports, analyst coverage, market forecasts, key players.`,

    persona: `Generate 6-8 search queries for persona and ICP research.
Focus on: target user pain points, daily workflows, tool adoption patterns, decision-making processes, job responsibilities, buying behavior.
Include queries for: user forums, role descriptions, industry surveys, user reviews.`,

    growth: `Generate 6-8 search queries for growth strategy research.
Focus on: growth channels, retention benchmarks, activation metrics, viral mechanics, PLG vs SLG motion, industry growth rates.
Include queries for: growth case studies, channel effectiveness, benchmark reports, growth frameworks.`,

    general: `Generate 6-8 search queries for broad research on this topic.
Focus on: key facts, recent developments, expert opinions, data points, frameworks, best practices.`,
  }

  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt: `You are a research query generator for product management analysis.

Topic: ${topic}
${context ? `Additional context: ${context}` : ''}

${typePrompts[researchType]}

Rules:
- Each query should be 4-12 words, optimized for web search
- Be specific — include industry, company names, or product categories when relevant
- Include 1-2 queries for recent/current data (use "2024" or "2025" or "latest")
- Vary query structure (some factual, some comparative, some exploratory)

Return one query per line, no numbering, no bullets, no explanations.`,
      temperature: 0.3,
      maxOutputTokens: 400,
    })

    const queries = text.split('\n').map(q => q.trim()).filter(q => q.length > 3)
    logger.debug('[ResearchService] Generated queries', {
      researchType,
      queryCount: queries.length,
    })
    return queries.length > 0 ? queries : [topic]
  } catch (error) {
    logger.warn('[ResearchService] Query generation failed, using topic as query', {
      error: error instanceof Error ? error.message : String(error),
    })
    return [topic]
  }
}

// =============================================================================
// Web Search Execution
// =============================================================================

/**
 * Execute parallel web searches across configured sources for a research type.
 * Uses Promise.allSettled for error tolerance — partial results are still useful.
 */
export async function executeWebResearch(
  queries: string[],
  options: ResearchOptions,
): Promise<ResearchResult[]> {
  const { researchType, maxResults = 10 } = options
  const configs = RESEARCH_TYPE_CONFIGS[researchType]

  // Distribute queries across source configs
  const searchPromises = configs.map((config, i) => {
    const query = queries[i % queries.length] || queries[0]
    const searchOpts: TavilySearchOptions = {
      searchDepth: options.searchDepth || config.searchDepth,
      maxResults: Math.ceil(maxResults / configs.length),
      ...(config.domains.length > 0 && { includeDomains: config.domains }),
      ...(config.sourceType === 'news' && { topic: 'news' as const, days: 30 }),
    }

    return tavilyClient.search(query, searchOpts)
      .then(results => results.map(r => ({
        source_type: config.sourceType,
        source_name: r.title,
        source_url: r.url,
        excerpt: r.content,
        relevance_score: r.score,
      })))
      .catch(error => {
        logger.warn('[ResearchService] Source query failed', {
          sourceType: config.sourceType,
          error: error instanceof Error ? error.message : String(error),
        })
        return [] as ResearchResult[]
      })
  })

  const results = await Promise.allSettled(searchPromises)

  const allResults = results
    .filter((r): r is PromiseFulfilledResult<ResearchResult[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)

  // Filter by relevance and deduplicate by URL
  const seen = new Set<string>()
  const filtered = allResults
    .filter(r => r.relevance_score > 0.5)
    .filter(r => {
      if (!r.source_url) return true
      if (seen.has(r.source_url)) return false
      seen.add(r.source_url)
      return true
    })
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, maxResults)

  logger.info('[ResearchService] Research completed', {
    researchType,
    totalRaw: allResults.length,
    afterFilter: filtered.length,
  })

  return filtered
}

// =============================================================================
// Result Storage
// =============================================================================

/**
 * Store research results in artifact_research table for UI display and audit trail.
 */
export async function storeResearchResults(
  supabase: SupabaseClient,
  artifactId: string,
  results: ResearchResult[],
): Promise<number> {
  if (results.length === 0) return 0

  const rows: StoredResearchResult[] = results.map(r => ({
    ...r,
    artifact_id: artifactId,
  }))

  const { data, error } = await supabase
    .from('artifact_research')
    .insert(rows)
    .select()

  if (error) {
    logger.error('[ResearchService] Failed to store results', {
      hasArtifactId: !!artifactId,
      error: error.message,
    })
    return 0
  }

  logger.debug('[ResearchService] Results stored', {
    hasArtifactId: !!artifactId,
    count: data?.length || 0,
  })

  return data?.length || 0
}

// =============================================================================
// Mock Data Generation
// =============================================================================

/**
 * Generate mock research results for development/testing.
 */
export function generateMockResults(
  topic: string,
  researchType: PMResearchType,
  count: number = 8,
): ResearchResult[] {
  const configs = RESEARCH_TYPE_CONFIGS[researchType]

  return configs.slice(0, count).map((config, i) => ({
    source_type: config.sourceType,
    source_name: `Mock ${config.sourceType} result for "${topic.substring(0, 30)}..."`,
    source_url: `https://example.com/${config.sourceType}/mock-${i}`,
    excerpt: `Mock research finding from ${config.sourceType} about "${topic}". Contains relevant ${config.queryPrompt} data for ${researchType} analysis. Key insights include industry benchmarks, market trends, and expert perspectives.`,
    relevance_score: 0.75 + (Math.random() * 0.2),
  }))
}
