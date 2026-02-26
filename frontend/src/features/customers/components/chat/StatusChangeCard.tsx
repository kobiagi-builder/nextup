/**
 * StatusChangeCard — Structured card for customer status changes
 *
 * Green-bordered card showing old → new status with reason.
 * Rendered when updateCustomerStatus tool executes successfully.
 */

import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusChangeCardProps {
  oldStatus: string
  newStatus: string
  reason: string
  className?: string
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  negotiation: 'Negotiation',
  live: 'Live',
  on_hold: 'On Hold',
  archive: 'Archive',
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1)
}

export function StatusChangeCard({ oldStatus, newStatus, reason, className }: StatusChangeCardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-green-500/20 bg-green-500/5 p-3 my-2',
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium text-green-500">Status Updated</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
          {formatStatus(oldStatus)}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">
          {formatStatus(newStatus)}
        </span>
      </div>
      {reason && (
        <p className="text-xs text-muted-foreground mt-2">{reason}</p>
      )}
    </div>
  )
}
