/**
 * Auth Controller
 *
 * Handles auth-related endpoints (data migration).
 */

import type { Request, Response, NextFunction } from 'express'
import { migrateDataToUser } from '../services/dataMigration.js'
import { logger } from '../lib/logger.js'

/**
 * POST /api/auth/migrate-data
 *
 * Migrate placeholder data to the authenticated user.
 * Idempotent — safe to call multiple times.
 */
export async function migrateData(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const result = await migrateDataToUser(userId)

    logger.info('[AuthController] Data migration request', {
      migrated: result.migrated,
      tableCount: result.tablesUpdated.length,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
}
