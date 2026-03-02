/**
 * LinkedIn Import Controller
 *
 * Handles CSV file upload for LinkedIn connections import.
 * Uses multer for multipart processing and createClientWithAuth
 * for Supabase client (AsyncLocalStorage breaks after multer).
 *
 * Streams progress via NDJSON (newline-delimited JSON) so the
 * frontend can show a real progress bar.
 */

import { Request, Response } from 'express'
import multer from 'multer'
import { createClientWithAuth } from '../lib/supabase.js'
import { logger } from '../lib/logger.js'
import { LinkedInImportService } from '../services/LinkedInImportService.js'

// =============================================================================
// Multer Configuration
// =============================================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() || '')
    if (file.mimetype === 'text/csv' || ext === '.csv') {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are accepted'))
    }
  },
})

export const uploadMiddleware = upload.single('file')

// =============================================================================
// POST /api/customers/import/linkedin
// =============================================================================

export const importLinkedInConnections = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const file = req.file

    if (!userId || !req.accessToken) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' })
      return
    }

    if (!file) {
      res.status(400).json({ error: 'Validation error', message: 'No CSV file provided' })
      return
    }

    logger.debug('[LinkedInImport] Processing upload', {
      fileSizeKB: Math.round(file.size / 1024),
      mimeType: file.mimetype,
    })

    // Stream NDJSON progress events
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.flushHeaders()

    // AsyncLocalStorage context is broken after multer — use createClientWithAuth
    const supabase = createClientWithAuth(req.accessToken)
    const service = new LinkedInImportService(supabase)

    const result = await service.import(file.buffer, (event) => {
      res.write(JSON.stringify({ type: 'progress', ...event }) + '\n')
    })

    // Write final result as last line
    res.write(JSON.stringify({ type: 'result', data: result }) + '\n')
    res.end()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // CSV format errors → 400
    if (message.includes('Invalid CSV format') || message.includes('Missing columns')) {
      // If headers already sent (streaming started), write error as NDJSON
      if (res.headersSent) {
        res.write(JSON.stringify({ type: 'error', message }) + '\n')
        res.end()
        return
      }
      res.status(400).json({ error: 'Invalid CSV', message })
      return
    }

    logger.error('[LinkedInImport] Error in importLinkedInConnections', {
      sourceCode: 'importLinkedInConnections',
      error: error instanceof Error ? error : new Error(String(error)),
    })

    if (res.headersSent) {
      res.write(JSON.stringify({ type: 'error', message: 'Failed to process LinkedIn import' }) + '\n')
      res.end()
      return
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process LinkedIn import',
    })
  }
}
