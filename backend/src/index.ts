// Load environment variables FIRST before any other imports
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { router } from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './lib/logger.js'

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
app.use(express.json())

// Routes
app.use('/api', router)

// Error handling
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})

export { app }
