/**
 * ArtifactSuggestionCard Component
 *
 * Displays an AI-suggested content idea with a "Create" button.
 * When clicked, creates a draft artifact immediately.
 */

import { useState } from 'react'
import { FileText, MessageSquare, Trophy, Loader2, Check, Edit, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ArtifactType } from '../../types/portfolio'

// =============================================================================
// Types
// =============================================================================

export interface ArtifactSuggestion {
  id: string
  title: string
  description: string
  type: ArtifactType
  rationale: string
  tags?: string[]
}

export interface ArtifactSuggestionCardProps {
  suggestion: ArtifactSuggestion
  isAdded?: boolean
  onCreate: (suggestion: ArtifactSuggestion) => Promise<void>
  onCreateContent?: (suggestion: ArtifactSuggestion) => Promise<void> // Phase 1: AI content creation
}

// =============================================================================
// Component
// =============================================================================

const ARTIFACT_TYPE_CONFIG = {
  social_post: { icon: MessageSquare, label: 'Social Post', color: 'text-blue-500' },
  blog: { icon: FileText, label: 'Blog Post', color: 'text-purple-500' },
  showcase: { icon: Trophy, label: 'Case Study', color: 'text-amber-500' },
}

export function ArtifactSuggestionCard({
  suggestion,
  isAdded = false,
  onCreate,
  onCreateContent,
}: ArtifactSuggestionCardProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingContent, setIsCreatingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = ARTIFACT_TYPE_CONFIG[suggestion.type]
  const Icon = config.icon

  const handleCreate = async () => {
    if (isAdded || isCreating) return

    setIsCreating(true)
    setError(null)

    try {
      await onCreate(suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create artifact')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateContent = async () => {
    if (isAdded || isCreatingContent || !onCreateContent) return

    setIsCreatingContent(true)
    setError(null)

    try {
      await onCreateContent(suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content')
    } finally {
      setIsCreatingContent(false)
    }
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Header: Type badge + Action buttons */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn('flex items-center gap-2 text-sm font-medium', config.color)}>
          <Icon className="h-4 w-4" />
          <span>{config.label}</span>
        </div>

        {/* Two-button layout: Add & Edit / Create Content */}
        <div className="flex flex-col gap-1.5 w-full sm:flex-row sm:gap-2 sm:w-auto">
          {/* Add & Edit button (outline) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreate}
            disabled={isAdded || isCreating || isCreatingContent}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Creating...
              </>
            ) : isAdded ? (
              <>
                <Check className="h-3 w-3" />
                Added
              </>
            ) : (
              <>
                <Edit className="h-3 w-3" />
                Add & Edit
              </>
            )}
          </Button>

          {/* Create Content button (primary) - Phase 1 */}
          {onCreateContent && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateContent}
              disabled={isAdded || isCreating || isCreatingContent}
              className="gap-2"
            >
              {isCreatingContent ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Create Content
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-base mb-2">{suggestion.title}</h4>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3">
        {suggestion.description}
      </p>

      {/* Rationale */}
      <div className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
        {suggestion.rationale}
      </div>

      {/* Tags */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {suggestion.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}
    </Card>
  )
}

export default ArtifactSuggestionCard
