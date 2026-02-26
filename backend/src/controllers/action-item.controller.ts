/**
 * Action Item Controller
 *
 * Express request handlers for customer action item CRUD.
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

const createActionItemSchema = z.object({
  type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).optional(),
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
})

const updateActionItemSchema = z.object({
  type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).optional(),
  description: z.string().min(1).optional(),
  due_date: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
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

export const listActionItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const customerId = req.params.id as string
    if (!customerId) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const filters = {
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      sort: req.query.sort as string | undefined,
    }

    const service = getService()
    const actionItems = await service.list(customerId, filters)

    res.status(200).json({ action_items: actionItems, count: actionItems.length })
  } catch (error) {
    logger.error('[ActionItemController] Error in listActionItems', {
      sourceCode: 'listActionItems',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

export const createActionItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const customerId = req.params.id as string
    if (!customerId) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const parsed = createActionItemSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    const service = getService()
    const actionItem = await service.create(customerId, parsed.data)

    res.status(201).json(actionItem)
  } catch (error) {
    logger.error('[ActionItemController] Error in createActionItem', {
      sourceCode: 'createActionItem',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

export const updateActionItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const actionItemId = req.params.actionItemId as string
    if (!actionItemId) {
      res.status(400).json({ error: 'Missing ID', message: 'Action item ID is required' })
      return
    }

    const parsed = updateActionItemSchema.safeParse(req.body)
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
    const actionItem = await service.update(actionItemId, parsed.data)

    res.status(200).json(actionItem)
  } catch (error) {
    logger.error('[ActionItemController] Error in updateActionItem', {
      sourceCode: 'updateActionItem',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

export const deleteActionItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const actionItemId = req.params.actionItemId as string
    if (!actionItemId) {
      res.status(400).json({ error: 'Missing ID', message: 'Action item ID is required' })
      return
    }

    const service = getService()
    await service.delete(actionItemId)

    res.status(200).json({ message: 'Action item deleted successfully' })
  } catch (error) {
    logger.error('[ActionItemController] Error in deleteActionItem', {
      sourceCode: 'deleteActionItem',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
