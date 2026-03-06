/**
 * Action Items Board Routes
 *
 * Top-level /api/action-items routes for the Kanban board.
 * Cross-customer CRUD (not nested under /customers/:id).
 */

import { Router } from 'express'
import * as boardController from '../controllers/action-items-board.controller.js'

export const actionItemsBoardRouter = Router()

actionItemsBoardRouter.get('/', boardController.listBoardActionItems)
actionItemsBoardRouter.post('/', boardController.createBoardActionItem)
actionItemsBoardRouter.put('/:id', boardController.updateBoardActionItem)
actionItemsBoardRouter.delete('/:id', boardController.deleteBoardActionItem)
