/**
 * Action Items Board Controller
 *
 * Express request handlers for cross-customer action item CRUD (Kanban board).
 * Uses Zod for input validation.
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import { ActionItemService } from '../services/ActionItemService.js'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const createBoardActionItemSchema = z.object({
  type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).optional(),
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  customer_id: z.string().uuid().nullable().optional(),
})

const updateBoardActionItemSchema = z.object({
  type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).optional(),
  description: z.string().min(1).optional(),
  due_date: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  customer_id: z.string().uuid().nullable().optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function getService(): ActionItemService {
  return new ActionItemService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

export const listBoardActionItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const filters: { customer_id?: string; status?: string[] } = {}

    if (req.query.customer_id) {
      filters.customer_id = req.query.customer_id as string
    }
    if (req.query.status) {
      filters.status = (req.query.status as string).split(',')
    }

    const service = getService()
    const actionItems = await service.listAll(userId, filters)

    res.status(200).json({ data: actionItems, count: actionItems.length })
  } catch (error) {
    logger.error('[ActionItemsBoardController] Error in listBoardActionItems', {
      sourceCode: 'listBoardActionItems',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

export const createBoardActionItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const parsed = createBoardActionItemSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    const service = getService()
    const actionItem = await service.createForBoard(userId, parsed.data)

    res.status(201).json(actionItem)
  } catch (error) {
    logger.error('[ActionItemsBoardController] Error in createBoardActionItem', {
      sourceCode: 'createBoardActionItem',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

export const updateBoardActionItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const actionItemId = req.params.id as string
    if (!actionItemId) {
      res.status(400).json({ error: 'Missing ID', message: 'Action item ID is required' })
      return
    }

    const parsed = updateBoardActionItemSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: 'Validation error', message: 'No updates provided' })
      return
    }

    const service = getService()
    const actionItem = await service.updateForBoard(actionItemId, parsed.data)

    res.status(200).json(actionItem)
  } catch (error) {
    logger.error('[ActionItemsBoardController] Error in updateBoardActionItem', {
      sourceCode: 'updateBoardActionItem',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

export const deleteBoardActionItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const actionItemId = req.params.id as string
    if (!actionItemId) {
      res.status(400).json({ error: 'Missing ID', message: 'Action item ID is required' })
      return
    }

    const service = getService()
    await service.delete(actionItemId)

    res.status(200).json({ message: 'Action item deleted successfully' })
  } catch (error) {
    logger.error('[ActionItemsBoardController] Error in deleteBoardActionItem', {
      sourceCode: 'deleteBoardActionItem',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
