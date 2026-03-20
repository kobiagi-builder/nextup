/**
 * AiExtractedBadge
 *
 * Per-field badge showing AI extraction provenance.
 * Green badge with Sparkles icon for AI-extracted fields.
 */

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AiExtractedBadge() {
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
