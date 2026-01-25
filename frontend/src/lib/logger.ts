type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
}

const isProduction = import.meta.env.PROD
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// =============================================================================
// Send ALL frontend logs to backend for file capture
// =============================================================================
async function sendToBackend(level: string, message: string, data?: unknown) {
  try {
    await fetch(`${API_URL}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, data }),
    })
  } catch {
    // Silently fail - don't want logging to break the app
  }
}

// Intercept ALL console output and send to backend
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
}

function formatArgs(args: unknown[]): { message: string; data?: unknown } {
  if (args.length === 0) return { message: '' }
  if (args.length === 1) {
    const first = args[0]
    if (typeof first === 'string') return { message: first }
    return { message: '', data: first }
  }
  // Multiple args - first is message, rest is data
  const [first, ...rest] = args
  const message = typeof first === 'string' ? first : JSON.stringify(first)
  return { message, data: rest.length === 1 ? rest[0] : rest }
}

// Override console methods to also send to backend
console.log = (...args: unknown[]) => {
  const { message, data } = formatArgs(args)
  sendToBackend('log', message, data)
  originalConsole.log(...args)
}

console.error = (...args: unknown[]) => {
  const { message, data } = formatArgs(args)
  sendToBackend('error', message, data)
  originalConsole.error(...args)
}

console.warn = (...args: unknown[]) => {
  const { message, data } = formatArgs(args)
  sendToBackend('warn', message, data)
  originalConsole.warn(...args)
}

console.info = (...args: unknown[]) => {
  const { message, data } = formatArgs(args)
  sendToBackend('info', message, data)
  originalConsole.info(...args)
}

console.debug = (...args: unknown[]) => {
  const { message, data } = formatArgs(args)
  sendToBackend('debug', message, data)
  originalConsole.debug(...args)
}

// Signal that interception is active
sendToBackend('info', '=== Frontend console interception active ===')
originalConsole.log('📝 All console output will be logged to backend/logs/debug.log')

// Sensitive field patterns to remove from logs
const SENSITIVE_PATTERNS = [
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'secret',
  'password',
  'authorization',
  'cookie',
  'session',
  'userId',
  'user_id',
  'email',
  'phone',
  'ssn',
  'creditcard',
]

/**
 * Sanitize context object by removing sensitive fields
 * Only applied in production
 */
function sanitize(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined

  // In development, return full context for debugging
  if (!isProduction) return context

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase()

    // Check if key matches any sensitive pattern
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) =>
      lowerKey.includes(pattern.toLowerCase())
    )

    if (isSensitive) {
      // Replace with boolean indicator
      sanitized[key] = value !== null && value !== undefined ? '[REDACTED]' : null
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitize(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    context: sanitize(context),
    timestamp: new Date().toISOString(),
  }

  if (isProduction) {
    // In production, send to logging service
    // TODO: Integrate with New Relic, Sentry, or other logging service
    // For now, only log errors and warnings to console in production
    if (level === 'error' || level === 'warn') {
      console[level](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context || '')
    }
  } else {
    // In development, log everything to console with formatting
    const prefix = `[${entry.level.toUpperCase()}]`
    const timestamp = entry.timestamp.split('T')[1].split('.')[0] // HH:MM:SS

    console[level](
      `%c${prefix}%c [${timestamp}] ${entry.message}`,
      getLogStyle(level),
      'color: inherit',
      entry.context || ''
    )
  }
}

function getLogStyle(level: LogLevel): string {
  switch (level) {
    case 'debug':
      return 'color: #888; font-weight: bold'
    case 'info':
      return 'color: #2196F3; font-weight: bold'
    case 'warn':
      return 'color: #FF9800; font-weight: bold'
    case 'error':
      return 'color: #F44336; font-weight: bold'
    default:
      return ''
  }
}

export const logger = {
  /**
   * Debug level - only shown in development
   * Use for detailed debugging information
   */
  debug: (message: string, context?: Record<string, unknown>) => {
    if (!isProduction) {
      log('debug', message, context)
    }
  },

  /**
   * Info level - general information
   * Use for tracking important events and state changes
   */
  info: (message: string, context?: Record<string, unknown>) => {
    log('info', message, context)
  },

  /**
   * Warn level - warning conditions
   * Use for unexpected but recoverable situations
   */
  warn: (message: string, context?: Record<string, unknown>) => {
    log('warn', message, context)
  },

  /**
   * Error level - error conditions
   * Use for errors that need attention
   */
  error: (message: string, context?: Record<string, unknown>) => {
    log('error', message, context)
  },
}
