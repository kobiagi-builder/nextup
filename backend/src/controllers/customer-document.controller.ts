/**
 * Customer Document Controller (formerly customer-artifact.controller)
 *
 * Express request handlers for customer document CRUD.
 * Uses inline Zod validation and CustomerDocumentService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { CustomerDocumentService } from '../services/CustomerDocumentService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required'),
  type: z.enum([
    'strategy', 'research', 'roadmap', 'competitive_analysis',
    'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom',
  ]).optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'review', 'final', 'archived']).optional(),
})

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum([
    'strategy', 'research', 'roadmap', 'competitive_analysis',
    'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom',
  ]).optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'review', 'final', 'archived']).optional(),
  initiative_id: z.string().uuid().nullable().optional(),
  folder_id: z.string().uuid().nullable().optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): CustomerDocumentService {
  return new CustomerDocumentService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers/:id/initiatives/:initiativeId/documents
 * List documents in an initiative.
 */
export const listInitiativeDocuments = async (req: Request, res: Response): Promise<void> => {
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
    const documents = await service.listByInitiative(initiativeId)

    res.status(200).json({ documents, count: documents.length })
  } catch (error) {
    logger.error('[DocumentController] Error in listInitiativeDocuments', {
      sourceCode: 'listInitiativeDocuments',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/:id/documents
 * List ALL documents across all initiatives for a customer (flat view).
 */
export const listCustomerDocuments = async (req: Request, res: Response): Promise<void> => {
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
    const documents = await service.listByCustomer(customerId)

    res.status(200).json({ documents, count: documents.length })
  } catch (error) {
    logger.error('[DocumentController] Error in listCustomerDocuments', {
      sourceCode: 'listCustomerDocuments',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/initiatives/:initiativeId/documents
 * Create a new document.
 */
export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const customerId = req.params.id as string
    const initiativeId = req.params.initiativeId as string
    if (!customerId || !initiativeId) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID and Initiative ID are required' })
      return
    }

    const parsed = createDocumentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[DocumentController] Creating document', {
      hasInitiativeId: true,
      hasType: !!parsed.data.type,
    })

    const service = getService()
    const document = await service.create(initiativeId, customerId, parsed.data)

    res.status(201).json(document)
  } catch (error) {
    logger.error('[DocumentController] Error in createDocument', {
      sourceCode: 'createDocument',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/customers/:id/initiatives/:initiativeId/documents/:documentId
 * Update a document.
 */
export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const documentId = req.params.documentId as string
    if (!documentId) {
      res.status(400).json({ error: 'Missing ID', message: 'Document ID is required' })
      return
    }

    const parsed = updateDocumentSchema.safeParse(req.body)
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

    logger.info('[DocumentController] Updating document', {
      hasDocumentId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService()
    const document = await service.update(documentId, parsed.data)

    res.status(200).json(document)
  } catch (error) {
    logger.error('[DocumentController] Error in updateDocument', {
      sourceCode: 'updateDocument',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id/initiatives/:initiativeId/documents/:documentId
 * Delete a document.
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const documentId = req.params.documentId as string
    if (!documentId) {
      res.status(400).json({ error: 'Missing ID', message: 'Document ID is required' })
      return
    }

    logger.info('[DocumentController] Deleting document', {
      hasDocumentId: true,
    })

    const service = getService()
    await service.delete(documentId)

    res.status(200).json({ message: 'Document deleted successfully' })
  } catch (error) {
    logger.error('[DocumentController] Error in deleteDocument', {
      sourceCode: 'deleteDocument',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
