/**
 * Initiative Controller Unit Tests
 *
 * Tests CRUD handlers for the customer initiatives resource.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import {
  listInitiatives,
  getInitiative,
  createInitiative,
  updateInitiative,
  deleteInitiative,
} from '../../../controllers/initiative.controller.js'

// =============================================================================
// Mocks
// =============================================================================

// Create stable mock methods that survive vi.restoreAllMocks() from global setup
const mockServiceInstance = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../../../services/InitiativeService.js', () => ({
  InitiativeService: class {
    list = mockServiceInstance.list
    getById = mockServiceInstance.getById
    create = mockServiceInstance.create
    update = mockServiceInstance.update
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
const TEST_CUSTOMER_ID = 'b0000000-0000-0000-0000-000000000002'
const TEST_INITIATIVE_ID = 'c0000000-0000-0000-0000-000000000003'
const TEST_AGREEMENT_ID = 'd0000000-e29b-41d4-a716-446655440000'

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
// Tests — listInitiatives
// =============================================================================

describe('listInitiatives', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await listInitiatives(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when customer ID is missing', async () => {
    const req = createMockReq({ params: { id: '' } as any })
    const res = createMockRes()

    await listInitiatives(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 200 with initiatives array', async () => {
    const initiatives = [
      { id: TEST_INITIATIVE_ID, name: 'Q1 Strategy', documents_count: 3 },
    ]
    mockServiceInstance.list.mockResolvedValue(initiatives)

    const req = createMockReq({ params: { id: TEST_CUSTOMER_ID } as any })
    const res = createMockRes()

    await listInitiatives(req, res)

    expect(mockServiceInstance.list).toHaveBeenCalledWith(TEST_CUSTOMER_ID)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ initiatives, count: 1 })
  })

  it('returns empty initiatives array when customer has none', async () => {
    mockServiceInstance.list.mockResolvedValue([])

    const req = createMockReq({ params: { id: TEST_CUSTOMER_ID } as any })
    const res = createMockRes()

    await listInitiatives(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ initiatives: [], count: 0 })
  })

  it('returns 500 on service error', async () => {
    mockServiceInstance.list.mockRejectedValue(new Error('DB error'))

    const req = createMockReq({ params: { id: TEST_CUSTOMER_ID } as any })
    const res = createMockRes()

    await listInitiatives(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// =============================================================================
// Tests — getInitiative
// =============================================================================

describe('getInitiative', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await getInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when initiative ID is missing', async () => {
    const req = createMockReq({ params: { initiativeId: '' } as any })
    const res = createMockRes()

    await getInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 200 with initiative data', async () => {
    const initiative = { id: TEST_INITIATIVE_ID, name: 'Roadmap 2025', documents_count: 7 }
    mockServiceInstance.getById.mockResolvedValue(initiative)

    const req = createMockReq({ params: { initiativeId: TEST_INITIATIVE_ID } as any })
    const res = createMockRes()

    await getInitiative(req, res)

    expect(mockServiceInstance.getById).toHaveBeenCalledWith(TEST_INITIATIVE_ID)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(initiative)
  })

  it('returns 404 when initiative is not found', async () => {
    mockServiceInstance.getById.mockResolvedValue(null)

    const req = createMockReq({ params: { initiativeId: TEST_INITIATIVE_ID } as any })
    const res = createMockRes()

    await getInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Not found' })
    )
  })

  it('returns 500 on service error', async () => {
    mockServiceInstance.getById.mockRejectedValue(new Error('DB error'))

    const req = createMockReq({ params: { initiativeId: TEST_INITIATIVE_ID } as any })
    const res = createMockRes()

    await getInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// =============================================================================
// Tests — createInitiative
// =============================================================================

describe('createInitiative', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await createInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when customer ID is missing', async () => {
    const req = createMockReq({ params: { id: '' } as any, body: { name: 'Test' } })
    const res = createMockRes()

    await createInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for validation error when name is empty', async () => {
    const req = createMockReq({
      params: { id: TEST_CUSTOMER_ID } as any,
      body: { name: '' },
    })
    const res = createMockRes()

    await createInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error' })
    )
  })

  it('returns 201 with created initiative', async () => {
    const created = {
      id: TEST_INITIATIVE_ID,
      customer_id: TEST_CUSTOMER_ID,
      name: 'New Initiative',
      status: 'planning',
    }
    mockServiceInstance.create.mockResolvedValue(created)

    const req = createMockReq({
      params: { id: TEST_CUSTOMER_ID } as any,
      body: { name: 'New Initiative' },
    })
    const res = createMockRes()

    await createInitiative(req, res)

    expect(mockServiceInstance.create).toHaveBeenCalledWith(
      TEST_CUSTOMER_ID,
      expect.objectContaining({ name: 'New Initiative' })
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(created)
  })

  it('passes optional fields (description, status, agreement_id) to service', async () => {
    const created = { id: TEST_INITIATIVE_ID, name: 'Full Initiative', status: 'active' }
    mockServiceInstance.create.mockResolvedValue(created)

    const req = createMockReq({
      params: { id: TEST_CUSTOMER_ID } as any,
      body: {
        name: 'Full Initiative',
        description: 'A detailed description',
        status: 'active',
        agreement_id: TEST_AGREEMENT_ID,
      },
    })
    const res = createMockRes()

    await createInitiative(req, res)

    expect(mockServiceInstance.create).toHaveBeenCalledWith(
      TEST_CUSTOMER_ID,
      expect.objectContaining({
        name: 'Full Initiative',
        description: 'A detailed description',
        status: 'active',
        agreement_id: TEST_AGREEMENT_ID,
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('returns 400 for invalid status enum value', async () => {
    const req = createMockReq({
      params: { id: TEST_CUSTOMER_ID } as any,
      body: { name: 'Test', status: 'invalid_status' },
    })
    const res = createMockRes()

    await createInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error' })
    )
  })

  it('returns 500 on service error', async () => {
    mockServiceInstance.create.mockRejectedValue(new Error('DB error'))

    const req = createMockReq({
      params: { id: TEST_CUSTOMER_ID } as any,
      body: { name: 'Test Initiative' },
    })
    const res = createMockRes()

    await createInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// =============================================================================
// Tests — updateInitiative
// =============================================================================

describe('updateInitiative', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await updateInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when initiative ID is missing', async () => {
    const req = createMockReq({ params: { initiativeId: '' } as any })
    const res = createMockRes()

    await updateInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when no update fields provided', async () => {
    const req = createMockReq({
      params: { initiativeId: TEST_INITIATIVE_ID } as any,
      body: {},
    })
    const res = createMockRes()

    await updateInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No updates provided' })
    )
  })

  it('returns 200 with updated initiative', async () => {
    const updated = { id: TEST_INITIATIVE_ID, name: 'Renamed', status: 'active' }
    mockServiceInstance.update.mockResolvedValue(updated)

    const req = createMockReq({
      params: { initiativeId: TEST_INITIATIVE_ID } as any,
      body: { name: 'Renamed', status: 'active' },
    })
    const res = createMockRes()

    await updateInitiative(req, res)

    expect(mockServiceInstance.update).toHaveBeenCalledWith(
      TEST_INITIATIVE_ID,
      expect.objectContaining({ name: 'Renamed', status: 'active' })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('returns 400 for invalid status enum in update', async () => {
    const req = createMockReq({
      params: { initiativeId: TEST_INITIATIVE_ID } as any,
      body: { status: 'not_a_valid_status' },
    })
    const res = createMockRes()

    await updateInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 500 on service error', async () => {
    mockServiceInstance.update.mockRejectedValue(new Error('DB error'))

    const req = createMockReq({
      params: { initiativeId: TEST_INITIATIVE_ID } as any,
      body: { name: 'Updated' },
    })
    const res = createMockRes()

    await updateInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// =============================================================================
// Tests — deleteInitiative
// =============================================================================

describe('deleteInitiative', () => {
  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await deleteInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when initiative ID is missing', async () => {
    const req = createMockReq({ params: { initiativeId: '' } as any })
    const res = createMockRes()

    await deleteInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 200 with moved_documents count', async () => {
    mockServiceInstance.delete.mockResolvedValue({ moved_documents: 4 })

    const req = createMockReq({ params: { initiativeId: TEST_INITIATIVE_ID } as any })
    const res = createMockRes()

    await deleteInitiative(req, res)

    expect(mockServiceInstance.delete).toHaveBeenCalledWith(TEST_INITIATIVE_ID)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Initiative deleted successfully',
      moved_documents: 4,
    })
  })

  it('returns 200 with moved_documents of 0 when initiative had no docs', async () => {
    mockServiceInstance.delete.mockResolvedValue({ moved_documents: 0 })

    const req = createMockReq({ params: { initiativeId: TEST_INITIATIVE_ID } as any })
    const res = createMockRes()

    await deleteInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ moved_documents: 0 })
    )
  })

  it('returns 500 on service error', async () => {
    mockServiceInstance.delete.mockRejectedValue(new Error('DB error'))

    const req = createMockReq({ params: { initiativeId: TEST_INITIATIVE_ID } as any })
    const res = createMockRes()

    await deleteInitiative(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
