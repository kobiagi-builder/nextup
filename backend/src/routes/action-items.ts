/**
 * Action Item Routes
 *
 * Nested under /api/customers/:id/action-items via customers.ts.
 * Uses mergeParams to access parent :id parameter.
 */

import { Router } from 'express'
import * as actionItemController from '../controllers/action-item.controller.js'

export const actionItemsRouter = Router({ mergeParams: true })

actionItemsRouter.get('/', actionItemController.listActionItems)
actionItemsRouter.post('/', actionItemController.createActionItem)
actionItemsRouter.put('/:actionItemId', actionItemController.updateActionItem)
actionItemsRouter.delete('/:actionItemId', actionItemController.deleteActionItem)
