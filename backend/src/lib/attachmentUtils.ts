/**
 * Attachment Utilities
 *
 * Shared helpers for converting file attachments into multimodal
 * content arrays compatible with the Vercel AI SDK v6.
 */

import type { ProcessedAttachment } from '../types/attachment.js'

/**
 * Build multimodal AI messages from simple text messages + attachments.
 *
 * If attachments are present, the last user message is converted from a plain
 * string to an array of content parts so the LLM can see images, PDFs, etc.
 *
 * Content part mapping (AI SDK v6 uses `mediaType`, not `mimeType`):
 *  - image  → { type: 'image', image: base64, mediaType }
 *  - document (PDF/DOCX) → { type: 'file', data: base64, mediaType }
 *  - text (CSV/txt/md) → prepended as a text block before the user's message
 */
export function buildMultimodalMessages(
  messages: Array<{ role: string; content: string }>,
  attachments?: ProcessedAttachment[],
): Array<{ role: string; content: string | Array<Record<string, unknown>> }> {
  // Always filter out messages with empty content — the Anthropic API rejects
  // empty text content blocks (e.g. assistant tool-call-only messages
  // that were converted to content: '' by convertToSimpleMessage).
  // This must run BEFORE the early return to cover non-attachment requests too.
  const filtered = messages.filter((msg) => msg.content?.trim())

  if (!attachments || attachments.length === 0) {
    return filtered
  }

  // Clone messages array, only modifying the last user message
  const result = filtered.map((msg, index) => {
    // Only transform the last user message (which has the attachments)
    const isLastUser =
      msg.role === 'user' &&
      index === filtered.length - 1

    if (!isLastUser) {
      return msg
    }

    // Build content parts array
    const parts: Array<Record<string, unknown>> = []

    // Add attachment content parts
    for (const att of attachments) {
      switch (att.type) {
        case 'image':
          if (att.data) {
            parts.push({
              type: 'image',
              image: att.data,
              mediaType: att.mimeType,
            })
          }
          break

        case 'document':
          if (att.data) {
            parts.push({
              type: 'file',
              data: att.data,
              mediaType: att.mimeType,
            })
          }
          break

        case 'text':
          if (att.content) {
            parts.push({
              type: 'text',
              text: `[Attached file: ${att.fileName}]\n${att.content}`,
            })
          }
          break
      }
    }

    // Add the user's text message as the final part
    if (msg.content?.trim()) {
      parts.push({ type: 'text', text: msg.content })
    }

    // Ensure at least one text part exists (API requires it for context)
    const hasTextPart = parts.some((p) => p.type === 'text')
    if (!hasTextPart) {
      parts.push({ type: 'text', text: 'See the attached file.' })
    }

    return { role: msg.role, content: parts }
  })

  return result
}
