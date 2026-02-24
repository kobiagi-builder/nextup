/**
 * Auth Routes
 *
 * Auth-specific endpoints. requireAuth is applied at the router-mount level
 * in routes/index.ts, so all routes here are already authenticated.
 */

import { Router } from 'express'
import { migrateData } from '../controllers/auth.controller.js'

export const authRouter = Router()

// POST /api/auth/migrate-data — reassign placeholder data to authenticated user
authRouter.post('/migrate-data', migrateData)
