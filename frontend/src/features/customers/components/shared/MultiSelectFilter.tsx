/**
 * Multi-Select Filter Dropdown
 *
 * Popover-based filter with checkboxes, used for Status and ICP filters
 * on the customer list page.
 */

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface FilterOption {
  value: string
  label: string
  dotColor?: string
}

interface MultiSelectFilterProps {
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }

  const clearAll = () => onChange([])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-xs',
            'hover:bg-accent hover:text-accent-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            selected.length > 0 && 'border-primary/50',
            className,
          )}
        >
          <span className="truncate">{label}</span>
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-[1rem] px-1 text-[10px] leading-none font-medium rounded"
            >
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-portal-ignore-click-outside
        align="start"
        className="w-48 p-1"
      >
        {selected.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors"
          >
            Clear all
          </button>
        )}
        {options.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isSelected && 'font-medium',
              )}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30',
                )}
              >
                {isSelected && <Check className="h-2.5 w-2.5" />}
              </span>
              {option.dotColor && (
                <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', option.dotColor)} />
              )}
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
