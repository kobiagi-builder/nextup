import { Router } from 'express'
import { healthRouter } from './health.js'
import { aiRouter } from './ai.js'
import artifactResearchRouter from './artifactResearch.routes.js'
import writingExamplesRouter from './writingExamples.routes.js'
import { authRouter } from './auth.routes.js'
import { requireAuth } from '../middleware/auth.js'
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
router.use('/artifacts', requireAuth, artifactResearchRouter)
router.use('/user/writing-examples', requireAuth, writingExamplesRouter)
