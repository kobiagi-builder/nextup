/**
 * InitiativeService Unit Tests
 *
 * Tests CRUD operations and the safe-delete flow (move docs → delete initiative).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InitiativeService } from '../../../services/InitiativeService.js'

// =============================================================================
// Mocks
// =============================================================================

// Mutable so individual tests can override the return value
const mockGetDefaultFolder = vi.fn()

vi.mock('../../../services/DocumentFolderService.js', () => ({
  DocumentFolderService: class {
    getDefaultFolder = mockGetDefaultFolder
  },
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

const TEST_CUSTOMER_ID = 'a0000000-0000-0000-0000-000000000001'
const TEST_INITIATIVE_ID = 'b0000000-0000-0000-0000-000000000001'

const GENERAL_FOLDER = {
  id: 'general-folder-id',
  name: 'General',
  slug: 'general',
  is_system: true,
  is_default: true,
  customer_id: null,
  user_id: null,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: General folder is always found
  mockGetDefaultFolder.mockResolvedValue(GENERAL_FOLDER)
})

// =============================================================================
// Chainable Supabase Mock Builder
// =============================================================================

/**
 * Creates a chainable mock for the Supabase query builder pattern.
 *
 * Each call to .from() should return a fresh chain. The `data` and `error`
 * params represent the final resolved value of the query.
 */
function makeChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {}

  const resolved = Promise.resolve({ data, error })

  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({ data, error })

  // Make the chain itself thenable so `await chain` resolves to { data, error }
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    resolved.then(resolve, reject)

  return chain
}

// =============================================================================
// Tests — list()
// =============================================================================

describe('InitiativeService.list()', () => {
  it('returns initiatives with documents_count derived from nested join', async () => {
    const rawRow = {
      id: TEST_INITIATIVE_ID,
      name: 'Q1 Strategy',
      customer_id: TEST_CUSTOMER_ID,
      status: 'active',
      customer_documents: [{ count: 5 }],
    }
    const chain = makeChain([rawRow])
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    const result = await service.list(TEST_CUSTOMER_ID)

    expect(mockSupabase.from).toHaveBeenCalledWith('customer_initiatives')
    expect(chain.select).toHaveBeenCalledWith('*, customer_documents(count)')
    expect(chain.eq).toHaveBeenCalledWith('customer_id', TEST_CUSTOMER_ID)
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })

    expect(result).toHaveLength(1)
    expect(result[0].documents_count).toBe(5)
    // customer_documents should not be in the returned shape
    expect((result[0] as any).customer_documents).toBeUndefined()
  })

  it('defaults documents_count to 0 when count array is empty', async () => {
    const rawRow = {
      id: TEST_INITIATIVE_ID,
      name: 'Empty Initiative',
      customer_id: TEST_CUSTOMER_ID,
      status: 'planning',
      customer_documents: [],
    }
    const chain = makeChain([rawRow])
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    const result = await service.list(TEST_CUSTOMER_ID)

    expect(result[0].documents_count).toBe(0)
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'DB error', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)

    await expect(service.list(TEST_CUSTOMER_ID)).rejects.toMatchObject({ message: 'DB error' })
  })
})

// =============================================================================
// Tests — getById()
// =============================================================================

describe('InitiativeService.getById()', () => {
  it('returns single initiative with documents_count', async () => {
    const rawRow = {
      id: TEST_INITIATIVE_ID,
      name: 'Roadmap 2025',
      customer_id: TEST_CUSTOMER_ID,
      status: 'active',
      customer_documents: [{ count: 3 }],
    }
    const chain = makeChain(rawRow)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    const result = await service.getById(TEST_INITIATIVE_ID)

    expect(chain.select).toHaveBeenCalledWith('*, customer_documents(count)')
    expect(chain.eq).toHaveBeenCalledWith('id', TEST_INITIATIVE_ID)
    expect(chain.single).toHaveBeenCalled()

    expect(result).not.toBeNull()
    expect(result!.documents_count).toBe(3)
    expect((result as any).customer_documents).toBeUndefined()
  })

  it('returns null when error code is PGRST116 (not found)', async () => {
    const chain = makeChain(null, { code: 'PGRST116', message: 'Not found' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    const result = await service.getById(TEST_INITIATIVE_ID)

    expect(result).toBeNull()
  })

  it('throws on unexpected database error', async () => {
    const chain = makeChain(null, { code: '500', message: 'Unexpected error' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)

    await expect(service.getById(TEST_INITIATIVE_ID)).rejects.toMatchObject({ code: '500' })
  })
})

// =============================================================================
// Tests — create()
// =============================================================================

describe('InitiativeService.create()', () => {
  it('creates initiative with correct fields and defaults', async () => {
    const created = {
      id: TEST_INITIATIVE_ID,
      customer_id: TEST_CUSTOMER_ID,
      name: 'New Initiative',
      description: null,
      status: 'planning',
      agreement_id: null,
      metadata: {},
    }
    const chain = makeChain(created)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    const result = await service.create(TEST_CUSTOMER_ID, { name: 'New Initiative' })

    expect(chain.insert).toHaveBeenCalledWith({
      customer_id: TEST_CUSTOMER_ID,
      name: 'New Initiative',
      description: null,
      status: 'planning',
      agreement_id: null,
      metadata: {},
    })
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
    expect(result).toEqual(created)
  })

  it('uses provided status and description', async () => {
    const created = {
      id: TEST_INITIATIVE_ID,
      name: 'Active Project',
      status: 'active',
      description: 'A description',
    }
    const chain = makeChain(created)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    await service.create(TEST_CUSTOMER_ID, {
      name: 'Active Project',
      description: 'A description',
      status: 'active',
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Active Project',
        description: 'A description',
        status: 'active',
      })
    )
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Insert failed', code: '23505' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)

    await expect(
      service.create(TEST_CUSTOMER_ID, { name: 'Duplicate' })
    ).rejects.toMatchObject({ message: 'Insert failed' })
  })
})

// =============================================================================
// Tests — update()
// =============================================================================

describe('InitiativeService.update()', () => {
  it('updates only provided fields', async () => {
    const updated = { id: TEST_INITIATIVE_ID, name: 'Renamed', status: 'active' }
    const chain = makeChain(updated)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    const result = await service.update(TEST_INITIATIVE_ID, { name: 'Renamed', status: 'active' })

    expect(chain.update).toHaveBeenCalledWith({ name: 'Renamed', status: 'active' })
    expect(chain.eq).toHaveBeenCalledWith('id', TEST_INITIATIVE_ID)
    expect(result).toEqual(updated)
  })

  it('sends only name when only name is provided', async () => {
    const updated = { id: TEST_INITIATIVE_ID, name: 'Only Name' }
    const chain = makeChain(updated)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)
    await service.update(TEST_INITIATIVE_ID, { name: 'Only Name' })

    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg).toEqual({ name: 'Only Name' })
    expect(updateArg).not.toHaveProperty('status')
    expect(updateArg).not.toHaveProperty('description')
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Update failed', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new InitiativeService(mockSupabase)

    await expect(service.update(TEST_INITIATIVE_ID, { name: 'X' })).rejects.toMatchObject({
      message: 'Update failed',
    })
  })
})

// =============================================================================
// Tests — delete()
// =============================================================================

describe('InitiativeService.delete()', () => {
  it('moves documents to General folder, then deletes initiative', async () => {
    // We need two separate chains: one for the documents update, one for delete
    const moveChain = makeChain([{ id: 'doc-1' }, { id: 'doc-2' }])
    const deleteChain = makeChain(null)

    let callCount = 0
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'customer_documents') return moveChain
        if (table === 'customer_initiatives') {
          callCount++
          return deleteChain
        }
        return makeChain()
      }),
    } as any

    const service = new InitiativeService(mockSupabase)
    const result = await service.delete(TEST_INITIATIVE_ID)

    // Verify documents were moved to General folder
    expect(moveChain.update).toHaveBeenCalledWith({
      initiative_id: null,
      folder_id: 'general-folder-id',
    })
    expect(moveChain.eq).toHaveBeenCalledWith('initiative_id', TEST_INITIATIVE_ID)

    // Verify initiative was deleted
    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('id', TEST_INITIATIVE_ID)

    // Verify moved_documents count
    expect(result).toEqual({ moved_documents: 2 })
  })

  it('throws when General folder is not found', async () => {
    // Override the shared mock for this test to simulate missing General folder
    mockGetDefaultFolder.mockResolvedValue(null)

    const mockSupabase = { from: vi.fn() } as any
    const service = new InitiativeService(mockSupabase)

    await expect(service.delete(TEST_INITIATIVE_ID)).rejects.toThrow(
      'General folder not found'
    )
  })
})
