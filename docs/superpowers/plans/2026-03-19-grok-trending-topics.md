# Grok-Powered Trending Topics (Option A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Grok 4.1 Fast as an alternative trending-topics provider alongside existing Tavily + Hacker News, controlled by env config, defaulting to Grok.

**Architecture:** New `researchTrendingTopicsGrok` tool sits beside the existing `researchTrendingTopics` tool. A wrapper function reads `TRENDING_TOPICS_PROVIDER` env var and delegates to the correct implementation. Claude Sonnet remains the orchestrator — it calls whichever trending tool is active. The Grok tool uses `@ai-sdk/xai` with native `x_search` + `web_search` server-side tools via a single `generateText` call.

**Tech Stack:** `@ai-sdk/xai` (Vercel AI SDK xAI provider), Grok 4.1 Fast (`grok-4-1-fast-non-reasoning`), existing Vercel AI SDK v6

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/src/lib/grokSearch.ts` | Grok search client — wraps `@ai-sdk/xai` with `x_search` + `web_search` for trending discovery |
| Create | `backend/src/services/ai/agents/portfolio/tools/trendingTopicsGrokTool.ts` | Vercel AI SDK `tool()` that calls `grokSearch` and returns `NormalizedTopic[]` in same shape as existing tool |
| Modify | `backend/src/services/ai/agents/portfolio/tools/trendingTopicsTools.ts` | Export the `NormalizedTopic` interface so both tools share it |
| Create | `backend/src/services/ai/agents/portfolio/tools/trendingTopicsRouter.ts` | Reads `TRENDING_TOPICS_PROVIDER` env var, re-exports the active tool as `researchTrendingTopics` |
| Modify | `backend/src/services/ai/AIService.ts:148` | Change import to use the router instead of direct tool import |
| Modify | `backend/.env.example` | Add `XAI_API_KEY` and `TRENDING_TOPICS_PROVIDER` vars |
| Modify | `backend/package.json` | Add `@ai-sdk/xai` dependency |
| Create | `backend/src/__tests__/unit/tools/trendingTopicsGrokTool.test.ts` | Unit tests for Grok trending tool |
| Create | `backend/src/__tests__/unit/tools/trendingTopicsRouter.test.ts` | Unit tests for router logic |

---

## Task 1: Install `@ai-sdk/xai` dependency

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install the package**

```bash
cd backend && npm install @ai-sdk/xai
```

- [ ] **Step 2: Verify installation**

```bash
cd backend && node -e "import('@ai-sdk/xai').then(m => console.log('OK:', Object.keys(m)))"
```

Expected: `OK: [ 'createXai', 'xai', ... ]`

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add @ai-sdk/xai for Grok trending topics"
```

---

## Task 2: Add env configuration

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/.env` (local only, not committed)

- [ ] **Step 1: Write failing test for env-based routing**

Create `backend/src/__tests__/unit/tools/trendingTopicsRouter.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx vitest run src/__tests__/unit/tools/trendingTopicsRouter.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Update `.env.example`**

Add these lines to the `# AI Services` section of `backend/.env.example`:

```env
# xAI Grok API for trending topics (https://console.x.ai)
XAI_API_KEY=xxx

# Trending Topics Provider
# Options: grok (default) | tavily_hn (legacy Tavily + Hacker News)
# - grok: Uses Grok 4.1 Fast with native X/Twitter search + web search (~$0.20/$0.50 per MTok + ~$0.015/query for tool calls)
# - tavily_hn: Uses Tavily API + Hacker News Firebase API (requires TAVILY_API_KEY)
TRENDING_TOPICS_PROVIDER=grok
```

- [ ] **Step 4: Add keys to local `.env`**

Add `XAI_API_KEY=<your-key>` and `TRENDING_TOPICS_PROVIDER=grok` to `backend/.env`.

- [ ] **Step 5: Commit**

```bash
git add backend/.env.example
git commit -m "chore: add XAI_API_KEY and TRENDING_TOPICS_PROVIDER env config"
```

---

## Task 3: Export shared types and widen source union

**Files:**
- Modify: `backend/src/services/ai/agents/portfolio/tools/trendingTopicsTools.ts`

This task combines exporting the type AND widening the `source` union. The Grok tool (Task 5) imports `NormalizedTopic` and assigns `'x_twitter' | 'web'` values, so the type must be widened **before** the Grok tool is created, otherwise it won't compile.

- [ ] **Step 1: Export `NormalizedTopic` interface with widened source type**

In `trendingTopicsTools.ts`, change:

```typescript
interface NormalizedTopic {
  title: string
  source: 'tavily' | 'hacker_news'
  url: string
  snippet: string
  score: number
  publishedAt?: string
}
```

to:

```typescript
export interface NormalizedTopic {
  title: string
  source: 'tavily' | 'hacker_news' | 'x_twitter' | 'web'
  url: string
  snippet: string
  score: number
  publishedAt?: string
}
```

- [ ] **Step 2: Check if frontend references `source` type**

```bash
cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper && grep -r "tavily\|hacker_news" frontend/src/ --include="*.ts" --include="*.tsx" -l
```

If any frontend files reference these source strings, they need updating too. If none found, proceed.

- [ ] **Step 3: Verify build**

```bash
cd backend && npx tsc --noEmit
```

Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/ai/agents/portfolio/tools/trendingTopicsTools.ts
git commit -m "refactor: export NormalizedTopic with widened source union for Grok"
```

---

## Task 4: Create Grok search client

**Files:**
- Create: `backend/src/lib/grokSearch.ts`

- [ ] **Step 1: Write the Grok search client**

Create `backend/src/lib/grokSearch.ts`:

```typescript
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

    const { text } = await generateText({
      model: xai.responses(this.modelId),
      tools: {
        xSearch: xai.tools.xSearch(),
        webSearch: xai.tools.webSearch(),
      },
      toolChoice: 'required',
      maxSteps: 5,
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors (may need to verify `xai.tools.xSearch` type — if not available in SDK, will adjust in next step)

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/grokSearch.ts
git commit -m "feat: add Grok search client with x_search + web_search"
```

> **IMPORTANT — Implementer must verify at build time:**
>
> 1. The code uses `xai.responses(modelId)` (NOT `xai(modelId)`) — server-side tools like `xSearch`/`webSearch` require the Responses API wrapper.
> 2. Verify that `xai.tools.xSearch()` and `xai.tools.webSearch()` exist in the installed `@ai-sdk/xai` version. Run: `node -e "import('@ai-sdk/xai').then(m => console.log(Object.keys(m.xai.tools || {})))"`
> 3. Verify the model ID `grok-4-1-fast-non-reasoning` is correct at https://console.x.ai or https://docs.x.ai/docs/models — xAI may use dots instead of dashes (e.g., `grok-4.1-fast-non-reasoning`). An incorrect ID will cause a 404 at runtime.
>
> **Fallback if `@ai-sdk/xai` doesn't expose server-side tools:** Use the OpenAI SDK directly (already installed as `openai@^6.16.0`):
>
> ```typescript
> import OpenAI from 'openai'
> const client = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
> const response = await client.responses.create({
>   model: 'grok-4-1-fast-non-reasoning',
>   input: [{ role: 'user', content: prompt }],
>   tools: [{ type: 'x_search' }, { type: 'web_search' }],
> })
> // response.output_text contains the model's text response
> ```
>
> If using this fallback, replace the entire `generateText` block in `grokSearch.ts`. The rest of the architecture (tool wrapper, router, AIService wiring) stays the same.

---

## Task 5: Create Grok trending topics tool

**Files:**
- Create: `backend/src/services/ai/agents/portfolio/tools/trendingTopicsGrokTool.ts`
- Test: `backend/src/__tests__/unit/tools/trendingTopicsGrokTool.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/__tests__/unit/tools/trendingTopicsGrokTool.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx vitest run src/__tests__/unit/tools/trendingTopicsGrokTool.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the Grok trending topics tool**

Create `backend/src/services/ai/agents/portfolio/tools/trendingTopicsGrokTool.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
cd backend && npx vitest run src/__tests__/unit/tools/trendingTopicsGrokTool.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ai/agents/portfolio/tools/trendingTopicsGrokTool.ts backend/src/__tests__/unit/tools/trendingTopicsGrokTool.test.ts
git commit -m "feat: add Grok trending topics tool with x_search + web_search"
```

---

## Task 6: Create the trending topics router

**Files:**
- Create: `backend/src/services/ai/agents/portfolio/tools/trendingTopicsRouter.ts`

- [ ] **Step 1: Implement the router**

Create `backend/src/services/ai/agents/portfolio/tools/trendingTopicsRouter.ts`:

```typescript
/**
 * Trending Topics Router
 *
 * Reads TRENDING_TOPICS_PROVIDER env var and exports the active
 * trending topics tool. The tool name stays `researchTrendingTopics`
 * so the Content Agent prompt and AIService tool registry work unchanged.
 *
 * Providers:
 * - 'grok' (default): Grok 4.1 Fast with x_search + web_search
 * - 'tavily_hn': Tavily API + Hacker News (legacy)
 */

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
 * The active trending topics tool, selected by TRENDING_TOPICS_PROVIDER env var.
 * Exported as `researchTrendingTopics` so it's a drop-in replacement.
 */
export const researchTrendingTopics = provider === 'grok' ? grokTool : tavilyHnTool
```

- [ ] **Step 2: Run router tests**

```bash
cd backend && npx vitest run src/__tests__/unit/tools/trendingTopicsRouter.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/ai/agents/portfolio/tools/trendingTopicsRouter.ts
git commit -m "feat: add trending topics router with env-based provider selection"
```

---

## Task 7: Wire router into AIService

**Files:**
- Modify: `backend/src/services/ai/AIService.ts:31` (import) and `:148` (tool registry)

- [ ] **Step 1: Update AIService import**

In `backend/src/services/ai/AIService.ts`, change line 31 from:

```typescript
import * as trendingTopicsTools from './agents/portfolio/tools/trendingTopicsTools.js'
```

to:

```typescript
import * as trendingTopicsRouter from './agents/portfolio/tools/trendingTopicsRouter.js'
```

- [ ] **Step 2: Update tool registry**

In the same file, change line 148 from:

```typescript
  researchTrendingTopics: trendingTopicsTools.researchTrendingTopics,
```

to:

```typescript
  researchTrendingTopics: trendingTopicsRouter.researchTrendingTopics,
```

- [ ] **Step 3: Verify build**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Run all existing tests**

```bash
cd backend && npx vitest run
```

Expected: All existing tests pass (the router defaults to grok, but since tests mock tools, no real API calls happen)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ai/AIService.ts
git commit -m "feat: wire trending topics router into AIService tool registry"
```

---

## Task 8: Manual smoke test

- [ ] **Step 1: Set env to Grok**

Verify `backend/.env` has:
```
XAI_API_KEY=<your-key>
TRENDING_TOPICS_PROVIDER=grok
```

- [ ] **Step 2: Start dev servers**

```bash
npm run dev
```

- [ ] **Step 3: Test Grok flow**

In the chat panel, send: "What are the trending topics in product management right now?"

Verify:
- Suggestion cards appear with trending topics
- Topics include X/Twitter sources
- No errors in backend logs

- [ ] **Step 4: Test fallback — switch to Tavily**

Change `backend/.env`:
```
TRENDING_TOPICS_PROVIDER=tavily_hn
```

Restart backend. Send the same message. Verify the old Tavily + HN flow still works.

- [ ] **Step 5: Test missing key gracefully**

Remove `XAI_API_KEY` from `.env`, keep `TRENDING_TOPICS_PROVIDER=grok`. Restart.
Send the same message. Verify it returns a graceful error message, no crash.

---

## Task 9: Railway production configuration

- [ ] **Step 1: Document Railway config**

The following environment variables need to be set in Railway for the backend service:

| Variable | Value | Notes |
|----------|-------|-------|
| `XAI_API_KEY` | `<production xAI key>` | Get from https://console.x.ai |
| `TRENDING_TOPICS_PROVIDER` | `grok` | Default. Set to `tavily_hn` to revert |

**To set via Railway CLI:**
```bash
railway variables set XAI_API_KEY=<key> TRENDING_TOPICS_PROVIDER=grok
```

**Rollback plan:** If Grok quality is poor in production, change one env var:
```bash
railway variables set TRENDING_TOPICS_PROVIDER=tavily_hn
```
No code changes needed — just flip the env var. Since the router reads `TRENDING_TOPICS_PROVIDER` at module load time, changing the Railway env var triggers an automatic redeploy, which applies the switch.

- [ ] **Step 2: Commit all remaining changes and push**

```bash
git push origin main
```

---

## Summary

| Step | What | Risk |
|------|------|------|
| Tasks 1-2 | Dependencies + env config | None |
| Task 3 | Export + widen shared type | None — additive |
| Tasks 4-5 | Grok client + tool | Isolated — new files only |
| Task 6 | Router | Low — simple delegation |
| Task 7 | Wire into AIService | Medium — 2-line change to working code |
| Task 8 | Smoke test | Validates everything |
| Task 9 | Railway deploy | Reversible via env var |

**Note:** AIService.ts has `// @ts-nocheck` — TypeScript won't validate the import change in Task 7. The smoke test (Task 8) is the real verification.

**Rollback:** Set `TRENDING_TOPICS_PROVIDER=tavily_hn` in Railway. Zero code changes needed.

**Cost estimate per trending query (Grok):** ~$0.002 model tokens + ~$0.015 tool calls = **~$0.017/query** vs current Tavily API call cost.
