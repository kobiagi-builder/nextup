/**
 * Customer Status Select
 *
 * Dropdown selector for changing customer status.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CustomerStatus } from '../../types'
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_COLORS } from '../../types'

interface CustomerStatusSelectProps {
  value: CustomerStatus
  onValueChange: (status: CustomerStatus) => void
  disabled?: boolean
  className?: string
}

export function CustomerStatusSelect({
  value,
  onValueChange,
  disabled,
  className,
}: CustomerStatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onValueChange(val as CustomerStatus)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent data-portal-ignore-click-outside>
        {CUSTOMER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${CUSTOMER_STATUS_COLORS[status].split(' ')[0]}`} />
              {CUSTOMER_STATUS_LABELS[status]}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
