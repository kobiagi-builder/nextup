/**
 * TagsInput Component
 *
 * Inline tag editor with chip display. Each tag renders as a Badge
 * with an X button. New tags are added via a text input that responds
 * to Enter, Space, comma, and Backspace.
 *
 * Used in both the "Create New Content" modal and the artifact editor.
 */

import { useCallback, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface TagsInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function TagsInput({
  tags,
  onChange,
  disabled = false,
  placeholder = 'Add tags...',
  className,
}: TagsInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim().toLowerCase()
      if (!trimmed || tags.includes(trimmed)) return
      onChange([...tags, trimmed])
    },
    [tags, onChange],
  )

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index))
    },
    [tags, onChange],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTag(input)
      setInput('')
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 min-h-[38px] cursor-text',
        'focus-within:border-ring',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, index) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 pl-2.5 pr-1.5 py-0.5 text-xs"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(index)
              }}
              className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {!disabled && (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (input.trim()) {
              addTag(input)
              setInput('')
            }
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
          disabled={disabled}
        />
      )}
    </div>
  )
}
