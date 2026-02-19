/**
 * SelectionContextBanner Component
 *
 * Shows a preview of the currently selected text or image in the chat panel.
 * Appears above the input area when a selection is active in the editor.
 * Dismissing clears the selection from the EditorSelectionStore.
 */

import { X, Type, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SelectionContextBannerProps {
  type: 'text' | 'image'
  /** Truncated selected text or image URL */
  content: string | null
  /** Clear selection */
  onDismiss: () => void
}

export function SelectionContextBanner({ type, content, onDismiss }: SelectionContextBannerProps) {
  if (!content) return null

  return (
    <div className={cn(
      'selection-context-banner flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
      'border-primary/30 bg-primary/5',
    )}>
      {type === 'text' ? (
        <Type className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
      )}

      <div className="min-w-0 flex-1">
        {type === 'text' ? (
          <p className="truncate text-muted-foreground">
            {content.length > 100 ? content.slice(0, 100) + '...' : content}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <img
              src={content}
              alt="Selected image"
              className="h-10 w-10 rounded object-cover"
            />
            <span className="text-muted-foreground">Selected image</span>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onDismiss}
        title="Clear selection"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
