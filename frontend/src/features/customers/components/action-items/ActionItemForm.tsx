/**
 * Action Item Form (Dialog)
 *
 * Create or edit an action item. Uses React Hook Form + Zod validation.
 * Supports two modes:
 * - Customer-scoped: customerId prop provided, uses customer-scoped mutations
 * - Board mode: customerId undefined, shows customer selector, uses board mutations
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateActionItem, useUpdateActionItem } from '../../hooks'
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import { useCustomers } from '../../hooks/useCustomers'
import {
  useCreateBoardActionItem,
  useUpdateBoardActionItem,
  boardActionItemKeys,
} from '@/features/action-items/hooks/useActionItemsBoard'
import {
  ACTION_ITEM_TYPES,
  ACTION_ITEM_TYPE_LABELS,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
} from '../../types'
import type { ActionItem } from '../../types'
import { useQueryClient } from '@tanstack/react-query'

const actionItemFormSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().optional(),
  status: z.string().optional(),
  reported_by: z.string().optional(),
  customer_id: z.string().nullable().optional(),
})

type ActionItemFormData = z.infer<typeof actionItemFormSchema>

interface ActionItemFormProps {
  customerId?: string
  actionItem?: ActionItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActionItemForm({ customerId, actionItem, open, onOpenChange }: ActionItemFormProps) {
  const isBoardMode = customerId === undefined
  const queryClient = useQueryClient()

  // Customer-scoped mutations (used when customerId is provided)
  const createActionItem = useCreateActionItem(customerId || '')
  const updateActionItem = useUpdateActionItem(customerId || '')

  // Board mutations (used when customerId is undefined)
  const createBoardItem = useCreateBoardActionItem()
  const updateBoardItem = useUpdateBoardActionItem()

  const isEditing = !!actionItem

  // Customer list for board mode selector
  const { isEnabled: hasCustomers } = useFeatureFlag('customer_management')
  const { data: customers } = useCustomers()

  const form = useForm<ActionItemFormData>({
    resolver: zodResolver(actionItemFormSchema),
    defaultValues: {
      type: 'follow_up',
      description: '',
      due_date: '',
      status: 'todo',
      reported_by: '',
      customer_id: null,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (actionItem && open) {
      form.reset({
        type: actionItem.type,
        description: actionItem.description,
        due_date: actionItem.due_date || '',
        status: actionItem.status,
        reported_by: actionItem.reported_by || '',
        customer_id: actionItem.customer_id || null,
      })
    } else if (!actionItem && open) {
      form.reset({
        type: 'follow_up',
        description: '',
        due_date: '',
        status: 'todo',
        reported_by: '',
        customer_id: null,
      })
    }
  }, [actionItem, open, form])

  const handleSubmit = async (data: ActionItemFormData) => {
    const basePayload = {
      type: data.type as ActionItem['type'],
      description: data.description,
      due_date: data.due_date || null,
      status: data.status as ActionItem['status'],
      reported_by: data.reported_by || null,
    }

    try {
      if (isBoardMode) {
        const boardPayload = { ...basePayload, customer_id: data.customer_id || null }
        if (isEditing) {
          await updateBoardItem.mutateAsync({ id: actionItem!.id, ...boardPayload })
          toast({ title: 'Action item updated' })
        } else {
          await createBoardItem.mutateAsync(boardPayload)
          toast({ title: 'Action item created' })
        }
        queryClient.invalidateQueries({ queryKey: boardActionItemKeys.all })
      } else {
        if (isEditing) {
          await updateActionItem.mutateAsync({ id: actionItem!.id, ...basePayload })
          toast({ title: 'Action item updated' })
        } else {
          await createActionItem.mutateAsync(basePayload)
          toast({ title: 'Action item created' })
        }
      }
      onOpenChange(false)
    } catch {
      toast({
        title: `Failed to ${isEditing ? 'update' : 'create'} action item`,
        variant: 'destructive',
      })
    }
  }

  const isPending = isBoardMode
    ? createBoardItem.isPending || updateBoardItem.isPending
    : createActionItem.isPending || updateActionItem.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Action Item' : 'New Action Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          {/* Type */}
          <div>
            <Label>Type</Label>
            <Select
              value={form.watch('type') || 'follow_up'}
              onValueChange={(val) => form.setValue('type', val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                {ACTION_ITEM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACTION_ITEM_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="action-item-description">Description *</Label>
            <Textarea
              id="action-item-description"
              {...form.register('description')}
              placeholder="What needs to happen?"
              rows={3}
              className="mt-1 resize-y max-h-[40vh]"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              autoFocus
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Customer selector (board mode only) */}
          {isBoardMode && hasCustomers && (
            <div>
              <Label>Customer</Label>
              <Select
                value={form.watch('customer_id') || '__none__'}
                onValueChange={(val) => form.setValue('customer_id', val === '__none__' ? null : val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside>
                  <SelectItem value="__none__">General (no customer)</SelectItem>
                  {(customers || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Due Date */}
          <div>
            <Label htmlFor="action-item-due-date">Due Date</Label>
            <DatePicker
              value={form.watch('due_date')}
              onChange={(date) => form.setValue('due_date', date || '', { shouldValidate: true })}
              placeholder="Pick a due date"
            />
          </div>

          {/* Reported By */}
          <div>
            <Label htmlFor="action-item-reported-by">Reported By</Label>
            <Input
              id="action-item-reported-by"
              {...form.register('reported_by')}
              placeholder="Who reported this?"
              className="mt-1"
            />
          </div>

          {/* Status (edit mode only) */}
          {isEditing && (
            <div>
              <Label>Status</Label>
              <Select
                value={form.watch('status') || 'todo'}
                onValueChange={(val) => form.setValue('status', val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside>
                  {ACTION_ITEM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ACTION_ITEM_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
