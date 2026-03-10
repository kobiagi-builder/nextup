/**
 * Document Card
 *
 * Minimal card displaying title, status, and type within an initiative section.
 */

import { cn } from '@/lib/utils'
import type { CustomerDocument } from '../../types'
import { DOCUMENT_TYPE_CONFIG, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '../../types'

interface DocumentCardProps {
  document: CustomerDocument
  isLast: boolean
  onClick: () => void
}

export function DocumentCard({ document, isLast, onClick }: DocumentCardProps) {
  const typeConfig = DOCUMENT_TYPE_CONFIG[document.type]

  return (
    <button
      data-testid={`document-card-${document.id}`}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md',
        'hover:bg-muted/50 cursor-pointer transition-colors',
        !isLast && 'border-b border-border/20'
      )}
    >
      <span className="text-sm text-foreground truncate flex-1">
        {document.title}
      </span>
      <span className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        DOCUMENT_STATUS_COLORS[document.status]
      )}>
        {DOCUMENT_STATUS_LABELS[document.status]}
      </span>
      <span className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        typeConfig.color
      )}>
        {typeConfig.label}
      </span>
    </button>
  )
}
