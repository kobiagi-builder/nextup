/**
 * Agreement Controller
 *
 * Express request handlers for customer agreement CRUD.
 * Uses inline Zod validation and AgreementService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { AgreementService } from '../services/AgreementService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const pricingSchema = z.object({
  amount: z.number().min(0, 'Amount must be non-negative'),
  currency: z.string().default('USD'),
  frequency: z.string(),
  unit: z.string().optional(),
  notes: z.string().optional(),
})

const createAgreementSchema = z.object({
  scope: z.string().min(1, 'Scope is required'),
  type: z.enum(['retainer', 'project_based', 'hourly', 'fixed_price', 'equity', 'hybrid', 'custom']).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  pricing: pricingSchema.optional(),
  override_status: z.enum(['terminated', 'suspended']).nullable().optional(),
})

const updateAgreementSchema = z.object({
  scope: z.string().min(1).optional(),
  type: z.enum(['retainer', 'project_based', 'hourly', 'fixed_price', 'equity', 'hybrid', 'custom']).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  pricing: pricingSchema.optional(),
  override_status: z.enum(['terminated', 'suspended']).nullable().optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): AgreementService {
  return new AgreementService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers/:id/agreements
 * List agreements for a customer.
 */
export const listAgreements = async (req: Request, res: Response): Promise<void> => {
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
    const agreements = await service.list(customerId)

    res.status(200).json({ agreements, count: agreements.length })
  } catch (error) {
    logger.error('[AgreementController] Error in listAgreements', {
      sourceCode: 'listAgreements',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/agreements
 * Create a new agreement.
 */
export const createAgreement = async (req: Request, res: Response): Promise<void> => {
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

    const parsed = createAgreementSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[AgreementController] Creating agreement', {
      hasCustomerId: true,
      hasType: !!parsed.data.type,
      hasPricing: !!parsed.data.pricing,
    })

    const service = getService()
    const agreement = await service.create(customerId, parsed.data)

    res.status(201).json(agreement)
  } catch (error) {
    logger.error('[AgreementController] Error in createAgreement', {
      sourceCode: 'createAgreement',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/customers/:id/agreements/:agreementId
 * Update an agreement.
 */
export const updateAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const agreementId = req.params.agreementId as string
    if (!agreementId) {
      res.status(400).json({ error: 'Missing ID', message: 'Agreement ID is required' })
      return
    }

    const parsed = updateAgreementSchema.safeParse(req.body)
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

    logger.info('[AgreementController] Updating agreement', {
      hasAgreementId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService()
    const agreement = await service.update(agreementId, parsed.data)

    res.status(200).json(agreement)
  } catch (error) {
    logger.error('[AgreementController] Error in updateAgreement', {
      sourceCode: 'updateAgreement',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id/agreements/:agreementId
 * Delete an agreement.
 */
export const deleteAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const agreementId = req.params.agreementId as string
    if (!agreementId) {
      res.status(400).json({ error: 'Missing ID', message: 'Agreement ID is required' })
      return
    }

    logger.info('[AgreementController] Deleting agreement', {
      hasAgreementId: true,
    })

    const service = getService()
    await service.delete(agreementId)

    res.status(200).json({ message: 'Agreement deleted successfully' })
  } catch (error) {
    logger.error('[AgreementController] Error in deleteAgreement', {
      sourceCode: 'deleteAgreement',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
