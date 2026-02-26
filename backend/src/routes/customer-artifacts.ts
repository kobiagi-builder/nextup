/**
 * Customer Artifact Routes
 *
 * Nested under /api/customers/:id/projects/:projectId/artifacts
 * Uses mergeParams to access parent :id and :projectId parameters.
 */

import { Router } from 'express'
import * as artifactController from '../controllers/customer-artifact.controller.js'

export const customerArtifactsRouter = Router({ mergeParams: true })

customerArtifactsRouter.get('/', artifactController.listProjectArtifacts)
customerArtifactsRouter.post('/', artifactController.createArtifact)
customerArtifactsRouter.put('/:artifactId', artifactController.updateArtifact)
customerArtifactsRouter.delete('/:artifactId', artifactController.deleteArtifact)
