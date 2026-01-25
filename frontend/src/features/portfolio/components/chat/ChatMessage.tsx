/**
 * ChatMessage Component
 *
 * Renders a single chat message with appropriate styling for user/assistant.
 * Handles tool results and streaming states.
 */

import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface ChatMessageProps {
  /** Message role */
  role: 'user' | 'assistant' | 'system'
  /** Message content */
  content: string
  /** Is this message currently streaming */
  isStreaming?: boolean
  /** Tool invocations if any */
  toolInvocations?: Array<{
    toolName: string
    state: 'partial-call' | 'call' | 'result'
    result?: unknown
  }>
  /** Additional class name */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function ChatMessage({
  role,
  content,
  isStreaming,
  toolInvocations,
  className,
}: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          {/* Message text with markdown-like rendering */}
          <div className="whitespace-pre-wrap break-words">
            {content}
            {isStreaming && (
              <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
            )}
          </div>
        </div>

        {/* Tool invocations */}
        {toolInvocations && toolInvocations.length > 0 && (
          <div className="flex flex-col gap-2">
            {toolInvocations.map((invocation, index) => (
              <ToolResultCard
                key={index}
                toolName={invocation.toolName}
                state={invocation.state}
                result={invocation.result}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Tool Result Card
// =============================================================================

interface ToolResultCardProps {
  toolName: string
  state: 'partial-call' | 'call' | 'result'
  result?: unknown
}

function ToolResultCard({ toolName, state, result }: ToolResultCardProps) {
  const isLoading = state === 'partial-call' || state === 'call'

  // Format tool name for display
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()

  return (
    <div className="rounded-md border bg-card p-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="font-medium">{displayName}</span>
        {isLoading ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        ) : (
          <span className="text-xs text-green-500">✓ Done</span>
        )}
      </div>

      {state === 'result' && result !== undefined && result !== null && (
        <div className="mt-2 text-xs">
          <ToolResultContent result={result} />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Tool Result Content
// =============================================================================

interface ToolResultContentProps {
  result: unknown
}

function ToolResultContent({ result }: ToolResultContentProps) {
  // Handle different result types
  if (typeof result !== 'object' || result === null) {
    return <span>{String(result)}</span>
  }

  const obj = result as Record<string, unknown>

  // Check for success/error pattern
  if ('success' in obj) {
    if (!obj.success) {
      return (
        <span className="text-destructive">
          Error: {String(obj.error || 'Unknown error')}
        </span>
      )
    }

    // Show message if available
    if ('message' in obj) {
      return <span className="text-green-600">{String(obj.message)}</span>
    }
  }

  // For artifact/topic results, show summary
  if ('artifact' in obj) {
    const artifact = obj.artifact as Record<string, unknown>
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium">{String(artifact.title || 'Untitled')}</span>
        <span className="text-muted-foreground">
          Type: {String(artifact.type)} | Status: {String(artifact.status)}
        </span>
      </div>
    )
  }

  if ('topic' in obj) {
    const topic = obj.topic as Record<string, unknown>
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium">{String(topic.title || 'Untitled')}</span>
        <span className="text-muted-foreground">
          Status: {String(topic.status)}
        </span>
      </div>
    )
  }

  // For list results
  if ('count' in obj && typeof obj.count === 'number') {
    return <span>{obj.count} items found</span>
  }

  // Default: show JSON
  return (
    <pre className="max-h-32 overflow-auto rounded bg-muted p-2">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

export default ChatMessage
