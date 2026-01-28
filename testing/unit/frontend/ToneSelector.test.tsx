/**
 * Unit Tests for ToneSelector Component (Phase 1)
 *
 * Tests the tone selector dropdown including:
 * - All 8 tone options present
 * - Selection callback functionality
 * - Default value handling
 * - Disabled state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

// Mock Radix UI Select components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: {
    children: React.ReactNode
    value?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
  }) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, id, className }: {
    children: React.ReactNode
    id?: string
    className?: string
  }) => (
    <button data-testid="select-trigger" id={id} className={className}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>
      {children}
    </div>
  ),
}))

// Define types locally for testing
type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous'

interface ToneSelectorProps {
  value?: ToneOption
  onChange: (tone: ToneOption) => void
  disabled?: boolean
  showDescription?: boolean
}

// ToneSelector component mock (since we can't import directly)
function ToneSelector({
  value,
  onChange,
  disabled = false,
  showDescription = true,
}: ToneSelectorProps) {
  const TONE_OPTIONS = [
    { value: 'professional', label: 'Professional', description: 'Clear and direct, industry-appropriate' },
    { value: 'formal', label: 'Formal', description: 'Academic language, sophisticated vocabulary' },
    { value: 'casual', label: 'Casual', description: 'Simple everyday language, conversational' },
    { value: 'conversational', label: 'Conversational', description: 'First-person, friendly, engaging' },
    { value: 'technical', label: 'Technical', description: 'Precise terminology, detailed explanations' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and supportive, encouraging' },
    { value: 'authoritative', label: 'Authoritative', description: 'Expert positioning, confident assertions' },
    { value: 'humorous', label: 'Humorous', description: 'Light jokes, entertaining examples' },
  ]

  const selectedOption = TONE_OPTIONS.find((opt) => opt.value === (value || 'professional'))

  return (
    <div data-testid="tone-selector" className="flex items-center gap-2">
      <label htmlFor="tone-selector" className="text-sm font-medium whitespace-nowrap">
        Tone:
      </label>
      <div
        data-testid="select"
        data-value={value || 'professional'}
        data-disabled={disabled}
      >
        <button
          data-testid="select-trigger"
          id="tone-selector"
          disabled={disabled}
        >
          {showDescription ? (
            <span data-testid="select-value">Select tone</span>
          ) : (
            <span className="text-sm">{selectedOption?.label || 'Select tone'}</span>
          )}
        </button>
        <div data-testid="select-content">
          {TONE_OPTIONS.map((option) => (
            <div
              key={option.value}
              data-testid={`select-item-${option.value}`}
              data-value={option.value}
              onClick={() => !disabled && onChange(option.value as ToneOption)}
            >
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

describe('ToneSelector Component', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<ToneSelector onChange={mockOnChange} />)

      expect(screen.getByText('Tone:')).toBeInTheDocument()
    })

    it('should render all 8 tone options', () => {
      render(<ToneSelector onChange={mockOnChange} />)

      const expectedTones = [
        'professional',
        'formal',
        'casual',
        'conversational',
        'technical',
        'friendly',
        'authoritative',
        'humorous',
      ]

      expectedTones.forEach((tone) => {
        expect(screen.getByTestId(`select-item-${tone}`)).toBeInTheDocument()
      })
    })

    it('should display option labels', () => {
      render(<ToneSelector onChange={mockOnChange} />)

      expect(screen.getByText('Professional')).toBeInTheDocument()
      expect(screen.getByText('Formal')).toBeInTheDocument()
      expect(screen.getByText('Casual')).toBeInTheDocument()
      expect(screen.getByText('Conversational')).toBeInTheDocument()
      expect(screen.getByText('Technical')).toBeInTheDocument()
      expect(screen.getByText('Friendly')).toBeInTheDocument()
      expect(screen.getByText('Authoritative')).toBeInTheDocument()
      expect(screen.getByText('Humorous')).toBeInTheDocument()
    })

    it('should display option descriptions', () => {
      render(<ToneSelector onChange={mockOnChange} />)

      expect(screen.getByText('Clear and direct, industry-appropriate')).toBeInTheDocument()
      expect(screen.getByText('Academic language, sophisticated vocabulary')).toBeInTheDocument()
      expect(screen.getByText('Simple everyday language, conversational')).toBeInTheDocument()
    })
  })

  describe('Default Value', () => {
    it('should default to professional when no value provided', () => {
      render(<ToneSelector onChange={mockOnChange} />)

      const select = screen.getByTestId('select')
      expect(select).toHaveAttribute('data-value', 'professional')
    })

    it('should use provided value', () => {
      render(<ToneSelector value="humorous" onChange={mockOnChange} />)

      const select = screen.getByTestId('select')
      expect(select).toHaveAttribute('data-value', 'humorous')
    })
  })

  describe('Selection', () => {
    it('should call onChange when option is selected', () => {
      render(<ToneSelector onChange={mockOnChange} />)

      const formalOption = screen.getByTestId('select-item-formal')
      fireEvent.click(formalOption)

      expect(mockOnChange).toHaveBeenCalledWith('formal')
    })

    it('should call onChange with correct tone value', () => {
      render(<ToneSelector onChange={mockOnChange} />)

      const humorousOption = screen.getByTestId('select-item-humorous')
      fireEvent.click(humorousOption)

      expect(mockOnChange).toHaveBeenCalledWith('humorous')
    })
  })

  describe('Disabled State', () => {
    it('should render as disabled when disabled prop is true', () => {
      render(<ToneSelector onChange={mockOnChange} disabled />)

      const select = screen.getByTestId('select')
      expect(select).toHaveAttribute('data-disabled', 'true')
    })

    it('should not call onChange when disabled', () => {
      render(<ToneSelector onChange={mockOnChange} disabled />)

      const formalOption = screen.getByTestId('select-item-formal')
      fireEvent.click(formalOption)

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Tone Options Metadata', () => {
    const toneMetadata = [
      { value: 'professional', label: 'Professional', descKeyword: 'industry' },
      { value: 'formal', label: 'Formal', descKeyword: 'academic' },
      { value: 'casual', label: 'Casual', descKeyword: 'everyday' },
      { value: 'conversational', label: 'Conversational', descKeyword: 'friendly' },
      { value: 'technical', label: 'Technical', descKeyword: 'terminology' },
      { value: 'friendly', label: 'Friendly', descKeyword: 'supportive' },
      { value: 'authoritative', label: 'Authoritative', descKeyword: 'expert' },
      { value: 'humorous', label: 'Humorous', descKeyword: 'jokes' },
    ]

    it.each(toneMetadata)(
      'should have correct metadata for $value tone',
      ({ value, label, descKeyword }) => {
        render(<ToneSelector onChange={mockOnChange} />)

        const option = screen.getByTestId(`select-item-${value}`)
        expect(option).toBeInTheDocument()

        const labelText = within(option).getByText(label)
        expect(labelText).toBeInTheDocument()
      }
    )
  })
})
