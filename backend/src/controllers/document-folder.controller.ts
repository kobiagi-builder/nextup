/**
 * Document Folder Controller
 *
 * Express request handlers for document folder CRUD.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { DocumentFolderService } from '../services/DocumentFolderService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  slug: z.string().optional(),
  customer_id: z.string().uuid('Valid customer ID is required'),
})

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): DocumentFolderService {
  return new DocumentFolderService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/document-folders?customerId=...
 * List folders (global + customer-specific).
 */
export const listFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const customerId = req.query.customerId as string | undefined

    const service = getService()
    const folders = await service.getFolders(customerId)

    res.status(200).json({ folders, count: folders.length })
  } catch (error) {
    logger.error('[FolderController] Error in listFolders', {
      sourceCode: 'listFolders',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/document-folders
 * Create a new folder.
 */
export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const parsed = createFolderSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    const service = getService()
    const folder = await service.createFolder(userId, parsed.data)

    res.status(201).json(folder)
  } catch (error) {
    logger.error('[FolderController] Error in createFolder', {
      sourceCode: 'createFolder',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/document-folders/:id
 * Update a folder.
 */
export const updateFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const folderId = req.params.id as string
    if (!folderId) {
      res.status(400).json({ error: 'Missing ID', message: 'Folder ID is required' })
      return
    }

    const parsed = updateFolderSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    const service = getService()
    const folder = await service.updateFolder(folderId, parsed.data)

    res.status(200).json(folder)
  } catch (error) {
    logger.error('[FolderController] Error in updateFolder', {
      sourceCode: 'updateFolder',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/document-folders/:id
 * Delete a folder (non-system only).
 */
export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const folderId = req.params.id as string
    if (!folderId) {
      res.status(400).json({ error: 'Missing ID', message: 'Folder ID is required' })
      return
    }

    const service = getService()
    await service.deleteFolder(folderId)

    res.status(200).json({ message: 'Folder deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot delete system folder') {
      res.status(403).json({ error: 'Forbidden', message: error.message })
      return
    }

    logger.error('[FolderController] Error in deleteFolder', {
      sourceCode: 'deleteFolder',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
