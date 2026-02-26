/**
 * Transaction Row
 *
 * Individual invoice/payment row in the transaction list.
 */

import { useState } from 'react'
import { FileText, CreditCard, MoreHorizontal, Pencil, Trash2, CheckCircle } from 'lucide-react'
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
import type { Receivable, InvoiceStatus } from '../../types'
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../../types'
import { formatCurrency, formatEventDate } from '../../utils/format'

interface TransactionRowProps {
  receivable: Receivable
  onEdit: (receivable: Receivable) => void
  onDelete: (id: string) => void
  onMarkPaid?: (id: string) => void
  isDeleting?: boolean
}

export function TransactionRow({ receivable, onEdit, onDelete, onMarkPaid, isDeleting }: TransactionRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isInvoice = receivable.type === 'invoice'
  const isPayment = receivable.type === 'payment'

  return (
    <>
      <div className="group flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
        {/* Type icon */}
        <div className={cn(
          'flex items-center justify-center h-9 w-9 rounded-full shrink-0',
          isInvoice && 'bg-blue-500/10 text-blue-400',
          isPayment && 'bg-green-500/10 text-green-400',
        )}>
          {isInvoice ? <FileText className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {receivable.description || (isInvoice ? 'Invoice' : 'Payment')}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {receivable.reference && (
              <span className="text-xs text-muted-foreground">#{receivable.reference}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatEventDate(receivable.date)}
            </span>
          </div>
        </div>

        {/* Amount + Status */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={cn(
            'text-sm font-medium',
            isPayment && 'text-green-400',
          )}>
            {isPayment ? '+' : ''}{formatCurrency(receivable.amount)}
          </span>

          {isInvoice && (
            <span className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              INVOICE_STATUS_COLORS[receivable.status as InvoiceStatus] || INVOICE_STATUS_COLORS.draft,
            )}>
              {INVOICE_STATUS_LABELS[receivable.status as InvoiceStatus] || receivable.status}
            </span>
          )}

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
              <DropdownMenuItem onClick={() => onEdit(receivable)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              {isInvoice && receivable.status !== 'paid' && onMarkPaid && (
                <DropdownMenuItem onClick={() => onMarkPaid(receivable.id)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-2" />
                  Mark as Paid
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

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {isInvoice ? 'Invoice' : 'Payment'}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {isInvoice ? 'invoice' : 'payment'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(receivable.id)
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
