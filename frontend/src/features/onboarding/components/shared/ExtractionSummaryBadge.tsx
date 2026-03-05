/**
 * ExtractionSummaryBadge
 *
 * Animated badge that fades in when extraction waterfall completes.
 * Shows "Found X of Y fields" with optional "+N collapsed" suffix.
 */

import { useEffect, useRef } from 'react'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExtractionSummaryBadgeProps {
  found: number
  total: number
  collapsedWithData?: number
  visible: boolean
}

export function ExtractionSummaryBadge({
  found,
  total,
  collapsedWithData = 0,
  visible,
}: ExtractionSummaryBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible && badgeRef.current) {
      badgeRef.current.focus()
    }
  }, [visible])

  if (!visible) return null

  const collapsedNote =
    collapsedWithData > 0 ? ` (+${collapsedWithData} collapsed)` : ''

  return (
    <div
      ref={badgeRef}
      tabIndex={-1}
      aria-label={`Profile data loaded. ${found} of ${total} fields extracted${collapsedNote}.`}
      className={cn(
        'inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full',
        'bg-emerald-500/10 onboarding-animate-fade-in',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        Found {found} of {total} fields{collapsedNote}
      </span>
    </div>
  )
}
