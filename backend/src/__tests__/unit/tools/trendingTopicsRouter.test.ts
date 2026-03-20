import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('trendingTopicsRouter', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('defaults to grok when TRENDING_TOPICS_PROVIDER is not set', async () => {
    delete process.env.TRENDING_TOPICS_PROVIDER
    const { getTrendingProvider } = await import(
      '../../../services/ai/agents/portfolio/tools/trendingTopicsRouter.js'
    )
    expect(getTrendingProvider()).toBe('grok')
  })

  it('returns tavily_hn when configured', async () => {
    process.env.TRENDING_TOPICS_PROVIDER = 'tavily_hn'
    const { getTrendingProvider } = await import(
      '../../../services/ai/agents/portfolio/tools/trendingTopicsRouter.js'
    )
    expect(getTrendingProvider()).toBe('tavily_hn')
  })

  it('returns grok when explicitly configured', async () => {
    process.env.TRENDING_TOPICS_PROVIDER = 'grok'
    const { getTrendingProvider } = await import(
      '../../../services/ai/agents/portfolio/tools/trendingTopicsRouter.js'
    )
    expect(getTrendingProvider()).toBe('grok')
  })
})
