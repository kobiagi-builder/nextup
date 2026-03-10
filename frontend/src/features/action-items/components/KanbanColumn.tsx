/**
 * Kanban Column
 *
 * Droppable column for a single action item status.
 * Shows header with status dot, title, and count badge.
 */

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { ACTION_ITEM_STATUS_LABELS } from '../types'
import type { ActionItemStatus, ActionItemWithCustomer } from '../types'
import { KanbanCard } from './KanbanCard'

const STATUS_DOT_COLORS: Record<ActionItemStatus, string> = {
  todo: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  on_hold: 'bg-yellow-500',
  done: 'bg-green-500',
  cancelled: 'bg-orange-500',
}

const COLUMN_HEADER_BG: Record<ActionItemStatus, string> = {
  todo: '',
  in_progress: 'bg-blue-500/5',
  on_hold: 'bg-yellow-500/5',
  done: 'bg-green-500/5',
  cancelled: 'bg-orange-500/5',
}

interface KanbanColumnProps {
  status: ActionItemStatus
  items: ActionItemWithCustomer[]
  onCardClick?: (item: ActionItemWithCustomer) => void
}

export function KanbanColumn({ status, items, onCardClick }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  const label = ACTION_ITEM_STATUS_LABELS[status]
  const dotColor = STATUS_DOT_COLORS[status]
  const headerBg = COLUMN_HEADER_BG[status]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[260px] max-w-[340px] bg-muted/30 rounded-xl border border-border/30 flex flex-col',
        'transition-all duration-150',
        isOver && 'ring-2 ring-primary/30 bg-primary/5',
      )}
    >
      {/* Column Header */}
      <div className={cn('px-3 py-2.5 flex items-center justify-between rounded-t-xl', headerBg)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', dotColor)} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {items.length}
        </span>
      </div>

      {/* Column Body */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 pt-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-8">No items</p>
        ) : (
          items.map((item) => (
            <KanbanCard key={item.id} item={item} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  )
}
