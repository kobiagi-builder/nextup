import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin, createClientWithAuth } from '../lib/supabase.js'
import { ApiError } from './errorHandler.js'
import { requestContextStorage } from '../lib/requestContext.js'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email?: string
      }
      accessToken?: string
    }
  }
}

/**
 * Middleware to verify Supabase JWT token
 * Extracts user from Authorization header and attaches to request
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Missing or invalid authorization header', 401)
    }

    const token = authHeader.split(' ')[1]

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      throw new ApiError('Invalid or expired token', 401)
    }

    // Attach user and token to request
    req.user = {
      id: user.id,
      email: user.email,
    }
    req.accessToken = token

    // Create user-scoped Supabase client and run downstream in AsyncLocalStorage context
    const supabase = createClientWithAuth(token)
    requestContextStorage.run({ supabase, userId: user.id }, () => next())
  } catch (error) {
    next(error)
  }
}

/**
 * Optional auth - attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
        }
        req.accessToken = token
      }
    }

    next()
  } catch {
    // Silently continue without auth
    next()
  }
}
