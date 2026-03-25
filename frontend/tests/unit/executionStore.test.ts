/**
 * Unit Tests for ExecutionStore
 *
 * Tests the Zustand store that enforces one-at-a-time action item execution:
 * - Default state (both ids are null)
 * - startExecution sets itemId and customerId
 * - endExecution clears both back to null
 * - Calling startExecution twice overwrites previous values
 * - endExecution after startExecution returns to default state
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useExecutionStore } from '@/stores/executionStore'

// ---------------------------------------------------------------------------
// Reset store state before each test so tests are fully isolated.
// Zustand's setState is available on the store reference directly.
// ---------------------------------------------------------------------------

beforeEach(() => {
  useExecutionStore.setState({
    executingItemId: null,
    executingCustomerId: null,
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('executionStore', () => {
  // -------------------------------------------------------------------------
  // Default state
  // -------------------------------------------------------------------------

  describe('default state', () => {
    it('executingItemId is null by default', () => {
      const { executingItemId } = useExecutionStore.getState()
      expect(executingItemId).toBeNull()
    })

    it('executingCustomerId is null by default', () => {
      const { executingCustomerId } = useExecutionStore.getState()
      expect(executingCustomerId).toBeNull()
    })

    it('both ids are null together by default', () => {
      const state = useExecutionStore.getState()
      expect(state.executingItemId).toBeNull()
      expect(state.executingCustomerId).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // startExecution
  // -------------------------------------------------------------------------

  describe('startExecution', () => {
    it('sets executingItemId to the provided itemId', () => {
      const { startExecution } = useExecutionStore.getState()

      startExecution('item-abc', 'cust-123')

      expect(useExecutionStore.getState().executingItemId).toBe('item-abc')
    })

    it('sets executingCustomerId to the provided customerId', () => {
      const { startExecution } = useExecutionStore.getState()

      startExecution('item-abc', 'cust-123')

      expect(useExecutionStore.getState().executingCustomerId).toBe('cust-123')
    })

    it('sets both ids atomically in a single update', () => {
      const { startExecution } = useExecutionStore.getState()

      startExecution('item-xyz', 'cust-999')

      const { executingItemId, executingCustomerId } = useExecutionStore.getState()
      expect(executingItemId).toBe('item-xyz')
      expect(executingCustomerId).toBe('cust-999')
    })

    it('overwrites previous values when called a second time', () => {
      const { startExecution } = useExecutionStore.getState()

      startExecution('item-first', 'cust-first')
      startExecution('item-second', 'cust-second')

      const { executingItemId, executingCustomerId } = useExecutionStore.getState()
      expect(executingItemId).toBe('item-second')
      expect(executingCustomerId).toBe('cust-second')
    })

    it('does not retain any value from the first call after overwrite', () => {
      const { startExecution } = useExecutionStore.getState()

      startExecution('item-old', 'cust-old')
      startExecution('item-new', 'cust-new')

      expect(useExecutionStore.getState().executingItemId).not.toBe('item-old')
      expect(useExecutionStore.getState().executingCustomerId).not.toBe('cust-old')
    })
  })

  // -------------------------------------------------------------------------
  // endExecution
  // -------------------------------------------------------------------------

  describe('endExecution', () => {
    it('clears executingItemId to null', () => {
      const { startExecution, endExecution } = useExecutionStore.getState()

      startExecution('item-abc', 'cust-123')
      endExecution()

      expect(useExecutionStore.getState().executingItemId).toBeNull()
    })

    it('clears executingCustomerId to null', () => {
      const { startExecution, endExecution } = useExecutionStore.getState()

      startExecution('item-abc', 'cust-123')
      endExecution()

      expect(useExecutionStore.getState().executingCustomerId).toBeNull()
    })

    it('clears both ids atomically in a single update', () => {
      const { startExecution, endExecution } = useExecutionStore.getState()

      startExecution('item-abc', 'cust-123')
      endExecution()

      const { executingItemId, executingCustomerId } = useExecutionStore.getState()
      expect(executingItemId).toBeNull()
      expect(executingCustomerId).toBeNull()
    })

    it('is a no-op when called without a preceding startExecution', () => {
      const { endExecution } = useExecutionStore.getState()

      // Must not throw
      expect(() => endExecution()).not.toThrow()

      const { executingItemId, executingCustomerId } = useExecutionStore.getState()
      expect(executingItemId).toBeNull()
      expect(executingCustomerId).toBeNull()
    })

    it('returns to the same state as the initial default', () => {
      const { startExecution, endExecution } = useExecutionStore.getState()

      startExecution('item-abc', 'cust-123')
      endExecution()

      const state = useExecutionStore.getState()
      expect(state.executingItemId).toBeNull()
      expect(state.executingCustomerId).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Full lifecycle: start → end → start again
  // -------------------------------------------------------------------------

  describe('full lifecycle', () => {
    it('supports multiple complete execution cycles', () => {
      const { startExecution, endExecution } = useExecutionStore.getState()

      // First cycle
      startExecution('item-1', 'cust-A')
      expect(useExecutionStore.getState().executingItemId).toBe('item-1')
      endExecution()
      expect(useExecutionStore.getState().executingItemId).toBeNull()

      // Second cycle with different ids
      startExecution('item-2', 'cust-B')
      expect(useExecutionStore.getState().executingItemId).toBe('item-2')
      expect(useExecutionStore.getState().executingCustomerId).toBe('cust-B')
      endExecution()
      expect(useExecutionStore.getState().executingItemId).toBeNull()
      expect(useExecutionStore.getState().executingCustomerId).toBeNull()
    })
  })
})
