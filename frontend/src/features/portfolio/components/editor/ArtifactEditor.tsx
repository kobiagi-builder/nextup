/**
 * ArtifactEditor Component
 *
 * Rich text editor for artifacts.
 * AI Assistant is now accessed via button in page header (not embedded).
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { RichTextEditor } from './RichTextEditor'
import { ChatPanel } from '../chat/ChatPanel'
import { artifactContextKey } from '../../stores/chatStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { ToneOption } from '../../types/portfolio'

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
  isSaving,
  tone,
  onToneChange,
  className,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange,
  'data-testid': testId,
}: ArtifactEditorProps) {
  const isMobile = useIsMobile()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
  const setIsCollapsed = onCollapsedChange || setInternalIsCollapsed

  const contextKey = artifactContextKey(artifactId)

  // Mobile layout with FAB
  if (isMobile) {
    return (
      <div className={cn('relative h-full', className)} data-testid={testId}>
        {/* Editor */}
        <div className="h-full">
          <RichTextEditor
            content={content}
            onChange={onContentChange}
            placeholder="Start writing..."
            tone={tone}
            onToneChange={onToneChange}
          />
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
      <div className="flex items-center justify-between border-b px-4 py-2">
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
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <RichTextEditor
          content={content}
          onChange={onContentChange}
          placeholder="Start writing your content..."
          tone={tone}
          onToneChange={onToneChange}
          className="h-full"
        />
      </div>
    </div>
  )
}

export default ArtifactEditor
