/**
 * Board Toolbar
 *
 * Sticky toolbar with title, customer filter, and Add Item button.
 */

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import { useCustomers } from '@/features/customers/hooks/useCustomers'

interface BoardToolbarProps {
  selectedCustomerId?: string
  onCustomerFilterChange: (customerId: string | undefined) => void
  onAddItem: () => void
}

export function BoardToolbar({ selectedCustomerId, onCustomerFilterChange, onAddItem }: BoardToolbarProps) {
  const { isEnabled: hasCustomers } = useFeatureFlag('customer_management')
  const { data: customers } = useCustomers()

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 flex items-center justify-between py-4 px-6">
      <h1 className="text-xl font-semibold text-foreground">Action Items</h1>

      <div className="flex items-center gap-3">
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
