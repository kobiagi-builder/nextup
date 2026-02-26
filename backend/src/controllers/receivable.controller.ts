/**
 * Receivable Controller
 *
 * Express request handlers for customer receivable CRUD + financial summary.
 * Uses inline Zod validation and ReceivableService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { ReceivableService } from '../services/ReceivableService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const createReceivableSchema = z.object({
  type: z.enum(['invoice', 'payment']),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  status: z.string().optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
  linked_invoice_id: z.string().uuid().nullable().optional(),
  linked_agreement_id: z.string().uuid().nullable().optional(),
})

const updateReceivableSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  date: z.string().min(1).optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
  linked_invoice_id: z.string().uuid().nullable().optional(),
  linked_agreement_id: z.string().uuid().nullable().optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): ReceivableService {
  return new ReceivableService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers/:id/receivables
 * List receivables for a customer.
 */
export const listReceivables = async (req: Request, res: Response): Promise<void> => {
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
    const receivables = await service.list(customerId)

    res.status(200).json({ receivables, count: receivables.length })
  } catch (error) {
    logger.error('[ReceivableController] Error in listReceivables', {
      sourceCode: 'listReceivables',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/:id/receivables/summary
 * Get financial summary (PostgreSQL NUMERIC arithmetic).
 */
export const getReceivableSummary = async (req: Request, res: Response): Promise<void> => {
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
    const summary = await service.getSummary(customerId)

    res.status(200).json(summary)
  } catch (error) {
    logger.error('[ReceivableController] Error in getReceivableSummary', {
      sourceCode: 'getReceivableSummary',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/receivables
 * Create a new receivable (invoice or payment).
 */
export const createReceivable = async (req: Request, res: Response): Promise<void> => {
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

    const parsed = createReceivableSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[ReceivableController] Creating receivable', {
      hasCustomerId: true,
      type: parsed.data.type,
      hasLinkedInvoice: !!parsed.data.linked_invoice_id,
      hasLinkedAgreement: !!parsed.data.linked_agreement_id,
    })

    const service = getService()
    const receivable = await service.create(customerId, parsed.data)

    res.status(201).json(receivable)
  } catch (error) {
    logger.error('[ReceivableController] Error in createReceivable', {
      sourceCode: 'createReceivable',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/customers/:id/receivables/:receivableId
 * Update a receivable.
 */
export const updateReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const receivableId = req.params.receivableId as string
    if (!receivableId) {
      res.status(400).json({ error: 'Missing ID', message: 'Receivable ID is required' })
      return
    }

    const parsed = updateReceivableSchema.safeParse(req.body)
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

    logger.info('[ReceivableController] Updating receivable', {
      hasReceivableId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService()
    const receivable = await service.update(receivableId, parsed.data)

    res.status(200).json(receivable)
  } catch (error) {
    logger.error('[ReceivableController] Error in updateReceivable', {
      sourceCode: 'updateReceivable',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id/receivables/:receivableId
 * Delete a receivable.
 */
export const deleteReceivable = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const receivableId = req.params.receivableId as string
    if (!receivableId) {
      res.status(400).json({ error: 'Missing ID', message: 'Receivable ID is required' })
      return
    }

    logger.info('[ReceivableController] Deleting receivable', {
      hasReceivableId: true,
    })

    const service = getService()
    await service.delete(receivableId)

    res.status(200).json({ message: 'Receivable deleted successfully' })
  } catch (error) {
    logger.error('[ReceivableController] Error in deleteReceivable', {
      sourceCode: 'deleteReceivable',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
