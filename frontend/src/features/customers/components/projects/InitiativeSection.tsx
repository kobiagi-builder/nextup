/**
 * Initiative Section
 *
 * Collapsible section displaying an initiative header and its document cards.
 * Also used for the "General" section (unassigned documents).
 */

import { useState } from 'react'
import { ChevronDown, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import type { InitiativeWithCounts, CustomerDocument } from '../../types'
import { INITIATIVE_STATUS_LABELS, INITIATIVE_STATUS_COLORS } from '../../types'
import { DocumentCard } from './DocumentCard'

interface InitiativeSectionProps {
  initiative?: InitiativeWithCounts
  documents: CustomerDocument[]
  isCollapsed: boolean
  onToggle: () => void
  onEdit?: (initiative: InitiativeWithCounts) => void
  onDelete?: (id: string) => void
  onDocumentClick: (document: CustomerDocument) => void
  isGeneral?: boolean
}

export function InitiativeSection({
  initiative,
  documents,
  isCollapsed,
  onToggle,
  onEdit,
  onDelete,
  onDocumentClick,
  isGeneral = false,
}: InitiativeSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const sectionId = isGeneral ? 'general' : initiative?.id ?? ''

  return (
    <>
      <div
        data-testid={`initiative-section-${sectionId}`}
        className="rounded-lg border border-border/30 bg-card"
      >
        {/* Header — clickable to toggle */}
        <button
          data-testid={`initiative-header-${sectionId}`}
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-4 py-3 text-left group hover:bg-muted/30 transition-colors rounded-lg"
        >
          {isGeneral ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
              isCollapsed && '-rotate-90'
            )} />
          )}

          <span className={cn(
            'text-sm font-semibold truncate flex-1',
            isGeneral ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {isGeneral ? 'General' : initiative?.name}
          </span>

          {/* Status badge — not shown for General */}
          {!isGeneral && initiative && (
            <span className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
              INITIATIVE_STATUS_COLORS[initiative.status]
            )}>
              {INITIATIVE_STATUS_LABELS[initiative.status]}
            </span>
          )}

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
          </span>

          {/* Action menu — not shown for General */}
          {!isGeneral && initiative && (
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
                  <DropdownMenuItem onClick={() => onEdit?.(initiative)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
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
        </button>

        {/* Expandable content */}
        <div className={cn(
          'grid transition-all duration-200',
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        )}>
          <div className="overflow-hidden">
            <div className="px-2 pb-2 pt-1">
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-3 py-4">
                  No documents yet. Create one to get started.
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
      {!isGeneral && initiative && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent data-portal-ignore-click-outside>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete initiative?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{initiative.name}&quot; and its {documents.length}{' '}
                {documents.length === 1 ? 'document' : 'documents'}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete?.(initiative.id)}
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
