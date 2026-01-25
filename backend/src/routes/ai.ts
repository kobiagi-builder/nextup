/**
 * AI Routes
 *
 * REST endpoints for AI chat and content generation.
 */

import { Router } from 'express'
import * as aiController from '../controllers/ai.controller.js'

export const aiRouter = Router()

// Health check
aiRouter.get('/health', aiController.healthCheck)

// Chat endpoints
aiRouter.post('/chat', aiController.chat)
aiRouter.post('/chat/stream', aiController.streamChat)

// Content generation
aiRouter.post('/generate', aiController.generateContent)
