/**
 * Customer List Page
 *
 * Displays customer cards with status filter pills, search, and sort.
 * Filter state lives in URL params (useSearchParams).
 */

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCustomers, useUpdateCustomerStatus, useDeleteCustomer } from '../hooks'
import { CustomerCard } from '../components/shared/CustomerCard'
import { CustomerCardSkeleton } from '../components/shared/CustomerCardSkeleton'
import { EmptyCustomers, EmptyCustomerSearch } from '../components/shared/EmptyState'
import { NewCustomerDialog } from '../components/forms/NewCustomerDialog'
import type { CustomerStatus, CustomerFilters } from '../types'
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS } from '../types'

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'created_at', label: 'Created' },
  { value: 'status', label: 'Status' },
  { value: 'last_activity', label: 'Last Activity' },
  { value: 'outstanding_balance', label: 'Outstanding Balance' },
]

export function CustomerListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [customerToArchive, setCustomerToArchive] = useState<string | null>(null)

  // Read filters from URL
  const statusFilter = (searchParams.get('status') as CustomerStatus | null) || null
  const searchQuery = searchParams.get('q') || ''
  const sortBy = searchParams.get('sort') || 'updated_at'

  const filters: CustomerFilters = {
    status: statusFilter,
    search: searchQuery || undefined,
    sort: sortBy,
  }

  const { data: customers = [], isLoading } = useCustomers(filters)
  const updateStatus = useUpdateCustomerStatus()
  const deleteCustomer = useDeleteCustomer()

  // URL param setters
  const setStatusFilter = (status: CustomerStatus | null) => {
    setSearchParams((prev) => {
      if (status) prev.set('status', status)
      else prev.delete('status')
      return prev
    })
  }

  const setSearchQuery = (q: string) => {
    setSearchParams((prev) => {
      if (q) prev.set('q', q)
      else prev.delete('q')
      return prev
    })
  }

  const setSortBy = (sort: string) => {
    setSearchParams((prev) => {
      if (sort && sort !== 'updated_at') prev.set('sort', sort)
      else prev.delete('sort')
      return prev
    })
  }

  const handleStatusChange = async (id: string, status: CustomerStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status })
      toast({ title: `Status updated to ${CUSTOMER_STATUS_LABELS[status]}` })
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleDelete = (id: string) => {
    setCustomerToArchive(id)
  }

  const confirmArchive = async () => {
    if (!customerToArchive) return
    try {
      await deleteCustomer.mutateAsync(customerToArchive)
      toast({ title: 'Customer archived' })
    } catch {
      toast({ title: 'Failed to archive customer', variant: 'destructive' })
    } finally {
      setCustomerToArchive(null)
    }
  }

  const hasFilters = !!statusFilter || !!searchQuery
  const showEmptyState = !isLoading && customers.length === 0 && !hasFilters
  const showNoResults = !isLoading && customers.length === 0 && hasFilters

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Customers</h1>
        <Button onClick={() => setIsNewDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      {/* Filters bar */}
      <div className="px-6 py-3 border-b border-border/50 space-y-3">
        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              !statusFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All
          </button>
          {CUSTOMER_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {CUSTOMER_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <CustomerCardSkeleton key={i} />
            ))}
          </div>
        )}

        {showEmptyState && <EmptyCustomers onCreateCustomer={() => setIsNewDialogOpen(true)} />}
        {showNoResults && <EmptyCustomerSearch />}

        {!isLoading && customers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <NewCustomerDialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen} />

      <AlertDialog open={!!customerToArchive} onOpenChange={(open) => !open && setCustomerToArchive(null)}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the customer and their data. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
