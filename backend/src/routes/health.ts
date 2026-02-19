import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { logger } from '../lib/logger.js'

export const healthRouter = Router()

/**
 * Categorize Supabase errors for better diagnostics.
 * Returns a structured object with status and reason.
 */
function categorizeSupabaseError(error: unknown): {
  status: 'paused' | 'unreachable' | 'auth_failed' | 'unhealthy'
  reason: string
} {
  // Supabase PostgREST errors are plain objects with .message, not Error instances
  const message = error instanceof Error
    ? error.message
    : (error as any)?.message || String(error)
  const code = (error as any)?.code
  const statusCode = (error as any)?.status || (error as any)?.statusCode

  // Project paused: Supabase returns specific errors when project is paused
  if (
    message.includes('project is paused') ||
    message.includes('Project is paused') ||
    statusCode === 540 ||
    (message.includes('fetch failed') && code === 'ECONNREFUSED')
  ) {
    return { status: 'paused', reason: 'Supabase project appears to be paused. Re-enable it from the Supabase dashboard.' }
  }

  // Network unreachable
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('network')
  ) {
    return { status: 'unreachable', reason: 'Cannot reach Supabase. Check network connectivity and Supabase project status.' }
  }

  // Auth / permission errors
  if (statusCode === 401 || statusCode === 403 || message.includes('Invalid API key')) {
    return { status: 'auth_failed', reason: 'Supabase authentication failed. Check SUPABASE_SERVICE_ROLE_KEY.' }
  }

  return { status: 'unhealthy', reason: message }
}

healthRouter.get('/', async (_req, res) => {
  const startTime = Date.now()

  try {
    // Check Supabase connection by querying an existing table with minimal cost
    const { error } = await supabaseAdmin.from('artifacts').select('id').limit(1)

    const supabaseHealthy = !error

    if (!supabaseHealthy) {
      const categorized = categorizeSupabaseError(error)
      logger.error(`[HealthCheck] Supabase unhealthy: ${categorized.reason}`, {
        supabaseStatus: categorized.status,
        errorCode: error?.code,
        responseTimeMs: Date.now() - startTime,
      })

      return res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          api: 'healthy',
          supabase: categorized.status,
        },
        supabaseError: categorized.reason,
      })
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        supabase: 'healthy',
      },
      responseTimeMs: Date.now() - startTime,
    })
  } catch (error) {
    const categorized = categorizeSupabaseError(error)

    logger.error(`[HealthCheck] FATAL: Supabase connection failed - ${categorized.reason}`, {
      supabaseStatus: categorized.status,
      responseTimeMs: Date.now() - startTime,
    })

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        supabase: categorized.status,
      },
      supabaseError: categorized.reason,
    })
  }
})
