/**
 * ProfileExtractionService
 *
 * Extracts structured profile data from a user's website and/or LinkedIn page
 * using web scraping (cheerio) + LLM extraction (Claude Haiku 4.5).
 *
 * Tiered fallback: website → LinkedIn → pasted text.
 * Returns ExtractedProfileFields or { __error: true } on failure.
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logger } from '../lib/logger.js'
import { assertPublicUrl } from '../lib/urlSecurity.js'

// =============================================================================
// Types
// =============================================================================

export interface ExtractedProfileFields {
  about_me?: {
    bio?: string
    background?: string
    value_proposition?: string
  }
  profession?: {
    expertise_areas?: string
    industries?: string
    methodologies?: string
  }
  customers?: {
    ideal_client?: string
    industry_verticals?: string[]
  }
  goals?: {
    content_goals?: string
  }
  __error?: boolean
  __message?: string
}

// =============================================================================
// Constants
// =============================================================================

const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'
const FETCH_TIMEOUT_MS = 15_000
const MAX_CONTENT_LENGTH = 8000

// Realistic browser UA — required for LinkedIn and sites that block bots
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const SYSTEM_PROMPT = `You are a professional profile analyzer. Given scraped content from a consultant's website and/or LinkedIn profile, extract structured profile information as JSON.

Return ONLY a JSON object with these sections (include only fields you can confidently extract):

{
  "about_me": {
    "bio": "1-3 sentence professional bio",
    "background": "Professional background and experience summary",
    "value_proposition": "Unique value they bring to clients"
  },
  "profession": {
    "expertise_areas": "Bullet list of expertise areas, one per line with • prefix",
    "industries": "Bullet list of industries, one per line with • prefix",
    "methodologies": "Bullet list of methodologies/frameworks, one per line with • prefix"
  },
  "customers": {
    "ideal_client": "Description of ideal client profile and who they serve",
    "industry_verticals": ["Array of industry verticals they target, e.g. Fintech, Cyber, SaaS"]
  },
  "goals": {
    "content_goals": "What they want to communicate through content"
  }
}

Rules:
- Extract ONLY from the provided content. Do NOT hallucinate or invent details.
- If a field cannot be determined, omit it or set to empty string.
- For list fields (expertise_areas, industries, methodologies), use bullet format: "• Item 1\\n• Item 2"
- Keep bio concise (1-3 sentences). Keep other fields under 500 characters each.
- Return ONLY valid JSON, no markdown fences, no explanation.`

// =============================================================================
// Pure Helpers
// =============================================================================

/**
 * Strip markdown fences from LLM output.
 * Claude Haiku 4.5 wraps JSON in ```json ... ``` fences.
 */
export function stripFences(text: string): string {
  let cleaned = text.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  }
  return cleaned
}

/**
 * Extract OpenGraph and meta tags from HTML.
 * LinkedIn serves og:title and og:description even for unauthenticated requests,
 * so this is the primary extraction path for LinkedIn profiles.
 */
function extractMetaTags($: ReturnType<typeof import('cheerio').load>): string {
  const parts: string[] = []

  // OpenGraph tags (LinkedIn serves these reliably)
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogType = $('meta[property="og:type"]').attr('content')

  // Twitter card tags (some sites use these)
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')
  const twitterDesc = $('meta[name="twitter:description"]').attr('content')

  // Standard meta
  const metaDesc = $('meta[name="description"]').attr('content')
  const title = $('title').text().trim()

  if (ogTitle) parts.push(`Name: ${ogTitle}`)
  if (ogDesc) parts.push(`About: ${ogDesc}`)
  if (ogType) parts.push(`Type: ${ogType}`)
  if (!ogTitle && twitterTitle) parts.push(`Name: ${twitterTitle}`)
  if (!ogDesc && twitterDesc) parts.push(`About: ${twitterDesc}`)
  if (!ogDesc && !twitterDesc && metaDesc) parts.push(`About: ${metaDesc}`)
  if (!ogTitle && !twitterTitle && title) parts.push(`Title: ${title}`)

  return parts.join('\n')
}

/**
 * Fetch text content from a URL using cheerio for HTML parsing.
 */
async function fetchText(url: string): Promise<string> {
  assertPublicUrl(url)
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()

  // Dynamic import cheerio (same pattern as publicationScraper.ts)
  const cheerio = await import('cheerio')
  const $ = cheerio.load(html)

  // Extract meta/OG tags before removing elements (they're in <head>)
  const metaContent = extractMetaTags($)

  // Remove non-content elements
  $('script, style, nav, header, footer, aside, button, svg, img, noscript').remove()
  $('[class*="comment"], [class*="sidebar"], [class*="menu"], [class*="nav"]').remove()

  // Try structured content first (JSON-LD)
  let content = ''
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '')
      const body = data.articleBody || data.description || data.text || ''
      if (body && body.length > 50) content += body + '\n\n'
    } catch {
      // ignore malformed JSON-LD
    }
  })

  // Extract from main content areas
  const mainContent = $('main, article, [role="main"], .content, #content')
  if (mainContent.length) {
    content += mainContent
      .find('p, h1, h2, h3, li')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t: string) => t.length > 20)
      .join('\n')
  } else {
    // Fallback: all paragraphs
    content += $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t: string) => t.length > 20)
      .join('\n')
  }

  // Prepend meta tags (most reliable for LinkedIn where body is auth-walled)
  if (metaContent) {
    content = metaContent + '\n\n' + content
  }

  return content.slice(0, MAX_CONTENT_LENGTH)
}

// =============================================================================
// Service
// =============================================================================

/**
 * Extract profile fields from provided URLs and/or pasted text.
 * Returns structured fields or an error marker object.
 */
export async function extractProfile(
  websiteUrl?: string,
  linkedInUrl?: string,
  pastedText?: string
): Promise<ExtractedProfileFields> {
  const contentParts: string[] = []

  // Tier 1: Website (most reliable for custom content)
  if (websiteUrl) {
    try {
      const text = await fetchText(websiteUrl)
      if (text.trim().length > 50) {
        contentParts.push(`=== WEBSITE CONTENT ===\n${text}`)
      }
    } catch (err) {
      logger.warn('[ProfileExtraction] Website fetch failed', {
        hasUrl: true,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Tier 2: LinkedIn (OG meta tags are served even behind auth wall)
  if (linkedInUrl) {
    try {
      const text = await fetchText(linkedInUrl)
      if (text.trim().length > 20) {
        contentParts.push(`=== LINKEDIN PROFILE ===\n${text}`)
        logger.info('[ProfileExtraction] LinkedIn content extracted', {
          contentLength: text.trim().length,
        })
      }
    } catch (err) {
      logger.warn('[ProfileExtraction] LinkedIn fetch failed', {
        hasUrl: true,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Tier 3: Pasted text (always available if provided)
  if (pastedText && pastedText.trim().length > 20) {
    contentParts.push(`=== PASTED BIO/ABOUT ===\n${pastedText.trim().slice(0, MAX_CONTENT_LENGTH)}`)
  }

  // No content at all — return empty (not error, user just had no scrapeable content)
  if (contentParts.length === 0) {
    logger.info('[ProfileExtraction] No content extracted from any source')
    return {}
  }

  // Pass to Claude for structured extraction
  try {
    const { text } = await generateText({
      model: anthropic(EXTRACTION_MODEL),
      system: SYSTEM_PROMPT,
      prompt: contentParts.join('\n\n'),
      maxOutputTokens: 1000,
    })

    const jsonText = stripFences(text)
    const parsed = JSON.parse(jsonText)

    // Basic shape validation
    if (!parsed || typeof parsed !== 'object') {
      logger.warn('[ProfileExtraction] Claude returned non-object', {
        responseLength: text.length,
      })
      return {}
    }

    logger.info('[ProfileExtraction] Extraction successful', {
      hasAboutMe: !!parsed.about_me,
      hasProfession: !!parsed.profession,
      hasCustomers: !!parsed.customers,
      hasGoals: !!parsed.goals,
      sourceCount: contentParts.length,
    })

    return parsed as ExtractedProfileFields
  } catch (err) {
    logger.error('[ProfileExtraction] LLM extraction failed', {
      sourceCode: 'extractProfile',
      error: err instanceof Error ? err : new Error(String(err)),
    })
    return { __error: true, __message: 'Extraction failed' }
  }
}
