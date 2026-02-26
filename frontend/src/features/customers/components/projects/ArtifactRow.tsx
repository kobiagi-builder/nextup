/**
 * Artifact Row
 *
 * Displays a single artifact with type badge, title, status, content preview, and last updated.
 */

import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { CustomerArtifact } from '../../types'
import { ARTIFACT_TYPE_CONFIG, ARTIFACT_STATUS_LABELS, ARTIFACT_STATUS_COLORS } from '../../types'

interface ArtifactRowProps {
  artifact: CustomerArtifact
  onClick: (artifact: CustomerArtifact) => void
}

/**
 * Strip HTML and markdown to get a plain text preview.
 */
function getContentPreview(content: string, maxLength = 80): string {
  if (!content) return ''
  // Strip HTML tags
  let text = content.replace(/<[^>]*>/g, '')
  // Strip markdown formatting characters (keep hyphens in text)
  text = text.replace(/[#*_~`>\[\]()!]/g, '').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function ArtifactRow({ artifact, onClick }: ArtifactRowProps) {
  const typeConfig = ARTIFACT_TYPE_CONFIG[artifact.type]
  const statusLabel = ARTIFACT_STATUS_LABELS[artifact.status]
  const statusColor = ARTIFACT_STATUS_COLORS[artifact.status]
  const preview = getContentPreview(artifact.content)

  return (
    <div
      className="flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onClick(artifact)}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Type badge + Title + Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', typeConfig.color)}>
            {typeConfig.label}
          </span>
          <span className="text-sm font-medium text-foreground truncate">{artifact.title}</span>
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs', statusColor)}>
            {statusLabel}
          </span>
        </div>

        {/* Row 2: Content preview */}
        {preview && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{preview}</p>
        )}

        {/* Row 3: Last updated */}
        <p className="text-xs text-muted-foreground mt-1">
          Updated {formatDistanceToNow(new Date(artifact.updated_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
