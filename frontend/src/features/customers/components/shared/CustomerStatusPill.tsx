/**
 * Customer Status Pill
 *
 * Colored pill badge with chevron and dropdown for changing customer status.
 * When no onStatusChange is provided, renders as a static badge.
 */

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CustomerStatus } from '../../types'
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_COLORS,
  CUSTOMER_STATUS_DOT_COLORS,
} from '../../types'

interface CustomerStatusPillProps {
  status: CustomerStatus
  onStatusChange?: (status: CustomerStatus) => void
  size?: 'sm' | 'md'
  className?: string
}

export function CustomerStatusPill({
  status,
  onStatusChange,
  size = 'sm',
  className,
}: CustomerStatusPillProps) {
  const pillClasses = cn(
    'inline-flex items-center rounded-full font-medium',
    size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5',
    CUSTOMER_STATUS_COLORS[status],
    className
  )

  if (!onStatusChange) {
    return (
      <span className={pillClasses}>
        {CUSTOMER_STATUS_LABELS[status]}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <button className={cn(pillClasses, 'cursor-pointer hover:opacity-80 transition-opacity')}>
          {CUSTOMER_STATUS_LABELS[status]}
          <ChevronDown className={cn('opacity-60', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent data-portal-ignore-click-outside align="end">
        {CUSTOMER_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onStatusChange(s); }}
            disabled={s === status}
          >
            <span className={cn('inline-block h-2 w-2 rounded-full mr-2', CUSTOMER_STATUS_DOT_COLORS[s])} />
            {CUSTOMER_STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
