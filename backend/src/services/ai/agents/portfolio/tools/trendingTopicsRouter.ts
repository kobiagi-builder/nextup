/**
 * Trending Topics Router
 *
 * Reads TRENDING_TOPICS_PROVIDER env var and routes to the correct provider.
 * When set to 'grok' (default), tries Grok first and automatically falls back
 * to Tavily+HN if Grok fails (API error, no credits, etc.).
 *
 * Providers:
 * - 'grok' (default): Grok 4.1 Fast with x_search + web_search, fallback to Tavily+HN
 * - 'tavily_hn': Tavily API + Hacker News only (no Grok)
 */

import { tool } from 'ai'
import { z } from 'zod'
import { researchTrendingTopics as tavilyHnTool } from './trendingTopicsTools.js'
import { researchTrendingTopicsGrok as grokTool } from './trendingTopicsGrokTool.js'
import { logToFile } from '../../../../../lib/logger.js'

export type TrendingProvider = 'grok' | 'tavily_hn'

export function getTrendingProvider(): TrendingProvider {
  const env = process.env.TRENDING_TOPICS_PROVIDER?.toLowerCase()
  if (env === 'tavily_hn') return 'tavily_hn'
  return 'grok' // default
}

const provider = getTrendingProvider()

logToFile('TrendingTopicsRouter initialized', { provider })

/**
 * Wrapper tool that tries the configured provider first,
 * falling back to Tavily+HN if Grok fails.
 */
const researchTrendingTopicsWithFallback = tool({
  description:
    'Discover trending topics in a specific domain via web research. Uses the configured provider (Grok or Tavily+HN) with automatic fallback. Use this tool for the "Trending" topic type.',

  inputSchema: z.object({
    domain: z
      .string()
      .default('product management')
      .describe('Domain to search for trending topics (default: product management)'),
    customKeywords: z
      .array(z.string())
      .optional()
      .describe('Additional keywords to filter stories by'),
    days: z
      .number()
      .min(1)
      .max(30)
      .default(7)
      .describe('Time range in days to search (default: 7, max: 30)'),
    maxResults: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe('Maximum number of results to return (default: 10, max: 20)'),
  }),

  execute: async (params) => {
    // tavily_hn mode: go directly, no fallback
    if (provider === 'tavily_hn') {
      logToFile('TrendingTopicsRouter: using tavily_hn (configured)')
      return tavilyHnTool.execute(params)
    }

    // grok mode: try Grok first, fallback to Tavily+HN on failure
    logToFile('TrendingTopicsRouter: trying grok (primary)')
    const grokResult = await grokTool.execute(params)

    if (grokResult.success) {
      return grokResult
    }

    // Grok failed — fall back to Tavily+HN
    logToFile('TrendingTopicsRouter: grok failed, falling back to tavily_hn', {
      grokError: grokResult.message,
    })

    const fallbackResult = await tavilyHnTool.execute(params)

    // Tag the message so logs show fallback was used
    return {
      ...fallbackResult,
      message: `${fallbackResult.message} (fallback from Grok: ${grokResult.message})`,
    }
  },
})

/**
 * The active trending topics tool, exported as `researchTrendingTopics`
 * so it's a drop-in replacement in AIService.
 */
export const researchTrendingTopics = researchTrendingTopicsWithFallback
