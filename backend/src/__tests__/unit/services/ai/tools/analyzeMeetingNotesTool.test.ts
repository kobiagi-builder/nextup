/**
 * Unit tests for analyzeMeetingNotes tool (both Customer Mgmt and Product Mgmt variants).
 *
 * Both tools share the same schema and execute function pattern,
 * delegating to createDocumentWithEvent from documentHelpers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logToFile before imports
vi.mock('../../../../../lib/logger.js', () => ({
  logToFile: vi.fn(),
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { analyzeMeetingNotesTool as cmAnalyzeMeetingNotesTool } from '../../../../../services/ai/agents/customer-mgmt/tools/analyzeMeetingNotesTool.js'
import { analyzeMeetingNotesTool as pmAnalyzeMeetingNotesTool } from '../../../../../services/ai/agents/product-mgmt/tools/analyzeMeetingNotesTool.js'
import { meetingNotesInputSchema } from '../../../../../services/ai/agents/shared/meetingNotesSchema.js'

// =============================================================================
// Supabase Mock Helpers
// =============================================================================

function createMockSupabase(documentId = 'doc-123', insertError: string | null = null) {
  const mockSingle = vi.fn().mockResolvedValue(
    insertError
      ? { data: null, error: { message: insertError } }
      : { data: { id: documentId }, error: null },
  )

  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })

  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

  // Event insert (fire-and-forget)
  const mockEventInsert = vi.fn().mockReturnValue({
    catch: vi.fn().mockReturnValue(undefined),
  })

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'customer_documents') {
      return { insert: mockInsert }
    }
    if (table === 'customer_events') {
      return { insert: mockEventInsert }
    }
    return { insert: mockInsert }
  })

  return {
    supabase: { from: mockFrom } as any,
    mocks: { from: mockFrom, insert: mockInsert, select: mockSelect, single: mockSingle, eventInsert: mockEventInsert },
  }
}

// =============================================================================
// Valid Input Fixtures
// =============================================================================

const validInput = {
  initiativeId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Sprint Planning - March 10',
  content: '# Meeting Analysis\n\n## Key Insights\n\nDiscussed sprint goals...',
  meetingType: 'sprint_planning',
  attendees: ['Alice', 'Bob', 'Charlie'],
  meetingDate: '2026-03-10',
  actionItemsSummary: [
    { description: 'Set up CI pipeline', owner: 'Bob', dueDate: '2026-03-15' },
    { description: 'Review PRD draft', owner: 'Alice' },
  ],
}

const minimalInput = {
  initiativeId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Quick Status Check',
  content: '# Meeting Analysis\n\nBrief status update...',
  meetingType: 'status',
}

const customerId = 'customer-456'

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('meetingNotesInputSchema', () => {
  it('should accept valid input with all fields', () => {
    const result = meetingNotesInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('should accept minimal input (required fields only)', () => {
    const result = meetingNotesInputSchema.safeParse(minimalInput)
    expect(result.success).toBe(true)
  })

  it('should reject missing initiativeId', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...validInput,
      initiativeId: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid UUID for initiativeId', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...validInput,
      initiativeId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing title', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...validInput,
      title: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing content', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...validInput,
      content: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing meetingType', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...validInput,
      meetingType: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('should accept actionItemsSummary with partial fields', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...minimalInput,
      actionItemsSummary: [{ description: 'Do something' }],
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid meetingType (enum validation)', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...validInput,
      meetingType: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })

  it('should accept all valid meetingType values', () => {
    const validTypes = [
      'status', 'discovery', 'sprint_planning', 'roadmap_review',
      'user_interview', 'pricing', 'kickoff', 'retrospective',
      'design_review', 'introduction', 'account_review', 'demo', 'other',
    ]
    for (const type of validTypes) {
      const result = meetingNotesInputSchema.safeParse({ ...minimalInput, meetingType: type })
      expect(result.success).toBe(true)
    }
  })

  it('should reject malformed meetingDate (regex validation)', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...minimalInput,
      meetingDate: 'March 10, 2026',
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid ISO date for meetingDate', () => {
    const result = meetingNotesInputSchema.safeParse({
      ...minimalInput,
      meetingDate: '2026-03-10',
    })
    expect(result.success).toBe(true)
  })
})

// =============================================================================
// Tool Tests — Helper to test both variants
// =============================================================================

function describeToolVariant(
  name: string,
  toolFactory: (supabase: any, customerId: string) => { analyzeMeetingNotes: any },
  expectedAgentSource: string,
) {
  describe(name, () => {
    let tool: any

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return an object with analyzeMeetingNotes key', () => {
      const { supabase } = createMockSupabase()
      const result = toolFactory(supabase, customerId)
      expect(result).toHaveProperty('analyzeMeetingNotes')
      expect(result.analyzeMeetingNotes).toHaveProperty('execute')
    })

    it('should create a document with all fields and correct metadata', async () => {
      const { supabase, mocks } = createMockSupabase('doc-abc')
      tool = toolFactory(supabase, customerId).analyzeMeetingNotes

      const result = await tool.execute(validInput)

      expect(result).toEqual({
        success: true,
        documentId: 'doc-abc',
        title: validInput.title,
        type: 'meeting_notes',
        initiativeId: validInput.initiativeId,
      })

      // Verify document insert was called with correct data
      expect(mocks.from).toHaveBeenCalledWith('customer_documents')
      expect(mocks.insert).toHaveBeenCalledWith({
        initiative_id: validInput.initiativeId,
        customer_id: customerId,
        type: 'meeting_notes',
        title: validInput.title,
        content: validInput.content,
        status: 'draft',
        metadata: {
          meetingType: 'sprint_planning',
          agentSource: expectedAgentSource,
          attendees: ['Alice', 'Bob', 'Charlie'],
          meetingDate: '2026-03-10',
          actionItemsSummary: validInput.actionItemsSummary,
        },
      })
    })

    it('should create a document with minimal input (no optional fields in metadata)', async () => {
      const { supabase, mocks } = createMockSupabase('doc-min')
      tool = toolFactory(supabase, customerId).analyzeMeetingNotes

      const result = await tool.execute(minimalInput)

      expect(result).toEqual({
        success: true,
        documentId: 'doc-min',
        title: minimalInput.title,
        type: 'meeting_notes',
        initiativeId: minimalInput.initiativeId,
      })

      // Metadata should only contain meetingType and agentSource (no attendees, meetingDate, actionItemsSummary)
      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            meetingType: 'status',
            agentSource: expectedAgentSource,
          },
        }),
      )
    })

    it('should exclude empty attendees array from metadata', async () => {
      const { supabase, mocks } = createMockSupabase()
      tool = toolFactory(supabase, customerId).analyzeMeetingNotes

      await tool.execute({ ...minimalInput, attendees: [] })

      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({ attendees: expect.anything() }),
        }),
      )
    })

    it('should exclude empty actionItemsSummary array from metadata', async () => {
      const { supabase, mocks } = createMockSupabase()
      tool = toolFactory(supabase, customerId).analyzeMeetingNotes

      await tool.execute({ ...minimalInput, actionItemsSummary: [] })

      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({ actionItemsSummary: expect.anything() }),
        }),
      )
    })

    it('should return error on Supabase insert failure', async () => {
      const { supabase } = createMockSupabase('', 'duplicate key value')
      tool = toolFactory(supabase, customerId).analyzeMeetingNotes

      const result = await tool.execute(validInput)

      expect(result).toEqual({
        success: false,
        error: 'duplicate key value',
      })
    })

    it('should log a delivery event after document creation', async () => {
      const { supabase, mocks } = createMockSupabase()
      tool = toolFactory(supabase, customerId).analyzeMeetingNotes

      await tool.execute(validInput)

      // Verify event logging was called
      expect(mocks.from).toHaveBeenCalledWith('customer_events')
      expect(mocks.eventInsert).toHaveBeenCalledWith({
        customer_id: customerId,
        event_type: 'delivery',
        title: `Created meeting_notes: ${validInput.title}`,
        description: 'Type: meeting_notes',
      })
    })

    it('should always set document status to draft', async () => {
      const { supabase, mocks } = createMockSupabase()
      tool = toolFactory(supabase, customerId).analyzeMeetingNotes

      await tool.execute(validInput)

      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' }),
      )
    })
  })
}

// =============================================================================
// Run tests for both tool variants
// =============================================================================

describeToolVariant(
  'analyzeMeetingNotesTool (Customer Mgmt)',
  cmAnalyzeMeetingNotesTool,
  'customer_mgmt',
)

describeToolVariant(
  'analyzeMeetingNotesTool (Product Mgmt)',
  pmAnalyzeMeetingNotesTool,
  'product_mgmt',
)
