/**
 * Customer Routes
 *
 * API routes for customer management.
 * All routes require authentication (requireAuth applied at mount level in index.ts).
 */

import { Router } from 'express'
import * as customerController from '../controllers/customer.controller.js'
import * as customerArtifactController from '../controllers/customer-artifact.controller.js'
import { agreementsRouter } from './agreements.js'
import { receivablesRouter } from './receivables.js'
import { projectsRouter } from './projects.js'
import { actionItemsRouter } from './action-items.js'

const router = Router()

// Search, stats, and artifact search (must come BEFORE /:id to avoid route collision)
router.get('/search', customerController.searchCustomers)
router.get('/stats', customerController.getDashboardStats)
router.get('/artifacts/search', customerController.searchArtifacts)

// Customer CRUD
router.get('/', customerController.listCustomers)
router.get('/:id', customerController.getCustomer)
router.post('/', customerController.createCustomer)
router.put('/:id', customerController.updateCustomer)
router.patch('/:id/status', customerController.updateCustomerStatus)
router.delete('/:id', customerController.deleteCustomer)

// Customer Events
router.get('/:id/events', customerController.listCustomerEvents)
router.post('/:id/events', customerController.createCustomerEvent)

// Nested sub-routes (agreements, receivables, projects)
router.use('/:id/agreements', agreementsRouter)
router.use('/:id/receivables', receivablesRouter)
router.use('/:id/projects', projectsRouter)
router.use('/:id/action-items', actionItemsRouter)

// Flat artifact route (all artifacts across all projects for a customer)
router.get('/:id/artifacts', customerArtifactController.listCustomerArtifacts)

export default router
