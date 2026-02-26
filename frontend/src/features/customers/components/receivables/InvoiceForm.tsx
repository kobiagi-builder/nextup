/**
 * Invoice Form (Dialog)
 *
 * Create or edit an invoice. Uses React Hook Form + Zod validation.
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
import { useCreateReceivable, useUpdateReceivable, useAgreements } from '../../hooks'
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from '../../types'
import type { Receivable } from '../../types'

const invoiceFormSchema = z.object({
  amount: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, 'Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  reference: z.string().optional(),
  status: z.string().optional(),
  linked_agreement_id: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceFormSchema>

interface InvoiceFormProps {
  customerId: string
  receivable?: Receivable | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceForm({ customerId, receivable, open, onOpenChange }: InvoiceFormProps) {
  const createReceivable = useCreateReceivable(customerId)
  const updateReceivable = useUpdateReceivable(customerId)
  const { data: agreements = [] } = useAgreements(customerId)
  const isEditing = !!receivable

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      status: 'sent',
      linked_agreement_id: '',
    },
  })

  useEffect(() => {
    if (receivable && open) {
      form.reset({
        amount: receivable.amount,
        date: receivable.date,
        description: receivable.description || '',
        reference: receivable.reference || '',
        status: receivable.status,
        linked_agreement_id: receivable.linked_agreement_id || '',
      })
    } else if (!receivable && open) {
      form.reset({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        status: 'sent',
        linked_agreement_id: '',
      })
    }
  }, [receivable, open, form])

  const handleSubmit = async (data: InvoiceFormData) => {
    const payload = {
      type: 'invoice' as const,
      amount: Number(data.amount),
      date: data.date,
      description: data.description || undefined,
      reference: data.reference || undefined,
      status: data.status || 'sent',
      linked_agreement_id: data.linked_agreement_id || null,
    }

    try {
      if (isEditing) {
        const { type: _, ...updatePayload } = payload
        await updateReceivable.mutateAsync({ id: receivable!.id, ...updatePayload })
        toast({ title: 'Invoice updated' })
      } else {
        await createReceivable.mutateAsync(payload)
        toast({ title: 'Invoice recorded' })
      }
      onOpenChange(false)
    } catch {
      toast({ title: `Failed to ${isEditing ? 'update' : 'record'} invoice`, variant: 'destructive' })
    }
  }

  const isPending = createReceivable.isPending || updateReceivable.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Invoice' : 'Record Invoice'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          {/* Amount */}
          <div>
            <Label htmlFor="invoice-amount">Amount *</Label>
            <Input
              id="invoice-amount"
              type="number"
              step="0.01"
              min="0"
              {...form.register('amount')}
              placeholder="0.00"
              className="mt-1"
              autoFocus
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="invoice-date">Date *</Label>
            <Input
              id="invoice-date"
              type="date"
              {...form.register('date')}
              className="mt-1"
            />
            {form.formState.errors.date && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.date.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="invoice-desc">Description</Label>
            <Input
              id="invoice-desc"
              {...form.register('description')}
              placeholder="Invoice description"
              className="mt-1"
            />
          </div>

          {/* Reference */}
          <div>
            <Label htmlFor="invoice-ref">Reference / Invoice Number</Label>
            <Input
              id="invoice-ref"
              {...form.register('reference')}
              placeholder="INV-001"
              className="mt-1"
            />
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select
              value={form.watch('status') || 'sent'}
              onValueChange={(val) => form.setValue('status', val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linked Agreement */}
          {agreements.length > 0 && (
            <div>
              <Label>Linked Agreement</Label>
              <Select
                value={form.watch('linked_agreement_id') || 'none'}
                onValueChange={(val) => form.setValue('linked_agreement_id', val === 'none' ? '' : val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside>
                  <SelectItem value="none">None</SelectItem>
                  {agreements.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.scope}</SelectItem>
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
              {isPending ? (isEditing ? 'Updating...' : 'Recording...') : (isEditing ? 'Update' : 'Record Invoice')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
