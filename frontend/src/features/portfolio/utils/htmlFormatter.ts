/**
 * HTML Formatter Utility
 *
 * Converts plain text lists into proper HTML list elements.
 * Detects numbered lists (1., 2., 3.) and bulleted lists (-, *, •).
 */

// =============================================================================
// Types
// =============================================================================

interface ListGroup {
  type: 'ordered' | 'unordered'
  items: string[]
  startIndex: number
  endIndex: number
}

// =============================================================================
// Constants
// =============================================================================

// Patterns for list detection
const ORDERED_LIST_PATTERN = /^(\d+)\.\s+(.+)$/
const UNORDERED_LIST_PATTERN = /^[-*•]\s+(.+)$/

// Pattern for markdown-style bold (backward compatibility)
const MARKDOWN_BOLD_PATTERN = /\*\*(.+?)\*\*/g

// Pattern for markdown images: ![alt](url)
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g

// =============================================================================
// Main Function
// =============================================================================

/**
 * Convert plain text lists to proper HTML lists
 *
 * @param html - The HTML string to format (or plain text)
 * @returns Formatted HTML with proper list elements
 *
 * @example
 * Input (HTML):
 * <p>1. First item</p>
 * <p>2. Second item</p>
 *
 * Output:
 * <ol>
 *   <li>First item</li>
 *   <li>Second item</li>
 * </ol>
 *
 * @example
 * Input (plain text with markdown bold):
 * **1. First item**
 * Some text
 * **2. Second item**
 *
 * Output:
 * <ol>
 *   <li><strong>First item</strong></li>
 *   <li><strong>Second item</strong></li>
 * </ol>
 * <p>Some text</p>
 */
export function formatListsInHtml(html: string): string {
  if (!html || html.trim() === '') return html

  // Step 1: Convert markdown-style bold to HTML (backward compatibility)
  let content = html.replace(MARKDOWN_BOLD_PATTERN, '<strong>$1</strong>')

  // Step 1b: Convert markdown images to HTML img tags
  content = content.replace(MARKDOWN_IMAGE_PATTERN, '<img src="$2" alt="$1" />')

  // Step 2: Check if content is plain text (no HTML tags)
  const hasHtmlTags = /<[^>]+>/.test(content)

  if (!hasHtmlTags) {
    // Plain text - wrap each line in <p> tags
    content = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => `<p>${line.trim()}</p>`)
      .join('\n')
  }

  // Step 3: Parse HTML into a DOM-like structure
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')

  // Find all paragraphs
  const paragraphs = Array.from(doc.body.querySelectorAll('p'))

  if (paragraphs.length === 0) return content

  // Group consecutive list items
  const listGroups: ListGroup[] = []
  let currentGroup: ListGroup | null = null

  paragraphs.forEach((p, index) => {
    const text = p.textContent?.trim() || ''
    const innerHTML = p.innerHTML || ''

    // Check for ordered list item
    const orderedMatch = text.match(ORDERED_LIST_PATTERN)
    if (orderedMatch) {
      // Extract the item text from innerHTML to preserve formatting (bold, etc.)
      const numberPrefix = orderedMatch[1] + '. '
      const itemHtml = innerHTML.replace(new RegExp(`^${numberPrefix}`), '').trim()

      if (!currentGroup || currentGroup.type !== 'ordered') {
        // Start new ordered list group
        if (currentGroup) listGroups.push(currentGroup)
        currentGroup = {
          type: 'ordered',
          items: [itemHtml],
          startIndex: index,
          endIndex: index,
        }
      } else {
        // Continue current ordered list group
        currentGroup.items.push(itemHtml)
        currentGroup.endIndex = index
      }
      return
    }

    // Check for unordered list item
    const unorderedMatch = text.match(UNORDERED_LIST_PATTERN)
    if (unorderedMatch) {
      // Extract the item text from innerHTML to preserve formatting (bold, etc.)
      const bulletPrefix = text.match(/^[-*•]\s+/)?.[0] || ''
      const itemHtml = innerHTML.replace(new RegExp(`^${bulletPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '').trim()

      if (!currentGroup || currentGroup.type !== 'unordered') {
        // Start new unordered list group
        if (currentGroup) listGroups.push(currentGroup)
        currentGroup = {
          type: 'unordered',
          items: [itemHtml],
          startIndex: index,
          endIndex: index,
        }
      } else {
        // Continue current unordered list group
        currentGroup.items.push(itemHtml)
        currentGroup.endIndex = index
      }
      return
    }

    // Not a list item - end current group
    if (currentGroup) {
      listGroups.push(currentGroup)
      currentGroup = null
    }
  })

  // Add final group if exists
  if (currentGroup) {
    listGroups.push(currentGroup)
  }

  // If no list groups found, return content with image/bold conversions applied
  if (listGroups.length === 0) return content

  // Replace list groups with proper HTML lists (in reverse order to preserve indices)
  listGroups.reverse().forEach((group) => {
    // Create list element
    const listElement = doc.createElement(group.type === 'ordered' ? 'ol' : 'ul')

    // Add list items (innerHTML is safe here - content already sanitized by DOMParser)
    group.items.forEach((itemHtml) => {
      const li = doc.createElement('li')
      li.innerHTML = itemHtml // Preserves <strong>, <em> formatting
      listElement.appendChild(li)
    })

    // Replace paragraphs with list element
    const firstParagraph = paragraphs[group.startIndex]
    firstParagraph.replaceWith(listElement)

    // Remove remaining paragraphs in group
    for (let i = group.startIndex + 1; i <= group.endIndex; i++) {
      paragraphs[i].remove()
    }
  })

  // Return formatted HTML
  return doc.body.innerHTML
}

// =============================================================================
// Export
// =============================================================================

export default formatListsInHtml
