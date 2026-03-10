/**
 * Initiative Routes (formerly projects.ts)
 *
 * Nested under /api/customers/:id/initiatives
 * Uses mergeParams to access parent :id parameter.
 */

import { Router } from 'express'
import * as initiativeController from '../controllers/initiative.controller.js'
import { customerDocumentsRouter } from './customer-documents.js'

export const initiativesRouter = Router({ mergeParams: true })

initiativesRouter.get('/', initiativeController.listInitiatives)
initiativesRouter.get('/:initiativeId', initiativeController.getInitiative)
initiativesRouter.post('/', initiativeController.createInitiative)
initiativesRouter.put('/:initiativeId', initiativeController.updateInitiative)
initiativesRouter.delete('/:initiativeId', initiativeController.deleteInitiative)

// Nested: /api/customers/:id/initiatives/:initiativeId/documents
initiativesRouter.use('/:initiativeId/documents', customerDocumentsRouter)
