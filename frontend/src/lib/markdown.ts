/**
 * Markdown Utilities
 *
 * Converts between markdown and HTML for Tiptap editor.
 */

import { marked } from 'marked'
import TurndownService from 'turndown'
import { logger } from '@/lib/logger'

// Configure marked at module level (not per-call)
marked.use({ gfm: true, breaks: true })

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

/**
 * Convert markdown to HTML
 *
 * Used for AI-generated content skeletons that come in markdown format.
 * Preserves formatting (headings, lists, bold, italic) while converting to HTML.
 */
export function markdownToHTML(markdown: string): string {
  if (!markdown) return ''

  try {
    return marked.parse(markdown, { async: false }) as string
  } catch (error) {
    logger.error('[markdownToHTML] Failed to convert markdown', {
      hasError: !!error,
    })
    return markdown
  }
}

/**
 * Check if content appears to be markdown
 *
 * Heuristic check for common markdown patterns.
 * Used to determine if content needs conversion.
 */
export function isMarkdown(content: string): boolean {
  if (!content) return false

  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headings (# ## ###)
    /\*\*[^*]+\*\*/,          // Bold (**text**)
    /\*[^*]+\*/,              // Italic (*text*)
    /^\s*[-*+]\s/m,           // Unordered lists (- * +)
    /^\s*\d+\.\s/m,           // Ordered lists (1. 2. 3.)
    /\[[^\]]+\]\([^)]+\)/,    // Links ([text](url))
    /^>\s/m,                  // Blockquotes (>)
    /```[\s\S]*```/,          // Code blocks (```)
    /\[.*?\]/,                // Placeholders like [Write hook here]
  ]

  return markdownPatterns.some((pattern) => pattern.test(content))
}

/**
 * Convert HTML to Markdown
 *
 * Used by customer artifact editor to convert TipTap HTML back to Markdown for storage.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  try {
    return turndownService.turndown(html)
  } catch {
    return html
  }
}
