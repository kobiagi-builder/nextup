/**
 * Agreements Tab
 *
 * Tab content for the customer detail page. Shows agreement cards list with create/edit actions.
 */

import { useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { useAgreements, useDeleteAgreement, useUpdateAgreement } from '../../hooks'
import type { Agreement } from '../../types'
import { AgreementCard } from './AgreementCard'
import { AgreementForm } from './AgreementForm'

interface AgreementsTabProps {
  customerId: string
}

export function AgreementsTab({ customerId }: AgreementsTabProps) {
  const { data: agreements = [], isLoading } = useAgreements(customerId)
  const deleteAgreement = useDeleteAgreement(customerId)
  const updateAgreement = useUpdateAgreement(customerId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null)

  const handleEdit = (agreement: Agreement) => {
    setEditingAgreement(agreement)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAgreement.mutateAsync(id)
      toast({ title: 'Agreement deleted' })
    } catch {
      toast({ title: 'Failed to delete agreement', variant: 'destructive' })
    }
  }

  const handleTerminate = async (id: string) => {
    try {
      await updateAgreement.mutateAsync({ id, override_status: 'terminated' })
      toast({ title: 'Agreement terminated' })
    } catch {
      toast({ title: 'Failed to terminate agreement', variant: 'destructive' })
    }
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditingAgreement(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-3" />
            <div className="h-3 bg-muted rounded w-1/4 mb-3" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {agreements.length} {agreements.length === 1 ? 'Agreement' : 'Agreements'}
        </h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Agreement
        </Button>
      </div>

      {/* Agreement list or empty state */}
      {agreements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No agreements yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Track service agreements, pricing, and contract terms for this customer.
          </p>
          <Button onClick={() => setFormOpen(true)} className="mt-4">
            Add First Agreement
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agreements.map((agreement) => (
            <AgreementCard
              key={agreement.id}
              agreement={agreement}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTerminate={handleTerminate}
              isDeleting={deleteAgreement.isPending}
            />
          ))}
        </div>
      )}

      {/* Create/Edit form */}
      <AgreementForm
        customerId={customerId}
        agreement={editingAgreement}
        open={formOpen}
        onOpenChange={handleFormClose}
      />
    </div>
  )
}
