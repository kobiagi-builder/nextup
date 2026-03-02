/**
 * Trending Topics Tools
 *
 * AI tool for discovering trending topics via web research.
 * Uses Tavily Enhanced + Hacker News API for multi-source discovery.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { logToFile } from '../../../../../lib/logger.js'
import { tavilyClient } from '../../../../../lib/tavily.js'
import { hackerNewsClient, DEFAULT_PM_KEYWORDS } from '../../../../../lib/hackerNews.js'

// =============================================================================
// Types
// =============================================================================

interface NormalizedTopic {
  title: string
  source: 'tavily' | 'hacker_news'
  url: string
  snippet: string
  score: number
  publishedAt?: string
}

// =============================================================================
// PM-focused source domains for Tavily
// =============================================================================

const PM_SOURCE_DOMAINS = [
  'producthunt.com',
  'mindtheproduct.com',
  'svpg.com',
  'lenny.substack.com',
  'medium.com',
  'hbr.org',
  'forbes.com',
  'techcrunch.com',
]

// =============================================================================
// Tool Definition
// =============================================================================

export const researchTrendingTopics = tool({
  description: 'Discover trending topics in a specific domain via web research. Uses Tavily news search and Hacker News community signals. Returns normalized, deduplicated results sorted by relevance. Use this tool for the "Trending" topic type.',

  inputSchema: z.object({
    domain: z.string().default('product management').describe('Domain to search for trending topics (default: product management)'),
    customKeywords: z.array(z.string()).optional().describe('Additional keywords to filter HN stories by'),
    days: z.number().min(1).max(30).default(7).describe('Time range in days to search (default: 7, max: 30)'),
    maxResults: z.number().min(1).max(20).default(10).describe('Maximum number of results to return (default: 10, max: 20)'),
  }),

  execute: async ({ domain, customKeywords, days, maxResults }) => {
    logToFile('🔧 TOOL EXECUTED: researchTrendingTopics', { domain, days, maxResults })

    const topics: NormalizedTopic[] = []
    const sourceCounts = { tavily: 0, hacker_news: 0 }

    // Run Tavily and HN searches in parallel
    const [tavilyResults, hnResults] = await Promise.allSettled([
      // Tavily: news search for trending content
      tavilyClient.isConfigured()
        ? tavilyClient.searchTrending(domain, {
            days,
            maxResults,
            includeDomains: PM_SOURCE_DOMAINS,
          })
        : Promise.resolve([]),

      // Hacker News: community trending stories
      hackerNewsClient.getTrendingByDomain(
        customKeywords && customKeywords.length > 0
          ? customKeywords
          : DEFAULT_PM_KEYWORDS,
        maxResults
      ),
    ])

    // Process Tavily results
    if (tavilyResults.status === 'fulfilled') {
      for (const result of tavilyResults.value) {
        topics.push({
          title: result.title,
          source: 'tavily',
          url: result.url,
          snippet: result.content?.substring(0, 200) || '',
          score: result.score,
          publishedAt: result.publishedDate,
        })
        sourceCounts.tavily++
      }
    } else {
      logToFile('⚠️ Tavily search failed, continuing with HN only', {
        error: tavilyResults.reason?.message,
      })
    }

    // Process HN results
    if (hnResults.status === 'fulfilled') {
      for (const story of hnResults.value) {
        topics.push({
          title: story.title,
          source: 'hacker_news',
          url: story.url,
          snippet: `${story.score} points, ${story.commentCount} comments on Hacker News`,
          score: Math.min(story.score / 500, 1), // Normalize HN score to 0-1
          publishedAt: story.publishedAt,
        })
        sourceCounts.hacker_news++
      }
    } else {
      logToFile('⚠️ HN search failed, continuing with Tavily only', {
        error: hnResults.reason?.message,
      })
    }

    // Deduplicate by title similarity (simple lowercase comparison)
    const seen = new Set<string>()
    const deduped = topics.filter((t) => {
      const key = t.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by score descending, limit results
    deduped.sort((a, b) => b.score - a.score)
    const limited = deduped.slice(0, maxResults)

    logToFile('✅ researchTrendingTopics complete', {
      domain,
      totalTopics: limited.length,
      sourceCounts,
    })

    return {
      success: true,
      type: 'trending_topics' as const,
      domain,
      topics: limited,
      sourceCounts,
      message: `Found ${limited.length} trending topics in ${domain} (Tavily: ${sourceCounts.tavily}, HN: ${sourceCounts.hacker_news})`,
    }
  },
})
