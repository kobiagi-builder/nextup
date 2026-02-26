/**
 * Artifact Editor (Sheet)
 *
 * Side panel editor for artifact content. Opens as a Sheet (right side).
 * Content stored as Markdown in DB, edited as HTML in TipTap.
 * Auto-saves with 1.5s debounce, converts HTML back to Markdown before saving.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUpdateArtifact, useReferencedByArtifacts } from '../../hooks'
import {
  ARTIFACT_TYPE_CONFIG,
  ARTIFACT_STATUSES,
  ARTIFACT_STATUS_LABELS,
} from '../../types'
import type { CustomerArtifact, ArtifactStatus } from '../../types'
import { markdownToHTML, isMarkdown } from '@/lib/markdown'
import { htmlToMarkdown } from '@/lib/markdown'
import { CustomerRichTextEditor } from './CustomerRichTextEditor'

interface ArtifactEditorProps {
  customerId: string
  projectId: string
  artifact: CustomerArtifact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: (id: string) => void
}

export function ArtifactEditor({
  customerId,
  projectId,
  artifact,
  open,
  onOpenChange,
  onDelete,
}: ArtifactEditorProps) {
  const updateArtifact = useUpdateArtifact(customerId, projectId)
  const { data: referencedBy = [] } = useReferencedByArtifacts(artifact?.id ?? null)

  // Local state for editing
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [localStatus, setLocalStatus] = useState<ArtifactStatus>('draft')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContentRef = useRef('')
  const lastSavedTitleRef = useRef('')

  // Initialize local state when artifact changes or sheet opens
  useEffect(() => {
    if (open && artifact) {
      const htmlContent = artifact.content && isMarkdown(artifact.content)
        ? markdownToHTML(artifact.content)
        : artifact.content || ''

      setLocalTitle(artifact.title)
      setLocalContent(htmlContent)
      setLocalStatus(artifact.status)
      lastSavedContentRef.current = htmlContent
      lastSavedTitleRef.current = artifact.title
      setSaveState('saved')
    }
  }, [open, artifact?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const doSave = useCallback(async (title: string, html: string) => {
    if (!artifact) return

    const markdown = htmlToMarkdown(html)
    const hasContentChanged = html !== lastSavedContentRef.current
    const hasTitleChanged = title !== lastSavedTitleRef.current

    if (!hasContentChanged && !hasTitleChanged) {
      setSaveState('saved')
      return
    }

    setSaveState('saving')
    try {
      const updates: Record<string, string> = {}
      if (hasContentChanged) updates.content = markdown
      if (hasTitleChanged) updates.title = title

      await updateArtifact.mutateAsync({ id: artifact.id, ...updates })

      lastSavedContentRef.current = html
      lastSavedTitleRef.current = title
      setSaveState('saved')
    } catch {
      setSaveState('unsaved')
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }, [artifact, updateArtifact])

  const scheduleAutoSave = useCallback((title: string, html: string) => {
    setSaveState('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(title, html), 1500)
  }, [doSave])

  const handleContentChange = useCallback((html: string) => {
    setLocalContent(html)
    scheduleAutoSave(localTitle, html)
  }, [localTitle, scheduleAutoSave])

  const handleTitleChange = useCallback((title: string) => {
    setLocalTitle(title)
    scheduleAutoSave(title, localContent)
  }, [localContent, scheduleAutoSave])

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!artifact) return
    const newStatus = status as ArtifactStatus
    setLocalStatus(newStatus)
    try {
      await updateArtifact.mutateAsync({ id: artifact.id, status: newStatus })
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleDelete = () => {
    if (!artifact || !onDelete) return
    onDelete(artifact.id)
    onOpenChange(false)
  }

  // Flush pending save when closing, wait for completion before closing
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      if (saveState === 'unsaved') {
        doSave(localTitle, localContent).then(() => onOpenChange(false))
        return
      }
    }
    onOpenChange(newOpen)
  }, [onOpenChange, saveState, localTitle, localContent, doSave])

  if (!artifact) return null

  const typeConfig = ARTIFACT_TYPE_CONFIG[artifact.type]

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          data-portal-ignore-click-outside
          side="right"
          className="sm:max-w-3xl w-full flex flex-col p-0 gap-0"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border/50 space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', typeConfig.color)}>
                {typeConfig.label}
              </span>

              <Select value={localStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-auto gap-1 text-xs border-none bg-transparent px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside>
                  {ARTIFACT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ARTIFACT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="ml-auto text-xs text-muted-foreground">
                {saveState === 'saving' ? 'Saving...' : saveState === 'unsaved' ? 'Unsaved changes' : 'Saved'}
              </span>

              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <SheetTitle className="sr-only">{localTitle}</SheetTitle>

            <Input
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Artifact title..."
            />
          </SheetHeader>

          {/* Referenced by (portfolio artifacts linking to this) */}
          {referencedBy.length > 0 && (
            <div className="px-6 py-2 border-b border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Link2 className="h-3 w-3" />
                <span>Referenced by</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {referencedBy.map((ref) => (
                  <Badge key={ref.id} variant="outline" className="text-xs">
                    {ref.title || 'Untitled'} ({ref.type.replace('_', ' ')})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Editor body */}
          <div className="flex-1 overflow-y-auto">
            <CustomerRichTextEditor
              content={localContent}
              onChange={handleContentChange}
              placeholder="Start writing your artifact content..."
              className="border-none rounded-none"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete artifact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{artifact.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
