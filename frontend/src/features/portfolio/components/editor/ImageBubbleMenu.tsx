/**
 * ImageBubbleMenu Component
 *
 * Floating toolbar that appears when an image node is selected in the Tiptap editor.
 * Provides crop, alignment, and delete actions for images.
 */

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Crop, AlignLeft, AlignCenter, AlignRight, Trash2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useEditorSelectionStore } from '../../stores/editorSelectionStore'

interface ImageBubbleMenuProps {
  editor: Editor
  onCropClick: (src: string) => void
  /** Called when user clicks AI button to improve image */
  onAIClick?: () => void
  /** Artifact ID for storing selection context */
  artifactId?: string
}

export function ImageBubbleMenu({ editor, onCropClick, onAIClick, artifactId }: ImageBubbleMenuProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const currentAlign = editor.getAttributes('image')['data-align'] || 'center'
  const setImageSelection = useEditorSelectionStore((s) => s.setImageSelection)

  return (
    <>
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: e }: { editor: Editor }) => {
          return e.isActive('image')
        }}
        options={{
          placement: 'top',
          offset: 8,
        }}
        className={cn(
          'flex items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-1 shadow-lg',
        )}
      >
        {/* AI Improve */}
        {onAIClick && artifactId && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary"
              title="Improve with AI"
              onClick={() => {
                const { from } = editor.state.selection
                const attrs = editor.getAttributes('image')
                if (attrs.src) {
                  setImageSelection({
                    imageSrc: attrs.src,
                    imageNodePos: from,
                    artifactId,
                  })
                  onAIClick()
                }
              }}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-0.5" />
          </>
        )}

        {/* Crop */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Crop image"
          onClick={() => {
            const attrs = editor.getAttributes('image')
            if (attrs.src) {
              onCropClick(attrs.src)
            }
          }}
        >
          <Crop className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Align Left */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', currentAlign === 'left' && 'bg-muted text-primary')}
          title="Align left"
          onClick={() => {
            editor.chain().focus().updateAttributes('image', { 'data-align': 'left' }).run()
          }}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        {/* Align Center */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', currentAlign === 'center' && 'bg-muted text-primary')}
          title="Align center"
          onClick={() => {
            editor.chain().focus().updateAttributes('image', { 'data-align': 'center' }).run()
          }}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        {/* Align Right */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', currentAlign === 'right' && 'bg-muted text-primary')}
          title="Align right"
          onClick={() => {
            editor.chain().focus().updateAttributes('image', { 'data-align': 'right' }).run()
          }}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Delete */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          title="Delete image"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </BubbleMenu>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
        <DialogContent data-portal-ignore-click-outside className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              This will remove the image from the article. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                editor.chain().focus().deleteSelection().run()
                setShowDeleteConfirm(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
