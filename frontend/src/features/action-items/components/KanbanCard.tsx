/**
 * Kanban Card
 *
 * Draggable action item card for the Kanban board.
 * Shows type badge, due date, description, and customer name.
 */

import { useDraggable } from '@dnd-kit/core'
import { Calendar, Check, Pause, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDueDateUrgency, formatDueDateShort } from '@/features/customers/utils/format'
import {
  ACTION_ITEM_TYPE_LABELS,
  ACTION_ITEM_TYPE_COLORS,
} from '../types'
import type { ActionItemStatus, ActionItemWithCustomer } from '../types'

interface KanbanCardProps {
  item: ActionItemWithCustomer
  onClick?: (item: ActionItemWithCustomer) => void
  onStatusChange?: (id: string, status: ActionItemStatus) => void
  isDragOverlay?: boolean
}

export function KanbanCard({ item, onClick, onStatusChange, isDragOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: isDragOverlay,
  })

  const typeLabel = ACTION_ITEM_TYPE_LABELS[item.type] || item.type
  const typeColor = ACTION_ITEM_TYPE_COLORS[item.type]

  const urgency = item.due_date
    ? getDueDateUrgency(item.due_date, item.status)
    : null
  const isOverdue = urgency?.urgency === 'overdue'

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      onClick={() => onClick?.(item)}
      className={cn(
        'rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing',
        'hover:border-border transition-colors',
        isOverdue ? 'border-destructive/50' : 'border-border/50',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-lg rotate-[2deg] scale-[1.02] ring-2 ring-primary/20',
      )}
    >
      {/* Row 1: Type badge + Due date */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={cn('text-[11px] font-medium rounded-full border px-1.5 py-0.5', typeColor)}>
          {typeLabel}
        </span>
        {item.due_date && (
          <span className={cn('text-[11px] flex items-center gap-1', urgency?.className || 'text-muted-foreground')}>
            <Calendar className="h-3 w-3" />
            <span className={urgency?.urgency !== 'normal' && urgency?.urgency !== 'done' ? 'font-medium' : ''}>
              {isOverdue ? 'Overdue: ' : ''}{formatDueDateShort(item.due_date)}
            </span>
          </span>
        )}
      </div>

      {/* Row 2: Description + Reporter */}
      <p className="text-sm text-foreground line-clamp-2 mb-1">{item.description}</p>
      <p className="text-[11px] text-muted-foreground mb-1">
        Reported by {item.reported_by || '—'}
      </p>

      {/* Row 3: Customer + Quick Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Users className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {item.customer_name || 'General'}
          </span>
        </div>
        {item.status === 'in_progress' && onStatusChange && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title="On Hold"
              onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'on_hold') }}
              className="p-1 rounded hover:bg-yellow-500/15 text-muted-foreground hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Done"
              onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'done') }}
              className="p-1 rounded hover:bg-green-500/15 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
