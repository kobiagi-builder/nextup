/**
 * Publication Scraper Service (Phase 3)
 *
 * Scrapes content from publication URLs (LinkedIn, Medium, Substack, Reddit).
 * Uses cheerio for HTML parsing and Reddit's JSON API.
 * Includes in-memory URL cache (1-hour TTL) and platform detection.
 *
 * All scrapers are colocated in this single file (function-based, project convention).
 */

import { createHash } from 'crypto';
import TurndownService from 'turndown';
import { logger } from '../lib/logger.js';

// =============================================================================
// Types
// =============================================================================

export type Platform = 'linkedin' | 'medium' | 'substack' | 'reddit' | 'google_docs' | 'generic';

export interface ScrapeResult {
  success: boolean;
  content: string;
  wordCount: number;
  title?: string;
  platform: Platform;
  error?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function makeResult(
  platform: Platform,
  content: string,
  title?: string
): ScrapeResult {
  if (!content || content.length < 50) {
    return {
      success: false,
      content: '',
      wordCount: 0,
      platform,
      error: `Could not extract meaningful content from this ${platform === 'generic' ? 'URL' : platform + ' page'}.`,
    };
  }
  return {
    success: true,
    content,
    wordCount: countWords(content),
    title,
    platform,
  };
}

function failResult(platform: Platform, error: string): ScrapeResult {
  return { success: false, content: '', wordCount: 0, platform, error };
}

/** Convert an HTML fragment to clean Markdown, preserving headings, lists, bold, italic, etc. */
function htmlToMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  // Strip non-text elements that add noise
  td.remove(['img', 'figure', 'figcaption', 'svg', 'button', 'nav', 'footer', 'script', 'style']);
  return td.turndown(html).replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

// =============================================================================
// Platform Detection
// =============================================================================

const PLATFORM_PATTERNS: { platform: Platform; patterns: RegExp[] }[] = [
  {
    platform: 'linkedin',
    patterns: [
      /linkedin\.com\/posts\//,
      /linkedin\.com\/pulse\//,
      /linkedin\.com\/feed\/update\//,
    ],
  },
  {
    platform: 'medium',
    patterns: [/medium\.com\//, /\.medium\.com\//],
  },
  {
    platform: 'substack',
    patterns: [/\.substack\.com\/p\//, /substack\.com\//],
  },
  {
    platform: 'reddit',
    patterns: [
      /reddit\.com\/r\/.*\/comments\//,
      /old\.reddit\.com\/r\/.*\/comments\//,
    ],
  },
  {
    platform: 'google_docs',
    patterns: [/docs\.google\.com\/document\/d\//],
  },
];

export function detectPlatform(url: string): Platform {
  for (const { platform, patterns } of PLATFORM_PATTERNS) {
    if (patterns.some((p) => p.test(url))) return platform;
  }
  return 'generic';
}

// =============================================================================
// LinkedIn Scraper
// =============================================================================

/** Remove common LinkedIn UI text artifacts from extracted content. */
function cleanLinkedInText(text: string): string {
  const uiPatterns = [
    /\b(Report this (post|comment)|Sign in|See more comments?)\b/gi,
    /\d+\s*(Reactions?|Comments?|Likes?|Replies?)\s*/gi,
    /No more (previous|next) content/gi,
    /To view or add a comment,?\s*sign in/gi,
  ];
  let cleaned = text;
  for (const pattern of uiPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Collapse excessive whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

async function scrapeLinkedIn(url: string): Promise<ScrapeResult> {
  const cheerio = await import('cheerio');

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (error) {
    return failResult('linkedin', `Failed to fetch LinkedIn page: ${error instanceof Error ? error.message : String(error)}`);
  }

  const $ = cheerio.load(html);
  let content = '';

  // 1. JSON-LD structured data (best quality for articles/pulse)
  $('script[type="application/ld+json"]').each((_, el) => {
    if (content) return;
    try {
      const data = JSON.parse($(el).html() || '');
      const body = data.articleBody || data.text || '';
      if (body && body.length > 100) content = body;
    } catch {
      // ignore parse errors
    }
  });

  // 2. DOM extraction with aggressive cleaning (for posts)
  if (!content) {
    // Strip non-content elements before text extraction
    $('script, style, nav, header, footer, aside, button, svg, img').remove();
    $('[class*="comment"], [data-test-id*="comment"]').remove();
    $('[class*="social-action"], [class*="social-count"]').remove();
    $('[class*="reactions"], [class*="reply"]').remove();

    // LinkedIn posts often wrap text in dir="ltr" spans
    const candidates: string[] = [];
    $('article span[dir="ltr"], article div[dir="ltr"]').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 80) candidates.push(t);
    });

    // Use the longest candidate (typically the post body)
    if (candidates.length) {
      content = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
    }

    // Fallback: extract paragraphs from article (excluding short UI text)
    if (!content) {
      const article = $('article');
      if (article.length) {
        content = article
          .find('p')
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((t) => t.length > 40)
          .join('\n\n');
      }
    }
  }

  // 3. og:description fallback (may be truncated but always clean)
  if (!content) {
    content = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }

  // Clean any remaining UI artifacts
  if (content) {
    content = cleanLinkedInText(content);
  }

  if (!content) {
    return failResult(
      'linkedin',
      'Could not extract content from this LinkedIn post. The post may require authentication to view.'
    );
  }

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    undefined;

  return makeResult('linkedin', content, title);
}

// =============================================================================
// Medium Scraper
// =============================================================================

async function scrapeMedium(url: string): Promise<ScrapeResult> {
  const cheerio = await import('cheerio');

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (error) {
    return failResult('medium', `Failed to fetch Medium page: ${error instanceof Error ? error.message : String(error)}`);
  }

  const $ = cheerio.load(html);

  // Medium articles use <article> tag
  const article = $('article');
  let content = '';

  if (article.length) {
    // Remove non-content elements before conversion
    article.find('button, nav, footer, [class*="metabar"], [class*="postActions"]').remove();
    content = htmlToMarkdown(article.html() || '');
  }

  // Fallback: meta description
  if (!content) {
    content = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }

  if (!content) {
    return failResult(
      'medium',
      'Could not extract content from this Medium article. It may be behind a paywall.'
    );
  }

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text() ||
    undefined;

  return makeResult('medium', content, title);
}

// =============================================================================
// Substack Scraper
// =============================================================================

async function scrapeSubstack(url: string): Promise<ScrapeResult> {
  const cheerio = await import('cheerio');

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (error) {
    return failResult('substack', `Failed to fetch Substack page: ${error instanceof Error ? error.message : String(error)}`);
  }

  const $ = cheerio.load(html);

  // Substack post body
  const postBody = $('.post-content, .body.markup, [class*="post-content"]');
  let content = '';

  if (postBody.length) {
    // Remove non-content elements (share buttons, subscribe prompts, etc.)
    postBody.find('button, [class*="subscribe"], [class*="share"], [class*="footer"]').remove();
    content = htmlToMarkdown(postBody.html() || '');
  }

  if (!content) {
    content = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }

  if (!content) {
    return failResult(
      'substack',
      'Could not extract content from this Substack post.'
    );
  }

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text() ||
    undefined;

  return makeResult('substack', content, title);
}

// =============================================================================
// Reddit Scraper (JSON API — no HTML parsing)
// =============================================================================

async function scrapeReddit(url: string): Promise<ScrapeResult> {
  // Use Reddit's JSON API: append .json to the URL
  const jsonUrl = url.replace(/\/?$/, '.json');

  let response: Response;
  try {
    response = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'User-Agent': 'NextUp/1.0 Content Extractor' },
    });
  } catch (error) {
    return failResult('reddit', `Failed to fetch Reddit post: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    return failResult('reddit', `Reddit API returned ${response.status}`);
  }

  const data = await response.json() as any[];

  // Reddit JSON structure: [listing, comments]
  // listing.data.children[0].data contains the post
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) {
    return failResult('reddit', 'Could not parse Reddit post data.');
  }

  const content = post.selftext || '';
  const title = post.title || undefined;

  if (!content) {
    return failResult(
      'reddit',
      'This Reddit post has no text content (may be a link or image post).'
    );
  }

  return makeResult('reddit', content, title);
}

// =============================================================================
// Google Docs Scraper (public export API)
// =============================================================================

async function scrapeGoogleDocs(url: string): Promise<ScrapeResult> {
  // Extract document ID from URL
  const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    return failResult('google_docs', 'Could not extract document ID from Google Docs URL.');
  }

  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

  let html: string;
  try {
    const response = await fetch(exportUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return failResult('google_docs', 'Google Doc not found. Check that the URL is correct.');
      }
      if (response.status === 401 || response.status === 403) {
        return failResult(
          'google_docs',
          'Cannot access this Google Doc. Make sure sharing is set to "Anyone with the link".'
        );
      }
      return failResult('google_docs', `Google Docs export returned ${response.status}`);
    }

    html = await response.text();
  } catch (error) {
    return failResult(
      'google_docs',
      `Failed to fetch Google Doc: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const content = htmlToMarkdown(html);

  // Try to extract title from the HTML
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  const title = $('title').text().replace(/ - Google Docs$/, '').trim() || undefined;

  return makeResult('google_docs', content, title);
}

// =============================================================================
// Generic Fallback Scraper (Readability-style heuristic)
// =============================================================================

async function scrapeGeneric(url: string): Promise<ScrapeResult> {
  const cheerio = await import('cheerio');

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (error) {
    return failResult('generic', `Failed to fetch page: ${error instanceof Error ? error.message : String(error)}`);
  }

  const $ = cheerio.load(html);

  // Remove script and style elements
  $('script, style, nav, header, footer, aside').remove();

  // Try article tag first
  let content = '';
  const article = $('article');
  if (article.length) {
    content = htmlToMarkdown(article.html() || '');
  }

  // Try main content area
  if (!content) {
    const main = $('main');
    if (main.length) {
      content = htmlToMarkdown(main.html() || '');
    }
  }

  // Collect all substantial paragraphs (Readability heuristic)
  if (!content) {
    content = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 50)
      .join('\n\n');
  }

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    undefined;

  return makeResult('generic', content, title);
}

// =============================================================================
// Cache (1-hour TTL, in-memory)
// =============================================================================

const cache = new Map<string, { result: ScrapeResult; expiry: number }>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiry <= now) cache.delete(key);
  }
}, 10 * 60 * 1000);

// =============================================================================
// Router — Public API
// =============================================================================

export async function scrapePublication(url: string): Promise<ScrapeResult> {
  // Check cache
  const cacheKey = createHash('md5').update(url).digest('hex');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    logger.info('[PublicationScraper] Cache hit', { hasUrl: true });
    return cached.result;
  }

  const platform = detectPlatform(url);

  logger.info('[PublicationScraper] Scraping publication', {
    platform,
    hasUrl: true,
  });

  let result: ScrapeResult;
  switch (platform) {
    case 'linkedin':
      result = await scrapeLinkedIn(url);
      break;
    case 'medium':
      result = await scrapeMedium(url);
      break;
    case 'substack':
      result = await scrapeSubstack(url);
      break;
    case 'reddit':
      result = await scrapeReddit(url);
      break;
    case 'google_docs':
      result = await scrapeGoogleDocs(url);
      break;
    default:
      result = await scrapeGeneric(url);
      break;
  }

  // Cache successful results for 1 hour
  if (result.success) {
    cache.set(cacheKey, { result, expiry: Date.now() + 60 * 60 * 1000 });
  }

  logger.info('[PublicationScraper] Scrape complete', {
    platform,
    success: result.success,
    wordCount: result.wordCount,
  });

  return result;
}
