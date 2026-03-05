/**
 * Shared URL Fetch Tool
 *
 * Allows agents to fetch content from URLs (web pages, Google Docs, etc.).
 * Google Docs URLs are auto-converted to plain-text export format.
 * Available to both customer-mgmt and product-mgmt agents.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { logToFile } from '../../../../lib/logger.js'

/**
 * Detect Google Docs URL and convert to plain-text export URL.
 * Supports /edit, /view, and bare document URLs.
 */
function toGoogleDocsExportUrl(url: string): string | null {
  const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return null
  return `https://docs.google.com/document/d/${match[1]}/export?format=txt`
}

/**
 * Strip HTML tags and decode common entities to get readable text.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function createFetchUrlTool() {
  return {
    fetchUrlContent: tool({
      description:
        'Fetch text content from a URL. Supports web pages and Google Docs (shared links). ' +
        'For Google Docs, the document must be shared as "Anyone with the link can view". ' +
        'Use this when the user provides a link to a document, transcript, article, or any web resource.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL to fetch content from'),
      }),
      execute: async ({ url }) => {
        logToFile('TOOL EXECUTED: fetchUrlContent', { url: url.substring(0, 60) + '...' })

        try {
          // Google Docs: convert to plain-text export
          const exportUrl = toGoogleDocsExportUrl(url)
          const fetchUrl = exportUrl || url

          logToFile('fetchUrlContent: fetching', {
            isGoogleDocs: !!exportUrl,
            fetchUrl: fetchUrl.substring(0, 80),
          })

          const response = await fetch(fetchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)',
              'Accept': 'text/html,text/plain,application/json,*/*',
            },
            signal: AbortSignal.timeout(15000),
          })

          if (!response.ok) {
            const hint = exportUrl
              ? ' Make sure the Google Doc is shared as "Anyone with the link can view".'
              : ''
            return {
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}.${hint}`,
            }
          }

          const contentType = response.headers.get('content-type') || ''
          const raw = await response.text()

          // Google Docs export returns plain text; web pages return HTML
          const text = contentType.includes('text/html') ? htmlToText(raw) : raw

          // Truncate to ~100k chars to stay within reasonable token budget
          const MAX_CHARS = 100_000
          const truncated = text.length > MAX_CHARS
          const content = truncated ? text.slice(0, MAX_CHARS) : text

          logToFile('fetchUrlContent: success', {
            chars: content.length,
            truncated,
            contentType: contentType.substring(0, 40),
          })

          return {
            success: true,
            content,
            source: url,
            truncated,
            charCount: content.length,
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          logToFile('fetchUrlContent: error', { error: message })

          if (message.includes('timeout') || message.includes('abort')) {
            return { success: false, error: 'Request timed out after 15 seconds. The URL may be unreachable.' }
          }

          return { success: false, error: `Failed to fetch URL: ${message}` }
        }
      },
    }),
  }
}
