import { Router } from 'express'
import { healthRouter } from './health.js'
import { aiRouter } from './ai.js'
import artifactResearchRouter from './artifactResearch.routes.js'
import { logFrontend } from '../lib/logger.js'

export const router = Router()

// Health check
router.use('/health', healthRouter)

// AI endpoints
router.use('/ai', aiRouter)

// Artifact research endpoints
router.use('/artifacts', artifactResearchRouter)

// Frontend logging endpoint - captures all FE logs to the debug file
router.post('/log', (req, res) => {
  const { level, message, data } = req.body
  logFrontend(level || 'log', message || 'No message', data)
  res.status(200).json({ ok: true })
})
