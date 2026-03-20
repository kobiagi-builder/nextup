/**
 * Grok Trending Topics Tool
 *
 * Alternative trending topics discovery using xAI Grok 4.1 Fast
 * with native X/Twitter search and web search.
 *
 * Returns data in the same NormalizedTopic shape as the Tavily+HN tool
 * so the Content Agent and suggestArtifactIdeas tool work unchanged.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { logToFile } from '../../../../../lib/logger.js'
import { grokSearchClient } from '../../../../../lib/grokSearch.js'
import type { NormalizedTopic } from './trendingTopicsTools.js'

// =============================================================================
// Tool Definition
// =============================================================================

export const researchTrendingTopicsGrok = tool({
  description:
    'Discover trending topics using Grok AI with native X/Twitter and web search. Returns normalized, deduplicated results sorted by relevance. Use this tool for the "Trending" topic type.',

  inputSchema: z.object({
    domain: z
      .string()
      .default('product management')
      .describe('Domain to search for trending topics'),
    days: z
      .number()
      .min(1)
      .max(30)
      .default(7)
      .describe('Time range in days (default: 7, max: 30)'),
    maxResults: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe('Maximum results to return (default: 10, max: 20)'),
  }),

  execute: async ({ domain, days, maxResults }) => {
    logToFile('TOOL EXECUTED: researchTrendingTopicsGrok', { domain, days, maxResults })

    if (!grokSearchClient.isConfigured()) {
      logToFile('Grok not configured, XAI_API_KEY missing')
      return {
        success: false,
        type: 'trending_topics' as const,
        domain,
        topics: [],
        sourceCounts: { x_twitter: 0, web: 0 },
        message: 'Grok API not configured. Set XAI_API_KEY environment variable.',
      }
    }

    try {
      const result = await grokSearchClient.discoverTrending(domain, { days, maxResults })

      // Map to NormalizedTopic shape (same as tavily_hn tool output)
      const topics: NormalizedTopic[] = result.topics.map((t) => ({
        title: t.title,
        source: t.source as NormalizedTopic['source'],
        url: t.url,
        snippet: t.snippet,
        score: t.score,
        publishedAt: t.publishedAt,
      }))

      logToFile('researchTrendingTopicsGrok complete', {
        domain,
        totalTopics: topics.length,
        sourceCounts: result.sourceCounts,
      })

      return {
        success: true,
        type: 'trending_topics' as const,
        domain,
        topics,
        sourceCounts: result.sourceCounts,
        message: `Found ${topics.length} trending topics in ${domain} (X/Twitter: ${result.sourceCounts.x_twitter}, Web: ${result.sourceCounts.web})`,
      }
    } catch (error) {
      logToFile('researchTrendingTopicsGrok error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        success: false,
        type: 'trending_topics' as const,
        domain,
        topics: [],
        sourceCounts: { x_twitter: 0, web: 0 },
        message: `Grok trending search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
})
