import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  try {
    // Check Supabase connection
    const { error } = await supabaseAdmin.from('_health_check').select('*').limit(1)

    // Table might not exist, but connection is still valid if we get a specific error
    const supabaseHealthy = !error || error.code === 'PGRST116' // relation does not exist

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        supabase: supabaseHealthy ? 'healthy' : 'unhealthy',
      },
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        supabase: 'unhealthy',
      },
    })
  }
})
