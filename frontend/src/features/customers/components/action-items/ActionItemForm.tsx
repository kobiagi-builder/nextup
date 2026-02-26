/**
 * Action Item Form (Dialog)
 *
 * Create or edit an action item. Uses React Hook Form + Zod validation.
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  ACTION_ITEM_TYPES,
  ACTION_ITEM_TYPE_LABELS,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
} from '../../types'
import type { ActionItem } from '../../types'

const actionItemFormSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().optional(),
  status: z.string().optional(),
})

type ActionItemFormData = z.infer<typeof actionItemFormSchema>

interface ActionItemFormProps {
  customerId: string
  actionItem?: ActionItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActionItemForm({ customerId, actionItem, open, onOpenChange }: ActionItemFormProps) {
  const createActionItem = useCreateActionItem(customerId)
  const updateActionItem = useUpdateActionItem(customerId)
  const isEditing = !!actionItem

  const form = useForm<ActionItemFormData>({
    resolver: zodResolver(actionItemFormSchema),
    defaultValues: {
      type: 'follow_up',
      description: '',
      due_date: '',
      status: 'todo',
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
      })
    } else if (!actionItem && open) {
      form.reset({
        type: 'follow_up',
        description: '',
        due_date: '',
        status: 'todo',
      })
    }
  }, [actionItem, open, form])

  const handleSubmit = async (data: ActionItemFormData) => {
    const payload = {
      type: data.type as ActionItem['type'],
      description: data.description,
      due_date: data.due_date || null,
      status: data.status as ActionItem['status'],
    }

    try {
      if (isEditing) {
        await updateActionItem.mutateAsync({ id: actionItem!.id, ...payload })
        toast({ title: 'Action item updated' })
      } else {
        await createActionItem.mutateAsync(payload)
        toast({ title: 'Action item created' })
      }
      onOpenChange(false)
    } catch {
      toast({
        title: `Failed to ${isEditing ? 'update' : 'create'} action item`,
        variant: 'destructive',
      })
    }
  }

  const isPending = createActionItem.isPending || updateActionItem.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
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
            <Input
              id="action-item-description"
              {...form.register('description')}
              placeholder="What needs to happen?"
              className="mt-1"
              autoFocus
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <Label htmlFor="action-item-due-date">Due Date</Label>
            <Input
              id="action-item-due-date"
              type="date"
              {...form.register('due_date')}
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
