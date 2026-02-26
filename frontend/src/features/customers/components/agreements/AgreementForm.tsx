/**
 * Agreement Form (Dialog)
 *
 * Create or edit an agreement. Uses React Hook Form + Zod validation.
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
import { useCreateAgreement, useUpdateAgreement } from '../../hooks'
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABELS } from '../../types'
import type { Agreement } from '../../types'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS'] as const
const FREQUENCIES = ['monthly', 'quarterly', 'annually', 'one_time', 'per_milestone'] as const
const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  one_time: 'One-time',
  per_milestone: 'Per Milestone',
}

const agreementFormSchema = z.object({
  scope: z.string().min(1, 'Scope is required'),
  type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  pricing_amount: z.union([z.string(), z.number()]).optional(),
  pricing_currency: z.string().optional(),
  pricing_frequency: z.string().optional(),
  pricing_notes: z.string().optional(),
})

type AgreementFormData = z.infer<typeof agreementFormSchema>

interface AgreementFormProps {
  customerId: string
  agreement?: Agreement | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgreementForm({ customerId, agreement, open, onOpenChange }: AgreementFormProps) {
  const createAgreement = useCreateAgreement(customerId)
  const updateAgreement = useUpdateAgreement(customerId)
  const isEditing = !!agreement

  const form = useForm<AgreementFormData>({
    resolver: zodResolver(agreementFormSchema),
    defaultValues: {
      scope: '',
      type: 'retainer',
      start_date: '',
      end_date: '',
      pricing_amount: '',
      pricing_currency: 'USD',
      pricing_frequency: 'monthly',
      pricing_notes: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (agreement && open) {
      form.reset({
        scope: agreement.scope,
        type: agreement.type,
        start_date: agreement.start_date || '',
        end_date: agreement.end_date || '',
        pricing_amount: agreement.pricing?.amount || '',
        pricing_currency: agreement.pricing?.currency || 'USD',
        pricing_frequency: agreement.pricing?.frequency || 'monthly',
        pricing_notes: agreement.pricing?.notes || '',
      })
    } else if (!agreement && open) {
      form.reset({
        scope: '',
        type: 'retainer',
        start_date: '',
        end_date: '',
        pricing_amount: '',
        pricing_currency: 'USD',
        pricing_frequency: 'monthly',
        pricing_notes: '',
      })
    }
  }, [agreement, open, form])

  const handleSubmit = async (data: AgreementFormData) => {
    const amount = data.pricing_amount ? Number(data.pricing_amount) : 0
    const pricing = amount > 0
      ? {
          amount,
          currency: data.pricing_currency || 'USD',
          frequency: data.pricing_frequency || 'monthly',
          notes: data.pricing_notes || undefined,
        }
      : undefined

    const payload = {
      scope: data.scope,
      type: data.type as Agreement['type'] | undefined,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      pricing,
    }

    try {
      if (isEditing) {
        await updateAgreement.mutateAsync({ id: agreement!.id, ...payload })
        toast({ title: 'Agreement updated' })
      } else {
        await createAgreement.mutateAsync(payload)
        toast({ title: 'Agreement created' })
      }
      onOpenChange(false)
    } catch {
      toast({
        title: `Failed to ${isEditing ? 'update' : 'create'} agreement`,
        variant: 'destructive',
      })
    }
  }

  const isPending = createAgreement.isPending || updateAgreement.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Agreement' : 'New Agreement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          {/* Scope */}
          <div>
            <Label htmlFor="agreement-scope">Scope *</Label>
            <Textarea
              id="agreement-scope"
              {...form.register('scope')}
              placeholder="Describe the scope of this agreement"
              rows={3}
              className="mt-1"
              autoFocus
            />
            {form.formState.errors.scope && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.scope.message}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <Label>Type</Label>
            <Select
              value={form.watch('type') || 'retainer'}
              onValueChange={(val) => form.setValue('type', val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                {AGREEMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {AGREEMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="agreement-start">Start Date</Label>
              <Input
                id="agreement-start"
                type="date"
                {...form.register('start_date')}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="agreement-end">End Date</Label>
              <Input
                id="agreement-end"
                type="date"
                {...form.register('end_date')}
                className="mt-1"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Pricing</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="agreement-amount" className="text-xs text-muted-foreground">Amount</Label>
                <Input
                  id="agreement-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('pricing_amount')}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Select
                  value={form.watch('pricing_currency') || 'USD'}
                  onValueChange={(val) => form.setValue('pricing_currency', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent data-portal-ignore-click-outside>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <Select
                  value={form.watch('pricing_frequency') || 'monthly'}
                  onValueChange={(val) => form.setValue('pricing_frequency', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent data-portal-ignore-click-outside>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="agreement-pricing-notes" className="text-xs text-muted-foreground">
                Pricing Notes
              </Label>
              <Input
                id="agreement-pricing-notes"
                {...form.register('pricing_notes')}
                placeholder="Additional pricing details"
                className="mt-1"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create Agreement')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
