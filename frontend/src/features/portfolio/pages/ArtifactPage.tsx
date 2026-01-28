/**
 * ArtifactPage Component
 *
 * Full-screen artifact editor with AI assistant.
 * Phase 1: Added tone selector and research area (60/40 split).
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { markdownToHTML, isMarkdown } from '@/lib/markdown'
import { ArrowLeft, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useArtifact, useUpdateArtifact, artifactKeys } from '../hooks/useArtifacts'
import { ArtifactEditor } from '../components/editor'
import { ResearchArea } from '../components/artifact/ResearchArea'
import { isProcessingState } from '../validators/stateMachine'
import { ChatPanel } from '../components'
import { useResearch } from '../hooks/useResearch'
import { useCallback, useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ToneOption } from '../types/portfolio'
import { useScreenContext } from '@/hooks/useScreenContext'
import { supabase } from '@/lib/supabase'

// =============================================================================
// Component
// =============================================================================

export function ArtifactPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const prevStatusRef = useRef<string | undefined>(undefined)

  // Data hooks
  const { data: artifact, isLoading, error } = useArtifact(id!)
  const updateArtifact = useUpdateArtifact()

  // Research hook (Phase 1) - pass artifact status for intelligent polling
  const { data: research = [] } = useResearch(id!, artifact?.status)

  // Phase 6: Screen context for Content Agent
  // IMPORTANT: Use fresh artifact data from useArtifact (which polls during processing)
  // instead of useScreenContext (which uses stale list cache)
  const baseScreenContext = useScreenContext()

  // Create fresh screenContext with up-to-date artifact data
  const screenContext = {
    ...baseScreenContext,
    artifactId: id, // Use URL param directly
    artifactType: artifact?.type ?? baseScreenContext.artifactType,
    artifactTitle: artifact?.title ?? baseScreenContext.artifactTitle,
    artifactStatus: artifact?.status ?? baseScreenContext.artifactStatus, // CRITICAL: Fresh status from useArtifact
  }

  // Log screen context for debugging
  useEffect(() => {
    console.log('[ArtifactPage] Screen context (fresh):', screenContext, {
      sourceArtifactStatus: artifact?.status,
      baseCacheStatus: baseScreenContext.artifactStatus,
    })
  }, [screenContext, artifact?.status, baseScreenContext.artifactStatus])

  // Local state for optimistic updates
  const [localContent, setLocalContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [localTone, setLocalTone] = useState<ToneOption>('professional')
  const [hasToneChanges, setHasToneChanges] = useState(false)

  // UI state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [isResearchCollapsed, setIsResearchCollapsed] = useState(true) // Default: collapsed
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false) // Default: expanded
  const [initialResearchMessage, setInitialResearchMessage] = useState<string | undefined>(undefined)

  // Sync local content with artifact data (Phase 1: includes AI-generated skeleton)
  useEffect(() => {
    if (artifact?.content) {
      console.log('[ArtifactPage] Syncing artifact content to editor:', {
        artifactId: artifact.id,
        artifactStatus: artifact.status,
        contentLength: artifact.content.length,
        contentPreview: artifact.content.substring(0, 150),
        isMarkdown: isMarkdown(artifact.content),
        timestamp: new Date().toISOString(),
      })

      // Phase 1: Convert markdown to HTML if needed (AI-generated skeletons come as markdown)
      let contentToSet = artifact.content
      if (isMarkdown(artifact.content)) {
        console.log('[ArtifactPage] Converting markdown skeleton to HTML:', {
          artifactId: artifact.id,
          markdownLength: artifact.content.length,
        })
        contentToSet = markdownToHTML(artifact.content)
        console.log('[ArtifactPage] Conversion complete:', {
          artifactId: artifact.id,
          htmlLength: contentToSet.length,
        })
      }

      setLocalContent(contentToSet)
      setHasUnsavedChanges(false) // Reset unsaved changes when receiving server content
    }
    if (artifact?.tone) {
      setLocalTone(artifact.tone)
      setHasToneChanges(false)
    }
  }, [artifact?.content, artifact?.tone, artifact?.id, artifact?.status])

  // Auto-trigger content creation when navigating with startCreation or autoResearch param
  useEffect(() => {
    const autoResearch = searchParams.get('autoResearch')
    const startCreation = searchParams.get('startCreation')

    if ((autoResearch === 'true' || startCreation === 'true') && artifact?.title && artifact.status === 'draft') {
      console.log('[ArtifactPage] Auto content creation triggered:', {
        artifactId: artifact.id,
        artifactTitle: artifact.title,
        source: startCreation === 'true' ? 'create-modal' : 'portfolio-card',
      })

      // Set the content creation message to auto-send (artifact ID provided via screen context)
      const contentMessage = `Create content: "${artifact.title}"`
      setInitialResearchMessage(contentMessage)

      // Open AI Assistant (message will be sent by ChatPanel)
      setIsAIAssistantOpen(true)

      // Clear the URL parameter so it doesn't trigger again
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, artifact?.title, artifact?.status, artifact?.id])

  // Invalidate research cache when artifact status changes (Phase 1 fix)
  useEffect(() => {
    if (!artifact) return

    const currentStatus = artifact.status
    const previousStatus = prevStatusRef.current

    // Debug logging to understand condition evaluation
    const isCurrentReady = currentStatus === 'ready'
    const isPreviousNotReady = previousStatus !== 'ready'
    const shouldTrigger = isCurrentReady && isPreviousNotReady

    console.log('[ArtifactPage] Artifact status tracking:', {
      artifactId: artifact.id,
      previousStatus,
      currentStatus,
      researchCount: research.length,
      timestamp: new Date().toISOString(),
      // Debug: detailed condition evaluation
      debug: {
        isCurrentReady,
        isPreviousNotReady,
        shouldTrigger,
        previousStatusType: typeof previousStatus,
        previousStatusValue: previousStatus,
      },
    })

    // When status becomes 'ready' from any previous state (including undefined on mount or fast completion)
    // This handles: draft→ready, in_progress→ready, OR first render with status already 'ready'
    if (shouldTrigger) {
      console.log('[ArtifactPage] Status is ready - invalidating research cache:', {
        artifactId: artifact.id,
        previousStatus,
        currentStatus,
        timestamp: new Date().toISOString(),
      })

      // Invalidate research to force immediate refetch
      queryClient.invalidateQueries({ queryKey: ['research', artifact.id] })

      // Note: Research area stays collapsed by default per user preference
      // Users can expand manually if they want to see research sources
    }

    // Update ref for next render
    prevStatusRef.current = currentStatus
  }, [artifact, research.length, queryClient])

  // Real-time artifact updates via Supabase Realtime
  // Listens for UPDATE events on the artifacts table and invalidates cache for immediate refresh
  useEffect(() => {
    if (!id) return

    console.log('[ArtifactPage] 🔌 Setting up Realtime subscription:', {
      artifactId: id,
      channelName: `artifact-${id}`,
      table: 'artifacts',
      filter: `id=eq.${id}`,
      timestamp: new Date().toISOString(),
    })

    // Subscribe to changes on this specific artifact
    const channel = supabase
      .channel(`artifact-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'artifacts',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('[ArtifactPage] 🔔 Realtime UPDATE event received:', {
            artifactId: id,
            newStatus: payload.new.status,
            oldStatus: payload.old?.status,
            hasContent: !!payload.new.content,
            contentLength: payload.new.content?.length || 0,
            timestamp: new Date().toISOString(),
          })

          // Check current cache state BEFORE invalidation
          const correctQueryKey = artifactKeys.detail(id)
          const cacheStateBefore = queryClient.getQueryState(correctQueryKey)
          console.log('[ArtifactPage] 📦 Cache state BEFORE invalidation:', {
            queryKey: correctQueryKey,
            exists: !!cacheStateBefore,
            status: cacheStateBefore?.status,
          })

          // FIXED: Now using correct query key that matches useArtifact hook
          // useArtifact uses artifactKeys.detail(id) = ['artifacts', 'detail', id]
          console.log('[ArtifactPage] ✅ Using CORRECT query key:', correctQueryKey)

          // Invalidate artifact query to trigger refetch (CORRECT KEY)
          queryClient.invalidateQueries({ queryKey: correctQueryKey })

          // Check cache state AFTER invalidation
          const cacheStateAfter = queryClient.getQueryState(correctQueryKey)
          console.log('[ArtifactPage] 📦 Cache state AFTER invalidation:', {
            queryKey: correctQueryKey,
            exists: !!cacheStateAfter,
            status: cacheStateAfter?.status,
          })

          // If status changed, also invalidate research query
          if (payload.new.status !== payload.old?.status) {
            console.log('[ArtifactPage] Status changed, invalidating research cache')
            queryClient.invalidateQueries({ queryKey: ['research', id] })
          }
        }
      )
      .subscribe((status) => {
        console.log('[ArtifactPage] 📡 Realtime subscription status changed:', {
          artifactId: id,
          status,
          isSubscribed: status === 'SUBSCRIBED',
          channelName: `artifact-${id}`,
          timestamp: new Date().toISOString(),
        })

        if (status === 'SUBSCRIBED') {
          console.log('[ArtifactPage] ✅ Successfully subscribed to Realtime updates')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error('[ArtifactPage] ❌ Realtime subscription failed:', status)
        }
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('[ArtifactPage] 🔌 Cleaning up Realtime subscription:', {
        artifactId: id,
        channelName: `artifact-${id}`,
        timestamp: new Date().toISOString(),
      })
      supabase.removeChannel(channel)
    }
  }, [id, queryClient])

  // Handle content change with debounced save
  // Auto-transition: published → ready when user edits content
  const handleContentChange = useCallback(
    async (newContent: string) => {
      setLocalContent(newContent)
      setHasUnsavedChanges(true)

      // Auto-transition published → ready on edit
      if (artifact?.status === 'published') {
        try {
          await updateArtifact.mutateAsync({
            id: artifact.id,
            updates: { status: 'ready' },
          })
          console.log('[ArtifactPage] Auto-transitioned from published to ready on edit')
        } catch (err) {
          console.error('[ArtifactPage] Failed to transition status:', err)
        }
      }
    },
    [artifact?.id, artifact?.status, updateArtifact]
  )

  // Handle tone change (Phase 1)
  // When user changes tone, open AI assistant and request text adjustment
  const handleToneChange = useCallback((newTone: ToneOption) => {
    const previousTone = localTone
    setLocalTone(newTone)
    setHasToneChanges(true)

    // Only trigger AI assistant if there's content to adjust and tone actually changed
    if (localContent && localContent.trim().length > 0 && newTone !== previousTone) {
      // Format tone label (capitalize first letter)
      const toneLabel = newTone.charAt(0).toUpperCase() + newTone.slice(1)
      const adjustMessage = `Adjust the text to use a ${toneLabel} tone`

      console.log('[ArtifactPage] Tone changed, triggering AI assistant:', {
        artifactId: artifact?.id,
        previousTone,
        newTone,
        message: adjustMessage,
      })

      // Set the message and open AI assistant
      setInitialResearchMessage(adjustMessage)
      setIsAIAssistantOpen(true)
    }
  }, [localTone, localContent, artifact?.id])

  // Handle mark as published
  const handleMarkAsPublished = useCallback(async () => {
    if (!artifact?.id) return

    console.log('[ArtifactPage] Marking as published:', {
      artifactId: artifact.id,
      currentStatus: artifact.status,
    })

    try {
      await updateArtifact.mutateAsync({
        id: artifact.id,
        updates: { status: 'published' },
      })
      console.log('[ArtifactPage] Marked as published successfully')
    } catch (err) {
      console.error('[ArtifactPage] Failed to mark as published:', err)
    }
  }, [artifact?.id, artifact?.status, updateArtifact])

  // Auto-save content effect (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || !artifact?.id) return

    const timer = setTimeout(async () => {
      try {
        await updateArtifact.mutateAsync({
          id: artifact.id,
          updates: { content: localContent },
        })
        setHasUnsavedChanges(false)
      } catch (err) {
        console.error('Failed to auto-save content:', err)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [localContent, hasUnsavedChanges, artifact?.id, updateArtifact])

  // Auto-save tone effect (debounced)
  useEffect(() => {
    if (!hasToneChanges || !artifact?.id) return

    const timer = setTimeout(async () => {
      try {
        await updateArtifact.mutateAsync({
          id: artifact.id,
          updates: { tone: localTone },
        })
        setHasToneChanges(false)
      } catch (err) {
        console.error('Failed to auto-save tone:', err)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [localTone, hasToneChanges, artifact?.id, updateArtifact])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" data-testid="artifact-page-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Error state
  if (error || !artifact) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" data-testid="artifact-page-error">
        <h2 className="text-xl font-semibold">Artifact not found</h2>
        <p className="text-muted-foreground">
          The artifact you're looking for doesn't exist or was deleted.
        </p>
        <Button onClick={() => navigate('/portfolio')}>Back to Portfolio</Button>
      </div>
    )
  }

  // Determine research area status (processing states show loading)
  const researchStatus = isProcessingState(artifact.status)
    ? 'loading'
    : research.length > 0
    ? 'loaded'
    : 'empty'

  console.log('[ArtifactPage] Research status determined:', {
    artifactId: artifact.id,
    artifactStatus: artifact.status,
    researchCount: research.length,
    researchStatus,
    isResearchCollapsed,
  })

  return (
    <div className="flex h-full flex-col" data-testid="artifact-page">
      {/* Header */}
      <div className="flex items-center gap-4 border-b px-4 py-3" data-testid="artifact-page-header">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/portfolio')}
          className="shrink-0"
          data-testid="artifact-page-back-button"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">
            {artifact.title || 'Untitled'}
          </h1>
        </div>

        {/* AI Assistant button */}
        <Button
          variant="secondary"
          className="gap-2"
          onClick={() => setIsAIAssistantOpen(true)}
          data-testid="artifact-page-ai-assistant-button"
        >
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Button>

        {/* Phase 1: Start Research button (only visible when draft) */}
        {artifact.status === 'draft' && (
          <Button
            onClick={() => {
              // Artifact ID provided via screen context, not in message text
              const contentMessage = `Create content: "${artifact.title}"`
              console.log('[ArtifactPage] Create Content clicked:', {
                artifactId: artifact.id,
                artifactTitle: artifact.title,
                artifactStatus: artifact.status,
                contentMessage,
              })
              // Set the content creation message to auto-send
              setInitialResearchMessage(contentMessage)
              // Open AI Assistant (message will be sent by ChatPanel)
              setIsAIAssistantOpen(true)
            }}
            className="gap-2"
            data-testid="artifact-page-create-content-button"
          >
            <Sparkles className="h-4 w-4" />
            Create Content
          </Button>
        )}

        {/* Mark as Published button (visible when ready) */}
        {artifact.status === 'ready' && (
          <Button
            onClick={handleMarkAsPublished}
            disabled={updateArtifact.isPending}
            className="gap-2"
            data-testid="artifact-page-mark-published-button"
          >
            {updateArtifact.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Mark as Published
          </Button>
        )}
      </div>

      {/* Main Area: Vertical Stack - Research (top) + Editor (bottom) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Research Area - Collapsible at top (default: collapsed) */}
        <div className={isResearchCollapsed ? 'h-auto' : 'h-1/3 min-h-[300px]'}>
          <ResearchArea
            artifactId={artifact.id}
            research={research}
            status={researchStatus}
            error={undefined}
            onRetry={undefined}
            onManualEntry={undefined}
            isCollapsed={isResearchCollapsed}
            onCollapsedChange={setIsResearchCollapsed}
          />
        </div>

        {/* Editor Area - Collapsible below research (default: expanded) */}
        <div className={isEditorCollapsed ? 'h-auto' : 'flex-1 overflow-hidden'}>
          <ArtifactEditor
            artifactId={artifact.id}
            content={localContent}
            onContentChange={handleContentChange}
            title={artifact.title || undefined}
            artifactType={artifact.type}
            status={artifact.status}
            visualsMetadata={artifact.visuals_metadata}
            isSaving={updateArtifact.isPending || hasUnsavedChanges || hasToneChanges}
            tone={localTone}
            onToneChange={handleToneChange}
            className="h-full"
            isCollapsed={isEditorCollapsed}
            editable={!isProcessingState(artifact.status)}
            data-testid="artifact-editor"
            onCollapsedChange={setIsEditorCollapsed}
          />
        </div>
      </div>

      {/* AI Assistant Sheet */}
      <Sheet
        open={isAIAssistantOpen}
        onOpenChange={(open) => {
          setIsAIAssistantOpen(open)
          // Clear initial message when sheet closes
          if (!open) {
            setInitialResearchMessage(undefined)
          }
        }}
      >
        <SheetContent side="right" className="w-[450px] sm:w-[650px] p-0" data-portal-ignore-click-outside data-testid="ai-assistant-panel">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Assistant
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)]">
            <ChatPanel
              contextKey={`artifact:${id}`}
              title="Content Assistant"
              showHeader={false}
              height="100%"
              initialMessage={initialResearchMessage}
              screenContext={screenContext}
              data-testid="ai-chat-panel"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default ArtifactPage
