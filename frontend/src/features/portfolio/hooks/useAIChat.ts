// @ts-nocheck
/**
 * useAIChat Hook
 *
 * Wraps the Vercel AI SDK v6 useChat with our chat store and API configuration.
 * Provides streaming chat functionality with tool call support.
 *
 * Note: AI SDK v6 no longer manages input state internally.
 * Input state is managed separately within this hook.
 *
 * TODO: Properly type for AI SDK v6 once types stabilize
 */

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  useChatStore,
  createChatMessage,
  type ChatContextKey,
  selectMessages,
  selectIsStreaming,
  selectError,
} from '../stores/chatStore'

// =============================================================================
// Types
// =============================================================================

/** Message type for our chat UI */
export interface ChatMessageType {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
  toolInvocations?: Array<{
    toolCallId: string
    toolName: string
    args: unknown
    state: 'partial-call' | 'call' | 'result'
    result?: unknown
  }>
}

export interface UseAIChatOptions {
  /** Context key for grouping messages (e.g., "artifact:123" or "topic:456") */
  contextKey: ChatContextKey
  /** Callback when a tool result is received */
  onToolResult?: (toolName: string, result: unknown, messageId?: string) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

export interface UseAIChatReturn {
  /** Current messages */
  messages: ChatMessageType[]
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
}

// =============================================================================
// API Configuration
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// =============================================================================
// Hook
// =============================================================================

export function useAIChat(options: UseAIChatOptions): UseAIChatReturn {
  const { contextKey, onToolResult, onError } = options

  // Local input state (AI SDK v6 doesn't manage this)
  const [input, setInput] = useState('')

  // Chat store selectors
  const storeMessages = useChatStore(selectMessages(contextKey))
  const storeIsStreaming = useChatStore(selectIsStreaming(contextKey))
  const storeError = useChatStore(selectError(contextKey))

  // Chat store actions
  const {
    addMessage,
    setMessages,
    clearMessages,
    startStreaming,
    finishStreaming,
    setError,
    clearError,
  } = useChatStore()

  // Vercel AI SDK v6 useChat with DefaultChatTransport for custom API
  const {
    messages: aiMessages,
    status,
    stop,
    error: aiError,
    sendMessage: aiSendMessage,
    setMessages: setAiMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_URL}/api/ai/chat/stream`,
    }),
    onError: (error: Error) => {
      finishStreaming(contextKey)
      setError(contextKey, error.message)
      onError?.(error)
    },
  })

  // Determine loading/streaming states from status
  const isStreaming = status === 'streaming'
  const isLoading = status === 'submitted' || status === 'streaming'

  // Handle streaming start/end
  useEffect(() => {
    if (status === 'streaming') {
      startStreaming(contextKey)
      clearError(contextKey)
    } else if (status === 'ready' && storeIsStreaming) {
      finishStreaming(contextKey)

      // Debug: Log message structure
      console.log('[useAIChat] Processing messages:', aiMessages.length)
      for (const msg of aiMessages) {
        console.log('[useAIChat] Message:', JSON.stringify({
          role: msg.role,
          hasContent: 'content' in msg,
          hasParts: 'parts' in msg,
          keys: Object.keys(msg),
        }))
        if ('parts' in msg && Array.isArray(msg.parts)) {
          for (const part of msg.parts) {
            if (part && typeof part === 'object') {
              const p = part as Record<string, unknown>
              const partType = String(p.type || '')
              // Log full structure for tool parts
              if (partType.startsWith('tool-')) {
                console.log('[useAIChat] Tool part full structure:', JSON.stringify(p))
              } else {
                console.log('[useAIChat] Part type:', partType)
              }
            }
          }
        }
      }

      // Handle tool invocations from ALL assistant messages (not just last one)
      // In multi-step execution, structuredResponse may be in an earlier message
      // Note: AI SDK v6 uses part type format like "tool-{toolName}" (e.g., "tool-structuredResponse")
      // Tool results are in the "output" property, not "result"
      console.log('[useAIChat] Checking for tool results, hasCallback:', !!onToolResult)
      if (onToolResult) {
        for (const message of aiMessages) {
          if (message.role === 'assistant' && 'parts' in message && Array.isArray(message.parts)) {
            for (const part of message.parts) {
              if (part && typeof part === 'object' && 'type' in part) {
                const partType = (part as { type: string }).type
                // Check for tool-{toolName} format (AI SDK v6 format)
                if (partType.startsWith('tool-') && partType !== 'tool-result') {
                  const toolName = partType.replace('tool-', '')
                  const toolPart = part as { output?: unknown }
                  console.log('[useAIChat] Found tool part:', toolName, 'output:', JSON.stringify(toolPart.output))
                  if (toolPart.output !== undefined) {
                    console.log('[useAIChat] Calling onToolResult with:', { toolName, hasOutput: true, messageId: message.id })
                    onToolResult(toolName, toolPart.output, message.id)
                    console.log('[useAIChat] onToolResult call completed')
                  }
                }
              }
            }
          }
        }
      } else {
        console.log('[useAIChat] No onToolResult callback provided!')
      }
    }
  }, [status, contextKey, aiMessages, storeIsStreaming, onToolResult, startStreaming, finishStreaming, clearError])

  // Convert AI messages to our format and sync to store
  useEffect(() => {
    if (aiMessages.length > 0) {
      const chatMessages: ChatMessageType[] = aiMessages.map((msg) => {
        // Extract text content from parts or content
        let textContent = ''
        if ('parts' in msg && Array.isArray(msg.parts)) {
          for (const part of msg.parts) {
            if (part && typeof part === 'object' && 'type' in part && part.type === 'text') {
              textContent += (part as { text: string }).text
            }
          }
        } else if ('content' in msg && typeof msg.content === 'string') {
          textContent = msg.content
        }

        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: textContent,
          createdAt: 'createdAt' in msg && msg.createdAt instanceof Date ? msg.createdAt : new Date(),
        }
      })
      setMessages(contextKey, chatMessages)
    }
  }, [aiMessages, contextKey, setMessages])

  // Send message handler
  const sendMessage = useCallback(
    (content?: string) => {
      const messageContent = content ?? input
      if (!messageContent.trim()) return

      // Clear input immediately
      setInput('')

      // Add user message to store immediately for optimistic UI
      addMessage(contextKey, createChatMessage('user', messageContent))

      // Send to AI using v6 sendMessage API
      aiSendMessage({
        role: 'user',
        content: messageContent,
      })
    },
    [input, contextKey, addMessage, aiSendMessage]
  )

  // Clear messages handler
  const clear = useCallback(() => {
    clearMessages(contextKey)
    setAiMessages([])
  }, [contextKey, clearMessages, setAiMessages])

  // Convert store messages to our return type
  const typedMessages: ChatMessageType[] = useMemo(() => {
    const msgs = storeMessages.length > 0 ? storeMessages : []
    return msgs.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      createdAt: m.createdAt,
    }))
  }, [storeMessages])

  // Memoize return object
  const returnValue = useMemo(
    () => ({
      messages: typedMessages,
      input,
      setInput,
      sendMessage,
      stop,
      clear,
      isStreaming: storeIsStreaming || isStreaming,
      isLoading,
      error: storeError ?? (aiError?.message || null),
    }),
    [
      typedMessages,
      input,
      setInput,
      sendMessage,
      stop,
      clear,
      storeIsStreaming,
      isStreaming,
      isLoading,
      storeError,
      aiError,
    ]
  )

  return returnValue
}

export default useAIChat
