/**
 * ChipToggle
 *
 * Toggle chip with check animation, press feedback, and checkbox ARIA semantics.
 */

import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChipToggleProps {
  label: string
  icon?: LucideIcon
  selected: boolean
  onToggle: () => void
  id?: string
}

export function ChipToggle({ label, icon: Icon, selected, onToggle, id }: ChipToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      id={id}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg min-h-[44px]',
        'border transition-all duration-150 cursor-pointer select-none',
        'active:scale-95',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground hover:bg-secondary hover:border-border'
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'h-4 w-4 flex-shrink-0',
            selected ? 'text-primary' : 'text-muted-foreground'
          )}
          aria-hidden="true"
        />
      )}
      <span className={cn('text-sm', selected && 'font-medium')}>
        {label}
      </span>
      {selected && (
        <Check
          className="h-3.5 w-3.5 text-primary flex-shrink-0"
          aria-hidden="true"
          style={{ animation: 'onboarding-chip-check 150ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
        />
      )}
    </button>
  )
}
