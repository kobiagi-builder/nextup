import fs from 'fs'
import path from 'path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
}

const isProduction = process.env.NODE_ENV === 'production'

// =============================================================================
// File-based logging for ALL output
// =============================================================================
const LOG_FILE = path.join(process.cwd(), 'logs', 'debug.log')

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE)
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Clear log file on startup
fs.writeFileSync(LOG_FILE, `=== Debug Log Started: ${new Date().toISOString()} ===\n\n`)

/**
 * Write to debug log file (always, regardless of environment)
 */
function writeToFile(message: string) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}\n`
  fs.appendFileSync(LOG_FILE, line)
}

/**
 * Log to file with formatting for objects
 */
export function logToFile(label: string, data?: unknown) {
  if (data !== undefined) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    writeToFile(`${label}: ${dataStr}`)
  } else {
    writeToFile(label)
  }
}

// =============================================================================
// INTERCEPT ALL CONSOLE OUTPUT - Write to file AND original console
// =============================================================================
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
}

function formatArgs(args: unknown[]): string {
  return args.map(arg => {
    if (typeof arg === 'string') return arg
    if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`
    try {
      return JSON.stringify(arg, null, 2)
    } catch {
      return String(arg)
    }
  }).join(' ')
}

// Override console methods to also write to file
console.log = (...args: unknown[]) => {
  writeToFile(`[LOG] ${formatArgs(args)}`)
  originalConsole.log(...args)
}

console.error = (...args: unknown[]) => {
  writeToFile(`[ERROR] ${formatArgs(args)}`)
  originalConsole.error(...args)
}

console.warn = (...args: unknown[]) => {
  writeToFile(`[WARN] ${formatArgs(args)}`)
  originalConsole.warn(...args)
}

console.info = (...args: unknown[]) => {
  writeToFile(`[INFO] ${formatArgs(args)}`)
  originalConsole.info(...args)
}

console.debug = (...args: unknown[]) => {
  writeToFile(`[DEBUG] ${formatArgs(args)}`)
  originalConsole.debug(...args)
}

// Log that interception is active
writeToFile('=== Console interception active - ALL output will be logged ===')

/**
 * Log frontend messages (called via API)
 */
export function logFrontend(level: string, message: string, data?: unknown) {
  const dataStr = data ? `: ${JSON.stringify(data, null, 2)}` : ''
  writeToFile(`[FE:${level.toUpperCase()}] ${message}${dataStr}`)
}

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
]

function sanitize(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined
  if (!isProduction) return context

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) =>
      lowerKey.includes(pattern.toLowerCase())
    )

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
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

  const logMessage = JSON.stringify(entry)

  switch (level) {
    case 'debug':
      if (!isProduction) console.debug(logMessage)
      break
    case 'info':
      console.info(logMessage)
      break
    case 'warn':
      console.warn(logMessage)
      break
    case 'error':
      console.error(logMessage)
      break
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    log('debug', message, context)
  },
  info: (message: string, context?: Record<string, unknown>) => {
    log('info', message, context)
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    log('warn', message, context)
  },
  error: (message: string, context?: Record<string, unknown>) => {
    log('error', message, context)
  },
}
