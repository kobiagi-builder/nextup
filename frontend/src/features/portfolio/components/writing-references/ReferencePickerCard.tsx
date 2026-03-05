/**
 * ReferencePickerCard — Selectable variant of ReferenceCard for the ReferencePicker.
 *
 * Removes delete/retry/type-change actions. Adds click-to-select toggle with
 * visual selection state (brand accent stripe + border). Inline content preview
 * with configurable line clamp and CSS mask fade.
 */

import { cn } from '@/lib/utils'
import type { UserWritingExample } from '../../types/portfolio'
import { getSourceIcon, stripMarkdown } from './ReferenceCard'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferencePickerCardProps {
  reference: UserWritingExample
  isSelected: boolean
  onToggle: (id: string) => void
  previewLines?: 2 | 4
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferencePickerCard({
  reference,
  isSelected,
  onToggle,
  previewLines = 4,
}: ReferencePickerCardProps) {
  const source = getSourceIcon(reference.source_type, reference.source_url)
  const SourceIcon = source.Icon

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onToggle(reference.id)}
      onKeyDown={(e) => e.key === 'Enter' && onToggle(reference.id)}
      className={cn(
        'group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 cursor-pointer',
        isSelected
          ? 'border-brand-300/40 shadow-md shadow-brand-300/5'
          : 'border-border hover:border-brand-300/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {/* Left accent stripe */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[3px] transition-colors duration-200',
          isSelected ? 'bg-brand-300' : 'bg-muted-foreground/30'
        )}
      />

      <div className="pl-5 pr-4 py-3 space-y-2">
        {/* Header row: source icon + name + word count */}
        <div className="flex items-center gap-3">
          {/* Selection indicator */}
          <div
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-200',
              isSelected
                ? 'border-brand-300 bg-brand-300'
                : 'border-muted-foreground/40'
            )}
          >
            {isSelected && (
              <svg
                className="h-3 w-3 text-white"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 6L5 8.5L9.5 3.5" />
              </svg>
            )}
          </div>

          {/* Source icon */}
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              'bg-secondary/80'
            )}
          >
            <SourceIcon className={cn('h-3.5 w-3.5', source.color)} />
          </div>

          {/* Name + word count */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate leading-tight">
              {reference.name}
            </p>
            {reference.word_count > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {reference.word_count.toLocaleString()} words
              </span>
            )}
          </div>

          {/* Artifact type badge */}
          {reference.artifact_type && (
            <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-full bg-secondary/80 shrink-0">
              {reference.artifact_type === 'social_post'
                ? 'Social'
                : reference.artifact_type === 'blog'
                  ? 'Blog'
                  : 'Showcase'}
            </span>
          )}
        </div>

        {/* Content preview with fade */}
        {reference.content && (
          <p
            className={cn(
              'text-xs text-muted-foreground/70 pl-[4.25rem] leading-relaxed',
              previewLines === 2 ? 'line-clamp-2' : 'line-clamp-4'
            )}
            style={{
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
            }}
          >
            {stripMarkdown(reference.content).substring(0, 500)}
          </p>
        )}
      </div>
    </div>
  )
}
