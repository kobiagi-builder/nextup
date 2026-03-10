/**
 * Customer-specific formatters
 */

import type { AgreementPricing } from '../types/customer'

/**
 * Format currency amount with symbol.
 * Accepts number or string (backend returns NUMERIC as string for precision).
 */
export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format agreement pricing for display.
 * e.g. "$5,000/month" or "$15,000 fixed"
 */
const FREQ_DISPLAY: Record<string, string> = {
  monthly: 'month',
  quarterly: 'quarter',
  annually: 'year',
}

export function formatPricing(pricing: AgreementPricing, currency = 'USD'): string {
  const amount = formatCurrency(pricing.amount, pricing.currency || currency)
  const freq = pricing.frequency

  if (freq === 'one_time' || freq === 'fixed') return `${amount} fixed`
  if (freq === 'per_milestone') return `${amount}/milestone`

  return `${amount}/${FREQ_DISPLAY[freq] ?? freq}`
}

/**
 * Format date range for agreement display.
 * e.g. "Jan 2026 → Jun 2026" or "Jan 2026 → Ongoing"
 */
export function formatDateRange(start: string | null, end: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }

  if (!start && !end) return 'No dates set'
  if (start && !end) {
    return `${new Date(start).toLocaleDateString('en-US', opts)} → Ongoing`
  }
  if (!start && end) {
    return `Until ${new Date(end).toLocaleDateString('en-US', opts)}`
  }

  return `${new Date(start!).toLocaleDateString('en-US', opts)} → ${new Date(end!).toLocaleDateString('en-US', opts)}`
}

/**
 * Determine balance direction for styling.
 */
export function getBalanceDirection(balance: string): 'positive' | 'negative' | 'zero' {
  const num = parseFloat(balance)
  if (isNaN(num) || num === 0) return 'zero'
  return num > 0 ? 'positive' : 'negative'
}

/**
 * Format event date for timeline display.
 * Shows relative time for recent events, full date for older ones.
 */
/**
 * Due date urgency levels for color coding.
 */
export type DueDateUrgency = 'overdue' | 'urgent' | 'soon' | 'normal' | 'done'

const URGENCY_CLASSES: Record<DueDateUrgency, string> = {
  overdue: 'text-red-600',
  urgent: 'text-orange-500',
  soon: 'text-yellow-600',
  normal: 'text-muted-foreground',
  done: 'text-muted-foreground',
}

export function getDueDateUrgency(
  dateStr: string,
  status?: string
): { urgency: DueDateUrgency; className: string } {
  if (status === 'done' || status === 'cancelled' || status === 'on_hold') {
    return { urgency: 'done', className: URGENCY_CLASSES.done }
  }

  const today = new Date(new Date().toDateString())
  const due = new Date(dateStr + 'T00:00:00')
  const diffMs = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { urgency: 'overdue', className: URGENCY_CLASSES.overdue }
  if (diffDays <= 1) return { urgency: 'urgent', className: URGENCY_CLASSES.urgent }
  if (diffDays <= 3) return { urgency: 'soon', className: URGENCY_CLASSES.soon }
  return { urgency: 'normal', className: URGENCY_CLASSES.normal }
}

/**
 * Format a YYYY-MM-DD due date for display.
 */
export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format a YYYY-MM-DD due date for short display (no year).
 */
export function formatDueDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`
    }
    return `${diffHours}h ago`
  }

  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
