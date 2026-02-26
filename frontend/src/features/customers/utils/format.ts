/**
 * Customer-specific formatters
 */

import type { Agreement, AgreementPricing, AgreementStatus } from '../types/customer'

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
 * Compute agreement status from dates and override.
 * Override takes precedence, then computed from start/end dates.
 */
export function getAgreementStatus(agreement: Agreement): AgreementStatus {
  if (agreement.override_status === 'terminated') return 'terminated'
  if (agreement.override_status === 'suspended') return 'suspended'

  const now = new Date()
  const start = agreement.start_date ? new Date(agreement.start_date) : null
  const end = agreement.end_date ? new Date(agreement.end_date) : null

  if (start && start > now) return 'upcoming'
  if (end && end < now) return 'expired'
  if (start && !end) return 'open_ended'
  if (start && end) return 'active'

  return 'open_ended'
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
