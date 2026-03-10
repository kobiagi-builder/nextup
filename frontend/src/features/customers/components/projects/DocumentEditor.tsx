/**
 * Document Editor (Sheet)
 *
 * Side panel editor for document content. Opens as a Sheet (right side).
 * Content stored as Markdown in DB, edited as HTML in TipTap.
 * Auto-saves with 1.5s debounce, converts HTML back to Markdown before saving.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Link2, MoreVertical, GripVertical } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateDocument, useReassignDocument, useReferencedByArtifacts } from '../../hooks'
import {
  DOCUMENT_TYPE_CONFIG,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
} from '../../types'
import type { CustomerDocument, DocumentStatus, InitiativeWithCounts, DocumentFolder } from '../../types'
import { markdownToHTML, isMarkdown } from '@/lib/markdown'
import { htmlToMarkdown } from '@/lib/markdown'
import { useSheetResize } from '@/hooks/use-sheet-resize'
import { useIsMobile } from '@/hooks/use-media-query'
import { CustomerRichTextEditor } from './CustomerRichTextEditor'

interface DocumentEditorProps {
  customerId: string
  document: CustomerDocument | null
  initiatives: InitiativeWithCounts[]
  folders: DocumentFolder[]
  onClose: () => void
  onDelete?: (documentId: string, initiativeId: string) => void
}

export function DocumentEditor({
  customerId,
  document,
  initiatives,
  folders,
  onClose,
  onDelete,
}: DocumentEditorProps) {
  const initiativeId = document?.initiative_id ?? ''
  const updateDocument = useUpdateDocument(customerId)
  const reassignDocument = useReassignDocument(customerId)
  const { data: referencedBy = [] } = useReferencedByArtifacts(document?.id ?? null)
  const isMobile = useIsMobile()
  const { width: sheetWidth, onHandleMouseDown } = useSheetResize({
    storageKey: 'document-panel-width',
    defaultWidth: 768,
    minWidth: 400,
    maxWidthPercent: 85,
  })

  // Local state for editing
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [localStatus, setLocalStatus] = useState<DocumentStatus>('draft')
  const [localInitiativeId, setLocalInitiativeId] = useState<string>('')
  const [localFolderId, setLocalFolderId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContentRef = useRef('')
  const lastSavedTitleRef = useRef('')

  const open = !!document

  // Initialize local state when document changes or sheet opens
  useEffect(() => {
    if (document) {
      const htmlContent = document.content && isMarkdown(document.content)
        ? markdownToHTML(document.content)
        : document.content || ''

      setLocalTitle(document.title)
      setLocalContent(htmlContent)
      setLocalStatus(document.status)
      setLocalInitiativeId(document.initiative_id)
      setLocalFolderId(document.folder_id)
      lastSavedContentRef.current = htmlContent
      lastSavedTitleRef.current = document.title
      setSaveState('saved')
    }
  }, [document?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const doSave = useCallback(async (title: string, html: string) => {
    if (!document) return

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

      await updateDocument.mutateAsync({ id: document.id, initiativeId, ...updates })

      lastSavedContentRef.current = html
      lastSavedTitleRef.current = title
      setSaveState('saved')
    } catch {
      setSaveState('unsaved')
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }, [document, initiativeId, updateDocument])

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
    if (!document) return
    const newStatus = status as DocumentStatus
    setLocalStatus(newStatus)
    try {
      await updateDocument.mutateAsync({
        id: document.id,
        initiativeId,
        status: newStatus,
      })
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleInitiativeChange = async (value: string) => {
    if (!document) return
    setLocalInitiativeId(value)
    try {
      await reassignDocument.mutateAsync({
        documentId: document.id,
        currentInitiativeId: initiativeId,
        newInitiativeId: value,
        folderId: localFolderId,
      })
    } catch {
      toast({ title: 'Failed to reassign document', variant: 'destructive' })
      setLocalInitiativeId(document.initiative_id) // revert
    }
  }

  const handleFolderChange = async (value: string) => {
    if (!document) return
    const newFolderId = value === 'none' ? null : value
    setLocalFolderId(newFolderId)
    try {
      await reassignDocument.mutateAsync({
        documentId: document.id,
        currentInitiativeId: initiativeId,
        newInitiativeId: localInitiativeId,
        folderId: newFolderId,
      })
    } catch {
      toast({ title: 'Failed to update folder', variant: 'destructive' })
      setLocalFolderId(document.folder_id) // revert
    }
  }

  const handleDelete = () => {
    if (!document || !onDelete) return
    onDelete(document.id, initiativeId)
  }

  // Flush pending save when closing
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      if (saveState === 'unsaved') {
        doSave(localTitle, localContent).then(() => onClose())
        return
      }
      onClose()
    }
  }, [onClose, saveState, localTitle, localContent, doSave])

  if (!document) return null

  const typeConfig = DOCUMENT_TYPE_CONFIG[document.type]

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          data-portal-ignore-click-outside
          side="right"
          className="w-full flex flex-col p-0 gap-0"
          style={isMobile ? undefined : { maxWidth: `${sheetWidth}px`, width: '100%' }}
        >
          {/* Resize handle (desktop only) */}
          {!isMobile && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group hover:bg-primary/10 active:bg-primary/20 transition-colors"
              onMouseDown={onHandleMouseDown}
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-8 -ml-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border/50 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', typeConfig.color)}>
                {typeConfig.label}
              </span>

              <Select value={localStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-auto gap-1 text-xs border-none bg-transparent px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside>
                  {DOCUMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DOCUMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Initiative reassignment dropdown */}
              <Select value={localInitiativeId} onValueChange={handleInitiativeChange}>
                <SelectTrigger className="h-7 w-auto max-w-[180px] gap-1 text-xs border-none bg-transparent px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside>
                  {initiatives.map((init) => (
                    <SelectItem key={init.id} value={init.id}>
                      {init.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Folder dropdown */}
              {folders.length > 0 && (
                <Select value={localFolderId || 'none'} onValueChange={handleFolderChange}>
                  <SelectTrigger className="h-7 w-auto max-w-[140px] gap-1 text-xs border-none bg-transparent px-2">
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent data-portal-ignore-click-outside>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <SheetTitle className="sr-only">{localTitle}</SheetTitle>

            <div className="flex items-center gap-2">
              <Input
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                placeholder="Document title..."
              />

              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent data-portal-ignore-click-outside align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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
              placeholder="Start writing your document content..."
              className="border-none rounded-none"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{document.title}&quot;. This action cannot be undone.
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
