/**
 * Customer Empty States
 *
 * Context-specific empty states for the customers module.
 */

import { Users, Search, FileText, Receipt, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyCustomersProps {
  onCreateCustomer: () => void
}

export function EmptyCustomers({ onCreateCustomer }: EmptyCustomersProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">No customers yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Start building your client base by adding your first customer.
      </p>
      <Button onClick={onCreateCustomer} className="mt-4">
        Add Your First Customer
      </Button>
    </div>
  )
}

export function EmptyCustomerSearch() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No matching customers</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Try adjusting your search or filters.
      </p>
    </div>
  )
}

// Phase-specific placeholder tabs

export function EmptyAgreementsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Agreements</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Track service agreements, pricing, and contract terms for this customer.
        Agreement management will be available in Phase 2.
      </p>
    </div>
  )
}

export function EmptyReceivablesTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Receipt className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Receivables</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Track invoices, payments, and outstanding balances for this customer.
        Financial tracking will be available in Phase 2.
      </p>
    </div>
  )
}

export function EmptyProjectsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FolderKanban className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Projects</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Manage product workflow projects and deliverables for this customer.
        Project management will be available in Phase 3.
      </p>
    </div>
  )
}
