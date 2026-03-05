/**
 * Attachment Routes
 *
 * File upload processing for chat attachments.
 */

import { Router } from 'express'
import multer from 'multer'
import { processAttachment } from '../controllers/attachment.controller.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

export const attachmentRouter = Router()

// POST /api/ai/attachments/process — process a single file upload
attachmentRouter.post('/process', upload.single('file'), processAttachment)
