/**
 * Grok Search Client
 *
 * Uses xAI's Grok 4.1 Fast with native x_search + web_search
 * server-side tools for trending topic discovery.
 *
 * The model autonomously searches X/Twitter and the web,
 * then returns structured trending topics.
 */

import { generateText } from 'ai'
import { xai } from '@ai-sdk/xai'
import { logToFile } from './logger.js'

// =============================================================================
// Types
// =============================================================================

export interface GrokTrendingTopic {
  title: string
  source: 'x_twitter' | 'web'
  url: string
  snippet: string
  score: number
  publishedAt?: string
}

export interface GrokTrendingResult {
  topics: GrokTrendingTopic[]
  sourceCounts: { x_twitter: number; web: number }
}

// =============================================================================
// Client
// =============================================================================

class GrokSearchClient {
  private modelId = 'grok-4-1-fast-non-reasoning'

  isConfigured(): boolean {
    return Boolean(process.env.XAI_API_KEY && process.env.XAI_API_KEY.length > 0)
  }

  /**
   * Discover trending topics using Grok's native search tools.
   *
   * Grok autonomously calls x_search and web_search, then returns
   * a structured JSON array of trending topics.
   */
  async discoverTrending(
    domain: string,
    options: {
      days?: number
      maxResults?: number
      xHandles?: string[]
    } = {}
  ): Promise<GrokTrendingResult> {
    const { days = 7, maxResults = 10, xHandles = [] } = options

    if (!this.isConfigured()) {
      throw new Error('xAI API key not configured. Set XAI_API_KEY environment variable.')
    }

    const startTime = Date.now()

    logToFile('GrokSearch: starting trending discovery', {
      domain,
      days,
      maxResults,
    })

    const handleFilter =
      xHandles.length > 0
        ? `Pay special attention to posts from: ${xHandles.join(', ')}.`
        : ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { text } = await generateText({
      model: xai.responses(this.modelId),
      tools: {
        xSearch: xai.tools.xSearch(),
        webSearch: xai.tools.webSearch(),
      } as any,
      toolChoice: 'required',
      prompt: `You are a trending topics researcher for the "${domain}" industry.

Search X/Twitter and the web for the most discussed and trending topics in ${domain} from the last ${days} days.
${handleFilter}

Return ONLY a JSON array (no markdown, no explanation) with up to ${maxResults} items in this exact format:
[
  {
    "title": "Topic title",
    "source": "x_twitter" or "web",
    "url": "source URL",
    "snippet": "Brief description (max 200 chars)",
    "score": 0.0 to 1.0 (relevance/virality),
    "publishedAt": "ISO date string or null"
  }
]

Sort by score descending. Focus on actionable, content-worthy topics that a consultant or advisor could write about.`,
    })

    const duration = Date.now() - startTime

    // Parse the JSON response — strip markdown fences if present
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
    let topics: GrokTrendingTopic[]

    try {
      topics = JSON.parse(cleaned)
    } catch {
      logToFile('GrokSearch: failed to parse response, returning empty', {
        responsePreview: cleaned.substring(0, 200),
      })
      return { topics: [], sourceCounts: { x_twitter: 0, web: 0 } }
    }

    // Validate and cap results
    topics = topics.slice(0, maxResults).map((t) => ({
      title: String(t.title || ''),
      source: t.source === 'x_twitter' ? 'x_twitter' : 'web',
      url: String(t.url || ''),
      snippet: String(t.snippet || '').substring(0, 200),
      score: Math.max(0, Math.min(1, Number(t.score) || 0)),
      publishedAt: t.publishedAt || undefined,
    }))

    const sourceCounts = {
      x_twitter: topics.filter((t) => t.source === 'x_twitter').length,
      web: topics.filter((t) => t.source === 'web').length,
    }

    logToFile('GrokSearch: trending discovery complete', {
      domain,
      totalTopics: topics.length,
      sourceCounts,
      duration,
    })

    return { topics, sourceCounts }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const grokSearchClient = new GrokSearchClient()
