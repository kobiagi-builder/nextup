// @ts-nocheck
/**
 * Execute Action Item — Integration Tests
 *
 * Tests the executeActionItem tool's complete flow:
 * fetch action item → update status → build context → build brief → log event.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createExecuteActionItemTool } from '../../services/ai/agents/customer-mgmt/tools/executeActionItemTool.js'

// Mock buildCustomerContext — must match the module specifier exactly
// The source uses .js extension, but vitest resolves to .ts
import { buildCustomerContext } from '../../services/ai/agents/shared/customerContextBuilder.js'
vi.mock('../../services/ai/agents/shared/customerContextBuilder.js')
const mockBuildCustomerContext = vi.mocked(buildCustomerContext)

// Mock logger
vi.mock('../../lib/logger.js', () => ({
  logToFile: vi.fn(),
}))

describe('executeActionItem Integration Tests', () => {
  const customerId = 'cust-abc-123'
  const actionItemId = 'ai-def-456'

  const mockActionItem = {
    id: actionItemId,
    type: 'follow_up',
    description: 'Send proposal to client for Q2 engagement',
    due_date: '2026-03-25',
    status: 'todo',
    reported_by: 'Sarah',
    created_at: '2026-03-20T10:00:00Z',
  }

  let mockSupabase: any
  let selectSingleFn: any
  let updateEqFn: any
  let insertFn: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockBuildCustomerContext.mockResolvedValue('## Customer Info\nTest customer context data')

    selectSingleFn = vi.fn().mockResolvedValue({ data: mockActionItem, error: null })
    updateEqFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    insertFn = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'customer_action_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: selectSingleFn,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: updateEqFn,
            }),
          }
        }
        if (table === 'customer_events') {
          return {
            insert: insertFn,
          }
        }
        return {}
      }),
    }
  })

  it('should fetch action item and return execution brief', async () => {
    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    const result = await tools.executeActionItem.execute({ actionItemId })

    expect(result.success).toBe(true)
    expect(result.brief).toContain('Send proposal to client for Q2 engagement')
    expect(result.brief).toContain('follow_up')
    expect(result.brief).toContain('2026-03-25')
    expect(result.brief).toContain('Sarah')
    expect(result.actionItemId).toBe(actionItemId)
    expect(result.customerId).toBe(customerId)
  })

  it('should include customer context in the brief', async () => {
    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    const result = await tools.executeActionItem.execute({ actionItemId })

    expect(result.success).toBe(true)
    expect(result.brief).toContain('Test customer context data')
    expect(result.brief).toContain('Customer Context')
  })

  it('should include all required sections in the brief', async () => {
    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    const result = await tools.executeActionItem.execute({ actionItemId })

    expect(result.success).toBe(true)
    expect(result.brief).toContain('## Execution Brief')
    expect(result.brief).toContain('### Objective')
    expect(result.brief).toContain('### Instructions')
    expect(result.brief).toContain('### Customer Context')
  })

  it('should update status to in_progress', async () => {
    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    await tools.executeActionItem.execute({ actionItemId })

    // Verify the update call was made
    const updateCalls = mockSupabase.from.mock.calls.filter(
      (call: string[]) => call[0] === 'customer_action_items'
    )
    expect(updateCalls.length).toBeGreaterThanOrEqual(2) // select + update
  })

  it('should log execution event to customer_events', async () => {
    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    await tools.executeActionItem.execute({ actionItemId })

    // Verify event was inserted
    const eventCalls = mockSupabase.from.mock.calls.filter(
      (call: string[]) => call[0] === 'customer_events'
    )
    expect(eventCalls.length).toBe(1)
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: customerId,
        event_type: 'update',
        title: expect.stringContaining('Execution started'),
      })
    )
  })

  it('should return error for non-existent action item', async () => {
    selectSingleFn.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    const result = await tools.executeActionItem.execute({ actionItemId: 'nonexistent-id' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('should handle action item with no due date', async () => {
    selectSingleFn.mockResolvedValueOnce({
      data: { ...mockActionItem, due_date: null },
      error: null,
    })

    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    const result = await tools.executeActionItem.execute({ actionItemId })

    expect(result.success).toBe(true)
    expect(result.brief).toContain('No due date')
  })

  it('should handle action item with no reported_by', async () => {
    selectSingleFn.mockResolvedValueOnce({
      data: { ...mockActionItem, reported_by: null },
      error: null,
    })

    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    const result = await tools.executeActionItem.execute({ actionItemId })

    expect(result.success).toBe(true)
    expect(result.brief).toContain('Unknown')
  })

  it('should include document_id and execution_summary instructions in the brief', async () => {
    const tools = createExecuteActionItemTool(mockSupabase, customerId)
    const result = await tools.executeActionItem.execute({ actionItemId })

    expect(result.success).toBe(true)
    // Phase 2: The brief should instruct the agent to include document_id and execution_summary
    expect(result.brief).toContain('document_id')
    expect(result.brief).toContain('execution_summary')
  })
})

/**
 * Phase 2 Integration Tests — updateActionItemStatus with document_id and execution_summary
 */
describe('updateActionItemStatus — Phase 2 extensions', () => {
  const customerId = 'cust-abc-123'
  const actionItemId = 'ai-def-456'
  const documentId = 'doc-789-xyz'
  const executionSummary = 'Created a Q2 proposal document with pricing and timeline.'

  let mockSupabase: any
  let updateFn: any
  let selectFn: any
  let singleFn: any
  let insertFn: any

  beforeEach(() => {
    vi.clearAllMocks()

    singleFn = vi.fn().mockResolvedValue({
      data: { id: actionItemId, description: 'Send proposal', type: 'follow_up', status: 'done' },
      error: null,
    })
    selectFn = vi.fn().mockReturnValue({ single: singleFn })
    const innerEq2 = vi.fn().mockReturnValue({ select: selectFn })
    const innerEq1 = vi.fn().mockReturnValue({ eq: innerEq2 })
    updateFn = vi.fn().mockReturnValue({ eq: innerEq1 })
    insertFn = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'customer_action_items') {
          return { update: updateFn }
        }
        if (table === 'customer_events') {
          return { insert: insertFn }
        }
        return {}
      }),
    }
  })

  it('should pass document_id and execution_summary when status is done', async () => {
    const { createActionItemTools } = await import('../../services/ai/agents/customer-mgmt/tools/actionItemTools.js')
    const tools = createActionItemTools(mockSupabase, customerId)
    await tools.updateActionItemStatus.execute({
      actionItemId,
      status: 'done',
      document_id: documentId,
      execution_summary: executionSummary,
    })

    expect(updateFn).toHaveBeenCalledWith({
      status: 'done',
      document_id: documentId,
      execution_summary: executionSummary,
    })
  })

  it('should pass only document_id when execution_summary is omitted', async () => {
    const { createActionItemTools } = await import('../../services/ai/agents/customer-mgmt/tools/actionItemTools.js')
    const tools = createActionItemTools(mockSupabase, customerId)
    await tools.updateActionItemStatus.execute({
      actionItemId,
      status: 'done',
      document_id: documentId,
    })

    expect(updateFn).toHaveBeenCalledWith({
      status: 'done',
      document_id: documentId,
    })
  })

  it('should pass only execution_summary when document_id is omitted', async () => {
    const { createActionItemTools } = await import('../../services/ai/agents/customer-mgmt/tools/actionItemTools.js')
    const tools = createActionItemTools(mockSupabase, customerId)
    await tools.updateActionItemStatus.execute({
      actionItemId,
      status: 'done',
      execution_summary: executionSummary,
    })

    expect(updateFn).toHaveBeenCalledWith({
      status: 'done',
      execution_summary: executionSummary,
    })
  })

  it('should ignore document_id and execution_summary when status is not done', async () => {
    const { createActionItemTools } = await import('../../services/ai/agents/customer-mgmt/tools/actionItemTools.js')
    const tools = createActionItemTools(mockSupabase, customerId)
    await tools.updateActionItemStatus.execute({
      actionItemId,
      status: 'in_progress',
      document_id: documentId,
      execution_summary: executionSummary,
    })

    expect(updateFn).toHaveBeenCalledWith({
      status: 'in_progress',
    })
  })

  it('should pass only status when done without document_id or execution_summary', async () => {
    const { createActionItemTools } = await import('../../services/ai/agents/customer-mgmt/tools/actionItemTools.js')
    const tools = createActionItemTools(mockSupabase, customerId)
    await tools.updateActionItemStatus.execute({
      actionItemId,
      status: 'done',
    })

    expect(updateFn).toHaveBeenCalledWith({
      status: 'done',
    })
  })
})
