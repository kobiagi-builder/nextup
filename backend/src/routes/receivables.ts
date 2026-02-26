/**
 * Receivable Routes
 *
 * Nested under /api/customers/:id/receivables
 * Uses mergeParams to access parent :id parameter.
 */

import { Router } from 'express'
import * as receivableController from '../controllers/receivable.controller.js'

export const receivablesRouter = Router({ mergeParams: true })

receivablesRouter.get('/', receivableController.listReceivables)
receivablesRouter.get('/summary', receivableController.getReceivableSummary)
receivablesRouter.post('/', receivableController.createReceivable)
receivablesRouter.put('/:receivableId', receivableController.updateReceivable)
receivablesRouter.delete('/:receivableId', receivableController.deleteReceivable)
