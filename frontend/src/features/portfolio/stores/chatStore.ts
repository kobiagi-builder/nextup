/**
 * Chat Store (Zustand)
 *
 * Manages local chat state for AI conversations.
 * Works alongside React Query for persisted conversation data.
 *
 * Features:
 * - Per-context message storage (by artifactId or topicId)
 * - Streaming state tracking
 * - Optimistic message handling
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ChatMessage, MessageRole } from '../types/portfolio'

// =============================================================================
// Types
// =============================================================================

/** Context key for grouping messages */
export type ChatContextKey = string // Format: "artifact:${id}" or "topic:${id}" or "general"

/** Chat context state */
interface ChatContext {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string
  error: string | null
}

/** Chat store state */
interface ChatState {
  /** Messages by context key */
  contexts: Record<ChatContextKey, ChatContext>

  /** Currently active context */
  activeContextKey: ChatContextKey | null

  /** Global loading state */
  isLoading: boolean
}

/** Chat store actions */
interface ChatActions {
  // Context management
  setActiveContext: (key: ChatContextKey) => void
  clearActiveContext: () => void

  // Message management
  addMessage: (contextKey: ChatContextKey, message: ChatMessage) => void
  updateMessage: (contextKey: ChatContextKey, messageId: string, updates: Partial<ChatMessage>) => void
  removeMessage: (contextKey: ChatContextKey, messageId: string) => void
  clearMessages: (contextKey: ChatContextKey) => void
  setMessages: (contextKey: ChatContextKey, messages: ChatMessage[]) => void

  // Streaming
  startStreaming: (contextKey: ChatContextKey) => void
  appendStreamingContent: (contextKey: ChatContextKey, content: string) => void
  finishStreaming: (contextKey: ChatContextKey) => void

  // Error handling
  setError: (contextKey: ChatContextKey, error: string | null) => void
  clearError: (contextKey: ChatContextKey) => void

  // Global
  setLoading: (loading: boolean) => void
  reset: () => void
}

/** Combined store type */
type ChatStore = ChatState & ChatActions

// =============================================================================
// Initial State
// =============================================================================

const initialContext: ChatContext = {
  messages: [],
  isStreaming: false,
  streamingContent: '',
  error: null,
}

const initialState: ChatState = {
  contexts: {},
  activeContextKey: null,
  isLoading: false,
}

// =============================================================================
// Helpers
// =============================================================================

/** Get or create context */
function getOrCreateContext(
  contexts: Record<ChatContextKey, ChatContext>,
  key: ChatContextKey
): ChatContext {
  return contexts[key] ?? { ...initialContext }
}

/** Generate a unique message ID */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** Create a new chat message */
export function createChatMessage(
  role: MessageRole,
  content: string,
  options?: Partial<ChatMessage>
): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    created_at: new Date().toISOString(),
    ...options,
  }
}

/** Create context key from artifact ID */
export function artifactContextKey(artifactId: string): ChatContextKey {
  return `artifact:${artifactId}`
}

/** Create context key from topic ID */
export function topicContextKey(topicId: string): ChatContextKey {
  return `topic:${topicId}`
}

/** General context key (no specific artifact/topic) */
export const GENERAL_CONTEXT_KEY: ChatContextKey = 'general'

// =============================================================================
// Store
// =============================================================================

/**
 * Chat Store
 *
 * Usage:
 * ```tsx
 * const messages = useChatStore((state) => state.contexts['artifact:123']?.messages ?? [])
 * const addMessage = useChatStore((state) => state.addMessage)
 * ```
 */
export const useChatStore = create<ChatStore>()(
  persist(
    devtools(
      (set) => ({
        // Initial state
        ...initialState,

        // Context management
        setActiveContext: (key) =>
          set({ activeContextKey: key }, false, 'setActiveContext'),

        clearActiveContext: () =>
          set({ activeContextKey: null }, false, 'clearActiveContext'),

      // Message management
      addMessage: (contextKey, message) =>
        set(
          (state) => {
            const context = getOrCreateContext(state.contexts, contextKey)
            return {
              contexts: {
                ...state.contexts,
                [contextKey]: {
                  ...context,
                  messages: [...context.messages, message],
                },
              },
            }
          },
          false,
          'addMessage'
        ),

      updateMessage: (contextKey, messageId, updates) =>
        set(
          (state) => {
            console.log('[chatStore] updateMessage called:', { contextKey, messageId, updates })
            const context = getOrCreateContext(state.contexts, contextKey)
            const updatedMessages = context.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            )
            console.log('[chatStore] Updated messages:', updatedMessages.map(m => ({
              id: m.id,
              role: m.role,
              hasStructuredResponse: 'structuredResponse' in m,
              hasArtifactSuggestions: 'artifactSuggestions' in m,
            })))
            return {
              contexts: {
                ...state.contexts,
                [contextKey]: {
                  ...context,
                  messages: updatedMessages,
                },
              },
            }
          },
          false,
          'updateMessage'
        ),

      removeMessage: (contextKey, messageId) =>
        set(
          (state) => {
            const context = getOrCreateContext(state.contexts, contextKey)
            return {
              contexts: {
                ...state.contexts,
                [contextKey]: {
                  ...context,
                  messages: context.messages.filter((msg) => msg.id !== messageId),
                },
              },
            }
          },
          false,
          'removeMessage'
        ),

      clearMessages: (contextKey) =>
        set(
          (state) => ({
            contexts: {
              ...state.contexts,
              [contextKey]: {
                ...getOrCreateContext(state.contexts, contextKey),
                messages: [],
              },
            },
          }),
          false,
          'clearMessages'
        ),

      setMessages: (contextKey, messages) =>
        set(
          (state) => ({
            contexts: {
              ...state.contexts,
              [contextKey]: {
                ...getOrCreateContext(state.contexts, contextKey),
                messages,
              },
            },
          }),
          false,
          'setMessages'
        ),

      // Streaming
      startStreaming: (contextKey) =>
        set(
          (state) => ({
            contexts: {
              ...state.contexts,
              [contextKey]: {
                ...getOrCreateContext(state.contexts, contextKey),
                isStreaming: true,
                streamingContent: '',
              },
            },
          }),
          false,
          'startStreaming'
        ),

      appendStreamingContent: (contextKey, content) =>
        set(
          (state) => {
            const context = getOrCreateContext(state.contexts, contextKey)
            return {
              contexts: {
                ...state.contexts,
                [contextKey]: {
                  ...context,
                  streamingContent: context.streamingContent + content,
                },
              },
            }
          },
          false,
          'appendStreamingContent'
        ),

      finishStreaming: (contextKey) =>
        set(
          (state) => ({
            contexts: {
              ...state.contexts,
              [contextKey]: {
                ...getOrCreateContext(state.contexts, contextKey),
                isStreaming: false,
                streamingContent: '',
              },
            },
          }),
          false,
          'finishStreaming'
        ),

      // Error handling
      setError: (contextKey, error) =>
        set(
          (state) => ({
            contexts: {
              ...state.contexts,
              [contextKey]: {
                ...getOrCreateContext(state.contexts, contextKey),
                error,
              },
            },
          }),
          false,
          'setError'
        ),

      clearError: (contextKey) =>
        set(
          (state) => ({
            contexts: {
              ...state.contexts,
              [contextKey]: {
                ...getOrCreateContext(state.contexts, contextKey),
                error: null,
              },
            },
          }),
          false,
          'clearError'
        ),

      // Global
      setLoading: (loading) =>
        set({ isLoading: loading }, false, 'setLoading'),

      reset: () =>
        set(initialState, false, 'reset'),
      }),
      { name: 'ChatStore' }
    ),
    {
      name: 'chat-storage', // sessionStorage key
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({
        contexts: state.contexts, // Only persist contexts (messages)
      }) as ChatStore,
    }
  )
)

// =============================================================================
// Selectors
// =============================================================================

/** Stable empty array for hooks */
const EMPTY_MESSAGES: ChatMessage[] = []

/**
 * Get messages for a context (returns stable empty array if not found)
 */
export const selectMessages = (contextKey: ChatContextKey) => (state: ChatStore) =>
  state.contexts[contextKey]?.messages ?? EMPTY_MESSAGES

/**
 * Check if streaming for a context
 */
export const selectIsStreaming = (contextKey: ChatContextKey) => (state: ChatStore) =>
  state.contexts[contextKey]?.isStreaming ?? false

/**
 * Get streaming content for a context
 */
export const selectStreamingContent = (contextKey: ChatContextKey) => (state: ChatStore) =>
  state.contexts[contextKey]?.streamingContent ?? ''

/**
 * Get error for a context
 */
export const selectError = (contextKey: ChatContextKey) => (state: ChatStore) =>
  state.contexts[contextKey]?.error ?? null

/**
 * Get active context
 */
export const selectActiveContext = (state: ChatStore) =>
  state.activeContextKey
    ? state.contexts[state.activeContextKey]
    : null

export default useChatStore
