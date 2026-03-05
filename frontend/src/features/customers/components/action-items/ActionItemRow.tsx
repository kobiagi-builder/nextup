/**
 * Action Item Row
 *
 * Displays a single action item with type badge, description,
 * inline-editable due date, clickable status badge, and actions menu.
 */

import { useState } from 'react'
import { Calendar, CalendarPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import type { ActionItem, ActionItemStatus } from '../../types'
import {
  ACTION_ITEM_TYPE_LABELS,
  ACTION_ITEM_TYPE_COLORS,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_STATUS_COLORS,
} from '../../types'
import { getDueDateUrgency, formatDueDate } from '../../utils/format'
import { format } from 'date-fns'

const STATUS_DOT_COLORS: Record<ActionItemStatus, string> = {
  todo: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  done: 'bg-green-500',
  cancelled: 'bg-red-500',
}

interface ActionItemRowProps {
  item: ActionItem
  onEdit: (item: ActionItem) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: ActionItemStatus) => void
  onDueDateChange: (id: string, date: string | null) => void
  isDeleting?: boolean
}

export function ActionItemRow({ item, onEdit, onDelete, onStatusChange, onDueDateChange, isDeleting }: ActionItemRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const typeLabel = ACTION_ITEM_TYPE_LABELS[item.type] || item.type
  const typeColor = ACTION_ITEM_TYPE_COLORS[item.type]
  const statusLabel = ACTION_ITEM_STATUS_LABELS[item.status]
  const statusColor = ACTION_ITEM_STATUS_COLORS[item.status]

  const urgency = item.due_date
    ? getDueDateUrgency(item.due_date, item.status)
    : null
  const isOverdue = urgency?.urgency === 'overdue'

  const selectedDate = item.due_date
    ? new Date(item.due_date + 'T00:00:00')
    : undefined

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDueDateChange(item.id, format(date, 'yyyy-MM-dd'))
    } else {
      onDueDateChange(item.id, null)
    }
    setDatePickerOpen(false)
  }

  const handleToday = () => {
    onDueDateChange(item.id, format(new Date(), 'yyyy-MM-dd'))
    setDatePickerOpen(false)
  }

  return (
    <>
      <div
        className={cn(
          'group rounded-lg border bg-card p-5 hover:border-border transition-colors',
          isOverdue ? 'border-destructive/50' : 'border-border/50'
        )}
      >
        {/* Single row: Type badge + Description + Due date + Status + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0', typeColor)}>
              {typeLabel}
            </span>
            <p className="text-sm text-foreground line-clamp-2">{item.description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Inline-editable due date */}
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'inline-flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity rounded px-1.5 py-0.5 hover:bg-muted',
                    urgency ? urgency.className : 'text-muted-foreground'
                  )}
                >
                  {item.due_date ? (
                    <>
                      <Calendar className="h-3 w-3" />
                      <span className={urgency?.urgency !== 'normal' && urgency?.urgency !== 'done' ? 'font-medium' : ''}>
                        {isOverdue ? 'Overdue: ' : ''}{formatDueDate(item.due_date)}
                      </span>
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="h-3 w-3" />
                      <span>Add date</span>
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                data-portal-ignore-click-outside
                className="w-auto p-0"
                align="end"
              >
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  defaultMonth={selectedDate}
                />
                <div className="border-t border-border px-3 py-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleToday}
                  >
                    Today
                  </Button>
                  {item.due_date && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs text-destructive hover:text-destructive"
                      onClick={() => {
                        onDueDateChange(item.id, null)
                        setDatePickerOpen(false)
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

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
                    <span className={cn('inline-block w-2 h-2 rounded-full mr-2', STATUS_DOT_COLORS[s])} />
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
