/**
 * Initiative Controller (formerly project.controller)
 *
 * Express request handlers for customer initiative CRUD.
 * Uses inline Zod validation and InitiativeService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { InitiativeService } from '../services/InitiativeService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const createInitiativeSchema = z.object({
  name: z.string().min(1, 'Initiative name is required'),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  agreement_id: z.string().uuid().nullable().optional(),
})

const updateInitiativeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  agreement_id: z.string().uuid().nullable().optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): InitiativeService {
  return new InitiativeService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers/:id/initiatives
 * List initiatives for a customer.
 */
export const listInitiatives = async (req: Request, res: Response): Promise<void> => {
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

    const service = getService()
    const initiatives = await service.list(customerId)

    res.status(200).json({ initiatives, count: initiatives.length })
  } catch (error) {
    logger.error('[InitiativeController] Error in listInitiatives', {
      sourceCode: 'listInitiatives',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/:id/initiatives/:initiativeId
 * Get a single initiative with document count.
 */
export const getInitiative = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const initiativeId = req.params.initiativeId as string
    if (!initiativeId) {
      res.status(400).json({ error: 'Missing ID', message: 'Initiative ID is required' })
      return
    }

    const service = getService()
    const initiative = await service.getById(initiativeId)

    if (!initiative) {
      res.status(404).json({ error: 'Not found', message: 'Initiative not found' })
      return
    }

    res.status(200).json(initiative)
  } catch (error) {
    logger.error('[InitiativeController] Error in getInitiative', {
      sourceCode: 'getInitiative',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/initiatives
 * Create a new initiative.
 */
export const createInitiative = async (req: Request, res: Response): Promise<void> => {
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

    const parsed = createInitiativeSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[InitiativeController] Creating initiative', {
      hasCustomerId: true,
      hasDescription: !!parsed.data.description,
      hasAgreementId: !!parsed.data.agreement_id,
    })

    const service = getService()
    const initiative = await service.create(customerId, parsed.data)

    res.status(201).json(initiative)
  } catch (error) {
    logger.error('[InitiativeController] Error in createInitiative', {
      sourceCode: 'createInitiative',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/customers/:id/initiatives/:initiativeId
 * Update an initiative.
 */
export const updateInitiative = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const initiativeId = req.params.initiativeId as string
    if (!initiativeId) {
      res.status(400).json({ error: 'Missing ID', message: 'Initiative ID is required' })
      return
    }

    const parsed = updateInitiativeSchema.safeParse(req.body)
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

    logger.info('[InitiativeController] Updating initiative', {
      hasInitiativeId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService()
    const initiative = await service.update(initiativeId, parsed.data)

    res.status(200).json(initiative)
  } catch (error) {
    logger.error('[InitiativeController] Error in updateInitiative', {
      sourceCode: 'updateInitiative',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id/initiatives/:initiativeId
 * Delete an initiative. Moves documents to General folder first.
 */
export const deleteInitiative = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const initiativeId = req.params.initiativeId as string
    if (!initiativeId) {
      res.status(400).json({ error: 'Missing ID', message: 'Initiative ID is required' })
      return
    }

    logger.info('[InitiativeController] Deleting initiative', {
      hasInitiativeId: true,
    })

    const service = getService()
    const result = await service.delete(initiativeId)

    res.status(200).json({
      message: 'Initiative deleted successfully',
      moved_documents: result.moved_documents,
    })
  } catch (error) {
    logger.error('[InitiativeController] Error in deleteInitiative', {
      sourceCode: 'deleteInitiative',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
