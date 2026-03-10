/**
 * Folder Section
 *
 * Collapsible section for document folders. Visual variant of InitiativeSection
 * with lighter styling, FolderOpen icon, and no status badge.
 */

import { useState } from 'react'
import { ChevronDown, FolderOpen, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { DocumentFolder, CustomerDocument } from '../../types'
import { DocumentCard } from './DocumentCard'

interface FolderSectionProps {
  folder: DocumentFolder
  documents: CustomerDocument[]
  isCollapsed: boolean
  onToggle: () => void
  onDocumentClick: (document: CustomerDocument) => void
  onRename?: (folder: DocumentFolder) => void
  onDelete?: (id: string) => void
}

export function FolderSection({
  folder,
  documents,
  isCollapsed,
  onToggle,
  onDocumentClick,
  onRename,
  onDelete,
}: FolderSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <>
      <div
        data-testid={`folder-section-${folder.id}`}
        className="rounded-lg border border-border/20 bg-muted/5"
      >
        {/* Header — clickable to toggle */}
        <div
          role="button"
          tabIndex={0}
          data-testid={`folder-header-${folder.id}`}
          onClick={onToggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left group hover:bg-muted/30 transition-colors rounded-lg cursor-pointer"
        >
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
            isCollapsed && '-rotate-90'
          )} />

          <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          <span className="text-sm font-medium text-muted-foreground truncate flex-1">
            {folder.name}
          </span>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
          </span>

          {/* System folders show lock, custom folders show action menu */}
          {folder.is_system ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" data-testid="folder-lock-icon" />
          ) : (
            <div
              className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent data-portal-ignore-click-outside align="end">
                  <DropdownMenuItem onClick={() => onRename?.(folder)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Expandable content */}
        <div className={cn(
          'grid transition-all duration-200',
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        )}>
          <div className="overflow-hidden">
            <div className="px-2 pb-2 pt-1">
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-3 py-4">
                  No documents in this folder.
                </p>
              ) : (
                documents.map((doc, i) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    isLast={i === documents.length - 1}
                    onClick={() => onDocumentClick(doc)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {!folder.is_system && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent data-portal-ignore-click-outside>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete folder?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete &quot;{folder.name}&quot;. Its {documents.length}{' '}
                {documents.length === 1 ? 'document' : 'documents'} will be moved to the General folder.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete?.(folder.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
