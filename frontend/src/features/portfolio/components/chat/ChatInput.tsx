/**
 * ChatInput Component
 *
 * Input field for chat messages with send button, file attachment support,
 * drag-and-drop, and keyboard hints.
 */

import { useCallback, useRef, useState, useEffect, useLayoutEffect, type KeyboardEvent, type DragEvent } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Send, Square, Loader2, Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { ProcessedAttachment } from '../../types/attachment'

// =============================================================================
// Constants
// =============================================================================

const MIN_HEIGHT = 44 // Minimum height in pixels
const MAX_HEIGHT = 200 // Maximum height in pixels before scrollbar appears

const ACCEPT_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
  'text/markdown',
  '.docx',
].join(',')

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
  /** Currently attached files */
  attachments?: ProcessedAttachment[]
  /** Handler to add a file attachment */
  onAttach?: (file: File) => void
  /** Handler to remove an attachment by index */
  onRemoveAttachment?: (index: number) => void
  /** Whether a file is currently being uploaded */
  isUploading?: boolean
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
  attachments,
  onAttach,
  onRemoveAttachment,
  isUploading,
}: ChatInputProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef || internalRef
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hasContent, setHasContent] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Update hasContent when value prop changes
  useEffect(() => {
    setHasContent(value.trim().length > 0)
  }, [value])

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'

    // Calculate new height, clamped between min and max
    const newHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)
    textarea.style.height = `${newHeight}px`

    // Enable scrolling when content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [textareaRef])

  // Adjust height when value changes
  useLayoutEffect(() => {
    adjustTextareaHeight()
  }, [value, adjustTextareaHeight])

  // Adjust height on initial mount
  useEffect(() => {
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isStreaming && !isLoading && (value.trim() || (attachments && attachments.length > 0))) {
          onSubmit()
        }
      }
    },
    [isStreaming, isLoading, value, attachments, onSubmit]
  )

  // Handle submit button click
  const handleSubmit = useCallback(() => {
    if (isStreaming && onStop) {
      onStop()
    } else if (value.trim() || (attachments && attachments.length > 0)) {
      onSubmit()
    }
  }, [isStreaming, onStop, value, attachments, onSubmit])

  // Handle file selection from input
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || !onAttach) return
      for (const file of Array.from(files)) {
        onAttach(file)
      }
      // Reset input so the same file can be selected again
      e.target.value = ''
    },
    [onAttach]
  )

  // Drag-and-drop handlers
  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (!onAttach) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    },
    [onAttach]
  )

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
    },
    []
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (!onAttach) return
      const files = e.dataTransfer.files
      for (const file of Array.from(files)) {
        onAttach(file)
      }
    },
    [onAttach]
  )

  const isDisabled = disabled || isLoading
  const hasAttachments = attachments && attachments.length > 0
  const canSubmit = !isDisabled && (isStreaming || hasContent || !!hasAttachments)

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachment preview chips */}
      {hasAttachments && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((att, index) => (
            <AttachmentChip
              key={`${att.fileName}-${index}`}
              attachment={att}
              onRemove={() => onRemoveAttachment?.(index)}
            />
          ))}
        </div>
      )}

      {/* Input area */}
      <div className={cn(
        'flex items-end gap-2 rounded-md transition-colors',
        isDragOver && 'ring-2 ring-primary/50 bg-primary/5',
      )}>
        {/* Hidden file input */}
        {onAttach && (
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_FILE_TYPES}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        )}

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDragOver ? 'Drop file here...' : placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              'flex w-full rounded-md border border-input bg-transparent py-2 text-base shadow-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'focus:ring-primary/20 focus:ring-2',
              'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              'resize-none pr-12',
              onAttach ? 'pl-9' : 'px-3'
            )}
            style={{
              minHeight: `${MIN_HEIGHT}px`,
              maxHeight: `${MAX_HEIGHT}px`,
            }}
            data-testid="chat-input"
          />

          {/* Floating attach button inside textarea */}
          {onAttach && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || isUploading}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Attach file"
            >
              {isUploading ? (
                <Spinner size="sm" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Submit/Stop button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant={isStreaming ? 'destructive' : 'default'}
          className="h-11 w-11 shrink-0"
          data-testid="chat-submit-button"
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
    </div>
  )
}

// =============================================================================
// Attachment Chip
// =============================================================================

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ProcessedAttachment
  onRemove: () => void
}) {
  const icon = attachment.type === 'image' ? (
    <ImageIcon className="h-3 w-3" />
  ) : attachment.type === 'document' ? (
    <FileText className="h-3 w-3" />
  ) : (
    <File className="h-3 w-3" />
  )

  const sizeLabel = attachment.fileSize < 1024
    ? `${attachment.fileSize}B`
    : attachment.fileSize < 1024 * 1024
      ? `${Math.round(attachment.fileSize / 1024)}KB`
      : `${(attachment.fileSize / (1024 * 1024)).toFixed(1)}MB`

  // For images, show a small thumbnail
  const thumbnail = attachment.type === 'image' && attachment.data ? (
    <img
      src={`data:${attachment.mimeType};base64,${attachment.data}`}
      alt={attachment.fileName}
      className="h-6 w-6 rounded object-cover"
    />
  ) : null

  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs">
      {thumbnail || icon}
      <span className="max-w-[120px] truncate">{attachment.fileName}</span>
      <span className="text-muted-foreground">{sizeLabel}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export default ChatInput
