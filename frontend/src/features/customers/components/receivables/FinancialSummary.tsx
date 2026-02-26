/**
 * Financial Summary
 *
 * 3-column summary card: Total Invoiced, Total Paid, Outstanding.
 * Amounts come as strings from backend for NUMERIC precision.
 */

import { cn } from '@/lib/utils'
import { formatCurrency, getBalanceDirection } from '../../utils/format'
import type { FinancialSummary as FinancialSummaryType } from '../../types'

interface FinancialSummaryProps {
  summary: FinancialSummaryType | undefined
  isLoading?: boolean
}

export function FinancialSummary({ summary, isLoading }: FinancialSummaryProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-muted rounded w-20 mb-2" />
              <div className="h-6 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const totalInvoiced = summary?.total_invoiced ?? '0'
  const totalPaid = summary?.total_paid ?? '0'
  const balance = summary?.balance ?? '0'
  const balanceDirection = getBalanceDirection(balance)

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Total Invoiced */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Invoiced</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>

        {/* Total Paid */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="text-lg font-semibold text-green-400">
            {formatCurrency(totalPaid)}
          </p>
        </div>

        {/* Outstanding */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {balanceDirection === 'negative' ? 'Credit' : 'Outstanding'}
          </p>
          <p className={cn(
            'text-lg font-semibold',
            balanceDirection === 'positive' && 'text-amber-400',
            balanceDirection === 'negative' && 'text-blue-400',
            balanceDirection === 'zero' && 'text-green-400',
          )}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  )
}
