/**
 * Onboarding Controller
 *
 * Handles onboarding progress CRUD and profile extraction.
 *
 * Endpoints:
 * - GET  /api/onboarding/progress       — Get current user's progress (or null)
 * - PUT  /api/onboarding/progress       — Upsert progress (step_data, current_step, completed_at)
 * - POST /api/onboarding/extract-profile — Start background extraction (returns 202)
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase, getUserId } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { extractProfile } from '../services/ProfileExtractionService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const saveProgressSchema = z.object({
  current_step: z.number().int().min(0).max(5).optional(),
  step_data: z.record(z.unknown()).optional(),
  completed_at: z.string().datetime().optional().nullable(),
})

const extractProfileSchema = z
  .object({
    websiteUrl: z.string().url().optional(),
    linkedInUrl: z.string().url().optional(),
    pastedText: z.string().max(10000).optional(),
  })
  .refine(
    (data) => data.websiteUrl || data.linkedInUrl || data.pastedText,
    { message: 'At least one of websiteUrl, linkedInUrl, or pastedText is required' }
  )

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/onboarding/progress
 * Returns the current user's onboarding row, or { progress: null } if no row exists.
 */
export const getProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      logger.error('[OnboardingController] Error fetching progress', {
        sourceCode: 'getProgress',
        hasError: true,
      })
      res.status(500).json({ error: 'Failed to fetch onboarding progress' })
      return
    }

    res.json({ progress: data })
  } catch (error) {
    logger.error('[OnboardingController] Error in getProgress', {
      sourceCode: 'getProgress',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * PUT /api/onboarding/progress
 * Upserts onboarding progress. Writes current_step, step_data, completed_at.
 * NEVER writes extraction_results (that's only written by extractProfile).
 */
export const saveProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const parsed = saveProgressSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('onboarding_progress')
      .upsert(
        {
          user_id: userId,
          ...parsed.data,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      logger.error('[OnboardingController] Error saving progress', {
        sourceCode: 'saveProgress',
        hasError: true,
      })
      res.status(500).json({ error: 'Failed to save onboarding progress' })
      return
    }

    res.json({ progress: data })
  } catch (error) {
    logger.error('[OnboardingController] Error in saveProgress', {
      sourceCode: 'saveProgress',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * POST /api/onboarding/extract-profile
 * Starts background profile extraction. Returns 202 immediately.
 * Writes extraction_results to DB when extraction completes or fails.
 */
export const extractProfileHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const parsed = extractProfileSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    // Capture supabase client BEFORE responding (stays valid after AsyncLocalStorage context ends)
    const supabase = getSupabase()

    // Ensure an onboarding row exists (don't overwrite extraction_results if row already exists)
    await supabase
      .from('onboarding_progress')
      .upsert(
        { user_id: userId },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )

    // Respond immediately
    res.status(202).json({ message: 'Extraction started', status: 'extracting' })

    // Fire-and-forget background extraction
    const { websiteUrl, linkedInUrl, pastedText } = parsed.data
    ;(async () => {
      try {
        const results = await extractProfile(websiteUrl, linkedInUrl, pastedText)

        await supabase
          .from('onboarding_progress')
          .update({ extraction_results: results })
          .eq('user_id', userId)

        logger.info('[OnboardingController] Extraction completed in background', {
          hasResults: !!results && !results.__error,
        })
      } catch (err) {
        logger.error('[OnboardingController] Background extraction failed', {
          sourceCode: 'extractProfile:background',
          error: err instanceof Error ? err : new Error(String(err)),
        })

        await supabase
          .from('onboarding_progress')
          .update({
            extraction_results: { __error: true, __message: 'Extraction failed' },
          })
          .eq('user_id', userId)
      }
    })()
  } catch (error) {
    logger.error('[OnboardingController] Error in extractProfile', {
      sourceCode: 'extractProfile',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}
