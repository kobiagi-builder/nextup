/**
 * FoundationsSection Component (Phase 4)
 *
 * Displays writing characteristics analysis and EDITABLE skeleton content.
 * Auto-expands when status is 'skeleton' or 'foundations_approval'.
 * Contains approval button to continue pipeline.
 *
 * CRITICAL: Skeleton is EDITABLE in FoundationsSection (not read-only).
 * The main ArtifactEditor shows final content only (after writing phase).
 */

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RichTextEditor } from '../editor/RichTextEditor'
import { WritingCharacteristicsDisplay } from './WritingCharacteristicsDisplay'
import { FoundationsApprovedButton } from './FoundationsApprovedButton'
import { FoundationsReferences } from './FoundationsReferences'
import type {
  ArtifactStatus,
  ArtifactType,
  ArtifactWritingCharacteristics,
} from '../../types/portfolio'

// =============================================================================
// Types
// =============================================================================

export interface FoundationsSectionProps {
  artifactId: string
  status: ArtifactStatus
  characteristics?: ArtifactWritingCharacteristics | null
  characteristicsLoading?: boolean
  characteristicsError?: string
  skeletonContent?: string
  onSkeletonChange?: (content: string) => void
  onApprove?: () => void
  approvalLoading?: boolean
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Artifact type for reference picker filtering */
  artifactType?: ArtifactType
  /** Currently selected writing reference IDs from artifact metadata */
  selectedReferenceIds?: string[]
  /** Callback to re-analyze foundations with new reference selection */
  onReanalyze?: (selectedIds: string[]) => void
  /** Whether re-analysis is currently in progress */
  reanalyzeLoading?: boolean
  /** Custom label for the re-analyze button (e.g. "Regenerate with new references") */
  reanalyzeButtonLabel?: string
}

const NOOP = () => {}

// Statuses where foundations section should show content
const FOUNDATIONS_VISIBLE_STATUSES: ArtifactStatus[] = [
  'foundations',
  'skeleton',
  'foundations_approval',
  'writing',
  'creating_visuals',
  'ready',
  'published',
]

// Statuses where skeleton editor is locked (during AI processing)
// NOTE: 'skeleton' is NOT included — that status means the skeleton is created
// and waiting for user review/approval, so it should be editable.
const SKELETON_LOCKED_STATUSES: ArtifactStatus[] = [
  'foundations',
  'writing',
  'creating_visuals',
]

// Statuses that should auto-expand the section
const AUTO_EXPAND_STATUSES: ArtifactStatus[] = [
  'skeleton',
  'foundations_approval',
]

// =============================================================================
// Main Component
// =============================================================================

export function FoundationsSection({
  artifactId,
  status,
  characteristics,
  characteristicsLoading = false,
  characteristicsError,
  skeletonContent = '',
  onSkeletonChange,
  onApprove,
  approvalLoading = false,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange,
  artifactType,
  selectedReferenceIds,
  onReanalyze,
  reanalyzeLoading = false,
  reanalyzeButtonLabel,
}: FoundationsSectionProps) {
  // Use external state if provided, otherwise use internal state
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(true)
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
  const setIsCollapsed = onCollapsedChange || setInternalIsCollapsed

  // Track if foundations has been viewed in this session
  const [hasBeenViewed, setHasBeenViewed] = useState(() => {
    const viewed = sessionStorage.getItem(`foundations-viewed-${artifactId}`)
    return viewed === 'true'
  })

  // Auto-expand when status reaches approval stage
  useEffect(() => {
    if (AUTO_EXPAND_STATUSES.includes(status) && isCollapsed && !hasBeenViewed) {
      setIsCollapsed(false)
      sessionStorage.setItem(`foundations-viewed-${artifactId}`, 'true')
      // Update viewed state in next render to avoid setState in effect
      Promise.resolve().then(() => setHasBeenViewed(true))
    }
  }, [status, isCollapsed, hasBeenViewed, artifactId, setIsCollapsed])

  // Approval celebration state
  const [showCelebration, setShowCelebration] = useState(false)
  const handleApproveWithCelebration = useCallback(() => {
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 1200)
    onApprove?.()
  }, [onApprove])

  // Show "New" badge when: has characteristics, collapsed, and not yet viewed
  const showNewBadge = characteristics && isCollapsed && !hasBeenViewed

  // Determine if skeleton is editable (not locked during AI processing)
  const isSkeletonEditable = !SKELETON_LOCKED_STATUSES.includes(status)

  // Show approval button when skeleton is ready for approval
  // Pipeline sets status to 'skeleton' with pauseForApproval, or 'foundations_approval'
  const showApprovalButton = status === 'skeleton' || status === 'foundations_approval'

  // Handle expand with viewed tracking
  const handleExpand = () => {
    setIsCollapsed(false)
    if (!hasBeenViewed) {
      sessionStorage.setItem(`foundations-viewed-${artifactId}`, 'true')
      setHasBeenViewed(true)
    }
  }

  // Don't render if status is before foundations stage
  if (!FOUNDATIONS_VISIBLE_STATUSES.includes(status) && status !== 'research') {
    return null
  }

  // Collapsed state (minimal height header)
  if (isCollapsed) {
    return (
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-3 bg-muted/30"
        data-testid="foundations-section-collapsed"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Foundations</h3>
          {showNewBadge && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded"
              data-testid="foundations-new-badge"
            >
              NEW
            </span>
          )}
          {showApprovalButton && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500 text-white rounded">
              NEEDS APPROVAL
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExpand}
          className="h-8 w-8"
          aria-label="Expand foundations section"
          data-testid="foundations-expand-button"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Expanded state
  return (
    <div
      className="h-full flex flex-col border-b bg-background"
      data-testid="foundations-section"
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between gap-2 border-b px-4 py-3 transition-colors duration-500',
        showCelebration && 'bg-emerald-100 dark:bg-emerald-900/30'
      )}>
        <div className="flex items-center gap-2">
          {showCelebration
            ? <CheckCircle className="h-4 w-4 text-emerald-600" />
            : <Lightbulb className="h-4 w-4 text-muted-foreground" />
          }
          <h3 className="font-semibold text-sm">
            {showCelebration ? 'Approved!' : 'Foundations'}
          </h3>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8"
          aria-label="Collapse foundations section"
          data-testid="foundations-collapse-button"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* State: Loading characteristics */}
        {characteristicsLoading && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing writing characteristics...</span>
            </div>
          </Card>
        )}

        {/* State: Error loading characteristics */}
        {characteristicsError && (
          <Card className="p-4 border-destructive/50">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{characteristicsError}</span>
            </div>
          </Card>
        )}

        {/* Writing References */}
        {artifactType && (
          <FoundationsReferences
            artifactType={artifactType}
            selectedReferenceIds={selectedReferenceIds ?? []}
            onReanalyze={onReanalyze ?? NOOP}
            reanalyzeLoading={reanalyzeLoading}
            editable={isSkeletonEditable}
            reanalyzeButtonLabel={reanalyzeButtonLabel}
          />
        )}

        {/* Writing Characteristics Display */}
        {characteristics && (
          <WritingCharacteristicsDisplay
            characteristics={characteristics}
            data-testid="writing-characteristics-display"
          />
        )}

        {/* Skeleton Editor (EDITABLE TipTap) */}
        {(skeletonContent || status === 'foundations_approval') && (
          <div className="space-y-2" data-testid="skeleton-editor-section">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Content Skeleton
              </h4>
              {!isSkeletonEditable && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processing...
                </span>
              )}
            </div>
            <RichTextEditor
              content={skeletonContent}
              onChange={onSkeletonChange || (() => {})}
              editable={isSkeletonEditable}
              placeholder="Skeleton content will appear here..."
              className={cn(
                'min-h-[200px]',
                !isSkeletonEditable && 'opacity-70'
              )}
              data-testid="skeleton-tiptap-editor"
            />
            <p className="text-xs text-muted-foreground">
              {isSkeletonEditable
                ? 'Edit the skeleton structure before approving. Changes will guide the final content.'
                : 'Editor locked during AI processing.'}
            </p>
          </div>
        )}

        {/* Spacer for sticky approval button */}
        {showApprovalButton && onApprove && <div className="h-16" />}

        {/* Empty state when no characteristics yet */}
        {!characteristics && !characteristicsLoading && status === 'research' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Foundations analysis pending
            </p>
            <p className="text-xs text-muted-foreground">
              Writing characteristics will be analyzed after research completes
            </p>
          </div>
        )}
      </div>

      {/* Sticky Approval Button */}
      {showApprovalButton && onApprove && (
        <div className="sticky bottom-0 border-t border-border bg-background p-4 z-10">
          <FoundationsApprovedButton
            onClick={handleApproveWithCelebration}
            loading={approvalLoading}
            disabled={reanalyzeLoading}
            data-testid="foundations-approved-button"
          />
        </div>
      )}
    </div>
  )
}

export default FoundationsSection
