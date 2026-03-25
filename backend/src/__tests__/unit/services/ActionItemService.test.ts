// @ts-nocheck
/**
 * Unit Tests: ActionItemService — listAll document mapping
 *
 * Tests for the Phase 2 execution feature addition to listAll:
 * - JOIN on customer_documents (aliased as `document`)
 * - document_title mapping: item.document?.title || null
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActionItemService } from '../../../services/ActionItemService.js'

// =============================================================================
// Mocks
// =============================================================================

vi.mock('../../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// =============================================================================
// Constants
// =============================================================================

const USER_ID = 'u0000000-0000-0000-0000-000000000001'
const CUSTOMER_ID = 'c0000000-0000-0000-0000-000000000002'
const ACTION_ITEM_ID_1 = 'a1000000-0000-0000-0000-000000000001'
const ACTION_ITEM_ID_2 = 'a2000000-0000-0000-0000-000000000002'
const DOCUMENT_ID = 'd0000000-0000-0000-0000-000000000003'
const DOCUMENT_TITLE = 'Competitive Landscape Q3 2026'

// =============================================================================
// Supabase Mock Factory
// =============================================================================

/**
 * Builds a Supabase mock for ActionItemService.listAll.
 *
 * The listAll query chain is:
 *   .from('customer_action_items')
 *   .select('*, customers(name), document:customer_documents(title)')
 *   .eq('user_id', userId)
 *   .order(...) — called twice
 *   [optional .eq() for customer_id filter]
 *   [optional .in() for status filter]
 *
 * We make every chain method return the same object so optional
 * filter calls don't break the chain regardless of call order.
 */
function createMockSupabase(rows: unknown[] = []) {
  const queryResult = { data: rows, error: null }

  // Build a chainable object; each method returns itself except the
  // terminal ones that resolve the promise.
  const chain: Record<string, unknown> = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)

  // Make the chain thenable so `await query` resolves correctly
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(queryResult).then(resolve, reject)

  const mockFrom = vi.fn().mockReturnValue(chain)

  return {
    supabase: { from: mockFrom } as any,
    chain,
    mocks: { from: mockFrom },
  }
}

function createMockSupabaseWithError(errorMessage: string) {
  const queryResult = { data: null, error: { message: errorMessage } }

  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(queryResult).then(resolve, reject)

  return {
    supabase: { from: chain as any } as any,
  }
}

// =============================================================================
// Fixtures
// =============================================================================

/** A raw DB row as Supabase would return it — with nested relation objects. */
function makeRawRow(overrides: {
  id?: string
  status?: string
  document?: { title: string } | null
  customers?: { name: string } | null
} = {}) {
  return {
    id: overrides.id ?? ACTION_ITEM_ID_1,
    user_id: USER_ID,
    customer_id: CUSTOMER_ID,
    type: 'follow_up',
    description: 'Follow up with client',
    due_date: '2026-04-15',
    status: overrides.status ?? 'todo',
    reported_by: null,
    document_id: overrides.document ? DOCUMENT_ID : null,
    execution_summary: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    customers: overrides.customers !== undefined ? overrides.customers : { name: 'Acme Corp' },
    document: overrides.document !== undefined ? overrides.document : null,
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('ActionItemService.listAll — document_title mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Items with a linked document ─────────────────────────────────────────

  describe('item with a linked document', () => {
    it('maps document_title to the document title string', async () => {
      const row = makeRawRow({ document: { title: DOCUMENT_TITLE } })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result).toHaveLength(1)
      expect(result[0].document_title).toBe(DOCUMENT_TITLE)
    })

    it('does NOT expose the raw document relation object on the mapped item', async () => {
      const row = makeRawRow({ document: { title: DOCUMENT_TITLE } })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0]).not.toHaveProperty('document')
    })

    it('preserves all other action item fields alongside document_title', async () => {
      const row = makeRawRow({ document: { title: DOCUMENT_TITLE } })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)
      const item = result[0]

      expect(item.id).toBe(ACTION_ITEM_ID_1)
      expect(item.user_id).toBe(USER_ID)
      expect(item.customer_id).toBe(CUSTOMER_ID)
      expect(item.description).toBe('Follow up with client')
      expect(item.status).toBe('todo')
    })
  })

  // ─── Items without a linked document ──────────────────────────────────────

  describe('item without a linked document', () => {
    it('sets document_title to null when document relation is null', async () => {
      const row = makeRawRow({ document: null })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0].document_title).toBeNull()
    })

    it('sets document_title to null when document relation is undefined', async () => {
      // Supabase may return undefined for a missing join — simulate that
      const row = makeRawRow()
      delete row.document
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0].document_title).toBeNull()
    })

    it('sets document_title to null when document exists but title is undefined', async () => {
      const row = makeRawRow({ document: {} as { title: string } })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0].document_title).toBeNull()
    })

    it('does NOT expose the raw document relation object on the mapped item', async () => {
      const row = makeRawRow({ document: null })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0]).not.toHaveProperty('document')
    })
  })

  // ─── Mixed result set ──────────────────────────────────────────────────────

  describe('mixed result set — some items with documents, some without', () => {
    it('correctly maps document_title for each item independently', async () => {
      const rowWithDoc = makeRawRow({
        id: ACTION_ITEM_ID_1,
        document: { title: DOCUMENT_TITLE },
      })
      const rowWithoutDoc = makeRawRow({
        id: ACTION_ITEM_ID_2,
        document: null,
      })
      const { supabase } = createMockSupabase([rowWithDoc, rowWithoutDoc])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result).toHaveLength(2)
      const withDoc = result.find((i) => i.id === ACTION_ITEM_ID_1)
      const withoutDoc = result.find((i) => i.id === ACTION_ITEM_ID_2)

      expect(withDoc?.document_title).toBe(DOCUMENT_TITLE)
      expect(withoutDoc?.document_title).toBeNull()
    })
  })

  // ─── customer_name mapping (pre-existing, regression guard) ───────────────

  describe('customer_name mapping', () => {
    it('maps customer_name from the nested customers relation', async () => {
      const row = makeRawRow({ customers: { name: 'Acme Corp' } })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0].customer_name).toBe('Acme Corp')
    })

    it('sets customer_name to null when customers relation is null', async () => {
      const row = makeRawRow({ customers: null })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0].customer_name).toBeNull()
    })

    it('does NOT expose the raw customers relation object on the mapped item', async () => {
      const row = makeRawRow({ customers: { name: 'Acme Corp' } })
      const { supabase } = createMockSupabase([row])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result[0]).not.toHaveProperty('customers')
    })
  })

  // ─── Empty result set ──────────────────────────────────────────────────────

  describe('empty result set', () => {
    it('returns an empty array when no action items exist', async () => {
      const { supabase } = createMockSupabase([])
      const service = new ActionItemService(supabase)

      const result = await service.listAll(USER_ID)

      expect(result).toEqual([])
    })

    it('returns an empty array when data is null', async () => {
      // Simulate Supabase returning null data with no error (zero rows edge case)
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.in = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject)

      const service = new ActionItemService({ from: vi.fn().mockReturnValue(chain) } as any)

      const result = await service.listAll(USER_ID)

      expect(result).toEqual([])
    })
  })

  // ─── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws when Supabase returns an error', async () => {
      const { supabase } = createMockSupabaseWithError('DB connection failed')
      const service = new ActionItemService(supabase)

      await expect(service.listAll(USER_ID)).rejects.toMatchObject({
        message: 'DB connection failed',
      })
    })
  })

  // ─── Select string includes document join ──────────────────────────────────

  describe('query construction', () => {
    it('calls .select() with a string that includes the document join alias', async () => {
      const { supabase, chain } = createMockSupabase([])
      const service = new ActionItemService(supabase)

      await service.listAll(USER_ID)

      expect(chain.select).toHaveBeenCalledWith(
        expect.stringContaining('document:customer_documents'),
      )
    })

    it('calls .select() with a string that includes the customers join', async () => {
      const { supabase, chain } = createMockSupabase([])
      const service = new ActionItemService(supabase)

      await service.listAll(USER_ID)

      expect(chain.select).toHaveBeenCalledWith(
        expect.stringContaining('customers(name)'),
      )
    })

    it('filters by user_id', async () => {
      const { supabase, chain } = createMockSupabase([])
      const service = new ActionItemService(supabase)

      await service.listAll(USER_ID)

      expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID)
    })
  })
})
