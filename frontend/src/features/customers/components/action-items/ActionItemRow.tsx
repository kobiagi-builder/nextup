/**
 * Action Item Row
 *
 * Displays a single action item with type badge, description, due date,
 * clickable status badge (quick change), and actions menu.
 */

import { useState } from 'react'
import { Calendar, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import type { ActionItem, ActionItemStatus } from '../../types'
import {
  ACTION_ITEM_TYPE_LABELS,
  ACTION_ITEM_TYPE_COLORS,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_STATUS_COLORS,
} from '../../types'

interface ActionItemRowProps {
  item: ActionItem
  onEdit: (item: ActionItem) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: ActionItemStatus) => void
  isDeleting?: boolean
}

function isOverdue(item: ActionItem): boolean {
  if (!item.due_date) return false
  if (item.status === 'done' || item.status === 'cancelled') return false
  return new Date(item.due_date) < new Date(new Date().toDateString())
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ActionItemRow({ item, onEdit, onDelete, onStatusChange, isDeleting }: ActionItemRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const overdue = isOverdue(item)
  const typeLabel = ACTION_ITEM_TYPE_LABELS[item.type] || item.type
  const typeColor = ACTION_ITEM_TYPE_COLORS[item.type]
  const statusLabel = ACTION_ITEM_STATUS_LABELS[item.status]
  const statusColor = ACTION_ITEM_STATUS_COLORS[item.status]

  return (
    <>
      <div
        className={cn(
          'group rounded-lg border bg-card p-5 space-y-3 hover:border-border transition-colors',
          overdue ? 'border-destructive/50' : 'border-border/50'
        )}
      >
        {/* Row 1: Type badge + Description + Status badge + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0', typeColor)}>
              {typeLabel}
            </span>
            <p className="text-sm text-foreground line-clamp-2">{item.description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Clickable status badge */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity',
                    statusColor
                  )}
                >
                  {statusLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-portal-ignore-click-outside align="end">
                {ACTION_ITEM_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onStatusChange(item.id, s)}
                    disabled={s === item.status}
                  >
                    <span className={cn('inline-block w-2 h-2 rounded-full mr-2', ACTION_ITEM_STATUS_COLORS[s].replace(/text-\S+/, '').replace(/border-\S+/, '').replace('/10', ''))} />
                    {ACTION_ITEM_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-portal-ignore-click-outside align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: Due date */}
        {item.due_date && (
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={cn(overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              {overdue ? 'Overdue: ' : ''}{formatDueDate(item.due_date)}
            </span>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action Item</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this action item. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(item.id)
                setShowDeleteConfirm(false)
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
