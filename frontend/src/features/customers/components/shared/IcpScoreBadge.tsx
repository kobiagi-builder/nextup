/**
 * ICP Score Badge
 *
 * Pill badge displaying the ICP correlation level.
 * Returns null if no score is set.
 */

import { cn } from '@/lib/utils'
import { ICP_SCORE_COLORS, ICP_SCORE_LABELS } from '../../types'
import type { IcpScore } from '../../types'

interface IcpScoreBadgeProps {
  score: IcpScore | null | undefined
  className?: string
}

export function IcpScoreBadge({ score, className }: IcpScoreBadgeProps) {
  if (!score) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        ICP_SCORE_COLORS[score],
        className
      )}
    >
      {ICP_SCORE_LABELS[score]}
    </span>
  )
}
