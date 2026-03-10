/**
 * CustomerDocumentService Unit Tests
 *
 * Tests CRUD operations for customer documents.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerDocumentService } from '../../../services/CustomerDocumentService.js'

// =============================================================================
// Mocks
// =============================================================================

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
const TEST_INITIATIVE_ID = 'b0000000-0000-0000-0000-000000000002'
const TEST_DOCUMENT_ID = 'c0000000-0000-0000-0000-000000000003'
const TEST_FOLDER_ID = 'd0000000-0000-0000-0000-000000000004'

// =============================================================================
// Chainable Supabase Mock Builder
// =============================================================================

function makeChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const resolved = Promise.resolve({ data, error })

  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({ data, error })

  // Make thenable for `await chain`
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    resolved.then(resolve, reject)

  return chain
}

// =============================================================================
// Sample Fixtures
// =============================================================================

const sampleDocument = {
  id: TEST_DOCUMENT_ID,
  customer_id: TEST_CUSTOMER_ID,
  initiative_id: TEST_INITIATIVE_ID,
  title: 'Discovery Report',
  type: 'research',
  content: '<p>Content</p>',
  status: 'draft',
  folder_id: null,
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// =============================================================================
// Tests — listByInitiative()
// =============================================================================

describe('CustomerDocumentService.listByInitiative()', () => {
  it('queries customer_documents filtered by initiative_id', async () => {
    const chain = makeChain([sampleDocument])
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    const result = await service.listByInitiative(TEST_INITIATIVE_ID)

    expect(mockSupabase.from).toHaveBeenCalledWith('customer_documents')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('initiative_id', TEST_INITIATIVE_ID)
    expect(chain.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(result).toEqual([sampleDocument])
  })

  it('returns empty array when no documents exist', async () => {
    const chain = makeChain([])
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    const result = await service.listByInitiative(TEST_INITIATIVE_ID)

    expect(result).toEqual([])
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'DB error', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)

    await expect(service.listByInitiative(TEST_INITIATIVE_ID)).rejects.toMatchObject({
      message: 'DB error',
    })
  })
})

// =============================================================================
// Tests — listByCustomer()
// =============================================================================

describe('CustomerDocumentService.listByCustomer()', () => {
  it('queries customer_documents filtered by customer_id', async () => {
    const chain = makeChain([sampleDocument])
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    const result = await service.listByCustomer(TEST_CUSTOMER_ID)

    expect(mockSupabase.from).toHaveBeenCalledWith('customer_documents')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('customer_id', TEST_CUSTOMER_ID)
    expect(chain.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(result).toEqual([sampleDocument])
  })

  it('returns multiple documents across initiatives', async () => {
    const docs = [
      { ...sampleDocument, id: 'doc-1', initiative_id: 'init-1' },
      { ...sampleDocument, id: 'doc-2', initiative_id: 'init-2' },
    ]
    const chain = makeChain(docs)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    const result = await service.listByCustomer(TEST_CUSTOMER_ID)

    expect(result).toHaveLength(2)
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Query error', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)

    await expect(service.listByCustomer(TEST_CUSTOMER_ID)).rejects.toMatchObject({
      message: 'Query error',
    })
  })
})

// =============================================================================
// Tests — create()
// =============================================================================

describe('CustomerDocumentService.create()', () => {
  it('creates document with initiative_id, customer_id and defaults', async () => {
    const chain = makeChain(sampleDocument)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    const result = await service.create(TEST_INITIATIVE_ID, TEST_CUSTOMER_ID, {
      title: 'Discovery Report',
    })

    expect(chain.insert).toHaveBeenCalledWith({
      initiative_id: TEST_INITIATIVE_ID,
      customer_id: TEST_CUSTOMER_ID,
      title: 'Discovery Report',
      type: 'custom',
      content: '',
      status: 'draft',
      metadata: {},
    })
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
    expect(result).toEqual(sampleDocument)
  })

  it('uses provided type, content, and status', async () => {
    const chain = makeChain({ ...sampleDocument, type: 'competitive_analysis', status: 'final' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    await service.create(TEST_INITIATIVE_ID, TEST_CUSTOMER_ID, {
      title: 'Final Report',
      type: 'research',
      content: '<h1>Report</h1>',
      status: 'final',
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'research',
        content: '<h1>Report</h1>',
        status: 'final',
      })
    )
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Insert failed', code: '23505' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)

    await expect(
      service.create(TEST_INITIATIVE_ID, TEST_CUSTOMER_ID, { title: 'Doc' })
    ).rejects.toMatchObject({ message: 'Insert failed' })
  })
})

// =============================================================================
// Tests — update()
// =============================================================================

describe('CustomerDocumentService.update()', () => {
  it('updates only provided fields', async () => {
    const updated = { ...sampleDocument, title: 'Updated Title' }
    const chain = makeChain(updated)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    const result = await service.update(TEST_DOCUMENT_ID, { title: 'Updated Title' })

    expect(chain.update).toHaveBeenCalledWith({ title: 'Updated Title' })
    expect(chain.eq).toHaveBeenCalledWith('id', TEST_DOCUMENT_ID)
    expect(result).toEqual(updated)
  })

  it('can update initiative_id and folder_id for document movement', async () => {
    const updated = { ...sampleDocument, initiative_id: 'new-init-id', folder_id: TEST_FOLDER_ID }
    const chain = makeChain(updated)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    await service.update(TEST_DOCUMENT_ID, {
      initiative_id: 'new-init-id',
      folder_id: TEST_FOLDER_ID,
    })

    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg).toEqual({
      initiative_id: 'new-init-id',
      folder_id: TEST_FOLDER_ID,
    })
    // Fields not provided should not appear in the update payload
    expect(updateArg).not.toHaveProperty('title')
    expect(updateArg).not.toHaveProperty('content')
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Update failed', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)

    await expect(service.update(TEST_DOCUMENT_ID, { title: 'X' })).rejects.toMatchObject({
      message: 'Update failed',
    })
  })
})

// =============================================================================
// Tests — delete()
// =============================================================================

describe('CustomerDocumentService.delete()', () => {
  it('deletes document by id', async () => {
    const chain = makeChain(null)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)
    await service.delete(TEST_DOCUMENT_ID)

    expect(mockSupabase.from).toHaveBeenCalledWith('customer_documents')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', TEST_DOCUMENT_ID)
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Delete failed', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new CustomerDocumentService(mockSupabase)

    await expect(service.delete(TEST_DOCUMENT_ID)).rejects.toMatchObject({
      message: 'Delete failed',
    })
  })
})
