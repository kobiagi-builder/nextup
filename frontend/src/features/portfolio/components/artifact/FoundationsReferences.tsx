/**
 * FoundationsReferences — Compact reference summary for FoundationsSection.
 *
 * Two modes:
 *  - Compact (default): shows selected reference names/icons or "default voice"
 *  - Expanded: full ReferencePicker with re-analyze capability
 *
 * When the user changes reference selection in expanded mode and the new
 * selection differs from the original, a "Re-analyze" button appears.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Info, Loader2, PenLine, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWritingExamples } from '../../hooks/useWritingExamples'
import { ReferencePicker } from '../writing-references/ReferencePicker'
import { getSourceIcon } from '../writing-references/ReferenceCard'
import type { ArtifactType } from '../../types/portfolio'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FoundationsReferencesProps {
  artifactType: ArtifactType
  selectedReferenceIds: string[]
  onReanalyze: (selectedIds: string[]) => void
  reanalyzeLoading: boolean
  editable: boolean
  /** Custom label for the re-analyze button (e.g. "Regenerate with new references") */
  reanalyzeButtonLabel?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FoundationsReferences({
  artifactType,
  selectedReferenceIds,
  onReanalyze,
  reanalyzeLoading,
  editable,
  reanalyzeButtonLabel,
}: FoundationsReferencesProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedReferenceIds)

  // Track whether a re-analyze was in progress (for auto-collapse)
  const wasReanalyzing = useRef(false)

  // Sync local state when parent selection changes (e.g. after re-analyze completes)
  useEffect(() => {
    setLocalSelectedIds(selectedReferenceIds)
  }, [selectedReferenceIds])

  // Track re-analyze loading state
  useEffect(() => {
    if (reanalyzeLoading) wasReanalyzing.current = true
  }, [reanalyzeLoading])

  // Collapse back to compact mode after successful re-analyze
  useEffect(() => {
    if (!reanalyzeLoading && wasReanalyzing.current && isExpanded) {
      wasReanalyzing.current = false
      setIsExpanded(false)
    }
  }, [reanalyzeLoading, isExpanded])

  // Check if selection has changed from original
  const hasSelectionChanged = useMemo(() => {
    if (localSelectedIds.length !== selectedReferenceIds.length) return true
    return !localSelectedIds.every((id) => selectedReferenceIds.includes(id))
  }, [localSelectedIds, selectedReferenceIds])

  // Fetch references to display names in compact mode
  const { data: allReferences = [] } = useWritingExamples()
  const selectedReferences = useMemo(
    () =>
      allReferences.filter(
        (r) =>
          selectedReferenceIds.includes(r.id) &&
          r.extraction_status === 'success',
      ),
    [allReferences, selectedReferenceIds],
  )

  const handleCancel = () => {
    setLocalSelectedIds(selectedReferenceIds)
    setIsExpanded(false)
  }

  const handleReanalyze = () => {
    onReanalyze(localSelectedIds)
  }

  // Compact mode
  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <PenLine className="h-3.5 w-3.5" />
            Writing References
            {selectedReferenceIds.length > 0 && (
              <span className="text-xs font-normal tabular-nums">
                {selectedReferenceIds.length} selected
              </span>
            )}
          </h4>
          {editable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-7 text-xs"
            >
              Change
            </Button>
          )}
        </div>

        {selectedReferences.length > 0 ? (
          <div className="space-y-1 pl-5">
            {selectedReferences.map((ref) => {
              const source = getSourceIcon(ref.source_type, ref.source_url)
              const SourceIcon = source.Icon
              return (
                <div
                  key={ref.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <SourceIcon className={`h-3 w-3 ${source.color}`} />
                  <span className="truncate">{ref.name}</span>
                  {ref.word_count > 0 && (
                    <span className="text-muted-foreground/50 tabular-nums shrink-0">
                      {ref.word_count.toLocaleString()}w
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pl-5">
            <Info className="h-3 w-3" />
            Using default voice matching
          </div>
        )}
      </div>
    )
  }

  // Expanded mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <PenLine className="h-3.5 w-3.5" />
          Writing References
        </h4>
      </div>

      <ReferencePicker
        contentType={artifactType}
        selectedIds={localSelectedIds}
        onSelectionChange={setLocalSelectedIds}
        previewLines={4}
      />

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={reanalyzeLoading}
          className="h-7 text-xs"
        >
          Cancel
        </Button>
        {hasSelectionChanged && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReanalyze}
            disabled={reanalyzeLoading}
            className="h-7 text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10 gap-1.5"
          >
            {reanalyzeLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {reanalyzeButtonLabel ? 'Regenerating...' : 'Re-analyzing...'}
              </>
            ) : (
              <>
                <RotateCcw className="h-3 w-3" />
                {reanalyzeButtonLabel || 'Re-analyze with new references'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
