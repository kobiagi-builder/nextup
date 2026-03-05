/**
 * AiExtractedBadge
 *
 * Per-field badge with provenance-driven states.
 * - 'extracted': green badge with Sparkles icon
 * - 'needs-input': amber badge with PenLine icon
 */

import { Sparkles, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiExtractedBadgeProps {
  variant: 'extracted' | 'needs-input'
}

export function AiExtractedBadge({ variant }: AiExtractedBadgeProps) {
  if (variant === 'extracted') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
          'bg-emerald-500/10',
          'onboarding-animate-badge-enter'
        )}
      >
        <Sparkles className="h-3 w-3 text-emerald-500 flex-shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          AI extracted
        </span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-amber-500/10',
        'onboarding-animate-fade-in'
      )}
    >
      <PenLine className="h-3 w-3 text-amber-500 flex-shrink-0" aria-hidden="true" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Add your details
      </span>
    </span>
  )
}
