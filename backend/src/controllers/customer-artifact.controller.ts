/**
 * Customer Artifact Controller
 *
 * Express request handlers for customer artifact CRUD.
 * Uses inline Zod validation and CustomerArtifactService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { CustomerArtifactService } from '../services/CustomerArtifactService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const createArtifactSchema = z.object({
  title: z.string().min(1, 'Artifact title is required'),
  type: z.enum([
    'strategy', 'research', 'roadmap', 'competitive_analysis',
    'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom',
  ]).optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'review', 'final', 'archived']).optional(),
})

const updateArtifactSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum([
    'strategy', 'research', 'roadmap', 'competitive_analysis',
    'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom',
  ]).optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'review', 'final', 'archived']).optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): CustomerArtifactService {
  return new CustomerArtifactService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers/:id/projects/:projectId/artifacts
 * List artifacts in a project.
 */
export const listProjectArtifacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const projectId = req.params.projectId as string
    if (!projectId) {
      res.status(400).json({ error: 'Missing ID', message: 'Project ID is required' })
      return
    }

    const service = getService()
    const artifacts = await service.listByProject(projectId)

    res.status(200).json({ artifacts, count: artifacts.length })
  } catch (error) {
    logger.error('[ArtifactController] Error in listProjectArtifacts', {
      sourceCode: 'listProjectArtifacts',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/:id/artifacts
 * List ALL artifacts across all projects for a customer (flat view).
 */
export const listCustomerArtifacts = async (req: Request, res: Response): Promise<void> => {
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
    const artifacts = await service.listByCustomer(customerId)

    res.status(200).json({ artifacts, count: artifacts.length })
  } catch (error) {
    logger.error('[ArtifactController] Error in listCustomerArtifacts', {
      sourceCode: 'listCustomerArtifacts',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/projects/:projectId/artifacts
 * Create a new artifact.
 */
export const createArtifact = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const customerId = req.params.id as string
    const projectId = req.params.projectId as string
    if (!customerId || !projectId) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID and Project ID are required' })
      return
    }

    const parsed = createArtifactSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[ArtifactController] Creating artifact', {
      hasProjectId: true,
      hasType: !!parsed.data.type,
    })

    const service = getService()
    const artifact = await service.create(projectId, customerId, parsed.data)

    res.status(201).json(artifact)
  } catch (error) {
    logger.error('[ArtifactController] Error in createArtifact', {
      sourceCode: 'createArtifact',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/customers/:id/projects/:projectId/artifacts/:artifactId
 * Update an artifact.
 */
export const updateArtifact = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const artifactId = req.params.artifactId as string
    if (!artifactId) {
      res.status(400).json({ error: 'Missing ID', message: 'Artifact ID is required' })
      return
    }

    const parsed = updateArtifactSchema.safeParse(req.body)
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

    logger.info('[ArtifactController] Updating artifact', {
      hasArtifactId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService()
    const artifact = await service.update(artifactId, parsed.data)

    res.status(200).json(artifact)
  } catch (error) {
    logger.error('[ArtifactController] Error in updateArtifact', {
      sourceCode: 'updateArtifact',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id/projects/:projectId/artifacts/:artifactId
 * Delete an artifact.
 */
export const deleteArtifact = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const artifactId = req.params.artifactId as string
    if (!artifactId) {
      res.status(400).json({ error: 'Missing ID', message: 'Artifact ID is required' })
      return
    }

    logger.info('[ArtifactController] Deleting artifact', {
      hasArtifactId: true,
    })

    const service = getService()
    await service.delete(artifactId)

    res.status(200).json({ message: 'Artifact deleted successfully' })
  } catch (error) {
    logger.error('[ArtifactController] Error in deleteArtifact', {
      sourceCode: 'deleteArtifact',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
