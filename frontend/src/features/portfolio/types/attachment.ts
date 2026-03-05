/**
 * Attachment Types
 *
 * Type definitions for file attachments in chat messages.
 */

/** Processed attachment ready to be sent with a chat message */
export interface ProcessedAttachment {
  /** Discriminator for how the content should be handled by the LLM */
  type: 'image' | 'document' | 'text'
  /** Base64-encoded file data (for images and PDFs) */
  data?: string
  /** Extracted text content (for CSV, text, markdown files) */
  content?: string
  /** MIME type of the original file */
  mimeType: string
  /** Original file name */
  fileName: string
  /** File size in bytes */
  fileSize: number
}
