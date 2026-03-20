import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the grokSearch client
vi.mock('../../../lib/grokSearch.js', () => ({
  grokSearchClient: {
    isConfigured: vi.fn(() => true),
    discoverTrending: vi.fn(() =>
      Promise.resolve({
        topics: [
          {
            title: 'AI Agents Are Replacing SaaS',
            source: 'x_twitter',
            url: 'https://x.com/post/123',
            snippet: 'Major discussion on X about AI agents',
            score: 0.95,
            publishedAt: '2026-03-18T10:00:00Z',
          },
          {
            title: 'Product-Led Growth in 2026',
            source: 'web',
            url: 'https://example.com/article',
            snippet: 'New trends in PLG',
            score: 0.8,
          },
        ],
        sourceCounts: { x_twitter: 1, web: 1 },
      })
    ),
  },
}))

describe('researchTrendingTopicsGrok', () => {
  it('returns normalized topics in the standard format', async () => {
    const { researchTrendingTopicsGrok } = await import(
      '../../../services/ai/agents/portfolio/tools/trendingTopicsGrokTool.js'
    )

    // Execute the tool directly
    const result = await researchTrendingTopicsGrok.execute({
      domain: 'product management',
      days: 7,
      maxResults: 10,
    })

    expect(result.success).toBe(true)
    expect(result.type).toBe('trending_topics')
    expect(result.topics).toHaveLength(2)
    expect(result.topics[0].source).toBe('x_twitter')
    expect(result.sourceCounts.x_twitter).toBe(1)
    expect(result.sourceCounts.web).toBe(1)
    expect(result.message).toContain('Found 2 trending topics')
  })

  it('returns the same shape as the tavily_hn tool', async () => {
    const { researchTrendingTopicsGrok } = await import(
      '../../../services/ai/agents/portfolio/tools/trendingTopicsGrokTool.js'
    )

    const result = await researchTrendingTopicsGrok.execute({
      domain: 'product management',
      days: 7,
      maxResults: 10,
    })

    // Verify contract: same keys as trendingTopicsTools output
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('type')
    expect(result).toHaveProperty('domain')
    expect(result).toHaveProperty('topics')
    expect(result).toHaveProperty('sourceCounts')
    expect(result).toHaveProperty('message')

    // Each topic must have the NormalizedTopic shape
    for (const topic of result.topics) {
      expect(topic).toHaveProperty('title')
      expect(topic).toHaveProperty('source')
      expect(topic).toHaveProperty('url')
      expect(topic).toHaveProperty('snippet')
      expect(topic).toHaveProperty('score')
    }
  })
})
