/**
 * Agreement Card
 *
 * Displays a single agreement with scope, computed status, type, dates, pricing, and actions.
 */

import { useState } from 'react'
import { Calendar, DollarSign, MoreHorizontal, Pencil, Trash2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { Agreement } from '../../types'
import {
  AGREEMENT_TYPE_LABELS,
  AGREEMENT_STATUS_LABELS,
  AGREEMENT_STATUS_COLORS,
} from '../../types'
import { getAgreementStatus, formatPricing, formatDateRange } from '../../utils/format'

interface AgreementCardProps {
  agreement: Agreement
  onEdit: (agreement: Agreement) => void
  onDelete: (id: string) => void
  onTerminate: (id: string) => void
  isDeleting?: boolean
}

export function AgreementCard({ agreement, onEdit, onDelete, onTerminate, isDeleting }: AgreementCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const status = getAgreementStatus(agreement)
  const statusLabel = AGREEMENT_STATUS_LABELS[status]
  const statusColor = AGREEMENT_STATUS_COLORS[status]
  const typeLabel = AGREEMENT_TYPE_LABELS[agreement.type] || agreement.type

  return (
    <>
      <div className="group rounded-lg border border-border/50 bg-card p-5 space-y-3 hover:border-border transition-colors">
        {/* Row 1: Scope + Status badge */}
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-medium text-foreground line-clamp-1">{agreement.scope}</h4>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', statusColor)}>
              {statusLabel}
            </span>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-portal-ignore-click-outside align="end">
                <DropdownMenuItem onClick={() => onEdit(agreement)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                {status !== 'terminated' && (
                  <DropdownMenuItem onClick={() => onTerminate(agreement.id)}>
                    <XCircle className="h-3.5 w-3.5 mr-2" />
                    Terminate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: Type label */}
        <p className="text-xs text-muted-foreground">{typeLabel}</p>

        {/* Row 3: Date range + Pricing */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateRange(agreement.start_date, agreement.end_date)}
          </span>
          {agreement.pricing && agreement.pricing.amount > 0 && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {formatPricing(agreement.pricing)}
            </span>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this agreement. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(agreement.id)
                setShowDeleteConfirm(false)
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
