import { Router } from 'express'
import { healthRouter } from './health.js'
import { aiRouter } from './ai.js'
import { customerAiRouter } from './customer-ai.js'
import artifactResearchRouter from './artifactResearch.routes.js'
import writingExamplesRouter from './writingExamples.routes.js'
import customersRouter from './customers.js'
import { actionItemsBoardRouter } from './action-items-board.js'
import icpSettingsRouter from './icp-settings.js'
import onboardingRouter from './onboarding.js'
import { attachmentRouter } from './attachments.js'
import { authRouter } from './auth.routes.js'
import { requireAuth } from '../middleware/auth.js'
import { requireFeature } from '../middleware/requireFeature.js'
import { createRateLimiter } from '../middleware/rateLimiter.js'
import { logFrontend } from '../lib/logger.js'
import { z } from 'zod'

export const router = Router()

// Log entry validation schema
const logSchema = z.object({
  level: z.enum(['log', 'info', 'warn', 'error', 'debug']).optional(),
  message: z.string().max(1000).optional(),
  data: z.record(z.unknown()).optional(),
})

// Public routes (no auth)
router.use('/health', healthRouter)
router.post('/log', requireAuth, createRateLimiter({ windowMs: 60000, maxRequests: 30 }), (req, res) => {
  const parsed = logSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid log entry' })
  logFrontend(parsed.data.level || 'log', parsed.data.message || 'No message', parsed.data.data)
  res.status(200).json({ ok: true })
})

// Authenticated routes — requireAuth applied at mount level
router.use('/auth', requireAuth, authRouter)
router.use('/ai', requireAuth, aiRouter)
router.use('/ai/customer/chat', requireAuth, requireFeature('customer_management'), customerAiRouter)
router.use('/artifacts', requireAuth, artifactResearchRouter)
router.use('/user/writing-examples', requireAuth, writingExamplesRouter)
router.use('/customers', requireAuth, requireFeature('customer_management'), customersRouter)
router.use('/action-items', requireAuth, requireFeature('action_items_kanban'), actionItemsBoardRouter)
router.use('/icp-settings', requireAuth, requireFeature('customer_management'), icpSettingsRouter)
router.use('/onboarding', requireAuth, onboardingRouter)
router.use('/ai/attachments', requireAuth, attachmentRouter)
