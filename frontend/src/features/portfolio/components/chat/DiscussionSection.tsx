/**
 * DiscussionSection Component
 *
 * Collapsible section showing conversation history leading to artifacts.
 * Similar to Claude Code's "Thinking" section with chevron toggle.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, MessageSquare, User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ResponseInterpretation, ParsedChatMessage } from '../../types/chat'

// =============================================================================
// Types
// =============================================================================

export interface DiscussionSectionProps {
  /** Message history (all messages before the current one with artifacts) */
  messageHistory: ParsedChatMessage[]
  /** AI's interpretation */
  interpretation: ResponseInterpretation
  /** Whether to start collapsed (default: true) */
  defaultCollapsed?: boolean
  /** Additional class name */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function DiscussionSection({
  messageHistory,
  interpretation,
  defaultCollapsed = true,
  className,
}: DiscussionSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Discussion</span>
      </button>

      {/* Content - Collapsible */}
      {!isCollapsed && (
        <div className="space-y-0">
          {/* Conversation History - Match original message layout */}
          {messageHistory.map((msg, index) => (
            msg.role === 'user' ? (
              // User message - right-aligned like original
              <div key={index} className="flex gap-3 p-4 flex-row-reverse">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex max-w-[80%] flex-col gap-2 items-end">
                  <div className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              </div>
            ) : (
              // AI message - left-aligned like original
              <div key={index} className="flex gap-3 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex max-w-[80%] flex-col gap-2 items-start">
                  <div className="rounded-lg bg-muted px-4 py-2 text-sm">
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              </div>
            )
          ))}

          {/* Supported Parts (for partial) */}
          {interpretation.supportedParts && interpretation.supportedParts.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-green-600 dark:text-green-400">
                I can help with:
              </div>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {interpretation.supportedParts.map((part, i) => (
                  <li key={i}>{part}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Unsupported Parts (for partial/unsupported) */}
          {interpretation.unsupportedParts && interpretation.unsupportedParts.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-red-600 dark:text-red-400">
                I can't help with:
              </div>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {interpretation.unsupportedParts.map((part, i) => (
                  <li key={i}>{part}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Clarifying Questions (for unclear) */}
          {interpretation.clarifyingQuestions && interpretation.clarifyingQuestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                To help you better, I need to know:
              </div>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {interpretation.clarifyingQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DiscussionSection
