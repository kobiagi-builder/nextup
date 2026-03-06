/**
 * Action Items Board Controller Unit Tests
 *
 * Tests CRUD handlers for the cross-customer Kanban board.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import {
  listBoardActionItems,
  createBoardActionItem,
  updateBoardActionItem,
  deleteBoardActionItem,
} from '../../../controllers/action-items-board.controller.js'

// =============================================================================
// Mocks
// =============================================================================

// Create stable mock methods that survive vi.restoreAllMocks() from global setup
const mockServiceInstance = {
  listAll: vi.fn(),
  createForBoard: vi.fn(),
  updateForBoard: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../../../services/ActionItemService.js', () => ({
  ActionItemService: class {
    listAll = mockServiceInstance.listAll
    createForBoard = mockServiceInstance.createForBoard
    updateForBoard = mockServiceInstance.updateForBoard
    delete = mockServiceInstance.delete
  },
}))

vi.mock('../../../lib/requestContext.js', () => ({
  getSupabase: () => ({}),
}))

vi.mock('../../../lib/logger.js', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}))

// =============================================================================
// Test UUIDs
// =============================================================================

const TEST_USER_ID = 'a0000000-0000-0000-0000-000000000001'
const TEST_ITEM_ID = 'b0000000-0000-0000-0000-000000000001'
const TEST_CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000'
const TEST_FILTER_CUSTOMER_ID = 'c0000000-0000-0000-0000-000000000001'

// =============================================================================
// Helpers
// =============================================================================

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: TEST_USER_ID },
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request
}

function createMockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// Tests
// =============================================================================

describe('listBoardActionItems', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await listBoardActionItems(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns items with 200 status', async () => {
    const mockItems = [
      { id: '1', description: 'Test', status: 'todo', customer_name: 'Acme' },
    ]
    mockServiceInstance.listAll.mockResolvedValue(mockItems)

    const req = createMockReq()
    const res = createMockRes()

    await listBoardActionItems(req, res)

    expect(mockServiceInstance.listAll).toHaveBeenCalledWith(TEST_USER_ID, {})
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: mockItems, count: 1 })
  })

  it('passes customer_id filter to service', async () => {
    mockServiceInstance.listAll.mockResolvedValue([])

    const req = createMockReq({ query: { customer_id: TEST_FILTER_CUSTOMER_ID } as any })
    const res = createMockRes()

    await listBoardActionItems(req, res)

    expect(mockServiceInstance.listAll).toHaveBeenCalledWith(TEST_USER_ID, { customer_id: TEST_FILTER_CUSTOMER_ID })
  })

  it('passes status filter as array to service', async () => {
    mockServiceInstance.listAll.mockResolvedValue([])

    const req = createMockReq({ query: { status: 'todo,in_progress' } as any })
    const res = createMockRes()

    await listBoardActionItems(req, res)

    expect(mockServiceInstance.listAll).toHaveBeenCalledWith(TEST_USER_ID, { status: ['todo', 'in_progress'] })
  })

  it('returns 500 on service error', async () => {
    mockServiceInstance.listAll.mockRejectedValue(new Error('DB error'))

    const req = createMockReq()
    const res = createMockRes()

    await listBoardActionItems(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('createBoardActionItem', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await createBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 on validation error (empty description)', async () => {
    const req = createMockReq({ body: { description: '' } })
    const res = createMockRes()

    await createBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error' })
    )
  })

  it('creates action item with null customer_id', async () => {
    const created = { id: 'new-1', description: 'Test', status: 'todo', customer_id: null }
    mockServiceInstance.createForBoard.mockResolvedValue(created)

    const req = createMockReq({
      body: { description: 'Test task' },
    })
    const res = createMockRes()

    await createBoardActionItem(req, res)

    expect(mockServiceInstance.createForBoard).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining({
      description: 'Test task',
    }))
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(created)
  })

  it('creates action item with customer_id', async () => {
    const created = { id: 'new-2', description: 'Test', customer_id: 'cust-1' }
    mockServiceInstance.createForBoard.mockResolvedValue(created)

    const req = createMockReq({
      body: {
        description: 'Customer task',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'meeting',
      },
    })
    const res = createMockRes()

    await createBoardActionItem(req, res)

    expect(mockServiceInstance.createForBoard).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining({
      description: 'Customer task',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'meeting',
    }))
    expect(res.status).toHaveBeenCalledWith(201)
  })
})

describe('updateBoardActionItem', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await updateBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when no ID provided', async () => {
    const req = createMockReq({ params: { id: '' } as any })
    const res = createMockRes()

    await updateBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when no updates provided (empty body)', async () => {
    const req = createMockReq({ params: { id: TEST_ITEM_ID } as any, body: {} })
    const res = createMockRes()

    await updateBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No updates provided' })
    )
  })

  it('updates status (drag-and-drop simulation)', async () => {
    const updated = { id: TEST_ITEM_ID, status: 'in_progress' }
    mockServiceInstance.updateForBoard.mockResolvedValue(updated)

    const req = createMockReq({
      params: { id: TEST_ITEM_ID } as any,
      body: { status: 'in_progress' },
    })
    const res = createMockRes()

    await updateBoardActionItem(req, res)

    expect(mockServiceInstance.updateForBoard).toHaveBeenCalledWith(TEST_ITEM_ID, { status: 'in_progress' })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('updates customer_id (reassignment)', async () => {
    const updated = { id: TEST_ITEM_ID, customer_id: '550e8400-e29b-41d4-a716-446655440000' }
    mockServiceInstance.updateForBoard.mockResolvedValue(updated)

    const req = createMockReq({
      params: { id: TEST_ITEM_ID } as any,
      body: { customer_id: '550e8400-e29b-41d4-a716-446655440000' },
    })
    const res = createMockRes()

    await updateBoardActionItem(req, res)

    expect(mockServiceInstance.updateForBoard).toHaveBeenCalledWith(TEST_ITEM_ID, {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

describe('deleteBoardActionItem', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await deleteBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when no ID provided', async () => {
    const req = createMockReq({ params: { id: '' } as any })
    const res = createMockRes()

    await deleteBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('deletes item and returns 200', async () => {
    mockServiceInstance.delete.mockResolvedValue(undefined)

    const req = createMockReq({ params: { id: TEST_ITEM_ID } as any })
    const res = createMockRes()

    await deleteBoardActionItem(req, res)

    expect(mockServiceInstance.delete).toHaveBeenCalledWith(TEST_ITEM_ID)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ message: 'Action item deleted successfully' })
  })

  it('returns 500 on service error', async () => {
    mockServiceInstance.delete.mockRejectedValue(new Error('DB error'))

    const req = createMockReq({ params: { id: TEST_ITEM_ID } as any })
    const res = createMockRes()

    await deleteBoardActionItem(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
