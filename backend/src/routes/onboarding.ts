/**
 * Onboarding Routes
 *
 * GET  /progress         — Get onboarding progress
 * PUT  /progress         — Update onboarding progress
 * POST /extract-profile  — Start profile extraction (rate limited)
 */

import { Router } from 'express'
import { createRateLimiter } from '../middleware/rateLimiter.js'
import * as controller from '../controllers/onboarding.controller.js'

const router = Router()

// Rate limit extraction: 10 requests per hour (expensive AI operation)
const extractionLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many extraction requests. Please wait before trying again.',
})

router.get('/progress', controller.getProgress)
router.put('/progress', controller.saveProgress)
router.post('/extract-profile', extractionLimit, controller.extractProfileHandler)

export default router
