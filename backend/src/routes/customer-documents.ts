/**
 * Customer Document Routes (formerly customer-artifacts.ts)
 *
 * Nested under /api/customers/:id/initiatives/:initiativeId/documents
 * Uses mergeParams to access parent :id and :initiativeId parameters.
 */

import { Router } from 'express'
import * as documentController from '../controllers/customer-document.controller.js'

export const customerDocumentsRouter = Router({ mergeParams: true })

customerDocumentsRouter.get('/', documentController.listInitiativeDocuments)
customerDocumentsRouter.post('/', documentController.createDocument)
customerDocumentsRouter.put('/:documentId', documentController.updateDocument)
customerDocumentsRouter.delete('/:documentId', documentController.deleteDocument)
