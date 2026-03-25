/**
 * Unit Tests for useExecuteActionItem Hook
 *
 * Tests the action item execution flow:
 * - Trigger message construction (description, type, due_date, ID)
 * - Status update call with correct arguments
 * - Chat opening when already on the customer page
 * - Navigation with state when on a different page
 * - executingItemId lifecycle (set → cleared)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted runs before any imports)
// ---------------------------------------------------------------------------

const { mockNavigate, mockOpenChat } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockOpenChat: vi.fn(),
}))

// Mock react-router-dom — location is set per-test via mockLocation
let mockLocation = { pathname: '/some-other-page' }

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}))

// Mock chatLayoutStore — openChat is extracted via selector so we mock the
// store's selector behaviour by returning our spy directly.
vi.mock('@/stores/chatLayoutStore', () => ({
  useChatLayoutStore: (selector: (s: { openChat: typeof mockOpenChat }) => unknown) =>
    selector({ openChat: mockOpenChat }),
}))

// The hook evaluates `import.meta.env.VITE_API_URL || 'http://localhost:3001'`
// at module load time, so stubEnv cannot change it after the fact.
// We use the actual fallback value in assertions instead.
const EXPECTED_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Import hook AFTER mocks are in place
// ---------------------------------------------------------------------------

import { useExecuteActionItem } from '../../../src/features/customers/hooks/useExecuteActionItem'
import type { ActionItem } from '../../../src/features/customers/types'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_ITEM: ActionItem = {
  id: 'item-123',
  customer_id: 'cust-456',
  user_id: 'user-789',
  type: 'follow_up',
  description: 'Send the revised proposal',
  due_date: '2026-04-01',
  status: 'todo',
  reported_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const CUSTOMER_ID = 'cust-456'
const CUSTOMER_NAME = 'Acme Corp'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderExecuteHook() {
  return renderHook(() => useExecuteActionItem())
}

function makeUpdateStatusFn() {
  return vi.fn().mockResolvedValue(undefined)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExecuteActionItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: not on the customer page
    mockLocation = { pathname: '/some-other-page' }
  })

  // -------------------------------------------------------------------------
  // Trigger message construction
  // -------------------------------------------------------------------------

  describe('buildTriggerMessage', () => {
    it('includes description, type, due_date, and item ID in the message', async () => {
      mockLocation = { pathname: `/customers/${CUSTOMER_ID}` }

      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      const calledConfig = mockOpenChat.mock.calls[0][0]
      expect(calledConfig.initialMessage).toContain('Send the revised proposal')
      expect(calledConfig.initialMessage).toContain('follow_up')
      expect(calledConfig.initialMessage).toContain('2026-04-01')
      expect(calledConfig.initialMessage).toContain('item-123')
    })

    it('omits the due date line when due_date is null', async () => {
      mockLocation = { pathname: `/customers/${CUSTOMER_ID}` }

      const itemNoDueDate: ActionItem = { ...BASE_ITEM, due_date: null }
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(itemNoDueDate, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      const calledConfig = mockOpenChat.mock.calls[0][0]
      expect(calledConfig.initialMessage).not.toContain('Due:')
    })

    it('always appends "Please execute this action item."', async () => {
      mockLocation = { pathname: `/customers/${CUSTOMER_ID}` }

      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      const calledConfig = mockOpenChat.mock.calls[0][0]
      expect(calledConfig.initialMessage).toContain('Please execute this action item.')
    })
  })

  // -------------------------------------------------------------------------
  // updateStatusFn call
  // -------------------------------------------------------------------------

  describe('status update', () => {
    it('calls updateStatusFn with item.id and "in_progress"', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(updateStatus).toHaveBeenCalledOnce()
      expect(updateStatus).toHaveBeenCalledWith('item-123', 'in_progress')
    })

    it('calls updateStatusFn before opening chat or navigating', async () => {
      mockLocation = { pathname: `/customers/${CUSTOMER_ID}` }

      const callOrder: string[] = []
      const updateStatus = vi.fn().mockImplementation(async () => {
        callOrder.push('updateStatus')
      })
      mockOpenChat.mockImplementation(() => {
        callOrder.push('openChat')
      })

      const { result } = renderExecuteHook()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(callOrder).toEqual(['updateStatus', 'openChat'])
    })
  })

  // -------------------------------------------------------------------------
  // openChat path (already on customer page)
  // -------------------------------------------------------------------------

  describe('when already on the customer page', () => {
    beforeEach(() => {
      mockLocation = { pathname: `/customers/${CUSTOMER_ID}` }
    })

    it('calls openChat instead of navigate', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(mockOpenChat).toHaveBeenCalledOnce()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('passes correct config to openChat', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      const config = mockOpenChat.mock.calls[0][0]
      expect(config.contextKey).toBe(`customer:${CUSTOMER_ID}`)
      expect(config.title).toContain(CUSTOMER_NAME)
      expect(config.endpoint).toBe(`${EXPECTED_API_URL}/api/ai/customer/chat/stream`)
      expect(config.screenContext).toMatchObject({
        currentPage: 'customer',
        customerId: CUSTOMER_ID,
        customerName: CUSTOMER_NAME,
        activeTab: 'action-items',
      })
      expect(config.suggestions).toEqual([])
      // initialMessage already validated in trigger message tests
      expect(config.initialMessage).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // navigate path (on a different page)
  // -------------------------------------------------------------------------

  describe('when on a different page', () => {
    beforeEach(() => {
      mockLocation = { pathname: '/action-items' }
    })

    it('calls navigate instead of openChat', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(mockNavigate).toHaveBeenCalledOnce()
      expect(mockOpenChat).not.toHaveBeenCalled()
    })

    it('navigates to the customer detail page', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      const [path] = mockNavigate.mock.calls[0]
      expect(path).toBe(`/customers/${CUSTOMER_ID}`)
    })

    it('passes executeActionItem state with initialMessage and customerName', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      const [, options] = mockNavigate.mock.calls[0]
      expect(options.state.executeActionItem).toMatchObject({
        customerName: CUSTOMER_NAME,
      })
      expect(options.state.executeActionItem.initialMessage).toBeTruthy()
      expect(options.state.executeActionItem.initialMessage).toContain('item-123')
    })
  })

  // -------------------------------------------------------------------------
  // executingItemId lifecycle
  // -------------------------------------------------------------------------

  describe('executingItemId', () => {
    it('starts as null', () => {
      const { result } = renderExecuteHook()
      expect(result.current.executingItemId).toBeNull()
    })

    it('is null again after execute completes', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(result.current.executingItemId).toBeNull()
    })

    it('is set to the item id while execute is in flight', async () => {
      mockLocation = { pathname: `/customers/${CUSTOMER_ID}` }

      // Make updateStatus pause long enough for us to observe executingItemId
      let resolveUpdate!: () => void
      const updateStatus = vi.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveUpdate = resolve
        }),
      )

      const { result } = renderExecuteHook()

      // Start execute without awaiting
      let executePromise: Promise<void>
      act(() => {
        executePromise = result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      // executingItemId should be set now (synchronously after the first setState call)
      expect(result.current.executingItemId).toBe('item-123')

      // Allow the async flow to complete
      await act(async () => {
        resolveUpdate()
        await executePromise
      })

      expect(result.current.executingItemId).toBeNull()
    })
  })
})
