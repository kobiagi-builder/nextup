import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger.js'

interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
  code?: string
}

/**
 * Detect if an error is caused by Supabase being unreachable/paused.
 */
function isSupabaseConnectionError(err: AppError): boolean {
  const message = err.message || ''
  const code = err.code || ''

  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('project is paused') ||
    message.includes('Project is paused')
  )
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Internal server error'

  // Detect Supabase connectivity issues and log them prominently
  if (isSupabaseConnectionError(err)) {
    logger.error('[ErrorHandler] FATAL: Supabase connection error detected in request', {
      originalError: err.message,
      hint: 'Supabase project may be paused or unreachable. Check Supabase dashboard.',
    })

    return res.status(503).json({
      error: 'Database service unavailable',
      code: 'SUPABASE_UNAVAILABLE',
      hint: 'The database service is currently unavailable. This may be a temporary issue.',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
    })
  }

  logger.error('[ErrorHandler] Request error', {
    message: err.message,
    stack: err.stack,
    statusCode,
  })

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export class ApiError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}
