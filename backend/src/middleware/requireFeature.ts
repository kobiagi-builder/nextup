import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { ApiError } from './errorHandler.js'

/**
 * Middleware factory that checks if a feature flag is active for the authenticated user.
 * Must be used AFTER requireAuth (requires req.user.id).
 *
 * Usage: router.use('/customers', requireAuth, requireFeature('customer_management'), customersRouter)
 */
export function requireFeature(featureName: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new ApiError('Authentication required', 401)
      }

      const { data, error } = await supabaseAdmin.rpc('is_feature_active', {
        p_uid: req.user.id,
        p_feature_name: featureName,
      })

      if (error || !data) {
        throw new ApiError('Feature not available for your account', 403)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
