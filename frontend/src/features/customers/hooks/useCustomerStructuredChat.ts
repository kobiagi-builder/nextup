/**
 * useCustomerStructuredChat Hook
 *
 * Wraps useAIChat for customer-specific tool result parsing.
 * Separate from portfolio's useStructuredChat to avoid cross-context interference.
 *
 * Handles customer tool results:
 * - updateCustomerStatus → StatusChangeCard data
 * - createArtifact → ArtifactCreatedCard data
 * - createProject → ProjectCreatedCard data
 * - createEventLogEntry → event logged confirmation
 */

import { useCallback, useMemo } from 'react'
import { useAIChat, type UseAIChatOptions } from '@/features/portfolio/hooks/useAIChat'
import {
  useChatStore,
  selectMessages,
} from '@/features/portfolio/stores/chatStore'
import type { ChatContextKey } from '@/features/portfolio/stores/chatStore'

// =============================================================================
// Types
// =============================================================================

export type CustomerToolResult =
  | { type: 'status_change'; oldStatus: string; newStatus: string; reason: string }
  | { type: 'artifact_created'; artifactId: string; title: string; artifactType: string; projectId: string }
  | { type: 'project_created'; projectId: string; projectName: string }
  | { type: 'event_logged'; eventId: string }
  | { type: 'info_updated'; updatedFields: string[] }

export interface CustomerParsedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
  /** Customer-specific tool results attached to this message */
  customerToolResults?: CustomerToolResult[]
}

export interface UseCustomerStructuredChatOptions {
  contextKey: ChatContextKey
  customerId: string
  screenContext?: UseAIChatOptions['screenContext']
  endpoint?: string
  onError?: (error: Error) => void
  /** Called when customer data changes (status update, etc.) to trigger refetch */
  onCustomerDataChanged?: () => void
}

export interface UseCustomerStructuredChatReturn {
  messages: CustomerParsedMessage[]
  input: string
  setInput: (value: string) => void
  sendMessage: (content?: string) => void
  stop: () => void
  clear: () => void
  isStreaming: boolean
  isLoading: boolean
  error: string | null
}

// =============================================================================
// Hook
// =============================================================================

export function useCustomerStructuredChat(options: UseCustomerStructuredChatOptions): UseCustomerStructuredChatReturn {
  const { contextKey, customerId, screenContext, endpoint, onError, onCustomerDataChanged } = options

  const updateMessage = useChatStore((state) => state.updateMessage)

  // Handle tool results from customer AI agents
  const handleToolResult = useCallback(
    (toolName: string, result: unknown, messageId?: string) => {
      if (!messageId || !contextKey) return

      const obj = result as Record<string, unknown> | null
      if (!obj || typeof obj !== 'object') return

      let toolResult: CustomerToolResult | null = null

      switch (toolName) {
        case 'updateCustomerStatus':
          if (obj.success) {
            toolResult = {
              type: 'status_change',
              oldStatus: String(obj.oldStatus || 'unknown'),
              newStatus: String(obj.newStatus || 'unknown'),
              reason: String(obj.reason || ''),
            }
            onCustomerDataChanged?.()
          }
          break

        case 'createArtifact':
          if (obj.success) {
            toolResult = {
              type: 'artifact_created',
              artifactId: String(obj.artifactId || ''),
              title: String(obj.title || ''),
              artifactType: String(obj.type || 'custom'),
              projectId: String(obj.projectId || ''),
            }
            onCustomerDataChanged?.()
          }
          break

        case 'createProject':
          if (obj.success) {
            toolResult = {
              type: 'project_created',
              projectId: String(obj.projectId || ''),
              projectName: String(obj.projectName || ''),
            }
            onCustomerDataChanged?.()
          }
          break

        case 'createEventLogEntry':
          if (obj.success) {
            toolResult = {
              type: 'event_logged',
              eventId: String(obj.eventId || ''),
            }
            onCustomerDataChanged?.()
          }
          break

        case 'updateCustomerInfo':
          if (obj.success) {
            toolResult = {
              type: 'info_updated',
              updatedFields: (obj.updatedFields as string[]) || [],
            }
            onCustomerDataChanged?.()
          }
          break
      }

      if (toolResult) {
        // Store the tool result in the message metadata
        updateMessage(contextKey, messageId, {
          customerToolResults: [toolResult],
        })
      }
    },
    [contextKey, updateMessage, onCustomerDataChanged]
  )

  // Use the base AI chat hook with customer endpoint
  const {
    input,
    setInput,
    sendMessage,
    stop,
    clear,
    isStreaming,
    isLoading,
    error,
  } = useAIChat({
    contextKey,
    onToolResult: handleToolResult,
    onError,
    screenContext,
    endpoint,
    extraBody: { customerId },
  })

  // Read messages from store
  const rawMessages = useChatStore(selectMessages(contextKey))

  // Parse messages with customer tool results
  const parsedMessages: CustomerParsedMessage[] = useMemo(() => {
    return rawMessages.map((msg) => {
      const parsed: CustomerParsedMessage = {
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        createdAt: ('createdAt' in msg && msg.createdAt instanceof Date) ? msg.createdAt : new Date(msg.created_at),
      }

      if ('customerToolResults' in msg && Array.isArray(msg.customerToolResults)) {
        parsed.customerToolResults = msg.customerToolResults as CustomerToolResult[]
      }

      return parsed
    })
  }, [rawMessages])

  return {
    messages: parsedMessages,
    input,
    setInput,
    sendMessage,
    stop,
    clear,
    isStreaming,
    isLoading,
    error,
  }
}
