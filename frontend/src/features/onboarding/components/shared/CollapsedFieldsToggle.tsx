/**
 * CollapsedFieldsToggle
 *
 * Disclosure toggle with extraction-aware copy.
 * Shows count when hidden fields have AI-extracted content.
 */

import { ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsedFieldsToggleProps {
  isExpanded: boolean
  onToggle: () => void
  collapsedFieldsWithData: number
}

export function CollapsedFieldsToggle({
  isExpanded,
  onToggle,
  collapsedFieldsWithData,
}: CollapsedFieldsToggleProps) {
  const hasHiddenData = collapsedFieldsWithData > 0

  const label = isExpanded
    ? 'Show less'
    : hasHiddenData
      ? `AI found ${collapsedFieldsWithData} more field${collapsedFieldsWithData !== 1 ? 's' : ''} — review them (optional)`
      : 'Add more detail (optional)'

  const colorClass =
    !isExpanded && hasHiddenData
      ? 'text-amber-600 dark:text-amber-400 hover:text-amber-500'
      : 'text-muted-foreground hover:text-foreground'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 text-sm transition-colors duration-150 mt-2',
        colorClass
      )}
      aria-expanded={isExpanded}
    >
      {!isExpanded && hasHiddenData && (
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <ChevronDown
        className={cn(
          'h-3.5 w-3.5 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}
        aria-hidden="true"
      />
      {label}
    </button>
  )
}
