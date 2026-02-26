/**
 * Project Controller
 *
 * Express request handlers for customer project CRUD.
 * Uses inline Zod validation and ProjectService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { ProjectService } from '../services/ProjectService.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  agreement_id: z.string().uuid().nullable().optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  agreement_id: z.string().uuid().nullable().optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(): ProjectService {
  return new ProjectService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers/:id/projects
 * List projects for a customer.
 */
export const listProjects = async (req: Request, res: Response): Promise<void> => {
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
    const projects = await service.list(customerId)

    res.status(200).json({ projects, count: projects.length })
  } catch (error) {
    logger.error('[ProjectController] Error in listProjects', {
      sourceCode: 'listProjects',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/:id/projects/:projectId
 * Get a single project with artifact count.
 */
export const getProject = async (req: Request, res: Response): Promise<void> => {
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
    const project = await service.getById(projectId)

    if (!project) {
      res.status(404).json({ error: 'Not found', message: 'Project not found' })
      return
    }

    res.status(200).json(project)
  } catch (error) {
    logger.error('[ProjectController] Error in getProject', {
      sourceCode: 'getProject',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/projects
 * Create a new project.
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
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

    const parsed = createProjectSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[ProjectController] Creating project', {
      hasCustomerId: true,
      hasDescription: !!parsed.data.description,
      hasAgreementId: !!parsed.data.agreement_id,
    })

    const service = getService()
    const project = await service.create(customerId, parsed.data)

    res.status(201).json(project)
  } catch (error) {
    logger.error('[ProjectController] Error in createProject', {
      sourceCode: 'createProject',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/customers/:id/projects/:projectId
 * Update a project.
 */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
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

    const parsed = updateProjectSchema.safeParse(req.body)
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

    logger.info('[ProjectController] Updating project', {
      hasProjectId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService()
    const project = await service.update(projectId, parsed.data)

    res.status(200).json(project)
  } catch (error) {
    logger.error('[ProjectController] Error in updateProject', {
      sourceCode: 'updateProject',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id/projects/:projectId
 * Delete a project. DB CASCADE handles child artifacts.
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
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

    logger.info('[ProjectController] Deleting project', {
      hasProjectId: true,
    })

    const service = getService()
    await service.delete(projectId)

    res.status(200).json({ message: 'Project deleted successfully' })
  } catch (error) {
    logger.error('[ProjectController] Error in deleteProject', {
      sourceCode: 'deleteProject',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
