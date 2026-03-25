/**
 * Kanban Card
 *
 * Draggable action item card for the Kanban board.
 * Shows type badge, due date, description, and customer name.
 * Phase 2: loading animation, document icon on done items.
 */

import { useDraggable } from '@dnd-kit/core'
import { Calendar, Check, FileText, Pause, Users, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useExecutionStore } from '@/stores/executionStore'
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
  onExecute?: (item: ActionItemWithCustomer) => void
  isExecuting?: boolean
  isDragOverlay?: boolean
}

export function KanbanCard({ item, onClick, onStatusChange, onExecute, isExecuting, isDragOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: isDragOverlay,
  })
  const navigate = useNavigate()

  const globalExecutingId = useExecutionStore((s) => s.executingItemId)
  const isExecutingThis = globalExecutingId === item.id

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
        isExecutingThis && 'border-primary/30 animate-pulse',
        isOverdue && !isExecutingThis ? 'border-destructive/50' : !isExecutingThis ? 'border-border/50' : '',
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

        <div className="flex items-center gap-1 shrink-0">
          {/* Document icon — on done items with a linked document */}
          {item.status === 'done' && item.document_id && item.customer_id && (
            <button
              type="button"
              title={item.document_title || 'View Document'}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/customers/${item.customer_id}`, {
                  state: { openDocumentId: item.document_id, switchToTab: 'documents' },
                })
              }}
              className="p-1 text-primary hover:text-primary/80 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Execute button — only on todo items */}
          {item.status === 'todo' && onExecute && (
            <button
              type="button"
              title="Execute with AI"
              onClick={(e) => { e.stopPropagation(); onExecute(item) }}
              disabled={isExecuting}
              className={cn(
                'p-1 rounded transition-colors',
                'text-muted-foreground hover:bg-primary/10 hover:text-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Zap className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Executing indicator */}
          {isExecutingThis && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary animate-pulse">
              <Zap className="h-3 w-3" />
            </span>
          )}

          {/* Quick status actions — in_progress items */}
          {item.status === 'in_progress' && !isExecutingThis && onStatusChange && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
