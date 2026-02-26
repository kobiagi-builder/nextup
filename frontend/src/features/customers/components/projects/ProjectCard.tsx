/**
 * Project Card
 *
 * Displays a single project with name, status, artifact count, linked agreement, and actions.
 */

import { useState } from 'react'
import { FileText, Link2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import type { ProjectWithCounts } from '../../types'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../../types'
import { formatDistanceToNow } from 'date-fns'

interface ProjectCardProps {
  project: ProjectWithCounts
  agreementLabel?: string | null
  onSelect: (id: string) => void
  onEdit: (project: ProjectWithCounts) => void
  onDelete: (id: string) => void
}

export function ProjectCard({ project, agreementLabel, onSelect, onEdit, onDelete }: ProjectCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const statusLabel = PROJECT_STATUS_LABELS[project.status]
  const statusColor = PROJECT_STATUS_COLORS[project.status]

  return (
    <>
      <div
        className="group relative rounded-lg border border-border/50 bg-card p-5 space-y-3 cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-md"
        onClick={() => onSelect(project.id)}
      >
        {/* Row 1: Name + Status */}
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-foreground truncate pr-2">{project.name}</h4>
          <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', statusColor)}>
            {statusLabel}
          </span>
        </div>

        {/* Row 2: Description */}
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
        )}

        {/* Row 3: Metrics */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {project.artifacts_count} {project.artifacts_count === 1 ? 'Artifact' : 'Artifacts'}
          </span>
          {agreementLabel && (
            <span className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px]">{agreementLabel}</span>
            </span>
          )}
        </div>

        {/* Row 4: Last updated */}
        <p className="text-xs text-muted-foreground">
          Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
        </p>

        {/* Actions */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-portal-ignore-click-outside align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project) }}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.name}" and all {project.artifacts_count} artifacts within it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(project.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
