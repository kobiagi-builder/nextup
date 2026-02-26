/**
 * Customer Controller
 *
 * Express request handlers for customer CRUD operations.
 * Uses inline Zod validation and CustomerService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { CustomerService } from '../services/CustomerService.js'
import { VALID_CUSTOMER_STATUSES } from '../types/customer.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const customerStatusSchema = z.enum([
  'lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive',
])

const teamMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
})

const customerInfoSchema = z.object({
  about: z.string().optional(),
  vertical: z.string().optional(),
  persona: z.string().optional(),
  icp: z.string().optional(),
  product: z.object({
    name: z.string().optional(),
    stage: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
  team: z.array(teamMemberSchema).optional(),
}).passthrough() // Allow extensible fields

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  status: customerStatusSchema.optional(),
  info: customerInfoSchema.optional(),
})

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: customerStatusSchema.optional(),
  info: customerInfoSchema.optional(),
})

const updateStatusSchema = z.object({
  status: customerStatusSchema,
})

const createEventSchema = z.object({
  event_type: z.string().optional(),
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  participants: z.array(z.string()).optional(),
  event_date: z.string().datetime({ message: 'event_date must be a valid ISO datetime' }).optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(req: Request): CustomerService {
  return new CustomerService(getSupabase())
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers
 * List all customers for authenticated user.
 */
export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined
    const sort = req.query.sort as string | undefined

    // Validate status if provided
    if (status && !VALID_CUSTOMER_STATUSES.includes(status as any)) {
      res.status(400).json({
        error: 'Validation error',
        message: `status must be one of: ${VALID_CUSTOMER_STATUSES.join(', ')}`,
      })
      return
    }

    const service = getService(req)
    const summary = req.query.summary === 'true'

    if (summary) {
      const customers = await service.listWithSummary({ status: status as any, search, sort })
      res.status(200).json({ customers, count: customers.length })
    } else {
      const customers = await service.list({ status: status as any, search, sort })
      res.status(200).json({ customers, count: customers.length })
    }
  } catch (error) {
    logger.error('[CustomerController] Error in listCustomers', {
      sourceCode: 'listCustomers',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/:id
 * Get single customer with tab counts.
 */
export const getCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const service = getService(req)
    const customer = await service.getById(id)

    if (!customer) {
      res.status(404).json({ error: 'Not found', message: 'Customer not found' })
      return
    }

    res.status(200).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in getCustomer', {
      sourceCode: 'getCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers
 * Create a new customer.
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const parsed = createCustomerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[CustomerController] Creating customer', {
      hasUserId: true,
      hasStatus: !!parsed.data.status,
      hasInfo: !!parsed.data.info,
    })

    const service = getService(req)
    const customer = await service.create(userId, parsed.data)

    res.status(201).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in createCustomer', {
      sourceCode: 'createCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PUT /api/customers/:id
 * Update customer (partial update).
 */
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const parsed = updateCustomerSchema.safeParse(req.body)
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

    logger.info('[CustomerController] Updating customer', {
      hasCustomerId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService(req)
    const customer = await service.update(id, parsed.data)

    res.status(200).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in updateCustomer', {
      sourceCode: 'updateCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PATCH /api/customers/:id/status
 * Quick status update.
 */
export const updateCustomerStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const parsed = updateStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: `status must be one of: ${VALID_CUSTOMER_STATUSES.join(', ')}`,
      })
      return
    }

    logger.info('[CustomerController] Updating customer status', {
      hasCustomerId: true,
      newStatus: parsed.data.status,
    })

    const service = getService(req)
    const customer = await service.updateStatus(id, parsed.data.status)

    res.status(200).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in updateCustomerStatus', {
      sourceCode: 'updateCustomerStatus',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id
 * Soft delete customer.
 */
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    logger.info('[CustomerController] Deleting customer (soft)', {
      hasCustomerId: true,
    })

    const service = getService(req)
    await service.delete(id)

    res.status(200).json({ message: 'Customer archived successfully' })
  } catch (error) {
    logger.error('[CustomerController] Error in deleteCustomer', {
      sourceCode: 'deleteCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

// =============================================================================
// Search, Stats, and Artifact Search (Phase 5)
// =============================================================================

/**
 * GET /api/customers/search?q=...
 * Full-text search across customers.
 */
export const searchCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const q = (req.query.q as string || '').trim()
    if (!q || q.length < 2) {
      res.status(400).json({ error: 'Validation error', message: 'Search query must be at least 2 characters' })
      return
    }

    const service = getService(req)
    const customers = await service.search(q)

    res.status(200).json({ customers, count: customers.length })
  } catch (error) {
    logger.error('[CustomerController] Error in searchCustomers', {
      sourceCode: 'searchCustomers',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/stats
 * Dashboard stats across all customers.
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const service = getService(req)
    const stats = await service.getDashboardStats()

    res.status(200).json(stats)
  } catch (error) {
    logger.error('[CustomerController] Error in getDashboardStats', {
      sourceCode: 'getDashboardStats',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/artifacts/search?q=...
 * Search customer artifacts by title for cross-module linking.
 */
export const searchArtifacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const q = (req.query.q as string || '').trim()
    if (!q || q.length < 2) {
      res.status(400).json({ error: 'Validation error', message: 'Search query must be at least 2 characters' })
      return
    }

    const query = q.slice(0, 200)

    const service = getService(req)
    const artifacts = await service.searchArtifacts(query)

    res.status(200).json({ artifacts, count: artifacts.length })
  } catch (error) {
    logger.error('[CustomerController] Error in searchArtifacts', {
      sourceCode: 'searchArtifacts',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

// =============================================================================
// Customer Events
// =============================================================================

/**
 * GET /api/customers/:id/events
 * List events for a customer.
 */
export const listCustomerEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const service = getService(req)
    const events = await service.listEvents(id)

    res.status(200).json({ events, count: events.length })
  } catch (error) {
    logger.error('[CustomerController] Error in listCustomerEvents', {
      sourceCode: 'listCustomerEvents',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/events
 * Create a new event for a customer.
 */
export const createCustomerEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const parsed = createEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    const service = getService(req)
    const event = await service.createEvent(id, parsed.data)

    res.status(201).json(event)
  } catch (error) {
    logger.error('[CustomerController] Error in createCustomerEvent', {
      sourceCode: 'createCustomerEvent',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
