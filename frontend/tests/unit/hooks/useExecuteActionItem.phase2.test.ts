/**
 * Unit Tests for useExecuteActionItem — Phase 2: ExecutionStore Integration
 *
 * This file specifically tests the Phase 2 changes to the hook:
 * - Migration from local useState to the global ExecutionStore
 * - One-at-a-time execution lock (bail if executingItemId !== null)
 * - ExecutionStore state wiring (executingItemId exposed by hook, cleared via finally)
 *
 * Behaviour tested by the original useExecuteActionItem.test.ts is NOT
 * duplicated here (trigger message, navigation path, openChat config, etc.).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExecutionStore } from '@/stores/executionStore'

// ---------------------------------------------------------------------------
// Hoisted mocks (must run before any imports)
// ---------------------------------------------------------------------------

const { mockNavigate, mockOpenChat } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockOpenChat: vi.fn(),
}))

let mockLocation = { pathname: '/some-other-page' }

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}))

vi.mock('@/stores/chatLayoutStore', () => ({
  useChatLayoutStore: (selector: (s: { openChat: typeof mockOpenChat }) => unknown) =>
    selector({ openChat: mockOpenChat }),
}))

// ---------------------------------------------------------------------------
// Import hook AFTER mocks are declared
// ---------------------------------------------------------------------------

import { useExecuteActionItem } from '../../../src/features/customers/hooks/useExecuteActionItem'
import type { ActionItem } from '../../../src/features/customers/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Complete fixture that matches the current ActionItem interface including
// fields added in later iterations (document_id, execution_summary).
const BASE_ITEM: ActionItem = {
  id: 'item-phase2',
  customer_id: 'cust-phase2',
  user_id: 'user-phase2',
  type: 'follow_up',
  description: 'Verify Phase 2 lock behaviour',
  due_date: null,
  status: 'todo',
  reported_by: null,
  document_id: null,
  execution_summary: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const ANOTHER_ITEM: ActionItem = {
  ...BASE_ITEM,
  id: 'item-another',
  description: 'Second concurrent item attempt',
}

const CUSTOMER_ID = 'cust-phase2'
const CUSTOMER_NAME = 'Phase2 Corp'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderExecuteHook() {
  return renderHook(() => useExecuteActionItem())
}

function makeUpdateStatusFn() {
  return vi.fn().mockResolvedValue(undefined)
}

function makePendingUpdateStatusFn() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  const fn = vi.fn().mockReturnValue(promise)
  return { fn, resolve }
}

// ---------------------------------------------------------------------------
// Lifecycle management
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  // Reset the real ExecutionStore before each test so isolation is guaranteed.
  useExecutionStore.setState({
    executingItemId: null,
    executingCustomerId: null,
  })
  mockLocation = { pathname: '/some-other-page' }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExecuteActionItem — Phase 2 ExecutionStore integration', () => {
  // -------------------------------------------------------------------------
  // Initial exposed state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('executingItemId is null when no execution is in progress', () => {
      const { result } = renderExecuteHook()
      expect(result.current.executingItemId).toBeNull()
    })

    it('execute is exposed as a function', () => {
      const { result } = renderExecuteHook()
      expect(typeof result.current.execute).toBe('function')
    })
  })

  // -------------------------------------------------------------------------
  // ExecutionStore wiring — executingItemId tracks the store
  // -------------------------------------------------------------------------

  describe('ExecutionStore wiring', () => {
    it('executingItemId reflects the store value when set externally', () => {
      // Manually set the store as if another instance called startExecution
      useExecutionStore.getState().startExecution('external-item', 'external-cust')

      const { result } = renderExecuteHook()
      expect(result.current.executingItemId).toBe('external-item')
    })

    it('executingItemId is null after external endExecution clears the store', () => {
      useExecutionStore.getState().startExecution('external-item', 'external-cust')
      // Render hook while item is executing
      const { result } = renderExecuteHook()
      expect(result.current.executingItemId).toBe('external-item')

      act(() => {
        useExecutionStore.getState().endExecution()
      })

      expect(result.current.executingItemId).toBeNull()
    })

    it('executingItemId is set to item.id while execute is in flight', async () => {
      // Pause the updateStatus call so we can observe the in-flight state
      const { fn: updateStatus, resolve } = makePendingUpdateStatusFn()
      const { result } = renderExecuteHook()

      let executePromise!: Promise<void>
      act(() => {
        executePromise = result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      // startExecution is called synchronously before the async updateStatus
      expect(result.current.executingItemId).toBe('item-phase2')

      await act(async () => {
        resolve()
        await executePromise
      })
    })

    it('executingItemId is null after execute completes successfully', async () => {
      const { result } = renderExecuteHook()
      const updateStatus = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(result.current.executingItemId).toBeNull()
    })

    it('executingItemId is null after execute throws (finally block clears store)', async () => {
      const updateStatus = vi.fn().mockRejectedValue(new Error('Network error'))
      const { result } = renderExecuteHook()

      await act(async () => {
        // execute swallows the error internally — it must not re-throw
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(result.current.executingItemId).toBeNull()
    })

    it('executingCustomerId in the store matches the customerId passed to execute', async () => {
      const updateStatus = makeUpdateStatusFn()
      const { result } = renderExecuteHook()

      // Use a pending update so we can inspect the store mid-flight
      const { fn: pendingUpdate, resolve } = makePendingUpdateStatusFn()

      let executePromise!: Promise<void>
      act(() => {
        executePromise = result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, pendingUpdate)
      })

      expect(useExecutionStore.getState().executingCustomerId).toBe(CUSTOMER_ID)

      await act(async () => {
        resolve()
        await executePromise
      })

      // Suppress unused variable warning — updateStatus defined for parity
      void updateStatus
    })
  })

  // -------------------------------------------------------------------------
  // One-at-a-time lock
  // -------------------------------------------------------------------------

  describe('one-at-a-time execution lock', () => {
    it('does not call updateStatusFn when another execution is already in progress', async () => {
      // Simulate a concurrent execution by pre-loading the store
      useExecutionStore.getState().startExecution('other-item', 'other-cust')

      const updateStatus = makeUpdateStatusFn()
      const { result } = renderExecuteHook()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(updateStatus).not.toHaveBeenCalled()
    })

    it('does not call openChat when another execution is already in progress', async () => {
      mockLocation = { pathname: `/customers/${CUSTOMER_ID}` }
      useExecutionStore.getState().startExecution('other-item', 'other-cust')

      const updateStatus = makeUpdateStatusFn()
      const { result } = renderExecuteHook()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(mockOpenChat).not.toHaveBeenCalled()
    })

    it('does not call navigate when another execution is already in progress', async () => {
      useExecutionStore.getState().startExecution('other-item', 'other-cust')

      const updateStatus = makeUpdateStatusFn()
      const { result } = renderExecuteHook()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('does not modify the store when bailing due to the lock', async () => {
      useExecutionStore.getState().startExecution('other-item', 'other-cust')

      const updateStatus = makeUpdateStatusFn()
      const { result } = renderExecuteHook()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus)
      })

      // The pre-loaded execution state must remain unchanged
      const state = useExecutionStore.getState()
      expect(state.executingItemId).toBe('other-item')
      expect(state.executingCustomerId).toBe('other-cust')
    })

    it('allows a second item to execute after the first has completed', async () => {
      // First execution
      const updateStatus1 = makeUpdateStatusFn()
      const { result } = renderExecuteHook()

      await act(async () => {
        await result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus1)
      })

      // Store must be clear
      expect(useExecutionStore.getState().executingItemId).toBeNull()

      // Second execution with a different item
      const updateStatus2 = makeUpdateStatusFn()

      await act(async () => {
        await result.current.execute(ANOTHER_ITEM, CUSTOMER_ID, CUSTOMER_NAME, updateStatus2)
      })

      expect(updateStatus2).toHaveBeenCalledOnce()
      expect(updateStatus2).toHaveBeenCalledWith('item-another', 'in_progress')
    })

    it('is safe to call execute concurrently: second call is a no-op while first is in flight', async () => {
      const { fn: slowUpdate, resolve } = makePendingUpdateStatusFn()
      const fastUpdate = makeUpdateStatusFn()
      const { result } = renderExecuteHook()

      // Start first execution without awaiting
      let firstPromise!: Promise<void>
      act(() => {
        firstPromise = result.current.execute(BASE_ITEM, CUSTOMER_ID, CUSTOMER_NAME, slowUpdate)
      })

      // While first is in flight, attempt a second execution
      await act(async () => {
        await result.current.execute(ANOTHER_ITEM, CUSTOMER_ID, CUSTOMER_NAME, fastUpdate)
      })

      // The second call should have been rejected by the lock
      expect(fastUpdate).not.toHaveBeenCalled()

      // Complete the first execution
      await act(async () => {
        resolve()
        await firstPromise
      })

      // Only the first updateStatus should have been called
      expect(slowUpdate).toHaveBeenCalledOnce()
    })
  })
})
