/**
 * Customer AI Routes
 *
 * POST /stream — Stream customer chat with dual agent routing
 */

import { Router } from 'express'
import { streamCustomerChat } from '../controllers/customer-ai.controller.js'

export const customerAiRouter = Router()

customerAiRouter.post('/stream', streamCustomerChat)
