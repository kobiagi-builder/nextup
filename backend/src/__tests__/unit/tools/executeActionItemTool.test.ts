// @ts-nocheck
/**
 * Unit Tests: executeActionItemTool
 *
 * Tests for createExecuteActionItemTool factory function.
 * The tool fetches an action item, verifies customer ownership,
 * updates status, builds an execution brief, and logs an event.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logger before imports that transitively use it
vi.mock('../../../lib/logger.js', () => ({
  logToFile: vi.fn(),
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Mock buildCustomerContext — it makes its own Supabase calls internally
vi.mock('../../../services/ai/agents/shared/customerContextBuilder.js', () => ({
  buildCustomerContext: vi.fn(),
}))

import { createExecuteActionItemTool } from '../../../services/ai/agents/customer-mgmt/tools/executeActionItemTool.js'
import { buildCustomerContext } from '../../../services/ai/agents/shared/customerContextBuilder.js'

// =============================================================================
// Constants
// =============================================================================

const CUSTOMER_ID = 'cust-111'
const ACTION_ITEM_ID = '550e8400-e29b-41d4-a716-446655440001'

const MOCK_ACTION_ITEM = {
  id: ACTION_ITEM_ID,
  type: 'research',
  description: 'Prepare competitive landscape analysis for Q3',
  due_date: '2026-04-01',
  status: 'todo',
  reported_by: 'Alice',
  created_at: '2026-03-01T00:00:00Z',
}

const MOCK_CUSTOMER_CONTEXT = `## Customer Context\n\n### Company\nAcme Corp\n\n### Goals\n- Grow ARR by 30%`

// =============================================================================
// Supabase Mock Factory
// =============================================================================

/**
 * Builds a minimal Supabase mock that handles all table interactions
 * used by executeActionItemTool:
 *
 *   customer_action_items  — select (fetch) and update (status)
 *   customer_events        — insert (log event)
 *
 * Override `fetchResult` to simulate fetch success/failure.
 */
function createMockSupabase({
  fetchResult = { data: MOCK_ACTION_ITEM, error: null },
  updateResolves = true,
  eventInsertResolves = true,
} = {}) {
  // --- select chain: .select().eq().eq().single() ---
  const mockSingle = vi.fn().mockResolvedValue(fetchResult)
  const mockSelectEqCustomer = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelectEqId = vi.fn().mockReturnValue({ eq: mockSelectEqCustomer })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEqId })

  // --- update chain: .update().eq().eq() ---
  const mockUpdateEqCustomer = vi.fn().mockResolvedValue(
    updateResolves ? { data: null, error: null } : { data: null, error: { message: 'update failed' } },
  )
  const mockUpdateEqId = vi.fn().mockReturnValue({ eq: mockUpdateEqCustomer })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEqId })

  // --- customer_events insert chain (fire-and-forget) ---
  const mockEventInsert = vi.fn().mockResolvedValue({ data: null, error: null })

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'customer_action_items') {
      return { select: mockSelect, update: mockUpdate }
    }
    if (table === 'customer_events') {
      return { insert: mockEventInsert }
    }
    return {}
  })

  return {
    supabase: { from: mockFrom } as any,
    mocks: {
      from: mockFrom,
      select: mockSelect,
      selectEqId: mockSelectEqId,
      selectEqCustomer: mockSelectEqCustomer,
      single: mockSingle,
      update: mockUpdate,
      updateEqId: mockUpdateEqId,
      updateEqCustomer: mockUpdateEqCustomer,
      eventInsert: mockEventInsert,
    },
  }
}

// =============================================================================
// Helpers
// =============================================================================

/** Execute the tool's inner function directly (bypasses AI SDK layer) */
async function runTool(tool: any, input: Record<string, unknown>) {
  return tool.executeActionItem.execute(input)
}

// =============================================================================
// Tests
// =============================================================================

describe('createExecuteActionItemTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: buildCustomerContext returns a sensible context string
    ;(buildCustomerContext as any).mockResolvedValue(MOCK_CUSTOMER_CONTEXT)
  })

  // ─── Factory shape ──────────────────────────────────────────────────────────

  describe('factory', () => {
    it('returns an object with an executeActionItem key', () => {
      const { supabase } = createMockSupabase()
      const tools = createExecuteActionItemTool(supabase, CUSTOMER_ID)
      expect(tools).toHaveProperty('executeActionItem')
      expect(tools.executeActionItem).toHaveProperty('execute')
    })
  })

  // ─── Happy path ─────────────────────────────────────────────────────────────

  describe('success', () => {
    it('returns success=true with the action item id and customer id', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.success).toBe(true)
      expect(result.actionItemId).toBe(ACTION_ITEM_ID)
      expect(result.customerId).toBe(CUSTOMER_ID)
    })

    it('returns a brief string in the result', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.success).toBe(true)
      expect(typeof result.brief).toBe('string')
      expect(result.brief.length).toBeGreaterThan(0)
    })

    it('brief contains the Objective section with action item description', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.brief).toContain('### Objective')
      expect(result.brief).toContain(MOCK_ACTION_ITEM.description)
    })

    it('brief contains the Instructions section', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.brief).toContain('### Instructions')
    })

    it('brief contains the Customer Context section with context from buildCustomerContext', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.brief).toContain('### Customer Context')
      expect(result.brief).toContain(MOCK_CUSTOMER_CONTEXT)
    })

    it('brief includes action item type, due date, and reported_by fields', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.brief).toContain(MOCK_ACTION_ITEM.type)
      expect(result.brief).toContain(MOCK_ACTION_ITEM.due_date)
      expect(result.brief).toContain(MOCK_ACTION_ITEM.reported_by)
    })

    it('brief includes the action item ID', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.brief).toContain(ACTION_ITEM_ID)
    })
  })

  // ─── Ownership check (customer_id filter) ────────────────────────────────────

  describe('customer ownership verification', () => {
    it('queries customer_action_items with both the action item id and customer id', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      // First .eq() call should filter on 'id'
      expect(mocks.selectEqId).toHaveBeenCalledWith('id', ACTION_ITEM_ID)
      // Second .eq() call should filter on 'customer_id'
      expect(mocks.selectEqCustomer).toHaveBeenCalledWith('customer_id', CUSTOMER_ID)
    })
  })

  // ─── Status update ───────────────────────────────────────────────────────────

  describe('status update', () => {
    it('updates the action item status to in_progress', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(mocks.update).toHaveBeenCalledWith({ status: 'in_progress' })
    })

    it('scopes the status update to the correct action item and customer', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(mocks.updateEqId).toHaveBeenCalledWith('id', ACTION_ITEM_ID)
      expect(mocks.updateEqCustomer).toHaveBeenCalledWith('customer_id', CUSTOMER_ID)
    })
  })

  // ─── Customer context ────────────────────────────────────────────────────────

  describe('customer context', () => {
    it('calls buildCustomerContext with the correct customerId and supabase client', async () => {
      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(buildCustomerContext).toHaveBeenCalledWith(CUSTOMER_ID, supabase)
    })

    it('incorporates the customer context string returned by buildCustomerContext into the brief', async () => {
      const customContext = '## Custom Context\n\nSpecific company info here'
      ;(buildCustomerContext as any).mockResolvedValue(customContext)

      const { supabase } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.brief).toContain(customContext)
    })
  })

  // ─── Event logging ───────────────────────────────────────────────────────────

  describe('event logging', () => {
    it('inserts a record into customer_events after successful execution', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(mocks.from).toHaveBeenCalledWith('customer_events')
      expect(mocks.eventInsert).toHaveBeenCalledTimes(1)
    })

    it('event record contains the correct customer_id and event_type', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(mocks.eventInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: CUSTOMER_ID,
          event_type: 'update',
        }),
      )
    })

    it('event title includes a truncated version of the action item description', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      const insertCall = mocks.eventInsert.mock.calls[0][0]
      expect(typeof insertCall.title).toBe('string')
      // Title is "Execution started: <description.slice(0,60)>"
      expect(insertCall.title).toContain('Execution started:')
      expect(insertCall.title).toContain(MOCK_ACTION_ITEM.description.slice(0, 60))
    })

    it('event description includes the action item type', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      const insertCall = mocks.eventInsert.mock.calls[0][0]
      expect(insertCall.description).toContain(MOCK_ACTION_ITEM.type)
    })
  })

  // ─── Error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns success=false when the action item is not found (null data)', async () => {
      const { supabase } = createMockSupabase({
        fetchResult: { data: null, error: null },
      })
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
    })

    it('returns success=false when the fetch returns a Supabase error', async () => {
      const { supabase } = createMockSupabase({
        fetchResult: { data: null, error: { message: 'row not found' } },
      })
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.success).toBe(false)
    })

    it('error message mentions action item not found or customer ownership', async () => {
      const { supabase } = createMockSupabase({
        fetchResult: { data: null, error: null },
      })
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.error).toMatch(/not found|does not belong/i)
    })

    it('does not call buildCustomerContext when action item fetch fails', async () => {
      const { supabase } = createMockSupabase({
        fetchResult: { data: null, error: { message: 'permission denied' } },
      })
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(buildCustomerContext).not.toHaveBeenCalled()
    })

    it('does not insert a customer_events record when action item fetch fails', async () => {
      const { supabase, mocks } = createMockSupabase({
        fetchResult: { data: null, error: null },
      })
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(mocks.eventInsert).not.toHaveBeenCalled()
    })
  })

  // ─── No due date / optional fields ──────────────────────────────────────────

  describe('optional action item fields', () => {
    it('handles action item with no due_date gracefully', async () => {
      const itemWithoutDueDate = { ...MOCK_ACTION_ITEM, due_date: null }
      const { supabase } = createMockSupabase({
        fetchResult: { data: itemWithoutDueDate, error: null },
      })
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.success).toBe(true)
      expect(result.brief).toContain('No due date')
    })

    it('handles action item with no reported_by gracefully', async () => {
      const itemWithoutReportedBy = { ...MOCK_ACTION_ITEM, reported_by: null }
      const { supabase } = createMockSupabase({
        fetchResult: { data: itemWithoutReportedBy, error: null },
      })
      const tool = createExecuteActionItemTool(supabase, CUSTOMER_ID)

      const result = await runTool(tool, { actionItemId: ACTION_ITEM_ID })

      expect(result.success).toBe(true)
      expect(result.brief).toContain('Unknown')
    })
  })
})
