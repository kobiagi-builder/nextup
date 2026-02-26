/**
 * Action Items Tab
 *
 * Tab content for the customer detail page. Shows action item rows with
 * filter/sort controls and create/edit actions.
 */

import { useState, useMemo } from 'react'
import { Plus, ListChecks, ArrowUpDown } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActionItems, useDeleteActionItem, useUpdateActionItem } from '../../hooks'
import type { ActionItem, ActionItemStatus } from '../../types'
import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_TYPES,
  ACTION_ITEM_TYPE_LABELS,
} from '../../types'
import { ActionItemRow } from './ActionItemRow'
import { ActionItemForm } from './ActionItemForm'

interface ActionItemsTabProps {
  customerId: string
}

export function ActionItemsTab({ customerId }: ActionItemsTabProps) {
  const { data: actionItems = [], isLoading } = useActionItems(customerId)
  const deleteActionItem = useDeleteActionItem(customerId)
  const updateActionItem = useUpdateActionItem(customerId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'due_date' | 'created_at'>('due_date')

  // Client-side filtering and sorting
  const filteredItems = useMemo(() => {
    let items = [...actionItems]

    if (statusFilter !== 'all') {
      items = items.filter((i) => i.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      items = items.filter((i) => i.type === typeFilter)
    }

    items.sort((a, b) => {
      if (sortBy === 'due_date') {
        // nulls last
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      // created_at descending
      return b.created_at.localeCompare(a.created_at)
    })

    return items
  }, [actionItems, statusFilter, typeFilter, sortBy])

  const handleEdit = (item: ActionItem) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteActionItem.mutateAsync(id)
      toast({ title: 'Action item deleted' })
    } catch {
      toast({ title: 'Failed to delete action item', variant: 'destructive' })
    }
  }

  const handleStatusChange = async (id: string, status: ActionItemStatus) => {
    try {
      await updateActionItem.mutateAsync({ id, status })
      toast({ title: `Status updated to ${ACTION_ITEM_STATUS_LABELS[status]}` })
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditingItem(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-5 bg-muted rounded-full w-20" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
          </h3>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent data-portal-ignore-click-outside>
              <SelectItem value="all">All Statuses</SelectItem>
              {ACTION_ITEM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ACTION_ITEM_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent data-portal-ignore-click-outside>
              <SelectItem value="all">All Types</SelectItem>
              {ACTION_ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ACTION_ITEM_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setSortBy(sortBy === 'due_date' ? 'created_at' : 'due_date')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            {sortBy === 'due_date' ? 'Due Date' : 'Created'}
          </Button>
        </div>

        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Action items list or empty state */}
      {actionItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ListChecks className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No action items yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Track follow-ups, proposals, meetings, and deliverables for this customer.
          </p>
          <Button onClick={() => setFormOpen(true)} className="mt-4">
            Add First Action Item
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No items match the current filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              isDeleting={deleteActionItem.isPending}
            />
          ))}
        </div>
      )}

      {/* Create/Edit form */}
      <ActionItemForm
        customerId={customerId}
        actionItem={editingItem}
        open={formOpen}
        onOpenChange={handleFormClose}
      />
    </div>
  )
}
