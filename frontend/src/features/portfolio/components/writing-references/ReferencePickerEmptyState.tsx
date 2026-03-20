/**
 * ReferencePickerEmptyState — Educational empty state for the ReferencePicker.
 *
 * Explains the value of writing references with contextual messaging
 * based on the content type being created.
 */

import { PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ArtifactType } from '../../types/portfolio'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferencePickerEmptyStateProps {
  onAddReference: () => void
  contentType: ArtifactType
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTENT_TYPE_MESSAGES: Record<ArtifactType, string> = {
  blog: 'Add a writing sample so the AI can match your blog writing style — tone, structure, and vocabulary.',
  social_post: 'Add a writing sample so the AI can match how you write social posts — voice, hooks, and pacing.',
  showcase: 'Add a writing sample so the AI can match your case study style — narrative flow and evidence presentation.',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferencePickerEmptyState({
  onAddReference,
  contentType,
}: ReferencePickerEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-6 px-4 space-y-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/80">
        <PenLine className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Your writing, your voice
        </p>
        <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
          {CONTENT_TYPE_MESSAGES[contentType]}
        </p>
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={onAddReference}
        className="gap-1.5"
      >
        <PenLine className="h-3.5 w-3.5" />
        Add your first reference
      </Button>

      <p className="text-[11px] text-muted-foreground/70">
        This step is optional
      </p>
    </div>
  )
}
