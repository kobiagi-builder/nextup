/**
 * ChatInput Component
 *
 * Input field for chat messages with send button and keyboard hints.
 */

import { useCallback, useRef, useState, useEffect, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Square, Loader2 } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface ChatInputProps {
  /** Current input value */
  value: string
  /** Input change handler */
  onChange: (value: string) => void
  /** Submit handler */
  onSubmit: () => void
  /** Stop generation handler */
  onStop?: () => void
  /** Is AI currently generating */
  isStreaming?: boolean
  /** Is loading (sending message) */
  isLoading?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Disable input */
  disabled?: boolean
  /** Additional class name */
  className?: string
  /** External ref to access the textarea */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}

// =============================================================================
// Component
// =============================================================================

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  isLoading,
  placeholder = 'Type a message...',
  disabled,
  className,
  inputRef,
}: ChatInputProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef || internalRef
  const [hasContent, setHasContent] = useState(false)

  // Update hasContent when value prop changes
  useEffect(() => {
    setHasContent(value.trim().length > 0)
  }, [value])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isStreaming && !isLoading && value.trim()) {
          onSubmit()
        }
      }
    },
    [isStreaming, isLoading, value, onSubmit]
  )

  // Handle submit button click
  const handleSubmit = useCallback(() => {
    if (isStreaming && onStop) {
      onStop()
    } else if (value.trim()) {
      onSubmit()
    }
  }, [isStreaming, onStop, value, onSubmit])

  const isDisabled = disabled || isLoading
  const canSubmit = !isDisabled && (isStreaming || hasContent)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              'min-h-[44px] max-h-[200px] resize-none pr-12',
              'focus:ring-primary/20 focus:ring-2'
            )}
          />
        </div>

        {/* Submit/Stop button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant={isStreaming ? 'destructive' : 'default'}
          className="h-11 w-11 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isStreaming ? (
            <Square className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1 py-0.5 text-xs">Enter</kbd> to send,{' '}
        <kbd className="rounded bg-muted px-1 py-0.5 text-xs">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}

export default ChatInput
