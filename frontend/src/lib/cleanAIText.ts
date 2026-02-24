/**
 * Clean AI Text
 *
 * Lightweight frontend safety net that catches mechanical AI patterns
 * the system prompt didn't prevent. Applied to plain-text chat messages only.
 * Never applied to structured data, JSON, or tool results.
 */

/**
 * Mechanical cleanup of common AI text artifacts.
 * This is a safety net — the system prompt handles the heavy lifting.
 */
export function cleanAIText(text: string): string {
  if (!text) return ''

  let cleaned = text

  // Curly quotes → straight quotes
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"')
  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'")

  // Strip trailing chatbot pleasantries (full line match only)
  cleaned = cleaned.replace(
    /\n\s*(Let me know if you('d| would) like.*|I hope this helps.*|Feel free to ask.*|Don't hesitate to.*|Happy to help.*)\s*$/gi,
    ''
  )

  // Strip leading sycophancy (only at very start of message)
  cleaned = cleaned.replace(
    /^(Great question!\s*|Absolutely!\s*|Of course!\s*|Certainly!\s*|That's a great point!\s*)/i,
    ''
  )

  // Em dash used for dramatic pauses → comma (only mid-sentence, not in code)
  // Match: word — word (dramatic pause pattern)
  cleaned = cleaned.replace(/(\w)\s*—\s*(\w)/g, '$1, $2')

  return cleaned.trim()
}
