/**
 * Payment Form (Dialog)
 *
 * Record a payment. Uses React Hook Form + Zod validation.
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
import { useCreateReceivable, useUpdateReceivable, useReceivables } from '../../hooks'
import type { Receivable } from '../../types'

const paymentFormSchema = z.object({
  amount: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, 'Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  reference: z.string().optional(),
  linked_invoice_id: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentFormSchema>

interface PaymentFormProps {
  customerId: string
  receivable?: Receivable | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentForm({ customerId, receivable, open, onOpenChange }: PaymentFormProps) {
  const createReceivable = useCreateReceivable(customerId)
  const updateReceivable = useUpdateReceivable(customerId)
  const { data: allReceivables = [] } = useReceivables(customerId)
  const isEditing = !!receivable

  // Get unpaid invoices for linking
  const unpaidInvoices = allReceivables.filter(
    (r) => r.type === 'invoice' && r.status !== 'paid' && r.status !== 'cancelled'
  )

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      linked_invoice_id: '',
    },
  })

  useEffect(() => {
    if (receivable && open) {
      form.reset({
        amount: receivable.amount,
        date: receivable.date,
        description: receivable.description || '',
        reference: receivable.reference || '',
        linked_invoice_id: receivable.linked_invoice_id || '',
      })
    } else if (!receivable && open) {
      form.reset({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        linked_invoice_id: '',
      })
    }
  }, [receivable, open, form])

  const handleSubmit = async (data: PaymentFormData) => {
    const payload = {
      type: 'payment' as const,
      amount: Number(data.amount),
      date: data.date,
      description: data.description || undefined,
      reference: data.reference || undefined,
      linked_invoice_id: data.linked_invoice_id || null,
    }

    try {
      if (isEditing) {
        const { type: _, ...updatePayload } = payload
        await updateReceivable.mutateAsync({ id: receivable!.id, ...updatePayload })
        toast({ title: 'Payment updated' })
      } else {
        await createReceivable.mutateAsync(payload)
        toast({ title: 'Payment recorded' })
      }
      onOpenChange(false)
    } catch {
      toast({ title: `Failed to ${isEditing ? 'update' : 'record'} payment`, variant: 'destructive' })
    }
  }

  const isPending = createReceivable.isPending || updateReceivable.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          {/* Amount */}
          <div>
            <Label htmlFor="payment-amount">Amount *</Label>
            <Input
              id="payment-amount"
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
            <Label htmlFor="payment-date">Date *</Label>
            <Input
              id="payment-date"
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
            <Label htmlFor="payment-desc">Description</Label>
            <Input
              id="payment-desc"
              {...form.register('description')}
              placeholder="Payment description"
              className="mt-1"
            />
          </div>

          {/* Reference */}
          <div>
            <Label htmlFor="payment-ref">Payment Reference</Label>
            <Input
              id="payment-ref"
              {...form.register('reference')}
              placeholder="Check #, wire ref, etc."
              className="mt-1"
            />
          </div>

          {/* Linked Invoice */}
          {unpaidInvoices.length > 0 && (
            <div>
              <Label>Linked Invoice</Label>
              <Select
                value={form.watch('linked_invoice_id') || 'none'}
                onValueChange={(val) => form.setValue('linked_invoice_id', val === 'none' ? '' : val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside>
                  <SelectItem value="none">None</SelectItem>
                  {unpaidInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.description || 'Invoice'} — ${inv.amount}
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
              {isPending ? (isEditing ? 'Updating...' : 'Recording...') : (isEditing ? 'Update' : 'Record Payment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
