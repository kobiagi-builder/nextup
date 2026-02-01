/**
 * WritingCharacteristicsDisplay Component (Phase 4)
 *
 * Displays writing characteristics grouped by source.
 * Shows value, confidence, and reasoning for each characteristic.
 */

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Blend,
  Settings,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type {
  ArtifactWritingCharacteristics,
  WritingCharacteristicValue,
} from '../../types/portfolio'

// =============================================================================
// Types
// =============================================================================

interface WritingCharacteristicsDisplayProps {
  characteristics: ArtifactWritingCharacteristics
  className?: string
}

// Source icons and labels
const SOURCE_CONFIG = {
  artifact: {
    icon: FileText,
    label: 'From Artifact',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  examples: {
    icon: User,
    label: 'From Your Examples',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  mix: {
    icon: Blend,
    label: 'Combined Analysis',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  default: {
    icon: Settings,
    label: 'Default',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
}

// =============================================================================
// Sub-Components
// =============================================================================

interface CharacteristicItemProps {
  name: string
  value: WritingCharacteristicValue
}

function CharacteristicItem({ name, value }: CharacteristicItemProps) {
  const sourceConfig = SOURCE_CONFIG[value.source] || SOURCE_CONFIG.default
  const SourceIcon = sourceConfig.icon

  // Format the display value
  const displayValue = Array.isArray(value.value)
    ? value.value.join(', ')
    : String(value.value)

  // Confidence percentage
  const confidencePercent = Math.round(value.confidence * 100)
  const confidenceColor =
    confidencePercent >= 80
      ? 'text-green-500'
      : confidencePercent >= 60
      ? 'text-amber-500'
      : 'text-red-500'

  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
      {/* Source icon */}
      <div
        className={cn(
          'p-1.5 rounded',
          sourceConfig.bgColor
        )}
      >
        <SourceIcon className={cn('h-3 w-3', sourceConfig.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium capitalize">
            {name.replace(/_/g, ' ')}
          </span>
          <span className={cn('text-[10px] font-semibold', confidenceColor)}>
            {confidencePercent}%
          </span>
        </div>
        <p className="text-sm text-foreground truncate" title={displayValue}>
          {displayValue}
        </p>
        {value.reasoning && (
          <div
            className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 cursor-help"
            title={value.reasoning}
          >
            <Info className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{value.reasoning}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface CharacteristicsGroupProps {
  source: keyof typeof SOURCE_CONFIG
  characteristics: Array<{ name: string; value: WritingCharacteristicValue }>
}

function CharacteristicsGroup({
  source,
  characteristics,
}: CharacteristicsGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const config = SOURCE_CONFIG[source]
  const Icon = config.icon

  if (characteristics.length === 0) return null

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left py-1 hover:bg-muted/30 rounded px-1"
      >
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className="text-xs font-semibold uppercase tracking-wide flex-1">
          {config.label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          ({characteristics.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 ml-2">
          {characteristics.map(({ name, value }) => (
            <CharacteristicItem key={name} name={name} value={value} />
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function WritingCharacteristicsDisplay({
  characteristics,
  className,
}: WritingCharacteristicsDisplayProps) {
  // Group characteristics by source
  const grouped = Object.entries(characteristics.characteristics).reduce(
    (acc, [name, value]) => {
      const source = value.source || 'default'
      if (!acc[source]) acc[source] = []
      acc[source].push({ name, value })
      return acc
    },
    {} as Record<string, Array<{ name: string; value: WritingCharacteristicValue }>>
  )

  // Sort groups: examples first, then artifact, then mix, then default
  const sourceOrder: Array<keyof typeof SOURCE_CONFIG> = [
    'examples',
    'artifact',
    'mix',
    'default',
  ]

  return (
    <Card className={cn('p-4', className)} data-testid="writing-characteristics-display">
      <div className="space-y-4">
        {/* Header with summary */}
        <div>
          <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
            Writing Characteristics
            <span className="text-[10px] font-normal text-muted-foreground">
              ({Object.keys(characteristics.characteristics).length} analyzed)
            </span>
          </h4>
          {characteristics.summary && (
            <p className="text-xs text-muted-foreground">
              {characteristics.summary}
            </p>
          )}
        </div>

        {/* Grouped characteristics */}
        <div className="space-y-3">
          {sourceOrder.map((source) => {
            const items = grouped[source]
            if (!items || items.length === 0) return null
            return (
              <CharacteristicsGroup
                key={source}
                source={source}
                characteristics={items}
              />
            )
          })}
        </div>

        {/* Recommendations */}
        {characteristics.recommendations && (
          <div className="pt-3 border-t border-border/50">
            <h5 className="text-xs font-semibold text-muted-foreground mb-1">
              Recommendations
            </h5>
            <p className="text-xs text-foreground">
              {characteristics.recommendations}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

export default WritingCharacteristicsDisplay
