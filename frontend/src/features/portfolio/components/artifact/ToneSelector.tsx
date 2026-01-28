/**
 * ToneSelector Component (Phase 1)
 *
 * Dropdown to select content tone/voice (8 options).
 * Applied during skeleton generation to match user's desired style.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import type { ToneOption } from '../../types/portfolio'

// =============================================================================
// Types
// =============================================================================

export interface ToneSelectorProps {
  value?: ToneOption
  onChange: (tone: ToneOption) => void
  disabled?: boolean
  /** Layout style: 'vertical' for forms, 'horizontal' for toolbars */
  layout?: 'vertical' | 'horizontal'
}

// =============================================================================
// Tone Options Configuration
// =============================================================================

const TONE_OPTIONS: { value: ToneOption; label: string; description: string }[] = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Clear and direct, industry-appropriate'
  },
  {
    value: 'formal',
    label: 'Formal',
    description: 'Academic language, sophisticated vocabulary'
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Simple everyday language, conversational'
  },
  {
    value: 'conversational',
    label: 'Conversational',
    description: 'First-person, friendly, engaging'
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Precise terminology, detailed explanations'
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and supportive, encouraging'
  },
  {
    value: 'authoritative',
    label: 'Authoritative',
    description: 'Expert positioning, confident assertions'
  },
  {
    value: 'humorous',
    label: 'Humorous',
    description: 'Light jokes, entertaining examples'
  },
]

// =============================================================================
// Component
// =============================================================================

export function ToneSelector({
  value,
  onChange,
  disabled = false,
  layout = 'vertical',
}: ToneSelectorProps) {
  const selectedOption = TONE_OPTIONS.find((opt) => opt.value === (value || 'professional'))

  const isHorizontal = layout === 'horizontal'

  return (
    <div className={isHorizontal ? 'flex items-center gap-2' : 'space-y-2'}>
      <label
        htmlFor="tone-selector"
        className={isHorizontal ? 'text-sm font-medium whitespace-nowrap' : 'text-sm font-medium'}
      >
        Tone{isHorizontal ? ':' : ''}
      </label>
      <Select
        value={value || 'professional'}
        onValueChange={(value) => onChange(value as ToneOption)}
        disabled={disabled}
      >
        <SelectTrigger id="tone-selector" className={isHorizontal ? 'w-[180px]' : undefined}>
          <span>{selectedOption?.label || 'Select tone'}</span>
        </SelectTrigger>
        <SelectContent data-portal-ignore-click-outside>
          {TONE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default ToneSelector
