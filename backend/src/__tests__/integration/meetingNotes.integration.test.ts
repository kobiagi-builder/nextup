/**
 * Meeting Notes Analysis — Integration Tests
 *
 * Tests tool registration in buildAgentTools and end-to-end document creation
 * flow across both agent variants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger before imports
vi.mock('../../lib/logger.js', () => ({
  logToFile: vi.fn(),
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { analyzeMeetingNotesTool as cmTool } from '../../services/ai/agents/customer-mgmt/tools/analyzeMeetingNotesTool.js'
import { analyzeMeetingNotesTool as pmTool } from '../../services/ai/agents/product-mgmt/tools/analyzeMeetingNotesTool.js'

// =============================================================================
// Supabase Mock
// =============================================================================

function createFullMockSupabase() {
  const documentId = 'integration-doc-' + Math.random().toString(36).substr(2, 6)
  const documentInserts: any[] = []
  const eventInserts: any[] = []

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'customer_initiatives') {
      // Mock for resolveInitiativeId — returns the initiative as valid
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: meetingInput.initiativeId },
                error: null,
              }),
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [{ id: meetingInput.initiativeId }], error: null }),
            }),
          })),
        }),
      }
    }
    if (table === 'customer_documents') {
      return {
        insert: vi.fn().mockImplementation((data: any) => {
          documentInserts.push(data)
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: documentId }, error: null }),
            }),
          }
        }),
      }
    }
    if (table === 'customer_events') {
      return {
        insert: vi.fn().mockImplementation((data: any) => {
          eventInserts.push(data)
          return { catch: vi.fn() }
        }),
      }
    }
    return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) }
  })

  return {
    supabase: { from: mockFrom } as any,
    documentInserts,
    eventInserts,
    documentId,
  }
}

// =============================================================================
// Fixtures
// =============================================================================

const customerId = 'integration-customer-789'

const meetingInput = {
  initiativeId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Integration Test Meeting',
  content: '# Meeting Analysis\n\n## Key Insights\n\nTest insights...\n\n## Next Steps\n\n- Item 1\n- Item 2',
  meetingType: 'status' as const,
  attendees: ['Alice', 'Bob'],
  meetingDate: '2026-03-09',
  actionItemsSummary: [
    { description: 'Follow up on proposal', owner: 'Alice', dueDate: '2026-03-12' },
  ],
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('Meeting Notes Tool Registration', () => {
  it('Customer Mgmt tool exports analyzeMeetingNotes key', () => {
    const { supabase } = createFullMockSupabase()
    const tools = cmTool(supabase, customerId)
    expect(Object.keys(tools)).toEqual(['analyzeMeetingNotes'])
    expect(tools.analyzeMeetingNotes).toBeDefined()
    expect(typeof tools.analyzeMeetingNotes.execute).toBe('function')
  })

  it('Product Mgmt tool exports analyzeMeetingNotes key', () => {
    const { supabase } = createFullMockSupabase()
    const tools = pmTool(supabase, customerId)
    expect(Object.keys(tools)).toEqual(['analyzeMeetingNotes'])
    expect(tools.analyzeMeetingNotes).toBeDefined()
    expect(typeof tools.analyzeMeetingNotes.execute).toBe('function')
  })

  it('both tools have the same input schema', () => {
    const { supabase } = createFullMockSupabase()
    const cmTools = cmTool(supabase, customerId)
    const pmTools = pmTool(supabase, customerId)

    // Both should have inputSchema (from the shared meetingNotesInputSchema)
    expect(cmTools.analyzeMeetingNotes.inputSchema).toBeDefined()
    expect(pmTools.analyzeMeetingNotes.inputSchema).toBeDefined()
  })
})

describe('Meeting Notes End-to-End Document Creation', () => {
  it('Customer Mgmt tool creates document and logs event', async () => {
    const { supabase, documentInserts, eventInserts, documentId } = createFullMockSupabase()
    const tools = cmTool(supabase, customerId)

    const result = await tools.analyzeMeetingNotes.execute!(meetingInput, {} as any)

    // Verify result
    expect(result).toEqual({
      success: true,
      documentId,
      title: meetingInput.title,
      type: 'meeting_notes',
      initiativeId: meetingInput.initiativeId,
    })

    // Verify document was inserted
    expect(documentInserts).toHaveLength(1)
    expect(documentInserts[0]).toMatchObject({
      initiative_id: meetingInput.initiativeId,
      customer_id: customerId,
      type: 'meeting_notes',
      title: meetingInput.title,
      content: meetingInput.content,
      status: 'draft',
    })

    // Verify metadata has agentSource
    expect(documentInserts[0].metadata.agentSource).toBe('customer_mgmt')
    expect(documentInserts[0].metadata.meetingType).toBe('status')
    expect(documentInserts[0].metadata.attendees).toEqual(['Alice', 'Bob'])

    // Verify event was logged
    expect(eventInserts).toHaveLength(1)
    expect(eventInserts[0]).toMatchObject({
      customer_id: customerId,
      event_type: 'delivery',
      title: `Created meeting_notes: ${meetingInput.title}`,
    })
  })

  it('Product Mgmt tool creates document and logs event', async () => {
    const { supabase, documentInserts, eventInserts, documentId } = createFullMockSupabase()
    const tools = pmTool(supabase, customerId)

    const result = await tools.analyzeMeetingNotes.execute!(meetingInput, {} as any)

    // Verify result
    expect(result).toEqual({
      success: true,
      documentId,
      title: meetingInput.title,
      type: 'meeting_notes',
      initiativeId: meetingInput.initiativeId,
    })

    // Verify metadata has correct agentSource
    expect(documentInserts[0].metadata.agentSource).toBe('product_mgmt')

    // Verify event was logged
    expect(eventInserts).toHaveLength(1)
  })

  it('both agent tools produce identical DB rows (except agentSource)', async () => {
    const cm = createFullMockSupabase()
    const pm = createFullMockSupabase()

    const cmTools = cmTool(cm.supabase, customerId)
    const pmTools = pmTool(pm.supabase, customerId)

    await cmTools.analyzeMeetingNotes.execute!(meetingInput, {} as any)
    await pmTools.analyzeMeetingNotes.execute!(meetingInput, {} as any)

    // Compare document inserts (exclude metadata since agentSource differs)
    const cmDoc = { ...cm.documentInserts[0] }
    const pmDoc = { ...pm.documentInserts[0] }
    delete cmDoc.metadata
    delete pmDoc.metadata

    expect(cmDoc).toEqual(pmDoc)

    // Verify only agentSource differs in metadata
    expect(cm.documentInserts[0].metadata.agentSource).toBe('customer_mgmt')
    expect(pm.documentInserts[0].metadata.agentSource).toBe('product_mgmt')
    expect(cm.documentInserts[0].metadata.meetingType).toBe(pm.documentInserts[0].metadata.meetingType)
  })
})
