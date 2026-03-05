/**
 * ReferenceSelectionDialog — Intermediate dialog shown when accepting a topic
 * suggestion via "Create Content". Wraps ReferencePicker so the user can
 * choose which writing references inform the AI's voice before the pipeline
 * starts. Can be skipped entirely.
 */

import { useState, useEffect } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReferencePicker } from './ReferencePicker'
import type { ArtifactType } from '../../types/portfolio'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferenceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: ArtifactType
  onSkip: () => void
  onCreateWithReferences: (selectedIds: string[]) => void
  isCreating?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<ArtifactType, string> = {
  social_post: 'social post',
  blog: 'blog post',
  showcase: 'case study',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferenceSelectionDialog({
  open,
  onOpenChange,
  contentType,
  onSkip,
  onCreateWithReferences,
  isCreating = false,
}: ReferenceSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds([])
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-portal-ignore-click-outside
        className="sm:max-w-2xl max-h-[80vh] flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            Select Writing References
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose references for the AI to match your voice when writing this{' '}
            {TYPE_LABELS[contentType]}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-2">
          <ReferencePicker
            contentType={contentType}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            previewLines={4}
            maxHeightClass="max-h-[400px]"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={isCreating}
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={() => onCreateWithReferences(selectedIds)}
            disabled={isCreating}
            className="gap-1.5"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {selectedIds.length > 0
                  ? `Create with ${selectedIds.length} selected`
                  : 'Create without references'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
