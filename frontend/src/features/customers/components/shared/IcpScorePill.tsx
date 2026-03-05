/**
 * ICP Score Pill
 *
 * Colored pill badge with chevron and dropdown for changing ICP score.
 * When no onScoreChange is provided, renders as a static badge.
 * Returns null if no score is set and no onScoreChange handler is provided.
 */

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { IcpScore } from '../../types'
import {
  ICP_SCORES,
  ICP_SCORE_LABELS,
  ICP_SCORE_COLORS,
  ICP_SCORE_DOT_COLORS,
} from '../../types'

interface IcpScorePillProps {
  score: IcpScore | null | undefined
  onScoreChange?: (score: IcpScore) => void
  size?: 'sm' | 'md'
  className?: string
}

export function IcpScorePill({
  score,
  onScoreChange,
  size = 'sm',
  className,
}: IcpScorePillProps) {
  // If no score and not editable, hide entirely
  if (!score && !onScoreChange) return null

  const pillClasses = cn(
    'inline-flex items-center rounded-full font-medium border',
    size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5',
    score
      ? ICP_SCORE_COLORS[score]
      : 'bg-muted/50 text-muted-foreground border-border',
    className
  )

  if (!onScoreChange) {
    return (
      <span className={pillClasses}>
        {score ? ICP_SCORE_LABELS[score] : 'Not scored'}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <button className={cn(pillClasses, 'cursor-pointer hover:opacity-80 transition-opacity')}>
          {score ? ICP_SCORE_LABELS[score] : 'Set ICP'}
          <ChevronDown className={cn('opacity-60', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent data-portal-ignore-click-outside align="end">
        {ICP_SCORES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onScoreChange(s); }}
            disabled={s === score}
          >
            <span className={cn('inline-block h-2 w-2 rounded-full mr-2', ICP_SCORE_DOT_COLORS[s])} />
            {ICP_SCORE_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
