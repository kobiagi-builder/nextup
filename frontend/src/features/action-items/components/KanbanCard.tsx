/**
 * Kanban Card
 *
 * Draggable action item card for the Kanban board.
 * Shows type badge, due date, description, and customer name.
 */

import { useDraggable } from '@dnd-kit/core'
import { Calendar, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDueDateUrgency, formatDueDateShort } from '@/features/customers/utils/format'
import {
  ACTION_ITEM_TYPE_LABELS,
  ACTION_ITEM_TYPE_COLORS,
} from '../types'
import type { ActionItemWithCustomer } from '../types'

interface KanbanCardProps {
  item: ActionItemWithCustomer
  onClick?: (item: ActionItemWithCustomer) => void
  isDragOverlay?: boolean
}

export function KanbanCard({ item, onClick, isDragOverlay }: KanbanCardProps) {
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

      {/* Row 2: Description */}
      <p className="text-sm text-foreground line-clamp-2 mb-2">{item.description}</p>

      {/* Row 3: Customer */}
      <div className="flex items-center gap-1.5">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground truncate">
          {item.customer_name || 'General'}
        </span>
      </div>
    </div>
  )
}
