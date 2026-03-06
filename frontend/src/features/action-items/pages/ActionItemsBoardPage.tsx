/**
 * Action Items Board Page
 *
 * Kanban board view of all action items across customers.
 * Supports drag-and-drop status changes, filtering, and create/edit.
 */

import { useState, useMemo } from 'react'
import { ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActionItemForm } from '@/features/customers/components/action-items/ActionItemForm'
import { BoardToolbar } from '../components/BoardToolbar'
import { KanbanBoard } from '../components/KanbanBoard'
import {
  useActionItemsBoard,
  useUpdateBoardActionItem,
} from '../hooks/useActionItemsBoard'
import type { ActionItemStatus, ActionItemWithCustomer } from '../types'
import type { ActionItem } from '../types'

export function ActionItemsBoardPage() {
  const [filterCustomerId, setFilterCustomerId] = useState<string | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null)

  const filters = useMemo(
    () => (filterCustomerId ? { customer_id: filterCustomerId } : undefined),
    [filterCustomerId]
  )

  const { data: items, isLoading } = useActionItemsBoard(filters)
  const updateMutation = useUpdateBoardActionItem(filters)

  function handleStatusChange(id: string, status: ActionItemStatus) {
    updateMutation.mutate({ id, status })
  }

  function handleCardClick(item: ActionItemWithCustomer) {
    setEditingItem(item as ActionItem)
    setFormOpen(true)
  }

  function handleAddItem() {
    setEditingItem(null)
    setFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingItem(null)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between py-4 px-6 border-b border-border/50">
          <Skeleton className="h-7 w-32" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="flex-1 flex gap-4 px-6 py-4">
          {[3, 2, 2, 1].map((cardCount, i) => (
            <div key={i} className="flex-1 min-w-[260px] max-w-[340px] bg-muted/30 rounded-xl border border-border/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              {Array.from({ length: cardCount }).map((_, j) => (
                <div key={j} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasItems = items && items.length > 0

  // Empty board state
  if (!hasItems && !filterCustomerId) {
    return (
      <div className="flex flex-col h-full">
        <BoardToolbar
          selectedCustomerId={filterCustomerId}
          onCustomerFilterChange={setFilterCustomerId}
          onAddItem={handleAddItem}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <ListChecks className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h2 className="text-lg font-medium text-foreground">No action items yet</h2>
            <p className="text-sm text-muted-foreground">Create your first action item to start tracking your work</p>
            <Button onClick={handleAddItem}>Create Action Item</Button>
          </div>
        </div>
        <ActionItemForm
          open={formOpen}
          onOpenChange={handleFormClose}
          actionItem={editingItem}
        />
      </div>
    )
  }

  // Empty filter results
  if (!hasItems && filterCustomerId) {
    return (
      <div className="flex flex-col h-full">
        <BoardToolbar
          selectedCustomerId={filterCustomerId}
          onCustomerFilterChange={setFilterCustomerId}
          onAddItem={handleAddItem}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">No action items for this customer</p>
            <Button variant="ghost" onClick={() => setFilterCustomerId(undefined)}>
              Clear Filter
            </Button>
          </div>
        </div>
        <ActionItemForm
          open={formOpen}
          onOpenChange={handleFormClose}
          actionItem={editingItem}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <BoardToolbar
        selectedCustomerId={filterCustomerId}
        onCustomerFilterChange={setFilterCustomerId}
        onAddItem={handleAddItem}
      />
      <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
        <KanbanBoard
          items={items || []}
          onStatusChange={handleStatusChange}
          onCardClick={handleCardClick}
        />
      </div>
      <ActionItemForm
        open={formOpen}
        onOpenChange={handleFormClose}
        actionItem={editingItem}
      />
    </div>
  )
}
