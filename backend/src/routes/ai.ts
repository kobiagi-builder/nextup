/**
 * AI Routes
 *
 * REST endpoints for AI chat and content generation.
 */

import { Router } from 'express'
import * as aiController from '../controllers/ai.controller.js'
import { perMinuteLimit, dailyPipelineLimit } from '../middleware/rateLimiter.js'

export const aiRouter = Router()

// Health check
aiRouter.get('/health', aiController.healthCheck)

// Chat endpoints (rate limited per user)
aiRouter.post('/chat', perMinuteLimit, aiController.chat)
aiRouter.post('/chat/stream', perMinuteLimit, aiController.streamChat)

// Content generation (stricter daily limit)
aiRouter.post('/generate', dailyPipelineLimit, aiController.generateContent)
