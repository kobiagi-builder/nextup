/**
 * Customer Card
 *
 * Landscape card for customer list page.
 * Layout:
 *   Row 1: Company name | STATUS: <pill> | kebab menu
 *   Row 2: VERTICAL: <pill> | ICP RANK: <badge>
 *   Row 3: metrics icons (agreements, balance, projects, action items) | timestamp
 */

import { useNavigate } from 'react-router-dom'
import { MoreVertical, Clock, FileText, DollarSign, FolderOpen, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CustomerStatus, CustomerWithSummary, IcpScore } from '../../types'
import { CustomerStatusPill } from './CustomerStatusPill'
import { IcpScoreBadge } from './IcpScoreBadge'
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
      {/* Row 1: Company name | STATUS: pill | kebab */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground truncate min-w-0">{customer.name}</h3>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status:</span>
            <CustomerStatusPill
              status={customer.status}
              onStatusChange={onStatusChange ? (s) => onStatusChange(customer.id, s) : undefined}
            />
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
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

      {/* Row 2: VERTICAL + ICP RANK */}
      <div className="mt-2 flex items-center gap-4">
        {vertical && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Vertical:</span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {vertical}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">ICP Rank:</span>
          <IcpScoreBadge score={(customer.info?.icp_score as IcpScore) ?? null} />
        </div>
      </div>

      {/* Row 3: Metrics + timestamp */}
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
        <span className="flex items-center gap-1" title="Action items">
          <ListChecks className="h-3 w-3" />
          {customer.action_items_count || '\u2014'}
        </span>
        <span className="flex items-center gap-1 ml-auto" title="Last activity">
          <Clock className="h-3 w-3" />
          {customer.last_activity ? formatEventDate(customer.last_activity) : formatEventDate(customer.updated_at)}
        </span>
      </div>
    </div>
  )
}
