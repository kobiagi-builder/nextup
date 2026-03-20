/**
 * Board Toolbar
 *
 * Sticky toolbar with title, customer filter, type multi-select, search, and Add Item button.
 */

import { Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelectFilter } from '@/features/customers/components/shared/MultiSelectFilter'
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import {
  ACTION_ITEM_TYPES,
  ACTION_ITEM_TYPE_LABELS,
} from '../types'

interface BoardToolbarProps {
  selectedCustomerId?: string
  onCustomerFilterChange: (customerId: string | undefined) => void
  selectedTypes: string[]
  onTypeFilterChange: (types: string[]) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onAddItem: () => void
}

export function BoardToolbar({ selectedCustomerId, onCustomerFilterChange, selectedTypes, onTypeFilterChange, searchQuery, onSearchChange, onAddItem }: BoardToolbarProps) {
  const { isEnabled: hasCustomers } = useFeatureFlag('customer_management')
  const { data: customers } = useCustomers()

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 flex items-center justify-between py-4 px-6">
      <h1 className="text-xl font-semibold text-foreground">Action Items</h1>

      <div className="flex items-center gap-3">
        {/* Free text search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-52 pl-8 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type multi-select filter */}
        <MultiSelectFilter
          label="Type"
          selected={selectedTypes}
          onChange={onTypeFilterChange}
          options={ACTION_ITEM_TYPES.map((t) => ({
            value: t,
            label: ACTION_ITEM_TYPE_LABELS[t],
          }))}
        />

        {hasCustomers && (
          <Select
            value={selectedCustomerId || '__all__'}
            onValueChange={(val) => onCustomerFilterChange(val === '__all__' ? undefined : val)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent data-portal-ignore-click-outside>
              <SelectItem value="__all__">All Customers</SelectItem>
              {(customers || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button onClick={onAddItem}>
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>
    </div>
  )
}
