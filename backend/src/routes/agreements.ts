/**
 * Agreement Routes
 *
 * Nested under /api/customers/:id/agreements
 * Uses mergeParams to access parent :id parameter.
 */

import { Router } from 'express'
import * as agreementController from '../controllers/agreement.controller.js'

export const agreementsRouter = Router({ mergeParams: true })

agreementsRouter.get('/', agreementController.listAgreements)
agreementsRouter.post('/', agreementController.createAgreement)
agreementsRouter.put('/:agreementId', agreementController.updateAgreement)
agreementsRouter.delete('/:agreementId', agreementController.deleteAgreement)
