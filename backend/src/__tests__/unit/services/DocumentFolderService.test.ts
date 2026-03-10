/**
 * DocumentFolderService Unit Tests
 *
 * Tests folder CRUD, default folder lookup, and the safe-delete flow
 * (move docs to General → delete folder).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentFolderService } from '../../../services/DocumentFolderService.js'

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

const TEST_USER_ID = 'a0000000-0000-0000-0000-000000000001'
const TEST_CUSTOMER_ID = 'b0000000-0000-0000-0000-000000000002'
const TEST_FOLDER_ID = 'c0000000-0000-0000-0000-000000000003'
const GENERAL_FOLDER_ID = 'd0000000-0000-0000-0000-000000000004'

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
  chain.is = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({ data, error })

  // Make thenable for `await chain`
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    resolved.then(resolve, reject)

  return chain
}

// =============================================================================
// Sample Fixtures
// =============================================================================

const generalFolder = {
  id: GENERAL_FOLDER_ID,
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

const customFolder = {
  id: TEST_FOLDER_ID,
  name: 'Q1 Deliverables',
  slug: 'q1-deliverables',
  is_system: false,
  is_default: false,
  customer_id: TEST_CUSTOMER_ID,
  user_id: TEST_USER_ID,
  sort_order: 1,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

// =============================================================================
// Tests — getFolders()
// =============================================================================

describe('DocumentFolderService.getFolders()', () => {
  it('filters by customer_id IS NULL when no customerId provided', async () => {
    const chain = makeChain([generalFolder])
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.getFolders()

    expect(mockSupabase.from).toHaveBeenCalledWith('document_folders')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true })
    expect(chain.is).toHaveBeenCalledWith('customer_id', null)
    expect(result).toEqual([generalFolder])
  })

  it('uses OR filter for both global and customer-specific folders when customerId provided', async () => {
    const folders = [generalFolder, customFolder]
    const chain = makeChain(folders)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.getFolders(TEST_CUSTOMER_ID)

    expect(chain.or).toHaveBeenCalledWith(
      `customer_id.is.null,customer_id.eq.${TEST_CUSTOMER_ID}`
    )
    expect(result).toEqual(folders)
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'DB error', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)

    await expect(service.getFolders()).rejects.toMatchObject({ message: 'DB error' })
  })
})

// =============================================================================
// Tests — getDefaultFolder()
// =============================================================================

describe('DocumentFolderService.getDefaultFolder()', () => {
  it('returns the global General folder when no customerId provided', async () => {
    const chain = makeChain(generalFolder)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.getDefaultFolder()

    expect(chain.is).toHaveBeenCalledWith('customer_id', null)
    expect(chain.eq).toHaveBeenCalledWith('is_default', true)
    expect(chain.single).toHaveBeenCalled()
    expect(result).toEqual(generalFolder)
  })

  it('returns null when error occurs fetching global default', async () => {
    const chain = makeChain(null, { message: 'Not found', code: 'PGRST116' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.getDefaultFolder()

    expect(result).toBeNull()
  })

  it('returns customer-specific default folder when customerId is provided and one exists', async () => {
    const customerDefault = { ...customFolder, is_default: true }

    // First call (customer-specific lookup) returns a folder
    // Second call (global fallback) should not be reached
    const customerChain = makeChain(customerDefault)
    const mockSupabase = { from: vi.fn().mockReturnValue(customerChain) } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.getDefaultFolder(TEST_CUSTOMER_ID)

    expect(result).toEqual(customerDefault)
  })

  it('falls back to global default when no customer-specific default exists', async () => {
    // First call: no customer-specific default (returns null data, no error)
    const customerChain = makeChain(null)
    // Second call: global default found
    const globalChain = makeChain(generalFolder)

    let callIndex = 0
    const mockSupabase = {
      from: vi.fn().mockImplementation(() => {
        callIndex++
        return callIndex === 1 ? customerChain : globalChain
      }),
    } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.getDefaultFolder(TEST_CUSTOMER_ID)

    expect(result).toEqual(generalFolder)
  })
})

// =============================================================================
// Tests — createFolder()
// =============================================================================

describe('DocumentFolderService.createFolder()', () => {
  it('creates folder with customer_id, user_id and auto-generated slug', async () => {
    const chain = makeChain(customFolder)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.createFolder(TEST_USER_ID, {
      name: 'Q1 Deliverables',
      customer_id: TEST_CUSTOMER_ID,
    })

    expect(chain.insert).toHaveBeenCalledWith({
      name: 'Q1 Deliverables',
      slug: 'q1-deliverables',
      is_system: false,
      is_default: false,
      customer_id: TEST_CUSTOMER_ID,
      user_id: TEST_USER_ID,
      sort_order: 0,
    })
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
    expect(result).toEqual(customFolder)
  })

  it('uses provided slug when given instead of auto-generating', async () => {
    const chain = makeChain({ ...customFolder, slug: 'custom-slug' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    await service.createFolder(TEST_USER_ID, {
      name: 'My Folder',
      slug: 'custom-slug',
      customer_id: TEST_CUSTOMER_ID,
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'custom-slug' })
    )
  })

  it('generates slug by lowercasing and replacing spaces', async () => {
    const chain = makeChain({ ...customFolder, slug: 'strategy-and-planning' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    await service.createFolder(TEST_USER_ID, {
      name: 'Strategy And Planning',
      customer_id: TEST_CUSTOMER_ID,
    })

    const insertArg = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(insertArg.slug).toBe('strategy-and-planning')
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Insert failed', code: '23505' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)

    await expect(
      service.createFolder(TEST_USER_ID, { name: 'Dupe', customer_id: TEST_CUSTOMER_ID })
    ).rejects.toMatchObject({ message: 'Insert failed' })
  })
})

// =============================================================================
// Tests — updateFolder()
// =============================================================================

describe('DocumentFolderService.updateFolder()', () => {
  it('updates name when provided', async () => {
    const updated = { ...customFolder, name: 'Renamed Folder' }
    const chain = makeChain(updated)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    const result = await service.updateFolder(TEST_FOLDER_ID, { name: 'Renamed Folder' })

    expect(chain.update).toHaveBeenCalledWith({ name: 'Renamed Folder' })
    expect(chain.eq).toHaveBeenCalledWith('id', TEST_FOLDER_ID)
    expect(result).toEqual(updated)
  })

  it('updates sort_order when provided', async () => {
    const updated = { ...customFolder, sort_order: 5 }
    const chain = makeChain(updated)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    await service.updateFolder(TEST_FOLDER_ID, { sort_order: 5 })

    expect(chain.update).toHaveBeenCalledWith({ sort_order: 5 })
  })

  it('only sends defined fields in the update payload', async () => {
    const chain = makeChain(customFolder)
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)
    await service.updateFolder(TEST_FOLDER_ID, { name: 'Only Name' })

    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg).toEqual({ name: 'Only Name' })
    expect(updateArg).not.toHaveProperty('sort_order')
  })

  it('throws when supabase returns an error', async () => {
    const chain = makeChain(null, { message: 'Update failed', code: '500' })
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) } as any

    const service = new DocumentFolderService(mockSupabase)

    await expect(
      service.updateFolder(TEST_FOLDER_ID, { name: 'X' })
    ).rejects.toMatchObject({ message: 'Update failed' })
  })
})

// =============================================================================
// Tests — deleteFolder()
// =============================================================================

describe('DocumentFolderService.deleteFolder()', () => {
  it('throws when attempting to delete a system folder', async () => {
    // System folder check returns is_system: true
    const fetchChain = makeChain({ is_system: true })
    const mockSupabase = { from: vi.fn().mockReturnValue(fetchChain) } as any

    const service = new DocumentFolderService(mockSupabase)

    await expect(service.deleteFolder(TEST_FOLDER_ID)).rejects.toThrow(
      'Cannot delete system folder'
    )
  })

  it('throws when fetching folder returns an error', async () => {
    const fetchChain = makeChain(null, { message: 'Not found', code: 'PGRST116' })
    const mockSupabase = { from: vi.fn().mockReturnValue(fetchChain) } as any

    const service = new DocumentFolderService(mockSupabase)

    await expect(service.deleteFolder(TEST_FOLDER_ID)).rejects.toMatchObject({
      message: 'Not found',
    })
  })

  it('moves documents to General folder then deletes non-system folder', async () => {
    // Call sequence:
    // 1. from('document_folders').select('is_system').eq().single() → { is_system: false }
    // 2. from('document_folders').select('*').is().eq().single()    → General folder (getDefaultFolder)
    // 3. from('customer_documents').update().eq()                   → move docs
    // 4. from('document_folders').delete().eq()                     → delete folder

    const fetchFolderChain = makeChain({ is_system: false })
    const getDefaultChain = makeChain(generalFolder)
    const moveDocsChain = makeChain(null)
    const deleteFolderChain = makeChain(null)

    let fromCallIndex = 0
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++
        if (fromCallIndex === 1) return fetchFolderChain   // Check is_system
        if (fromCallIndex === 2) return getDefaultChain    // getDefaultFolder
        if (table === 'customer_documents') return moveDocsChain
        return deleteFolderChain                           // Delete folder
      }),
    } as any

    const service = new DocumentFolderService(mockSupabase)
    await service.deleteFolder(TEST_FOLDER_ID)

    // Verify documents moved to General folder
    expect(moveDocsChain.update).toHaveBeenCalledWith({ folder_id: GENERAL_FOLDER_ID })
    expect(moveDocsChain.eq).toHaveBeenCalledWith('folder_id', TEST_FOLDER_ID)

    // Verify folder deleted
    expect(deleteFolderChain.delete).toHaveBeenCalled()
    expect(deleteFolderChain.eq).toHaveBeenCalledWith('id', TEST_FOLDER_ID)
  })

  it('throws when General folder is not found during delete', async () => {
    // Check is_system → non-system folder
    const fetchFolderChain = makeChain({ is_system: false })
    // getDefaultFolder → error (no General folder)
    const defaultChain = makeChain(null, { message: 'No rows returned', code: 'PGRST116' })

    let fromCallIndex = 0
    const mockSupabase = {
      from: vi.fn().mockImplementation(() => {
        fromCallIndex++
        return fromCallIndex === 1 ? fetchFolderChain : defaultChain
      }),
    } as any

    const service = new DocumentFolderService(mockSupabase)

    await expect(service.deleteFolder(TEST_FOLDER_ID)).rejects.toThrow(
      'General folder not found'
    )
  })

  it('throws when the final delete query returns an error', async () => {
    const fetchFolderChain = makeChain({ is_system: false })
    const getDefaultChain = makeChain(generalFolder)
    const moveDocsChain = makeChain(null)
    const deleteFolderChain = makeChain(null, { message: 'Delete failed', code: '500' })

    let fromCallIndex = 0
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++
        if (fromCallIndex === 1) return fetchFolderChain
        if (fromCallIndex === 2) return getDefaultChain
        if (table === 'customer_documents') return moveDocsChain
        return deleteFolderChain
      }),
    } as any

    const service = new DocumentFolderService(mockSupabase)

    await expect(service.deleteFolder(TEST_FOLDER_ID)).rejects.toMatchObject({
      message: 'Delete failed',
    })
  })
})
