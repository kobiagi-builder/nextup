/**
 * Project Routes
 *
 * Nested under /api/customers/:id/projects
 * Uses mergeParams to access parent :id parameter.
 */

import { Router } from 'express'
import * as projectController from '../controllers/project.controller.js'
import { customerArtifactsRouter } from './customer-artifacts.js'

export const projectsRouter = Router({ mergeParams: true })

projectsRouter.get('/', projectController.listProjects)
projectsRouter.get('/:projectId', projectController.getProject)
projectsRouter.post('/', projectController.createProject)
projectsRouter.put('/:projectId', projectController.updateProject)
projectsRouter.delete('/:projectId', projectController.deleteProject)

// Nested: /api/customers/:id/projects/:projectId/artifacts
projectsRouter.use('/:projectId/artifacts', customerArtifactsRouter)
