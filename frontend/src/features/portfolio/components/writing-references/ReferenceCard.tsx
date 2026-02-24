/**
 * ReferenceCard — Displays a single writing reference with status, preview, and actions.
 *
 * Editorial-precision aesthetic: compact index-card feel with a thin left accent
 * stripe indicating extraction status. Hover reveals subtle depth shift.
 */

import {
  FileText,
  Type,
  Link2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { UserWritingExample, ExtractionStatus, WritingExampleSourceType, ArtifactType } from '../../types/portfolio'
import { detectPlatform, PLATFORM_META } from './platform-utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferenceCardProps {
  reference: UserWritingExample
  onDelete: (id: string) => void
  onRetry?: (id: string) => void
  onTypeChange?: (id: string, newType: ArtifactType) => void
  onClick: (reference: UserWritingExample) => void
  isDeleting: boolean
}

const TYPE_OPTIONS: { value: ArtifactType; label: string }[] = [
  { value: 'blog', label: 'Blog' },
  { value: 'social_post', label: 'Social' },
  { value: 'showcase', label: 'Showcase' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ExtractionStatus,
  { icon: React.ElementType; color: string; stripe: string; label: string }
> = {
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    stripe: 'bg-emerald-500',
    label: 'Extracted',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-destructive',
    stripe: 'bg-destructive',
    label: 'Failed',
  },
  extracting: {
    icon: Loader2,
    color: 'text-brand-300',
    stripe: 'bg-brand-300',
    label: 'Extracting',
  },
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    stripe: 'bg-muted-foreground',
    label: 'Pending',
  },
}

function getSourceIcon(sourceType: WritingExampleSourceType, sourceUrl?: string | null) {
  if (sourceType === 'url' && sourceUrl) {
    const platform = detectPlatform(sourceUrl)
    return { Icon: Link2, ...PLATFORM_META[platform] }
  }
  if (sourceType === 'file_upload') {
    return { Icon: FileText, label: 'File', color: 'text-blue-400' }
  }
  return { Icon: Type, label: 'Pasted', color: 'text-muted-foreground' }
}

/** Strip markdown syntax for plain-text preview display. */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // bold
    .replace(/\*([^*]+)\*/g, '$1')      // italic
    .replace(/`([^`]+)`/g, '$1')        // inline code
    .replace(/^\s*[-*+]\s+/gm, '')      // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')      // ordered list markers
    .replace(/^>\s+/gm, '')             // blockquotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images
    .replace(/\n{2,}/g, ' ')            // collapse double newlines
    .replace(/\n/g, ' ')                // collapse single newlines
    .trim()
}

function truncateHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferenceCard({
  reference,
  onDelete,
  onRetry,
  onTypeChange,
  onClick,
  isDeleting,
}: ReferenceCardProps) {
  const status = STATUS_CONFIG[reference.extraction_status ?? 'success']
  const StatusIcon = status.icon
  const source = getSourceIcon(reference.source_type, reference.source_url)
  const SourceIcon = source.Icon

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(reference)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(reference)}
      className={cn(
        'group relative rounded-xl border border-border bg-card',
        'overflow-hidden transition-all duration-200',
        'hover:border-brand-300/40 hover:shadow-md hover:shadow-brand-300/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'cursor-pointer'
      )}
    >
      {/* Left accent stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', status.stripe)} />

      <div className="pl-5 pr-4 py-4 space-y-2.5">
        {/* Row 1: Source icon + name + word count + status + delete */}
        <div className="flex items-center gap-3">
          {/* Source icon */}
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              'bg-secondary/80'
            )}
          >
            <SourceIcon className={cn('h-4 w-4', source.color)} />
          </div>

          {/* Name */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate leading-tight">
              {reference.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Word count */}
              {reference.word_count > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {reference.word_count.toLocaleString()} words
                </span>
              )}
              {/* Source URL hostname */}
              {reference.source_url && (
                <a
                  href={reference.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:underline truncate max-w-[160px]"
                >
                  {truncateHostname(reference.source_url)}
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* Type pill dropdown */}
          {onTypeChange && reference.artifact_type && (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Select
                value={reference.artifact_type}
                onValueChange={(val: string) => onTypeChange(reference.id, val as ArtifactType)}
              >
                <SelectTrigger
                  className={cn(
                    'h-6 w-auto min-w-[70px] gap-1 rounded-full border-border/50',
                    'px-2 text-[10px] font-medium text-muted-foreground',
                    'hover:border-brand-300/40 hover:text-foreground',
                    'focus:ring-1 focus:ring-brand-300/30'
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-portal-ignore-click-outside align="end">
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="secondary"
              className={cn(
                'gap-1 text-[10px] font-medium px-1.5 py-0',
                status.color
              )}
            >
              <StatusIcon
                className={cn(
                  'h-3 w-3',
                  reference.extraction_status === 'extracting' && 'animate-spin'
                )}
              />
              {status.label}
            </Badge>

            {/* Retry button for failed */}
            {reference.extraction_status === 'failed' && onRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-brand-300"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry(reference.id)
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 shrink-0 text-muted-foreground/50',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:text-destructive hover:bg-destructive/10'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(reference.id)
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Row 2: Content preview */}
        {reference.extraction_status === 'success' && reference.content && (
          <p className="text-xs text-muted-foreground/70 line-clamp-2 pl-11 leading-relaxed">
            {stripMarkdown(reference.content).substring(0, 200)}
          </p>
        )}
      </div>
    </div>
  )
}
