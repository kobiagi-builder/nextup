/**
 * ArtifactEditor Component
 *
 * Rich text editor for artifacts.
 * AI Assistant is now accessed via button in page header (not embedded).
 * Phase 3: Includes image approval panel and regeneration support.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, ChevronDown, ChevronUp, Lock, Loader2, PartyPopper } from 'lucide-react'
import { RichTextEditor } from './RichTextEditor'
import { ChatPanel } from '../chat/ChatPanel'
import { ImageApprovalPanel } from '../artifact/ImageApprovalPanel'
import { ImageRegenerationModal } from '../artifact/ImageRegenerationModal'
import { TagsInput } from '../artifact/TagsInput'
import { Label } from '@/components/ui/label'
import { artifactContextKey } from '../../stores/chatStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useImageGeneration } from '../../hooks/useImageGeneration'
import type { ToneOption, VisualsMetadata, FinalImage, ImageNeed, ArtifactStatus } from '../../types/portfolio'

// =============================================================================
// Types
// =============================================================================

export interface ArtifactEditorProps {
  /** Artifact ID for chat context */
  artifactId: string
  /** Current content */
  content: string
  /** Content change handler */
  onContentChange: (content: string) => void
  /** Title (optional, for display) */
  title?: string
  /** Artifact type for context */
  artifactType?: 'social_post' | 'blog' | 'showcase'
  /** Artifact status (Phase 3: for image workflow) */
  status?: ArtifactStatus
  /** Visuals metadata (Phase 3: image generation) */
  visualsMetadata?: VisualsMetadata | null
  /** Is saving */
  isSaving?: boolean
  /** Content tone (Phase 1) */
  tone?: ToneOption
  /** Tone change handler (Phase 1) */
  onToneChange?: (tone: ToneOption) => void
  /** Additional class name */
  className?: string
  /** Collapsed state (external control) */
  isCollapsed?: boolean
  /** Collapse state callback */
  onCollapsedChange?: (collapsed: boolean) => void
  /** Whether the editor is editable (false locks for AI processing) */
  editable?: boolean
  /** Callback when user clicks AI button on text selection */
  onTextAIClick?: () => void
  /** Callback when user clicks AI button on image selection */
  onImageAIClick?: () => void
  /** Artifact tags */
  tags?: string[]
  /** Tags change handler */
  onTagsChange?: (tags: string[]) => void
  /** Test ID for E2E testing */
  'data-testid'?: string
}

// =============================================================================
// Component
// =============================================================================

export function ArtifactEditor({
  artifactId,
  content,
  onContentChange,
  title,
  artifactType,
  status,
  visualsMetadata,
  isSaving,
  tone,
  onToneChange,
  className,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange,
  onTextAIClick,
  onImageAIClick,
  tags = [],
  onTagsChange,
  editable = true,
  'data-testid': testId,
}: ArtifactEditorProps) {
  const isMobile = useIsMobile()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const [regeneratingImage, setRegeneratingImage] = useState<FinalImage | null>(null)
  const [regeneratingImageNeed, setRegeneratingImageNeed] = useState<ImageNeed | null>(null)

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
  const setIsCollapsed = onCollapsedChange || setInternalIsCollapsed

  const contextKey = artifactContextKey(artifactId)

  // Phase 3: Image generation hooks
  const {
    approveDescriptions,
    rejectDescriptions,
    generateFinals,
    regenerateImage: regenerateImageMutation,
    isLoading: isImageOperationLoading,
  } = useImageGeneration(artifactId)

  // Phase 3: Image approval panel is disabled (auto-approval workflow)
  // Keep the condition here for potential future use, but always false
  const showImageApprovalPanel = false // Disabled: auto-approval workflow skips this step

  // Phase 3: Check if showing complete banner (shows when ready with images processed)
  const showCompleteBanner = status === 'ready' && visualsMetadata?.phase?.phase === 'complete'

  // Phase 3: Check if generating images (during creating_visuals status)
  const isGeneratingImages = status === 'creating_visuals'

  // Phase 3: Image generation handlers
  const handleApproveImages = async (imageIds: string[]) => {
    try {
      await approveDescriptions(imageIds)
    } catch (error) {
      console.error('[ArtifactEditor] Failed to approve images:', error)
      throw error
    }
  }

  const handleRejectImages = async (imageIds: string[]) => {
    try {
      await rejectDescriptions(imageIds)
    } catch (error) {
      console.error('[ArtifactEditor] Failed to reject images:', error)
      throw error
    }
  }

  const handleGenerateFinals = async () => {
    try {
      await generateFinals()
    } catch (error) {
      console.error('[ArtifactEditor] Failed to generate final images:', error)
      throw error
    }
  }

  const handleRegenerateImage = async (imageId: string, description: string) => {
    try {
      await regenerateImageMutation({ imageId, description })
      setRegeneratingImage(null)
      setRegeneratingImageNeed(null)
    } catch (error) {
      console.error('[ArtifactEditor] Failed to regenerate image:', error)
      throw error
    }
  }

  const _openRegenerationModal = (image: FinalImage, need: ImageNeed) => {
    setRegeneratingImage(image)
    setRegeneratingImageNeed(need)
  }
  void _openRegenerationModal // Suppress TS6133 - function preserved for future image regeneration UI

  const closeRegenerationModal = () => {
    setRegeneratingImage(null)
    setRegeneratingImageNeed(null)
  }

  // Mobile layout with FAB
  if (isMobile) {
    return (
      <div className={cn('relative h-full', className)} data-testid={testId}>
        {/* Editor */}
        <div className="h-full relative">
          <RichTextEditor
            content={content}
            onChange={onContentChange}
            placeholder="Start writing..."
            tone={tone}
            onToneChange={onToneChange}
            editable={editable}
            artifactId={artifactId}
            onTextAIClick={onTextAIClick}
            onImageAIClick={onImageAIClick}
          />
          {/* Lock overlay when not editable */}
          {!editable && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10" data-testid="editor-lock-overlay">
              <div className="flex items-center gap-2 text-muted-foreground bg-background/80 px-4 py-2 rounded-lg">
                <Lock className="h-4 w-4" />
                <span>{status === 'creating_visuals' ? 'Finalizing your content...' : 'Content is being generated...'}</span>
              </div>
            </div>
          )}
        </div>

        {/* AI FAB Button */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <ChatPanel
              contextKey={contextKey}
              title={title ? `AI - ${title}` : 'AI Assistant'}
              showHeader={true}
              height="100%"
            />
          </SheetContent>
        </Sheet>

        {/* Saving indicator */}
        {isSaving && (
          <div className="absolute right-4 top-4 text-xs text-muted-foreground">
            Saving...
          </div>
        )}
      </div>
    )
  }

  // Desktop layout - full-width editor
  // Collapsed state (minimal height header)
  if (isCollapsed) {
    return (
      <div className={cn('flex items-center justify-between border-b px-4 py-3 bg-muted/30', className)} data-testid={testId}>
        <div className="flex items-center gap-2">
          {title && <span className="font-medium text-sm">{title}</span>}
          {artifactType && (
            <span className="text-xs text-muted-foreground capitalize">
              {artifactType.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8"
            aria-label="Expand editor"
            data-testid="editor-expand-button"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Expanded state
  return (
    <div className={cn('flex flex-col h-full', className)} data-testid={testId}>
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {title && <span className="font-medium">{title}</span>}
          {artifactType && (
            <span className="text-xs text-muted-foreground capitalize">
              {artifactType.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8"
            aria-label="Collapse editor"
            data-testid="editor-collapse-button"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tags */}
      {onTagsChange && (
        <div className="border-b px-4 py-3 flex items-start gap-3">
          <Label className="pt-2 shrink-0">Tags</Label>
          <TagsInput
            tags={tags}
            onChange={onTagsChange}
            disabled={!editable}
            placeholder="Type a tag and press Enter..."
            className="flex-1"
          />
        </div>
      )}

      {/* Phase 3: Content Complete Banner */}
      {showCompleteBanner && (
        <div className="border-b">
          <Alert className="rounded-none border-x-0 border-t-0 border-green-500 bg-green-50 dark:bg-green-900/20">
            <PartyPopper className="h-4 w-4 text-green-600" />
            <AlertTitle>Content Creation Complete!</AlertTitle>
            <AlertDescription>
              Your artifact is ready for final review. You can still edit content and regenerate
              images if needed.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Phase 3: Image Generation Progress */}
      {isGeneratingImages && !showImageApprovalPanel && (
        <div className="border-b">
          <Card className="rounded-none border-x-0 border-t-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <div className="flex-1">
                  <p className="font-medium">
                    {visualsMetadata?.phase?.phase === 'identifying_needs' &&
                      'Analyzing content for images...'}
                    {visualsMetadata?.phase?.phase === 'generating_images' &&
                      `Generating final images... ${
                        (visualsMetadata.phase as { completed?: number }).completed || 0
                      }/${(visualsMetadata.phase as { total?: number }).total || 0}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This may take a few minutes. You'll be notified when complete.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase 3: Image Approval Panel */}
      {showImageApprovalPanel && visualsMetadata && (
        <div className="border-b p-4 overflow-auto max-h-[60vh]">
          <ImageApprovalPanel
            artifactId={artifactId}
            imageNeeds={visualsMetadata.needs}
            onApprove={handleApproveImages}
            onReject={handleRejectImages}
            onGenerateFinals={handleGenerateFinals}
            isLoading={isImageOperationLoading}
          />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 relative">
        <RichTextEditor
          content={content}
          onChange={onContentChange}
          placeholder="Start writing your content..."
          tone={tone}
          onToneChange={onToneChange}
          className="h-full"
          editable={editable}
          artifactId={artifactId}
          onTextAIClick={onTextAIClick}
          onImageAIClick={onImageAIClick}
        />
        {/* Lock overlay when not editable */}
        {!editable && (
          <div
            className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"
            data-testid="editor-lock-overlay"
          >
            <div className="flex items-center gap-2 text-muted-foreground bg-background/80 px-4 py-2 rounded-lg">
              <Lock className="h-4 w-4" />
              <span>{status === 'creating_visuals' ? 'Finalizing your content...' : 'Content is being generated...'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Phase 3: Image Regeneration Modal */}
      {regeneratingImage && regeneratingImageNeed && (
        <ImageRegenerationModal
          isOpen={true}
          onClose={closeRegenerationModal}
          image={regeneratingImage}
          imageNeed={regeneratingImageNeed}
          onRegenerate={handleRegenerateImage}
        />
      )}
    </div>
  )
}

export default ArtifactEditor
