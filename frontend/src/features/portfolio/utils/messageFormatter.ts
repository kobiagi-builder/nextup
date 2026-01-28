/**
 * Message Formatter Utility
 *
 * Parses and formats assistant chat messages for better readability.
 * Splits single text blobs into logical message segments with proper spacing.
 */

// =============================================================================
// Types
// =============================================================================

export interface MessageSegment {
  /** Unique ID for the segment */
  id: string
  /** The formatted text content */
  text: string
  /** Segment type (helps with styling) */
  type: 'action' | 'explanation' | 'result'
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Phrases that typically start a new message segment
 * Only includes strong transition indicators, not generic sentence starters
 */
const SEGMENT_STARTERS = [
  "I'll ",
  "I will ",
  "Let me ",
  "Perfect!",
  "Great!",
  "Excellent!",
  "Done!",
  "All set!",
  "Now ",
  "Next,",
  "First,",
  "Second,",
  "Third,",
  "Finally,",
]

/**
 * Phrases that indicate a result or completion
 */
const RESULT_INDICATORS = [
  "Perfect!",
  "Great!",
  "Excellent!",
  "Done!",
  "All set!",
  "Successfully",
  "Complete",
  "Finished",
  "Ready",
]

/**
 * Phrases that indicate an action being taken
 */
const ACTION_INDICATORS = [
  "I'll ",
  "I will ",
  "Let me ",
  "I'm going to",
  "I'm ",
  "Now ",
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a string starts with any of the given phrases (case-insensitive)
 */
function startsWithAny(text: string, phrases: string[]): boolean {
  const lowerText = text.trim().toLowerCase()
  return phrases.some((phrase) => lowerText.startsWith(phrase.toLowerCase()))
}

/**
 * Checks if a string contains any of the given phrases (case-insensitive)
 */
function containsAny(text: string, phrases: string[]): boolean {
  const lowerText = text.toLowerCase()
  return phrases.some((phrase) => lowerText.includes(phrase.toLowerCase()))
}

/**
 * Determines the segment type based on content
 * Priority: Action indicators at start > Result indicators anywhere > Default explanation
 */
function getSegmentType(text: string): MessageSegment['type'] {
  // Priority 1: If text starts with action indicator, it's an action
  // This prevents false positives from words like "complete" appearing mid-sentence
  if (startsWithAny(text, ACTION_INDICATORS)) {
    return 'action'
  }

  // Priority 2: If text contains result indicators, it's a result
  if (containsAny(text, RESULT_INDICATORS)) {
    return 'result'
  }

  // Default: explanation
  return 'explanation'
}

/**
 * Adds proper spacing between sentences in a paragraph
 */
function formatParagraph(text: string): string {
  // Only add line breaks for longer content (more than one sentence)
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/)

  if (sentences.length <= 1) {
    // Short content - no extra formatting needed
    return text.trim()
  }

  // For multiple sentences, add line breaks between them
  return text
    .replace(/\.\s+([A-Z])/g, '.\n\n$1') // Add double newline after sentences
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines to max 2
    .trim()
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Parses a message into logical segments with proper formatting
 *
 * @param content - The raw message content
 * @returns Array of formatted message segments
 *
 * @example
 * Input: "I'll create that content for you.Let me try to complete..."
 * Output: [
 *   { id: "seg-0", text: "I'll create that content for you.", type: "action" },
 *   { id: "seg-1", text: "Let me try to complete...", type: "action" }
 * ]
 */
export function parseMessageSegments(content: string): MessageSegment[] {
  if (!content || typeof content !== 'string') {
    return []
  }

  const segments: MessageSegment[] = []
  let currentSegment = ''
  let segmentCount = 0

  // First, normalize the content: add space after periods that don't have one
  const normalized = content.replace(/\.([A-Z])/g, '. $1')

  // Split on sentence boundaries (period/exclamation/question + space + capital letter)
  const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-Z])/)

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue

    // Check if this sentence starts a new segment
    const isNewSegmentStart = startsWithAny(trimmedSentence, SEGMENT_STARTERS)

    if (isNewSegmentStart && currentSegment) {
      // Save the current segment and start a new one
      const formattedText = formatParagraph(currentSegment)
      if (formattedText) {
        segments.push({
          id: `seg-${segmentCount++}`,
          text: formattedText,
          type: getSegmentType(formattedText),
        })
      }
      currentSegment = trimmedSentence
    } else {
      // Add to current segment
      currentSegment += (currentSegment ? ' ' : '') + trimmedSentence
    }
  }

  // Add the last segment
  if (currentSegment) {
    const formattedText = formatParagraph(currentSegment)
    if (formattedText) {
      segments.push({
        id: `seg-${segmentCount++}`,
        text: formattedText,
        type: getSegmentType(formattedText),
      })
    }
  }

  // If no segments were created (no clear boundaries), return the whole content as one segment
  if (segments.length === 0 && content.trim()) {
    segments.push({
      id: 'seg-0',
      text: formatParagraph(content),
      type: 'explanation',
    })
  }

  return segments
}

// =============================================================================
// Export
// =============================================================================

export default parseMessageSegments
