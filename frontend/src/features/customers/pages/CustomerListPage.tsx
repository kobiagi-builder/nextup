/**
 * Customer List Page
 *
 * Displays customer cards with status/ICP dropdown filters, search, and sort.
 * Filter state lives in URL params (useSearchParams).
 */

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { MultiSelectFilter } from '../components/shared/MultiSelectFilter'
import { EmptyCustomers, EmptyCustomerSearch } from '../components/shared/EmptyState'
import { NewCustomerDialog } from '../components/forms/NewCustomerDialog'
import { ImportLinkedInButton } from '../components/import/ImportLinkedInButton'
import { LinkedInImportDialog } from '../components/import/LinkedInImportDialog'
import type { CustomerStatus, CustomerFilters, IcpScore } from '../types'
import {
  CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_DOT_COLORS,
  ICP_SCORES, ICP_SCORE_LABELS, ICP_SCORE_DOT_COLORS,
} from '../types'

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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [customerToArchive, setCustomerToArchive] = useState<string | null>(null)

  // Read filters from URL (comma-separated for multi-select)
  const statusParam = searchParams.get('status') || ''
  const statusFilter: CustomerStatus[] = statusParam
    ? statusParam.split(',').filter(Boolean) as CustomerStatus[]
    : []
  const searchQuery = searchParams.get('q') || ''
  const sortBy = searchParams.get('sort') || 'updated_at'
  const icpParam = searchParams.get('icp') || ''
  const icpFilter: (IcpScore | 'not_scored')[] = icpParam
    ? icpParam.split(',').filter(Boolean) as (IcpScore | 'not_scored')[]
    : []

  const filters: CustomerFilters = {
    status: statusFilter.length > 0 ? statusFilter : null,
    search: searchQuery || undefined,
    sort: sortBy,
    icp: icpFilter.length > 0 ? icpFilter : null,
  }

  const { data: customers = [], isLoading } = useCustomers(filters)
  const updateStatus = useUpdateCustomerStatus()
  const deleteCustomer = useDeleteCustomer()

  // URL param setters
  const setStatusFilterValues = (values: string[]) => {
    setSearchParams((prev) => {
      if (values.length > 0) prev.set('status', values.join(','))
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

  const setIcpFilterValues = (values: string[]) => {
    setSearchParams((prev) => {
      if (values.length > 0) prev.set('icp', values.join(','))
      else prev.delete('icp')
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

  const hasFilters = statusFilter.length > 0 || !!searchQuery || icpFilter.length > 0
  const showEmptyState = !isLoading && customers.length === 0 && !hasFilters
  const showNoResults = !isLoading && customers.length === 0 && hasFilters

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Customers</h1>
        <div className="flex items-center gap-2">
          <ImportLinkedInButton onClick={() => setIsImportDialogOpen(true)} />
          <Button onClick={() => setIsNewDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Customer
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50">
        {/* Status filter (multi-select) */}
        <MultiSelectFilter
          label="Status"
          selected={statusFilter}
          onChange={setStatusFilterValues}
          options={CUSTOMER_STATUSES.map((s) => ({
            value: s,
            label: CUSTOMER_STATUS_LABELS[s],
            dotColor: CUSTOMER_STATUS_DOT_COLORS[s],
          }))}
        />

        {/* ICP filter (multi-select) */}
        <MultiSelectFilter
          label="ICP Score"
          selected={icpFilter}
          onChange={setIcpFilterValues}
          options={[
            ...ICP_SCORES.map((s) => ({
              value: s,
              label: ICP_SCORE_LABELS[s],
              dotColor: ICP_SCORE_DOT_COLORS[s],
            })),
            { value: 'not_scored', label: 'Not Scored', dotColor: 'bg-slate-400' },
          ]}
        />

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(val) => setSortBy(val)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent data-portal-ignore-click-outside>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <LinkedInImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />

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
