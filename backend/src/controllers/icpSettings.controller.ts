/**
 * ICP Settings Controller
 *
 * Handles GET and PUT for user-level ICP settings.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { IcpSettingsService } from '../services/IcpSettingsService.js'

// =============================================================================
// Validation
// =============================================================================

const upsertIcpSettingsSchema = z.object({
  target_employee_min: z.number().int().min(0).nullable().optional(),
  target_employee_max: z.number().int().min(0).nullable().optional(),
  target_industries: z.array(z.string().max(100)).max(20).optional(),
  target_specialties: z.array(z.string().max(100)).max(50).optional(),
  description: z.string().max(2000).optional(),
  weight_quantitative: z.number().int().min(0).max(100).optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): IcpSettingsService {
  return new IcpSettingsService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/icp-settings
 */
export const getIcpSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const service = getService()
    const settings = await service.getByUserId(userId)

    res.json({ data: settings })
  } catch (error) {
    logger.error('[IcpSettingsController] Error getting settings', {
      sourceCode: 'getIcpSettings',
      hasError: true,
    })
    res.status(500).json({ error: 'Failed to fetch ICP settings' })
  }
}

/**
 * PUT /api/icp-settings
 */
export const upsertIcpSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const parsed = upsertIcpSettingsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const service = getService()
    const settings = await service.upsert(userId, parsed.data)

    res.json({ data: settings })
  } catch (error) {
    logger.error('[IcpSettingsController] Error upserting settings', {
      sourceCode: 'upsertIcpSettings',
      hasError: true,
    })
    res.status(500).json({ error: 'Failed to save ICP settings' })
  }
}
