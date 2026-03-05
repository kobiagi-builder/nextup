/**
 * Customer Card
 *
 * Landscape card for customer list page.
 * Layout:
 *   Row 1: Company name | STATUS: <pill> | kebab menu
 *   Row 2: ICP SCORE: <badge>
 *   Row 3: BALANCE: agreements, outstanding, projects
 *   Row 4: ACTION ITEMS: <icon> count
 *   Row 5: Next action item (2-line wrap, vertically centered icon + date)
 */

import { useNavigate } from 'react-router-dom'
import { MoreVertical, FileText, DollarSign, FolderOpen, ListChecks, CircleArrowRight, CalendarDays, Linkedin, Globe } from 'lucide-react'
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
import { IcpScorePill } from './IcpScorePill'
import { formatCurrency } from '../../utils'

interface CustomerCardProps {
  customer: CustomerWithSummary
  onStatusChange?: (id: string, status: CustomerStatus) => void
  onIcpScoreChange?: (id: string, score: IcpScore) => void
  onDelete?: (id: string) => void
  className?: string
}

export function CustomerCard({
  customer,
  onStatusChange,
  onIcpScoreChange,
  onDelete,
  className,
}: CustomerCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/customers/${customer.id}`)
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border/50 bg-card p-5',
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

      {/* Row 2: ICP SCORE */}
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide font-medium">ICP Score:</span>
        <IcpScorePill
          score={(customer.info?.icp_score as IcpScore) ?? null}
          onScoreChange={onIcpScoreChange ? (s) => onIcpScoreChange(customer.id, s) : undefined}
        />
      </div>

      {/* URL links */}
      {(customer.info?.linkedin_company_url || customer.info?.website_url) && (
        <div className="mt-3 flex items-center gap-3">
          {customer.info.linkedin_company_url && (
            <a
              href={customer.info.linkedin_company_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px] underline underline-offset-2">
                {customer.info.linkedin_company_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </span>
            </a>
          )}
          {customer.info.website_url && (
            <a
              href={customer.info.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px] underline underline-offset-2">
                {(() => { try { return new URL(customer.info.website_url).hostname.replace('www.', '') } catch { return customer.info.website_url } })()}
              </span>
            </a>
          )}
        </div>
      )}

      {/* Row 3: BALANCE */}
      <div className="mt-3.5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide font-medium">Balance:</span>
        <span className="flex items-center gap-1" title="Active agreements">
          <FileText className="h-3 w-3" aria-hidden="true" />
          {customer.active_agreements_count || '\u2014'}
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            customer.outstanding_balance > 0 && 'text-amber-500 dark:text-amber-400'
          )}
          title="Outstanding balance"
        >
          <DollarSign className="h-3 w-3" aria-hidden="true" />
          {customer.outstanding_balance > 0
            ? formatCurrency(customer.outstanding_balance)
            : '\u2014'}
        </span>
        <span className="flex items-center gap-1" title="Active projects">
          <FolderOpen className="h-3 w-3" aria-hidden="true" />
          {customer.active_projects_count || '\u2014'}
        </span>
      </div>

      {/* Row 4: ACTION ITEMS */}
      <div className="mt-3.5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide font-medium">Action Items:</span>
        <span className="flex items-center gap-1">
          <ListChecks className="h-3 w-3" aria-hidden="true" />
          {customer.action_items_count || '\u2014'}
        </span>
      </div>

      {/* Row 5: Next action item (only if todo/in_progress exists) */}
      {customer.next_action_description && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-2">
          <CircleArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden="true" />
          <p className="text-xs text-foreground/80 min-w-0 flex-1 line-clamp-2">{customer.next_action_description}</p>
          {customer.next_action_due_date && (
            <span className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {new Date(customer.next_action_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
