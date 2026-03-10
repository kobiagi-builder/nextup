/**
 * Initiative Form (Dialog)
 *
 * Create or edit an initiative. Uses React Hook Form + Zod validation.
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
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
import { useCreateInitiative, useUpdateInitiative, useAgreements } from '../../hooks'
import { INITIATIVE_STATUSES, INITIATIVE_STATUS_LABELS } from '../../types'
import type { Initiative } from '../../types'

const initiativeFormSchema = z.object({
  name: z.string().min(1, 'Initiative name is required'),
  description: z.string().optional(),
  status: z.string().optional(),
  agreement_id: z.string().optional(),
})

type InitiativeFormData = z.infer<typeof initiativeFormSchema>

interface InitiativeFormProps {
  customerId: string
  initiative?: Initiative | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InitiativeForm({ customerId, initiative, open, onOpenChange }: InitiativeFormProps) {
  const createInitiative = useCreateInitiative(customerId)
  const updateInitiative = useUpdateInitiative(customerId)
  const { data: agreements = [] } = useAgreements(customerId)
  const isEditing = !!initiative

  const form = useForm<InitiativeFormData>({
    resolver: zodResolver(initiativeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'planning',
      agreement_id: '',
    },
  })

  // Reset form when opening/closing or when editing initiative changes
  useEffect(() => {
    if (open && initiative) {
      form.reset({
        name: initiative.name,
        description: initiative.description || '',
        status: initiative.status,
        agreement_id: initiative.agreement_id || '',
      })
    } else if (open && !initiative) {
      form.reset({
        name: '',
        description: '',
        status: 'planning',
        agreement_id: '',
      })
    }
  }, [open, initiative, form])

  const onSubmit = async (data: InitiativeFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        status: data.status as Initiative['status'] || undefined,
        agreement_id: data.agreement_id || null,
      }

      if (isEditing && initiative) {
        await updateInitiative.mutateAsync({ id: initiative.id, ...payload })
        toast({ title: 'Initiative updated' })
      } else {
        await createInitiative.mutateAsync(payload)
        toast({ title: 'Initiative created' })
      }
      onOpenChange(false)
    } catch {
      toast({
        title: isEditing ? 'Failed to update initiative' : 'Failed to create initiative',
        variant: 'destructive',
      })
    }
  }

  const isPending = createInitiative.isPending || updateInitiative.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Initiative' : 'New Initiative'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Initiative Name</Label>
            <Input
              id="name"
              placeholder="e.g., Q1 Product Strategy"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the initiative..."
              rows={2}
              {...form.register('description')}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                {INITIATIVE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {INITIATIVE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linked Agreement */}
          <div className="space-y-2">
            <Label>Linked Agreement (optional)</Label>
            <Select
              value={form.watch('agreement_id') || ''}
              onValueChange={(v) => form.setValue('agreement_id', v === '_none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agreement..." />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                <SelectItem value="_none">None</SelectItem>
                {agreements.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.scope.length > 50 ? `${a.scope.slice(0, 50)}...` : a.scope}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Initiative'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
