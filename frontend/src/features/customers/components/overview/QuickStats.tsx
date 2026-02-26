/**
 * Quick Stats
 *
 * Summary cards for customer detail page overview tab.
 */

import { Briefcase, Receipt, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { TabCounts, FinancialSummary } from '../../types'
import { formatCurrency, getBalanceDirection } from '../../utils/format'

interface QuickStatsProps {
  counts: TabCounts
  financialSummary?: FinancialSummary
}

export function QuickStats({ counts, financialSummary }: QuickStatsProps) {
  const balanceDir = financialSummary ? getBalanceDirection(financialSummary.balance) : null

  const stats = [
    {
      label: 'Agreements',
      value: String(counts.agreements),
      subValue: null as string | null,
      icon: Briefcase,
      valueColor: '',
    },
    {
      label: 'Financials',
      value: financialSummary ? formatCurrency(financialSummary.total_invoiced) : String(counts.receivables),
      subValue: financialSummary ? `${formatCurrency(financialSummary.balance)} balance` : null,
      icon: Receipt,
      valueColor: '',
      subValueColor: balanceDir === 'positive' ? 'text-amber-400' : balanceDir === 'negative' ? 'text-blue-400' : 'text-green-400',
    },
    {
      label: 'Projects',
      value: String(counts.projects),
      subValue: null as string | null,
      icon: FolderKanban,
      valueColor: '',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-muted p-2">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className={cn('text-2xl font-bold text-foreground', stat.valueColor)}>
                {stat.value}
              </p>
              {stat.subValue ? (
                <p className={cn('text-xs', stat.subValueColor || 'text-muted-foreground')}>
                  {stat.subValue}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
