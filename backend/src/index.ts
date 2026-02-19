// Load environment variables FIRST before any other imports
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { router } from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './lib/logger.js'
import { supabaseAdmin } from './lib/supabase.js'

const app = express()
const PORT = process.env.PORT || 3001

// Debug: Log environment variables at startup
console.log('[STARTUP] Environment check:', {
  cwd: process.cwd(),
  MOCK_ALL_AI_TOOLS: process.env.MOCK_ALL_AI_TOOLS,
  MOCK_CONTENT_WRITING_TOOLS: process.env.MOCK_CONTENT_WRITING_TOOLS,
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

// Routes
app.use('/api', router)

// Error handling
app.use(errorHandler)

/**
 * Verify Supabase connectivity at startup.
 * Logs a FATAL warning if Supabase is unreachable (e.g. project paused).
 */
async function checkSupabaseConnectivity(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('artifacts').select('id').limit(1)
    if (!error) {
      logger.info('[Startup] Supabase connectivity verified')
      return true
    }
    logger.error(`[Startup] FATAL: Supabase responded with error: ${error.message}`, {
      errorCode: error.code,
      hint: error.hint,
    })
    return false
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`[Startup] FATAL: Cannot connect to Supabase - ${message}`, {
      hint: 'Check if the Supabase project is paused or if network/credentials are correct.',
    })
    return false
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`)

  // Non-blocking startup check - server still starts even if Supabase is down
  // so the health endpoint remains accessible for diagnostics
  const supabaseOk = await checkSupabaseConnectivity()
  if (!supabaseOk) {
    logger.error('[Startup] WARNING: Server started but Supabase is NOT reachable. All database operations will fail.')
  }
})

export { app }
