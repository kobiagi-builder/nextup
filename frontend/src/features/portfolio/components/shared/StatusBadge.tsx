/**
 * Status Badge Component
 *
 * Displays artifact or topic status with appropriate styling.
 */

import { cn } from '@/lib/utils'
import type { ArtifactStatus } from '../../types/portfolio'
import { STATUS_COLORS, STATUS_LABELS } from '../../validators'

interface StatusBadgeProps {
  status: ArtifactStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Badge component for displaying status with color coding
 */
export function StatusBadge({
  status,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium border',
        STATUS_COLORS[status],
        sizeClasses[size],
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
