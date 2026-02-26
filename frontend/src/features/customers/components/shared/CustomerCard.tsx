/**
 * Customer Card
 *
 * Landscape card for customer list page.
 */

import { useNavigate } from 'react-router-dom'
import { MoreVertical, Clock, FileText, DollarSign, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CustomerStatus, CustomerWithSummary } from '../../types'
import { CustomerStatusBadge } from './CustomerStatusBadge'
import { CustomerStatusSelect } from './CustomerStatusSelect'
import { formatEventDate, formatCurrency } from '../../utils'

interface CustomerCardProps {
  customer: CustomerWithSummary
  onStatusChange?: (id: string, status: CustomerStatus) => void
  onDelete?: (id: string) => void
  className?: string
}

export function CustomerCard({
  customer,
  onStatusChange,
  onDelete,
  className,
}: CustomerCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/customers/${customer.id}`)
  }

  const vertical = customer.info?.vertical

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border/50 bg-card p-4',
        'transition-all duration-200 hover:border-primary/30 hover:shadow-md',
        'cursor-pointer',
        className
      )}
      onClick={handleClick}
      data-testid="customer-card"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
          {vertical && (
            <span className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {vertical}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CustomerStatusBadge status={customer.status} />

          {/* Status quick-change (visible on hover) */}
          <div
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {onStatusChange && (
              <CustomerStatusSelect
                value={customer.status}
                onValueChange={(status) => onStatusChange(customer.id, status)}
                className="h-7 w-[130px] text-xs"
              />
            )}
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-portal-ignore-click-outside>
              <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/customers/${customer.id}`); }}>
                View Details
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(customer.id); }}
                    className="text-destructive"
                  >
                    Archive
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* About preview */}
      {customer.info?.about && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
          {customer.info.about}
        </p>
      )}

      {/* Metrics row */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1" title="Active agreements">
          <FileText className="h-3 w-3" />
          {customer.active_agreements_count || '\u2014'}
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            customer.outstanding_balance > 0 && 'text-amber-500 dark:text-amber-400'
          )}
          title="Outstanding balance"
        >
          <DollarSign className="h-3 w-3" />
          {customer.outstanding_balance > 0
            ? formatCurrency(customer.outstanding_balance)
            : '\u2014'}
        </span>
        <span className="flex items-center gap-1" title="Active projects">
          <FolderOpen className="h-3 w-3" />
          {customer.active_projects_count || '\u2014'}
        </span>
        <span className="flex items-center gap-1 ml-auto" title="Last activity">
          <Clock className="h-3 w-3" />
          {customer.last_activity ? formatEventDate(customer.last_activity) : formatEventDate(customer.updated_at)}
        </span>
      </div>
    </div>
  )
}
