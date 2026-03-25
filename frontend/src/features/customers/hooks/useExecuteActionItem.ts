/**
 * useExecuteActionItem Hook
 *
 * Encapsulates the action item execution flow:
 * 1. Updates status to in_progress
 * 2. Builds a trigger message for the AI agent
 * 3. Opens the customer chat with the trigger message
 *
 * Works from both the customer detail page (ActionItemsTab) and
 * the board page (KanbanBoard) via navigation state handoff.
 *
 * Uses the global ExecutionStore to enforce one-at-a-time execution
 * and provide loading state across all views.
 */

import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChatLayoutStore } from '@/stores/chatLayoutStore'
import { useExecutionStore } from '@/stores/executionStore'
import type { ActionItem, ActionItemWithCustomer, ActionItemStatus } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function buildTriggerMessage(item: ActionItem | ActionItemWithCustomer): string {
  const parts = [
    `Execute action item: "${item.description}"`,
    `Type: ${item.type}`,
  ]
  if (item.due_date) {
    parts.push(`Due: ${item.due_date}`)
  }
  parts.push(`Action Item ID: ${item.id}`)
  parts.push('Please execute this action item.')
  return parts.join('\n')
}

function buildChatConfig(customerId: string, customerName: string, message: string, activeTab?: string) {
  return {
    title: `AI Assistant \u2022 ${customerName}`,
    contextKey: `customer:${customerId}`,
    endpoint: `${API_URL}/api/ai/customer/chat/stream`,
    screenContext: {
      currentPage: 'customer' as const,
      customerId,
      customerName,
      activeTab: activeTab || 'action-items',
    },
    suggestions: [],
    initialMessage: message,
  }
}

export function useExecuteActionItem() {
  const navigate = useNavigate()
  const location = useLocation()
  const openChat = useChatLayoutStore((s) => s.openChat)
  const executingItemId = useExecutionStore((s) => s.executingItemId)
  const startExecution = useExecutionStore((s) => s.startExecution)
  const endExecution = useExecutionStore((s) => s.endExecution)

  const execute = useCallback(async (
    item: ActionItem | ActionItemWithCustomer,
    customerId: string,
    customerName: string,
    updateStatusFn: (id: string, status: ActionItemStatus) => Promise<void>
  ) => {
    // One-at-a-time lock: if something is already executing, bail
    if (executingItemId !== null) return

    startExecution(item.id, customerId)

    try {
      // 1. Update status to in_progress
      await updateStatusFn(item.id, 'in_progress')

      // 2. Build trigger message
      const message = buildTriggerMessage(item)

      // 3. Check if already on customer page
      const isOnCustomerPage = location.pathname === `/customers/${customerId}`

      if (isOnCustomerPage) {
        // Open chat directly with initialMessage
        openChat(buildChatConfig(customerId, customerName, message))
      } else {
        // Navigate to customer page with state — CustomerDetailPage picks it up
        navigate(`/customers/${customerId}`, {
          state: {
            executeActionItem: {
              initialMessage: message,
              customerName,
            },
          },
        })
      }
    } catch {
      // Status update failed — button re-enables via finally block
    } finally {
      endExecution()
    }
  }, [navigate, location.pathname, openChat, executingItemId, startExecution, endExecution])

  return { execute, executingItemId }
}
