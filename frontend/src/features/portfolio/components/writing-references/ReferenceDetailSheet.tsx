/**
 * ReferenceDetailSheet — Full content view when clicking a reference card.
 *
 * Slides in from the right. Shows the extracted content in a clean,
 * readable layout with metadata header and scrollable body.
 */

import {
  FileText,
  Type,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'
import { markdownToHTML, isMarkdown } from '@/lib/markdown'
import type { UserWritingExample } from '../../types/portfolio'
import { detectPlatform, PLATFORM_META } from './platform-utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferenceDetailSheetProps {
  reference: UserWritingExample | null
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferenceDetailSheet({
  reference,
  open,
  onClose,
}: ReferenceDetailSheetProps) {
  if (!reference) return null

  const statusMap = {
    success: { icon: CheckCircle2, label: 'Extracted', color: 'text-emerald-500' },
    failed: { icon: AlertCircle, label: 'Failed', color: 'text-destructive' },
    extracting: { icon: Loader2, label: 'Extracting...', color: 'text-brand-300' },
    pending: { icon: Clock, label: 'Pending', color: 'text-muted-foreground' },
  }

  const status = statusMap[reference.extraction_status ?? 'success']
  const StatusIcon = status.icon

  // Source display
  let sourceLabel = 'Pasted text'
  let SourceIcon = Type
  if (reference.source_type === 'file_upload') {
    sourceLabel = 'Uploaded file'
    SourceIcon = FileText
  } else if (reference.source_type === 'url' && reference.source_url) {
    const platform = detectPlatform(reference.source_url)
    sourceLabel = PLATFORM_META[platform].label
    SourceIcon = Link2
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        data-portal-ignore-click-outside
        className="w-full sm:max-w-lg flex flex-col"
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-base pr-8">{reference.name}</SheetTitle>
          <SheetDescription className="sr-only">
            Full content of writing reference
          </SheetDescription>
        </SheetHeader>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge variant="secondary" className="gap-1.5 text-[11px] font-medium">
            <SourceIcon className="h-3 w-3" />
            {sourceLabel}
          </Badge>

          {reference.word_count > 0 && (
            <Badge variant="outline" className="text-[11px] font-normal tabular-nums">
              {reference.word_count.toLocaleString()} words
            </Badge>
          )}

          <Badge
            variant="secondary"
            className={cn('gap-1 text-[11px] font-medium', status.color)}
          >
            <StatusIcon
              className={cn(
                'h-3 w-3',
                reference.extraction_status === 'extracting' && 'animate-spin'
              )}
            />
            {status.label}
          </Badge>
        </div>

        {/* Source URL */}
        {reference.source_url && (
          <a
            href={reference.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-300 hover:underline mt-1 max-w-full"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{reference.source_url}</span>
          </a>
        )}

        <Separator className="my-3" />

        {/* Content body */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {reference.extraction_status === 'success' && reference.content ? (
            isMarkdown(reference.content) ? (
              <div
                className="prose prose-sm prose-invert max-w-none pb-8
                  prose-headings:text-foreground prose-headings:font-semibold
                  prose-p:text-foreground/90 prose-p:leading-relaxed
                  prose-strong:text-foreground prose-em:text-foreground/80
                  prose-li:text-foreground/90
                  prose-blockquote:border-brand-300/40 prose-blockquote:text-foreground/70
                  prose-a:text-brand-300"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(markdownToHTML(reference.content)),
                }}
              />
            ) : (
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap pb-8">
                {reference.content}
              </div>
            )
          ) : reference.extraction_status === 'extracting' ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-3" />
              <p className="text-sm">Extracting content...</p>
            </div>
          ) : reference.extraction_status === 'failed' ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive mb-3" />
              <p className="text-sm">Content extraction failed.</p>
              <p className="text-xs mt-1">Try deleting and re-uploading this reference.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="h-6 w-6 mb-3" />
              <p className="text-sm">Waiting for extraction to begin...</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
