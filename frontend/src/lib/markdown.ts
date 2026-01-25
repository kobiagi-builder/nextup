/**
 * Markdown Utilities
 *
 * Converts markdown to HTML for Tiptap editor.
 */

import { marked } from 'marked'

/**
 * Convert markdown to HTML
 *
 * Used for AI-generated content skeletons that come in markdown format.
 * Preserves formatting (headings, lists, bold, italic) while converting to HTML.
 */
export function markdownToHTML(markdown: string): string {
  if (!markdown) return ''

  try {
    // Configure marked options
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert \n to <br>
    })

    // Convert markdown to HTML
    const html = marked(markdown)

    return html as string
  } catch (error) {
    console.error('[markdownToHTML] Failed to convert markdown:', error)
    // Fallback: return as-is if conversion fails
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
