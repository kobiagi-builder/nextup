/**
 * Attachment Controller
 *
 * Handles file upload processing for chat attachments.
 * Accepts multipart file uploads, extracts/processes content,
 * and returns structured data for inclusion in chat messages.
 */

import type { Request, Response } from 'express'
import { parse } from 'csv-parse/sync'
import mammoth from 'mammoth'
import { logger } from '../lib/logger.js'
import type { ProcessedAttachment } from '../types/attachment.js'

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Text
  'text/csv',
  'text/plain',
  'text/markdown',
  'application/csv',
])

// =============================================================================
// Controller
// =============================================================================

/**
 * Process an uploaded file for chat attachment.
 *
 * Multer middleware must be applied before this handler
 * to populate req.file with the uploaded file data.
 */
export async function processAttachment(req: Request, res: Response) {
  try {
    const file = req.file

    if (!file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` })
      return
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      res.status(400).json({
        error: `Unsupported file type: ${file.mimetype}. Supported: images, PDF, Word, CSV, text files.`,
      })
      return
    }

    logger.debug('[Attachment] Processing file', {
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    })

    let result: ProcessedAttachment

    if (file.mimetype.startsWith('image/')) {
      // Images: return base64 for Claude multimodal
      result = {
        type: 'image',
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
      }
    } else if (file.mimetype === 'application/pdf') {
      // PDFs: return base64 for Claude document understanding
      result = {
        type: 'document',
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
      }
    } else if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // DOCX: extract text with mammoth (Anthropic doesn't support DOCX natively)
      const { value: extractedText } = await mammoth.extractRawText({ buffer: file.buffer })
      result = {
        type: 'text',
        content: `[Word document: ${file.originalname}]\n${extractedText.slice(0, 50000)}`,
        mimeType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
      }
    } else if (file.mimetype === 'text/csv' || file.mimetype === 'application/csv') {
      // CSV: parse and format as structured text
      const csvText = file.buffer.toString('utf-8')
      const formattedContent = formatCsvContent(csvText, file.originalname)

      result = {
        type: 'text',
        content: formattedContent,
        mimeType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
      }
    } else {
      // Text/Markdown: read as UTF-8
      const textContent = file.buffer.toString('utf-8')

      result = {
        type: 'text',
        content: textContent.slice(0, 50000), // Cap at 50k chars
        mimeType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
      }
    }

    res.json({ success: true, ...result })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('[Attachment] Processing failed', { error: errorMessage })
    res.status(500).json({ error: 'Failed to process file' })
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse CSV and format as a readable text table for the LLM.
 */
function formatCsvContent(csvText: string, fileName: string): string {
  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[]

    if (records.length === 0) {
      return `[CSV file: ${fileName}]\n(empty file)`
    }

    const columns = Object.keys(records[0])
    const header = `[CSV file: ${fileName} — ${records.length} rows, ${columns.length} columns]\n`
    const columnList = `Columns: ${columns.join(', ')}\n\n`

    // Format first 200 rows as readable text (cap to avoid huge payloads)
    const maxRows = Math.min(records.length, 200)
    const rows = records.slice(0, maxRows).map((row, i) => {
      const values = columns.map((col) => `${col}: ${row[col] || ''}`).join(' | ')
      return `Row ${i + 1}: ${values}`
    }).join('\n')

    const truncation = records.length > maxRows
      ? `\n\n(Showing first ${maxRows} of ${records.length} rows)`
      : ''

    return header + columnList + rows + truncation
  } catch {
    // If CSV parsing fails, return raw text
    return `[CSV file: ${fileName}]\n${csvText.slice(0, 50000)}`
  }
}
