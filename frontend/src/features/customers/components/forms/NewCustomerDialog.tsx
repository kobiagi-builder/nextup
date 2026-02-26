/**
 * New Customer Dialog
 *
 * Dialog for creating a new customer. On success, navigates to the detail page.
 */

import { useNavigate } from 'react-router-dom'
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
import { useCreateCustomer } from '../../hooks'
import { CustomerStatusSelect } from '../shared/CustomerStatusSelect'
import type { CustomerStatus } from '../../types'

const newCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  vertical: z.string().optional(),
  about: z.string().optional(),
})

type NewCustomerFormData = z.infer<typeof newCustomerSchema>

interface NewCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewCustomerDialog({ open, onOpenChange }: NewCustomerDialogProps) {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()

  const form = useForm<NewCustomerFormData>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { name: '', vertical: '', about: '' },
  })

  const statusValue: CustomerStatus = 'lead'

  const handleSubmit = async (data: NewCustomerFormData) => {
    try {
      const customer = await createCustomer.mutateAsync({
        name: data.name,
        status: statusValue,
        info: {
          vertical: data.vertical || undefined,
          about: data.about || undefined,
        },
      })

      toast({ title: 'Customer created', description: `${customer.name} has been added.` })

      form.reset()
      onOpenChange(false)
      navigate(`/customers/${customer.id}`)
    } catch {
      toast({ title: 'Failed to create customer', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="customer-name">Name *</Label>
            <Input
              id="customer-name"
              {...form.register('name')}
              placeholder="Company or client name"
              className="mt-1"
              autoFocus
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label>Status</Label>
            <div className="mt-1">
              <CustomerStatusSelect
                value={statusValue}
                onValueChange={() => {}} // Default lead for new customers
                disabled
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">New customers start as Lead.</p>
          </div>

          <div>
            <Label htmlFor="customer-vertical">Vertical / Industry</Label>
            <Input
              id="customer-vertical"
              {...form.register('vertical')}
              placeholder="e.g., SaaS, Healthcare, FinTech"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="customer-about">About</Label>
            <Textarea
              id="customer-about"
              {...form.register('about')}
              placeholder="Brief description of the customer"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
