import { Router } from 'express'
import { healthRouter } from './health.js'
import { aiRouter } from './ai.js'
import { customerAiRouter } from './customer-ai.js'
import artifactResearchRouter from './artifactResearch.routes.js'
import writingExamplesRouter from './writingExamples.routes.js'
import customersRouter from './customers.js'
import icpSettingsRouter from './icp-settings.js'
import { authRouter } from './auth.routes.js'
import { requireAuth } from '../middleware/auth.js'
import { requireFeature } from '../middleware/requireFeature.js'
import { logFrontend } from '../lib/logger.js'

export const router = Router()

// Public routes (no auth)
router.use('/health', healthRouter)
router.post('/log', (req, res) => {
  const { level, message, data } = req.body
  logFrontend(level || 'log', message || 'No message', data)
  res.status(200).json({ ok: true })
})

// Authenticated routes — requireAuth applied at mount level
router.use('/auth', requireAuth, authRouter)
router.use('/ai', requireAuth, aiRouter)
router.use('/ai/customer/chat', requireAuth, requireFeature('customer_management'), customerAiRouter)
router.use('/artifacts', requireAuth, artifactResearchRouter)
router.use('/user/writing-examples', requireAuth, writingExamplesRouter)
router.use('/customers', requireAuth, requireFeature('customer_management'), customersRouter)
router.use('/icp-settings', requireAuth, requireFeature('customer_management'), icpSettingsRouter)
