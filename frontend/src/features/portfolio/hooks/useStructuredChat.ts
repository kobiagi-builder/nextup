// @ts-nocheck
/**
 * useStructuredChat Hook
 *
 * Wraps useAIChat and parses messages to extract structured response data.
 * Provides enhanced message objects with structuredResponse and artifactSuggestions.
 */

import { useCallback, useMemo, useState } from 'react'
import { useAIChat, type UseAIChatOptions } from './useAIChat'
import {
  useChatStore,
  selectMessages,
  type ChatContextKey,
} from '../stores/chatStore'
import type {
  ParsedChatMessage,
  StructuredResponse,
  ArtifactSuggestion,
  isStructuredResponseToolResult,
  isArtifactSuggestionsToolResult,
} from '../types/chat'

// =============================================================================
// Types
// =============================================================================

export interface UseStructuredChatOptions extends Omit<UseAIChatOptions, 'onToolResult'> {
  /** Callback when an artifact is created */
  onArtifactCreated?: (artifact: ArtifactSuggestion) => void
  /** Screen context for Content Agent (optional, passed through from parent) */
  screenContext?: UseAIChatOptions['screenContext']
}

export interface UseStructuredChatReturn {
  /** Parsed messages with structured response data */
  messages: ParsedChatMessage[]
  /** Current input value */
  input: string
  /** Set input value */
  setInput: (value: string) => void
  /** Send a message */
  sendMessage: (content?: string) => void
  /** Stop generation */
  stop: () => void
  /** Clear messages */
  clear: () => void
  /** Is currently streaming */
  isStreaming: boolean
  /** Is loading (initial or sending) */
  isLoading: boolean
  /** Error if any */
  error: string | null
  /** Set of item IDs that have been added */
  addedItemIds: Set<string>
  /** Mark an item as added */
  markItemAdded: (itemId: string) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a result is a structured response tool result
 */
function isStructuredResponse(result: unknown): result is {
  success: boolean
  type: 'structured_response'
  response: StructuredResponse
} {
  console.log('[useStructuredChat] isStructuredResponse check:', {
    hasResult: !!result,
    isObject: typeof result === 'object',
    result: result,
  })

  if (!result || typeof result !== 'object') {
    console.log('[useStructuredChat] Failed: not an object')
    return false
  }

  const obj = result as Record<string, unknown>
  console.log('[useStructuredChat] Checking fields:', {
    type: obj.type,
    success: obj.success,
    hasResponse: 'response' in obj,
  })

  const passes = obj.type === 'structured_response' && obj.success === true
  console.log('[useStructuredChat] Type guard result:', passes)

  return passes
}

/**
 * Check if a result is an artifact suggestions tool result
 */
function isArtifactSuggestions(result: unknown): result is {
  success: boolean
  type: 'artifact_suggestions'
  suggestions: ArtifactSuggestion[]
  message: string
} {
  if (!result || typeof result !== 'object') return false
  const obj = result as Record<string, unknown>
  return obj.type === 'artifact_suggestions' && obj.success === true
}

// =============================================================================
// Hook
// =============================================================================

export function useStructuredChat(options: UseStructuredChatOptions): UseStructuredChatReturn {
  const { contextKey, onError, onArtifactCreated, screenContext } = options

  // Track added items locally
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set())

  // Get store actions to update messages
  const updateMessage = useChatStore((state) => state.updateMessage)

  // Handle tool results from AI
  const handleToolResult = useCallback(
    (toolName: string, result: unknown, messageId?: string) => {
      console.log('[useStructuredChat] handleToolResult called:', { toolName, hasResult: !!result, messageId, contextKey })

      if (!messageId || !contextKey) {
        console.log('[useStructuredChat] Skipping - missing messageId or contextKey')
        return
      }

      // Check for structuredResponse tool
      if (toolName === 'structuredResponse') {
        console.log('[useStructuredChat] Processing structuredResponse:', result)
        const passes = isStructuredResponse(result)
        console.log('[useStructuredChat] Type guard result:', passes)

        if (passes) {
          console.log('[useStructuredChat] Storing structuredResponse in message')
          // Store in the message itself
          updateMessage(contextKey, messageId, {
            structuredResponse: result.response as unknown,
          })
        }
      }

      // Check for suggestArtifactIdeas tool
      if (toolName === 'suggestArtifactIdeas' && isArtifactSuggestions(result)) {
        // Store in the message itself
        updateMessage(contextKey, messageId, {
          artifactSuggestions: result.suggestions as unknown[],
        })
      }
    },
    [contextKey, updateMessage]
  )

  // Use the base AI chat hook
  const {
    messages: _aiMessages, // We don't use these - we read from store instead
    input,
    setInput,
    sendMessage,
    stop,
    clear: baseClear,
    isStreaming,
    isLoading,
    error,
  } = useAIChat({
    contextKey,
    onToolResult: handleToolResult,
    onError,
    screenContext, // Pass through to useAIChat
  })

  // Read messages from store (which includes our updates from handleToolResult)
  const rawMessages = useChatStore(selectMessages(contextKey))

  // Clear handler that also resets local state
  const clear = useCallback(() => {
    baseClear()
    setAddedItemIds(new Set())
  }, [baseClear])

  // Mark an item as added
  const markItemAdded = useCallback((itemId: string) => {
    setAddedItemIds((prev) => {
      const next = new Set(prev)
      next.add(itemId)
      return next
    })
  }, [])

  // Parse messages to include structured response data
  const parsedMessages: ParsedChatMessage[] = useMemo(() => {
    console.log('[useStructuredChat] Parsing messages, count:', rawMessages.length)
    const parsed = rawMessages.map((msg) => {
      console.log('[useStructuredChat] Parsing message:', {
        id: msg.id,
        role: msg.role,
        hasStructuredResponse: 'structuredResponse' in msg,
        hasArtifactSuggestions: 'artifactSuggestions' in msg,
      })

      const parsedMsg: ParsedChatMessage = {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        toolInvocations: 'toolInvocations' in msg ? msg.toolInvocations : undefined,
      }

      // Structured data is now stored directly in messages
      if ('structuredResponse' in msg && msg.structuredResponse) {
        console.log('[useStructuredChat] Found structuredResponse in message')
        parsedMsg.structuredResponse = msg.structuredResponse as StructuredResponse
      }

      if ('artifactSuggestions' in msg && msg.artifactSuggestions) {
        console.log('[useStructuredChat] Found artifactSuggestions in message')
        parsedMsg.artifactSuggestions = msg.artifactSuggestions as ArtifactSuggestion[]
      }

      return parsedMsg
    })
    console.log('[useStructuredChat] Parsed messages:', parsed.map(m => ({
      id: m.id,
      role: m.role,
      hasStructuredResponse: !!m.structuredResponse,
      hasArtifactSuggestions: !!m.artifactSuggestions,
    })))
    return parsed
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
    addedItemIds,
    markItemAdded,
  }
}

export default useStructuredChat
