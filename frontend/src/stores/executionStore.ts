/**
 * Execution Store
 *
 * Tracks which action item is currently being executed by the AI agent.
 * Enforces one-at-a-time execution across the entire app.
 * Session-only — no persistence.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ExecutionState {
  executingItemId: string | null
  executingCustomerId: string | null
  startExecution: (itemId: string, customerId: string) => void
  endExecution: () => void
}

export const useExecutionStore = create<ExecutionState>()(
  devtools(
    (set) => ({
      executingItemId: null,
      executingCustomerId: null,
      startExecution: (itemId, customerId) =>
        set({ executingItemId: itemId, executingCustomerId: customerId }, false, 'startExecution'),
      endExecution: () =>
        set({ executingItemId: null, executingCustomerId: null }, false, 'endExecution'),
    }),
    { name: 'ExecutionStore' }
  )
)
