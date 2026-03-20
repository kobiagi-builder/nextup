/**
 * Kanban Board
 *
 * DndContext wrapper with 4 status columns.
 * Handles drag-and-drop between columns to change action item status.
 */

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ACTION_ITEM_STATUSES } from '../types'
import type { ActionItemStatus, ActionItemWithCustomer } from '../types'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'

interface KanbanBoardProps {
  items: ActionItemWithCustomer[]
  onStatusChange: (id: string, status: ActionItemStatus) => void
  onCardClick?: (item: ActionItemWithCustomer) => void
}

export function KanbanBoard({ items, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [activeItem, setActiveItem] = useState<ActionItemWithCustomer | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  )

  const columnItems = useMemo(() => {
    const grouped: Record<ActionItemStatus, ActionItemWithCustomer[]> = {
      todo: [],
      in_progress: [],
      on_hold: [],
      done: [],
      cancelled: [],
    }

    for (const item of items) {
      const status = item.status as ActionItemStatus
      if (grouped[status]) {
        grouped[status].push(item)
      }
    }

    return grouped
  }, [items])

  function handleDragStart(event: DragStartEvent) {
    const item = items.find(i => i.id === event.active.id)
    setActiveItem(item || null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return

    const itemId = active.id as string
    const newStatus = over.id as ActionItemStatus
    const item = items.find(i => i.id === itemId)

    if (item && item.status !== newStatus) {
      onStatusChange(itemId, newStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-2">
        {ACTION_ITEM_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            items={columnItems[status]}
            onCardClick={onCardClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem && <KanbanCard item={activeItem} isDragOverlay />}
      </DragOverlay>
    </DndContext>
  )
}
