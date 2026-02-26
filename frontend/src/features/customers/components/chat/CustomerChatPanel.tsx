/**
 * CustomerChatPanel
 *
 * Chat panel for customer AI agents. Uses useCustomerStructuredChat
 * instead of portfolio's useStructuredChat. Renders customer-specific
 * structured cards (StatusChangeCard, ArtifactCreatedCard, etc.).
 */

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import DOMPurify from 'dompurify'
import { ChatInput } from '@/features/portfolio/components/chat/ChatInput'
import {
  useCustomerStructuredChat,
  type CustomerParsedMessage,
  type CustomerToolResult,
} from '../../hooks/useCustomerStructuredChat'
import { useQueryClient } from '@tanstack/react-query'
import { customerKeys } from '../../hooks/useCustomers'
import { StatusChangeCard } from './StatusChangeCard'
import { ArtifactCreatedCard } from './ArtifactCreatedCard'
import { ProjectCreatedCard } from './RecommendationCard'
import { markdownToHTML } from '@/lib/markdown'

// =============================================================================
// Types
// =============================================================================

export interface CustomerChatPanelProps {
  contextKey: string
  customerId: string
  screenContext?: {
    currentPage: string
    [key: string]: string | undefined
  }
  endpoint?: string
  suggestions?: Array<{ text: string }>
  className?: string
  height?: string | number
}

// =============================================================================
// Component
// =============================================================================

export function CustomerChatPanel({
  contextKey,
  customerId,
  screenContext,
  endpoint,
  suggestions,
  className,
  height = '100%',
}: CustomerChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  // Invalidate customer queries when AI tools change customer data
  const handleCustomerDataChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
  }, [queryClient, customerId])

  const {
    messages,
    input,
    setInput,
    sendMessage,
    stop,
    isStreaming,
    isLoading,
    error,
  } = useCustomerStructuredChat({
    contextKey,
    customerId,
    screenContext,
    endpoint,
    onCustomerDataChanged: handleCustomerDataChanged,
  })

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages, isStreaming])

  return (
    <div
      className={cn('flex flex-col bg-background', className)}
      style={{ height }}
    >
      {/* Messages area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <EmptyState
              suggestions={suggestions}
              onSuggestionClick={(text) => {
                setInput(text)
                inputRef.current?.focus()
              }}
            />
          ) : (
            messages.map((message, index) => (
              <CustomerMessageRenderer
                key={message.id || index}
                message={message}
              />
            ))
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex gap-3 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="animate-pulse">Thinking</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>.</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 my-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t px-3 py-3">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage()}
          onStop={stop}
          isStreaming={isStreaming}
          isLoading={isLoading}
          placeholder="Ask about this customer..."
          inputRef={inputRef}
        />
      </div>
    </div>
  )
}

// =============================================================================
// Message Renderer
// =============================================================================

function CustomerMessageRenderer({ message }: { message: CustomerParsedMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-3 p-4 flex-row-reverse">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <div className="flex max-w-[80%] flex-col gap-2 items-end">
          <div className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex gap-3 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex max-w-[85%] flex-col gap-1">
        {/* Tool result cards */}
        {message.customerToolResults?.map((result, i) => (
          <ToolResultCard key={i} result={result} />
        ))}

        {/* Text content — markdown rendered as sanitized HTML */}
        {message.content && (
          <AssistantContent text={message.content} />
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Tool Result Card Router
// =============================================================================

function ToolResultCard({ result }: { result: CustomerToolResult }) {
  switch (result.type) {
    case 'status_change':
      return (
        <StatusChangeCard
          oldStatus={result.oldStatus}
          newStatus={result.newStatus}
          reason={result.reason}
        />
      )
    case 'artifact_created':
      return (
        <ArtifactCreatedCard
          title={result.title}
          artifactType={result.artifactType}
        />
      )
    case 'project_created':
      return (
        <ProjectCreatedCard
          projectName={result.projectName}
        />
      )
    default:
      return null
  }
}

// =============================================================================
// Assistant Content (Markdown → sanitized HTML)
// Content is sanitized with DOMPurify before rendering to prevent XSS.
// =============================================================================

function AssistantContent({ text }: { text: string }) {
  const html = useMemo(() => DOMPurify.sanitize(markdownToHTML(text)), [text])
  return (
    <div
      className="text-sm prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  suggestions?: Array<{ text: string }>
  onSuggestionClick: (text: string) => void
}

function EmptyState({ suggestions, onSuggestionClick }: EmptyStateProps) {
  const defaultSuggestions = [
    { text: "What's the engagement status?" },
    { text: 'Help me draft a follow-up email' },
    { text: '@product Create a product strategy' },
  ]

  const items = suggestions || defaultSuggestions

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">Customer AI</h3>
        <p className="text-sm text-muted-foreground">
          I can help with customer management and product strategy.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        {items.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSuggestionClick(s.text)}
            className="rounded-full border bg-muted px-3 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  )
}
