/**
 * Customer Status Badge
 *
 * Color-coded badge for customer statuses.
 */

import { cn } from '@/lib/utils'
import type { CustomerStatus } from '../../types'
import { CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_COLORS } from '../../types'

interface CustomerStatusBadgeProps {
  status: CustomerStatus
  size?: 'sm' | 'md'
  className?: string
}

export function CustomerStatusBadge({ status, size = 'sm', className }: CustomerStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        CUSTOMER_STATUS_COLORS[status],
        className
      )}
    >
      {CUSTOMER_STATUS_LABELS[status]}
    </span>
  )
}
