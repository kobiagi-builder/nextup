/**
 * Receivables Tab
 *
 * Tab content for the customer detail page. Shows financial summary + transaction list.
 */

import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  useReceivables,
  useReceivableSummary,
  useDeleteReceivable,
  useUpdateReceivable,
} from '../../hooks'
import type { Receivable } from '../../types'
import { FinancialSummary } from './FinancialSummary'
import { TransactionRow } from './TransactionRow'
import { InvoiceForm } from './InvoiceForm'
import { PaymentForm } from './PaymentForm'

interface ReceivablesTabProps {
  customerId: string
}

export function ReceivablesTab({ customerId }: ReceivablesTabProps) {
  const { data: receivables = [], isLoading: listLoading } = useReceivables(customerId)
  const { data: summary, isLoading: summaryLoading } = useReceivableSummary(customerId)
  const deleteReceivable = useDeleteReceivable(customerId)
  const updateReceivable = useUpdateReceivable(customerId)

  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false)
  const [paymentFormOpen, setPaymentFormOpen] = useState(false)
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null)

  const handleEdit = (receivable: Receivable) => {
    setEditingReceivable(receivable)
    if (receivable.type === 'invoice') {
      setInvoiceFormOpen(true)
    } else {
      setPaymentFormOpen(true)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteReceivable.mutateAsync(id)
      toast({ title: 'Transaction deleted' })
    } catch {
      toast({ title: 'Failed to delete transaction', variant: 'destructive' })
    }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      await updateReceivable.mutateAsync({ id, status: 'paid' })
      toast({ title: 'Invoice marked as paid' })
    } catch {
      toast({ title: 'Failed to update invoice', variant: 'destructive' })
    }
  }

  const handleInvoiceFormClose = (open: boolean) => {
    setInvoiceFormOpen(open)
    if (!open) setEditingReceivable(null)
  }

  const handlePaymentFormClose = (open: boolean) => {
    setPaymentFormOpen(open)
    if (!open) setEditingReceivable(null)
  }

  // Sort by date DESC
  const sortedReceivables = [...receivables].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const hasTransactions = receivables.length > 0

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <FinancialSummary summary={summary ?? undefined} isLoading={summaryLoading} />

      {/* Transactions section */}
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {receivables.length} {receivables.length === 1 ? 'Transaction' : 'Transactions'}
          </h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setInvoiceFormOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Record Invoice
            </Button>
            <Button size="sm" onClick={() => setPaymentFormOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Record Payment
            </Button>
          </div>
        </div>

        {/* Transaction list or empty state */}
        {listLoading ? (
          <div className="rounded-lg border border-border/50 bg-card divide-y divide-border/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
                <div className="h-9 w-9 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        ) : !hasTransactions ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No transactions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Start tracking invoices and payments for this customer.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setInvoiceFormOpen(true)}>
                Record Invoice
              </Button>
              <Button onClick={() => setPaymentFormOpen(true)}>
                Record Payment
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-card divide-y divide-border/50">
            {sortedReceivables.map((receivable) => (
              <TransactionRow
                key={receivable.id}
                receivable={receivable}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkPaid={handleMarkPaid}
                isDeleting={deleteReceivable.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Forms */}
      <InvoiceForm
        customerId={customerId}
        receivable={editingReceivable?.type === 'invoice' ? editingReceivable : null}
        open={invoiceFormOpen}
        onOpenChange={handleInvoiceFormClose}
      />
      <PaymentForm
        customerId={customerId}
        receivable={editingReceivable?.type === 'payment' ? editingReceivable : null}
        open={paymentFormOpen}
        onOpenChange={handlePaymentFormClose}
      />
    </div>
  )
}
