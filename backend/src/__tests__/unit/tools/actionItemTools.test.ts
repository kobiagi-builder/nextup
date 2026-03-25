// @ts-nocheck
/**
 * Unit Tests: actionItemTools — updateActionItemStatus
 *
 * Tests for the updateActionItemStatus tool produced by createActionItemTools.
 * Focuses on the Phase 2 execution feature: conditional inclusion of
 * document_id and execution_summary in the DB update object based on status.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logger before module imports that transitively use it
vi.mock('../../../lib/logger.js', () => ({
  logToFile: vi.fn(),
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { createActionItemTools } from '../../../services/ai/agents/customer-mgmt/tools/actionItemTools.js'

// =============================================================================
// Constants
// =============================================================================

const CUSTOMER_ID = 'cust-abc-123'
const ACTION_ITEM_ID = '550e8400-e29b-41d4-a716-446655440001'
const DOCUMENT_ID = '660e8400-e29b-41d4-a716-446655440002'
const EXECUTION_SUMMARY = 'Completed the competitive landscape analysis and shared findings.'

const MOCK_ACTION_ITEM_ROW = {
  id: ACTION_ITEM_ID,
  description: 'Prepare competitive landscape analysis for Q3',
  type: 'follow_up',
  status: 'done',
}

// =============================================================================
// Supabase Mock Factory
// =============================================================================

/**
 * Builds a minimal Supabase mock for updateActionItemStatus interactions:
 *
 *   customer_action_items  — update().eq().eq().select().single()
 *   customer_events        — insert()
 *
 * Exposes `capturedUpdate` so tests can inspect exactly what was passed to
 * .update() without relying on call-order fragility.
 */
function createMockSupabase({
  updateResult = { data: MOCK_ACTION_ITEM_ROW, error: null },
} = {}) {
  let capturedUpdate: Record<string, unknown> | null = null

  // --- update chain: .update(obj).eq().eq().select().single() ---
  const mockSingle = vi.fn().mockResolvedValue(updateResult)
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
  const mockUpdateEqCustomer = vi.fn().mockReturnValue({ select: mockSelect })
  const mockUpdateEqId = vi.fn().mockReturnValue({ eq: mockUpdateEqCustomer })
  const mockUpdate = vi.fn().mockImplementation((obj) => {
    capturedUpdate = obj
    return { eq: mockUpdateEqId }
  })

  // --- customer_events insert (fire-and-forget) ---
  const mockEventInsert = vi.fn().mockResolvedValue({ data: null, error: null })

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'customer_action_items') {
      return { update: mockUpdate }
    }
    if (table === 'customer_events') {
      return { insert: mockEventInsert }
    }
    return {}
  })

  return {
    supabase: { from: mockFrom } as any,
    getCapturedUpdate: () => capturedUpdate,
    mocks: {
      from: mockFrom,
      update: mockUpdate,
      updateEqId: mockUpdateEqId,
      updateEqCustomer: mockUpdateEqCustomer,
      select: mockSelect,
      single: mockSingle,
      eventInsert: mockEventInsert,
    },
  }
}

// =============================================================================
// Helpers
// =============================================================================

/** Invokes the tool's execute function directly, bypassing the AI SDK layer. */
async function runUpdateTool(
  tool: ReturnType<typeof createActionItemTools>,
  input: Record<string, unknown>,
) {
  return tool.updateActionItemStatus.execute(input)
}

// =============================================================================
// Tests
// =============================================================================

describe('createActionItemTools — updateActionItemStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Factory shape ─────────────────────────────────────────────────────────

  describe('factory', () => {
    it('returns an object with an updateActionItemStatus key', () => {
      const { supabase } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)
      expect(tools).toHaveProperty('updateActionItemStatus')
      expect(tools.updateActionItemStatus).toHaveProperty('execute')
    })
  })

  // ─── status = done, both optional fields present ───────────────────────────

  describe('status done with both document_id and execution_summary', () => {
    it('includes document_id in the update object', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        document_id: DOCUMENT_ID,
        execution_summary: EXECUTION_SUMMARY,
      })

      expect(getCapturedUpdate()).toMatchObject({ document_id: DOCUMENT_ID })
    })

    it('includes execution_summary in the update object', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        document_id: DOCUMENT_ID,
        execution_summary: EXECUTION_SUMMARY,
      })

      expect(getCapturedUpdate()).toMatchObject({ execution_summary: EXECUTION_SUMMARY })
    })

    it('includes status in the update object', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        document_id: DOCUMENT_ID,
        execution_summary: EXECUTION_SUMMARY,
      })

      expect(getCapturedUpdate()).toMatchObject({ status: 'done' })
    })

    it('returns success=true with the updated action item', async () => {
      const { supabase } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      const result = await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        document_id: DOCUMENT_ID,
        execution_summary: EXECUTION_SUMMARY,
      })

      expect(result.success).toBe(true)
      expect(result.actionItem).toMatchObject({ id: ACTION_ITEM_ID })
    })
  })

  // ─── status = done, only document_id ──────────────────────────────────────

  describe('status done with only document_id', () => {
    it('includes document_id in the update object', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        document_id: DOCUMENT_ID,
      })

      expect(getCapturedUpdate()).toMatchObject({ status: 'done', document_id: DOCUMENT_ID })
    })

    it('does NOT include execution_summary in the update object', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        document_id: DOCUMENT_ID,
      })

      expect(getCapturedUpdate()).not.toHaveProperty('execution_summary')
    })
  })

  // ─── status = done, only execution_summary ────────────────────────────────

  describe('status done with only execution_summary', () => {
    it('includes execution_summary in the update object', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        execution_summary: EXECUTION_SUMMARY,
      })

      expect(getCapturedUpdate()).toMatchObject({ status: 'done', execution_summary: EXECUTION_SUMMARY })
    })

    it('does NOT include document_id in the update object', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
        execution_summary: EXECUTION_SUMMARY,
      })

      expect(getCapturedUpdate()).not.toHaveProperty('document_id')
    })
  })

  // ─── status = done, neither optional field ────────────────────────────────

  describe('status done with neither optional field', () => {
    it('update object contains only status', async () => {
      const { supabase, getCapturedUpdate } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, {
        actionItemId: ACTION_ITEM_ID,
        status: 'done',
      })

      const update = getCapturedUpdate()
      expect(update).toEqual({ status: 'done' })
    })
  })

  // ─── status != done — optional fields are always ignored ──────────────────

  describe('status NOT done — optional fields are ignored', () => {
    const nonDoneStatuses = ['in_progress', 'todo', 'on_hold', 'cancelled'] as const

    for (const status of nonDoneStatuses) {
      describe(`status = ${status}`, () => {
        it('does NOT include document_id even when provided', async () => {
          const { supabase, getCapturedUpdate } = createMockSupabase({
            updateResult: {
              data: { ...MOCK_ACTION_ITEM_ROW, status },
              error: null,
            },
          })
          const tools = createActionItemTools(supabase, CUSTOMER_ID)

          await runUpdateTool(tools, {
            actionItemId: ACTION_ITEM_ID,
            status,
            document_id: DOCUMENT_ID,
            execution_summary: EXECUTION_SUMMARY,
          })

          expect(getCapturedUpdate()).not.toHaveProperty('document_id')
        })

        it('does NOT include execution_summary even when provided', async () => {
          const { supabase, getCapturedUpdate } = createMockSupabase({
            updateResult: {
              data: { ...MOCK_ACTION_ITEM_ROW, status },
              error: null,
            },
          })
          const tools = createActionItemTools(supabase, CUSTOMER_ID)

          await runUpdateTool(tools, {
            actionItemId: ACTION_ITEM_ID,
            status,
            document_id: DOCUMENT_ID,
            execution_summary: EXECUTION_SUMMARY,
          })

          expect(getCapturedUpdate()).not.toHaveProperty('execution_summary')
        })

        it('update object contains only status', async () => {
          const { supabase, getCapturedUpdate } = createMockSupabase({
            updateResult: {
              data: { ...MOCK_ACTION_ITEM_ROW, status },
              error: null,
            },
          })
          const tools = createActionItemTools(supabase, CUSTOMER_ID)

          await runUpdateTool(tools, {
            actionItemId: ACTION_ITEM_ID,
            status,
            document_id: DOCUMENT_ID,
            execution_summary: EXECUTION_SUMMARY,
          })

          expect(getCapturedUpdate()).toEqual({ status })
        })
      })
    }
  })

  // ─── DB scoping ────────────────────────────────────────────────────────────

  describe('DB scoping', () => {
    it('scopes the update to the correct action item id', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, { actionItemId: ACTION_ITEM_ID, status: 'done' })

      expect(mocks.updateEqId).toHaveBeenCalledWith('id', ACTION_ITEM_ID)
    })

    it('scopes the update to the correct customer id', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, { actionItemId: ACTION_ITEM_ID, status: 'done' })

      expect(mocks.updateEqCustomer).toHaveBeenCalledWith('customer_id', CUSTOMER_ID)
    })
  })

  // ─── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns success=false when the DB returns an error', async () => {
      const { supabase } = createMockSupabase({
        updateResult: { data: null, error: { message: 'permission denied' } },
      })
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      const result = await runUpdateTool(tools, { actionItemId: ACTION_ITEM_ID, status: 'done' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('permission denied')
    })

    it('returns success=false when the DB returns null data (not found)', async () => {
      const { supabase } = createMockSupabase({
        updateResult: { data: null, error: null },
      })
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      const result = await runUpdateTool(tools, { actionItemId: ACTION_ITEM_ID, status: 'done' })

      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
    })

    it('does NOT insert a customer_events record when the update fails', async () => {
      const { supabase, mocks } = createMockSupabase({
        updateResult: { data: null, error: { message: 'row not found' } },
      })
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, { actionItemId: ACTION_ITEM_ID, status: 'done' })

      expect(mocks.eventInsert).not.toHaveBeenCalled()
    })
  })

  // ─── Event logging ─────────────────────────────────────────────────────────

  describe('event logging', () => {
    it('inserts a customer_events record on success', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, { actionItemId: ACTION_ITEM_ID, status: 'done' })

      expect(mocks.eventInsert).toHaveBeenCalledTimes(1)
    })

    it('event record contains the correct customer_id and event_type', async () => {
      const { supabase, mocks } = createMockSupabase()
      const tools = createActionItemTools(supabase, CUSTOMER_ID)

      await runUpdateTool(tools, { actionItemId: ACTION_ITEM_ID, status: 'done' })

      expect(mocks.eventInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: CUSTOMER_ID,
          event_type: 'update',
        }),
      )
    })
  })
})
