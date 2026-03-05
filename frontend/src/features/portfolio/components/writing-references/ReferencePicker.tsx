/**
 * ReferencePicker — Multi-select picker for writing references.
 *
 * Fetches all writing examples, filters by artifact type and extraction status,
 * and renders selectable ReferencePickerCards. Includes type filter toggle,
 * selection count, hidden count indicator, and inline add reference dialog.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWritingExamples } from '../../hooks/useWritingExamples'
import { ReferencePickerCard } from './ReferencePickerCard'
import { ReferencePickerEmptyState } from './ReferencePickerEmptyState'
import { InlineAddReferenceDialog } from './InlineAddReferenceDialog'
import type { ArtifactType, UserWritingExample } from '../../types/portfolio'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferencePickerProps {
  contentType: ArtifactType
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  previewLines?: 2 | 4
  maxHeightClass?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferencePicker({
  contentType,
  selectedIds,
  onSelectionChange,
  previewLines = 4,
  maxHeightClass = 'max-h-[400px]',
}: ReferencePickerProps) {
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data: allReferences = [] } = useWritingExamples()

  // Only show successfully extracted references
  const successfulRefs = allReferences.filter(
    (r) => r.extraction_status === 'success'
  )

  // Apply type filter
  const filteredRefs = showAllTypes
    ? successfulRefs
    : successfulRefs.filter((r) => r.artifact_type === contentType)

  const hiddenCount = successfulRefs.length - filteredRefs.length

  // Toggle selection
  const handleToggle = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    )
  }

  // Auto-select newly added reference
  const handleReferenceAdded = (reference: UserWritingExample) => {
    onSelectionChange([...selectedIds, reference.id])
  }

  // Empty state: no successful references at all
  if (successfulRefs.length === 0) {
    return (
      <>
        <ReferencePickerEmptyState
          onAddReference={() => setAddDialogOpen(true)}
          contentType={contentType}
        />
        <InlineAddReferenceDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          defaultArtifactType={contentType}
          onSuccess={handleReferenceAdded}
        />
      </>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header: label + selected count + type filter toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Writing References
          </span>
          {selectedIds.length > 0 && (
            <span className="text-[10px] font-medium text-brand-300 bg-brand-300/10 px-1.5 py-0.5 rounded-full tabular-nums">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {/* Type filter toggle */}
        {hiddenCount > 0 && !showAllTypes && (
          <button
            type="button"
            onClick={() => setShowAllTypes(true)}
            className="text-[11px] text-brand-300 hover:underline"
          >
            Show all types (+{hiddenCount})
          </button>
        )}
        {showAllTypes && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllTypes(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Show matching only
          </button>
        )}
      </div>

      {/* Scrollable card list */}
      <div className={cn('overflow-y-auto space-y-2 pr-1', maxHeightClass)}>
        {filteredRefs.map((ref) => (
          <ReferencePickerCard
            key={ref.id}
            reference={ref}
            isSelected={selectedIds.includes(ref.id)}
            onToggle={handleToggle}
            previewLines={previewLines}
          />
        ))}

        {/* Add new reference card */}
        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className={cn(
            'w-full rounded-xl border-2 border-dashed border-border/50',
            'py-3 flex items-center justify-center gap-2',
            'text-xs text-muted-foreground hover:text-foreground',
            'hover:border-brand-300/30 transition-colors duration-200'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Add new reference
        </button>
      </div>

      {/* Inline add dialog */}
      <InlineAddReferenceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultArtifactType={contentType}
        onSuccess={handleReferenceAdded}
      />
    </div>
  )
}
