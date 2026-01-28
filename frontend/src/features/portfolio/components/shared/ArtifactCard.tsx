/**
 * Artifact Card Component
 *
 * Card display for artifacts in lists and grids.
 */

import { useNavigate } from 'react-router-dom'
import { FileText, MessageSquare, Trophy, MoreVertical, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Artifact, ArtifactType } from '../../types/portfolio'
import { StatusBadge } from './StatusBadge'
import { formatRelativeTime } from '../../utils/format'

interface ArtifactCardProps {
  artifact: Artifact
  onEdit?: () => void
  onDelete?: () => void
  onArchive?: () => void
  className?: string
}

/** Icon mapping for artifact types */
const TYPE_ICONS: Record<ArtifactType, React.ElementType> = {
  social_post: MessageSquare,
  blog: FileText,
  showcase: Trophy,
}

/** Label mapping for artifact types */
const TYPE_LABELS: Record<ArtifactType, string> = {
  social_post: 'Social Post',
  blog: 'Blog Post',
  showcase: 'Case Study',
}

/**
 * Card component for displaying artifact summary
 */
export function ArtifactCard({
  artifact,
  onEdit,
  onDelete,
  onArchive,
  className,
}: ArtifactCardProps) {
  const navigate = useNavigate()
  const Icon = TYPE_ICONS[artifact.type]

  const handleClick = () => {
    navigate(`/portfolio/artifacts/${artifact.id}`)
  }

  const handleCreateContent = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    console.log('[ArtifactCard] Create Content clicked:', {
      artifactId: artifact.id,
      artifactTitle: artifact.title,
      artifactStatus: artifact.status,
    })
    // Navigate to artifact page with auto-research flag
    navigate(`/portfolio/artifacts/${artifact.id}?autoResearch=true`)
  }

  // Extract preview from content
  const preview = artifact.content
    ? artifact.content.replace(/<[^>]*>/g, '').slice(0, 120) + '...'
    : 'No content yet'

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border/50 bg-card p-4',
        'transition-all duration-200 hover:border-primary/30 hover:shadow-md',
        'cursor-pointer',
        className
      )}
      onClick={handleClick}
      data-testid="artifact-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{TYPE_LABELS[artifact.type]}</span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={artifact.status} size="sm" />

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-portal-ignore-click-outside>
              {onEdit && (
                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }}>
                  Edit
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onArchive(); }}>
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(); }}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-3 font-semibold text-foreground line-clamp-2">
        {artifact.title || 'Untitled'}
      </h3>

      {/* Preview */}
      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {preview}
      </p>

      {/* Tags */}
      {artifact.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {artifact.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {artifact.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{artifact.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Phase 1: Create Content button (only visible for draft status) */}
      {artifact.status === 'draft' && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleCreateContent}
            data-testid="artifact-create-content-button"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create Content
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatRelativeTime(artifact.updated_at)}</span>
      </div>
    </div>
  )
}
