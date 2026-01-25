/**
 * Format Utilities
 *
 * Formatting helpers for dates, numbers, and strings.
 */

import type { DateString } from '../types/portfolio'

/**
 * Format a date string to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: DateString): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) {
    return 'just now'
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`
  }
  if (diffWeek < 4) {
    return `${diffWeek}w ago`
  }
  if (diffMonth < 12) {
    return `${diffMonth}mo ago`
  }
  return formatDate(dateString)
}

/**
 * Format a date string to a readable date
 */
export function formatDate(dateString: DateString): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date string to a readable date and time
 */
export function formatDateTime(dateString: DateString): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(text: string, wordsPerMinute = 200): number {
  const words = stripHtml(text).split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Format percentage (0-1 to "XX%")
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}
