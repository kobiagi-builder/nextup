/**
 * ArtifactPage Component
 *
 * Full-screen artifact editor with AI assistant.
 * Phase 1: Added tone selector and research area (60/40 split).
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { markdownToHTML, isMarkdown } from '@/lib/markdown'
import { ArrowLeft, CheckCircle, Loader2, Sparkles, Share2, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-media-query'
import { useChatLayoutStore } from '@/stores/chatLayoutStore'
import { useArtifact, useUpdateArtifact, useCreateArtifact, artifactKeys } from '../hooks/useArtifacts'
import { ArtifactEditor } from '../components/editor'
import { ResearchArea } from '../components/artifact/ResearchArea'
import { FoundationsSection } from '../components/artifact/FoundationsSection'
import { ContentGenerationLoader } from '../components/artifact/ContentGenerationLoader'
import { isProcessingState } from '../validators/stateMachine'
import { ChatPanel } from '../components'
import { useResearch } from '../hooks/useResearch'
import { useWritingCharacteristics } from '../hooks/useWritingCharacteristics'
import { useFoundationsApproval } from '../hooks/useFoundationsApproval'
import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Editor } from '@tiptap/react'
import type { ToneOption } from '../types/portfolio'
import { canCreateSocialPost } from '../types/portfolio'
import { useScreenContext } from '@/hooks/useScreenContext'
import { useEditorSelectionStore, getEditorRef } from '../stores/editorSelectionStore'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

// =============================================================================
// Component
// =============================================================================

export function ArtifactPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const prevStatusRef = useRef<string | undefined>(undefined)

  // State for enabling draft polling when content creation is triggered
  // Must be declared before useArtifact which uses it
  const [isContentCreationTriggered, setIsContentCreationTriggered] = useState(false)

  // Data hooks - enable draft polling when content creation is triggered
  const { data: artifact, isLoading, error } = useArtifact(id!, isContentCreationTriggered)
  const updateArtifact = useUpdateArtifact()
  const createArtifact = useCreateArtifact()

  // Research hook (Phase 1) - pass artifact status for intelligent polling
  const { data: research = [] } = useResearch(id!, artifact?.status)

  // Phase 4: Writing characteristics hook - polls during foundations status
  const {
    data: writingCharacteristics,
    isLoading: characteristicsLoading,
    error: characteristicsError,
  } = useWritingCharacteristics(id!, artifact?.status)

  // Phase 4: Foundations approval mutation
  const foundationsApproval = useFoundationsApproval()

  // Phase 6: Screen context for Content Agent
  // IMPORTANT: Use fresh artifact data from useArtifact (which polls during processing)
  // instead of useScreenContext (which uses stale list cache)
  const baseScreenContext = useScreenContext()

  // Create fresh screenContext with up-to-date artifact data
  const screenContext = useMemo(() => ({
    ...baseScreenContext,
    artifactId: id, // Use URL param directly
    artifactType: artifact?.type ?? baseScreenContext.artifactType,
    artifactTitle: artifact?.title ?? baseScreenContext.artifactTitle,
    artifactStatus: artifact?.status ?? baseScreenContext.artifactStatus, // CRITICAL: Fresh status from useArtifact
  }), [baseScreenContext, id, artifact?.type, artifact?.title, artifact?.status])

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

  // Chat layout (split view on desktop, Sheet on mobile)
  const isMobile = useIsMobile()
  const { openChat, closeChat, isOpen: isChatOpen, chatConfig, configVersion } = useChatLayoutStore()
  // Ref to hold handleContentImproved for use in effects declared before the callback
  const contentImprovedRef = useRef<((toolName: string, result: unknown) => void) | undefined>(undefined)

  // UI state
  const [isResearchCollapsed, setIsResearchCollapsed] = useState(true) // Default: collapsed
  const [isFoundationsCollapsed, setIsFoundationsCollapsed] = useState(true) // Default: collapsed, auto-expands on approval stage
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false) // Default: expanded

  // Phase 4: Local state for skeleton editing in FoundationsSection
  const [localSkeletonContent, setLocalSkeletonContent] = useState('')
  const [hasUnsavedSkeletonChanges, setHasUnsavedSkeletonChanges] = useState(false)

  // Phase 4: Sync skeleton content from artifact when in foundations/skeleton statuses
  useEffect(() => {
    if (artifact?.content && ['foundations', 'skeleton', 'foundations_approval'].includes(artifact.status)) {
      // Only sync if local skeleton is empty (initial load) or status just changed
      if (!localSkeletonContent) {
        let contentToSet = artifact.content
        if (isMarkdown(artifact.content)) {
          contentToSet = markdownToHTML(artifact.content)
        }
        queueMicrotask(() => setLocalSkeletonContent(contentToSet))
        console.log('[ArtifactPage] Phase 4: Synced skeleton content:', {
          artifactId: artifact.id,
          status: artifact.status,
          contentLength: contentToSet.length,
        })
      }
    }
  }, [artifact?.content, artifact?.status, artifact?.id, localSkeletonContent])

  // Phase 4: Auto-expand FoundationsSection when status reaches skeleton or foundations_approval
  useEffect(() => {
    if (artifact?.status && ['skeleton', 'foundations_approval'].includes(artifact.status)) {
      if (isFoundationsCollapsed) {
        queueMicrotask(() => setIsFoundationsCollapsed(false))
        console.log('[ArtifactPage] Phase 4: Auto-expanded FoundationsSection:', {
          artifactId: artifact.id,
          status: artifact.status,
        })
      }
    }
  }, [artifact?.status, artifact?.id, isFoundationsCollapsed])

  // Sync local content with artifact data (Phase 1: includes AI-generated skeleton)
  useEffect(() => {
    // Skip syncing during writing/humanizing - content will sync when creating_visuals arrives with fresh content
    if (artifact?.status === 'writing' || artifact?.status === 'humanity_checking') return
    // Don't overwrite user's local edits with stale server content (e.g., from auto-save response)
    if (hasUnsavedChanges) return

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

      queueMicrotask(() => {
        setLocalContent(contentToSet)
        setHasUnsavedChanges(false) // Reset unsaved changes when receiving server content
      })
    }
    if (artifact?.tone) {
      const tone = artifact.tone
      queueMicrotask(() => {
        setLocalTone(tone)
        setHasToneChanges(false)
      })
    }
  }, [artifact?.content, artifact?.tone, artifact?.id, artifact?.status, hasUnsavedChanges])

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

      // Enable aggressive polling to catch draft→research status transition
      // This is needed because Realtime subscriptions may fail in some environments
      const contentMessage = `Create content: "${artifact.title}"`
      queueMicrotask(() => {
        setIsContentCreationTriggered(true)
        openChat({
          contextKey: `artifact:${id}`,
          screenContext,
          initialMessage: contentMessage,
          onContentImproved: (...args) => contentImprovedRef.current?.(...args),
        })
        setSearchParams({}, { replace: true })
      })
    }
  }, [searchParams, setSearchParams, artifact?.title, artifact?.status, artifact?.id])

  // Auto-trigger social post creation when navigating with createSocialPost param
  useEffect(() => {
    const createSocialPost = searchParams.get('createSocialPost')
    const sourceId = searchParams.get('sourceId')

    if (createSocialPost === 'true' && sourceId && artifact?.id) {
      // Fetch source artifact content and trigger AI assistant
      const fetchAndTrigger = async () => {
        try {
          const { data: source } = await supabase
            .from('artifacts')
            .select('title, type, tags, content')
            .eq('id', sourceId)
            .single()

          if (source) {
            const socialPostMessage = `Create social post promoting this article:

Title: ${source.title || 'Untitled'}
Type: ${source.type}
Tags: ${(source.tags || []).join(', ')}
Source Artifact ID: ${sourceId}`

            queueMicrotask(() => {
              openChat({
                contextKey: `artifact:${id}`,
                screenContext,
                initialMessage: socialPostMessage,
                onContentImproved: (...args) => contentImprovedRef.current?.(...args),
              })
              setSearchParams({}, { replace: true })
            })
          } else {
            toast({ variant: 'destructive', title: 'Source not found', description: 'The original article could not be loaded.' })
            setSearchParams({}, { replace: true })
          }
        } catch (err) {
          console.error('[ArtifactPage] Failed to fetch source artifact for social post:', err)
          toast({ variant: 'destructive', title: 'Source not found', description: 'The original article could not be loaded.' })
          setSearchParams({}, { replace: true })
        }
      }
      fetchAndTrigger()
    }
  }, [searchParams, setSearchParams, artifact?.id, toast])

  // Disable content creation polling once we've transitioned out of draft status
  useEffect(() => {
    if (artifact?.status && artifact.status !== 'draft' && isContentCreationTriggered) {
      console.log('[ArtifactPage] Content creation detected - disabling draft polling:', {
        artifactId: artifact.id,
        status: artifact.status,
      })
      queueMicrotask(() => setIsContentCreationTriggered(false))
    }
  }, [artifact?.status, isContentCreationTriggered, artifact?.id])

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
    [artifact, updateArtifact]
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
      openChat({
        contextKey: `artifact:${id}`,
        screenContext,
        initialMessage: adjustMessage,
        onContentImproved: (...args) => contentImprovedRef.current?.(...args),
      })
    }
  }, [localTone, localContent, artifact?.id, id, openChat, screenContext])

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
  }, [artifact, updateArtifact])

  // Handle tags change
  const handleTagsChange = useCallback(async (tags: string[]) => {
    if (!artifact?.id) return
    try {
      await updateArtifact.mutateAsync({
        id: artifact.id,
        updates: { tags },
      })
    } catch (err) {
      console.error('[ArtifactPage] Failed to update tags:', err)
    }
  }, [artifact, updateArtifact])

  // Handle create social post from this artifact
  const handleCreateSocialPost = useCallback(async () => {
    if (!artifact?.id) return
    try {
      const created = await createArtifact.mutateAsync({
        type: 'social_post',
        title: `Social Post: ${artifact.title || 'Untitled'}`,
        tags: artifact.tags,
        metadata: {
          source_artifact_id: artifact.id,
          source_artifact_title: artifact.title,
        },
      })
      if (created) {
        navigate(`/portfolio/artifacts/${created.id}?createSocialPost=true&sourceId=${artifact.id}`)
      }
    } catch (err) {
      console.error('[ArtifactPage] Failed to create social post:', err)
    }
  }, [artifact, createArtifact, navigate])

  // Phase 4: Handle skeleton content change in FoundationsSection
  const handleSkeletonChange = useCallback((newContent: string) => {
    setLocalSkeletonContent(newContent)
    setHasUnsavedSkeletonChanges(true)
  }, [])

  // Phase 4: Handle foundations approval
  const handleFoundationsApproval = useCallback(async () => {
    if (!artifact?.id) return

    console.log('[ArtifactPage] Approving foundations:', {
      artifactId: artifact.id,
      currentStatus: artifact.status,
      hasSkeletonEdits: localSkeletonContent.length > 0,
    })

    try {
      await foundationsApproval.mutateAsync({
        artifactId: artifact.id,
        skeletonContent: localSkeletonContent || undefined,
      })
      console.log('[ArtifactPage] Foundations approved successfully')
      toast({
        title: 'Content generation started',
        description: 'The AI is now writing your content. This may take a minute.',
      })
    } catch (err) {
      console.error('[ArtifactPage] Failed to approve foundations:', err)
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: err instanceof Error ? err.message : 'Failed to start content generation',
      })
    }
  }, [artifact, localSkeletonContent, foundationsApproval, toast])

  // Handle content improvement tool results (Phase 8: apply AI changes to editor)
  const clearSelection = useEditorSelectionStore((s) => s.clearSelection)
  const handleContentImproved = useCallback((toolName: string, result: unknown) => {
    const editor = getEditorRef() as Editor | null
    if (!editor) {
      toast({ variant: 'destructive', title: 'Editor not available', description: 'Could not apply changes — editor is not active.' })
      return
    }

    const res = result as { success?: boolean; data?: Record<string, unknown>; error?: { message?: string } }
    if (!res.success || !res.data) {
      toast({ variant: 'destructive', title: 'Improvement failed', description: res.error?.message || 'The AI could not improve the content.' })
      clearSelection()
      return
    }

    if (toolName === 'improveTextContent') {
      const { improvedText } = res.data as { improvedText: string }
      const selection = useEditorSelectionStore.getState()

      if (!selection.selectedText || selection.startPos == null || selection.endPos == null) {
        toast({ variant: 'destructive', title: 'Selection lost', description: 'Could not find the original selection. Please try again.' })
        clearSelection()
        return
      }

      // Verify position still matches the original text
      let from = selection.startPos
      let to = selection.endPos
      let verified = false

      try {
        const currentText = editor.state.doc.textBetween(from, to)
        verified = currentText === selection.selectedText
      } catch {
        // Position out of bounds — document changed significantly
      }

      if (!verified) {
        // Fallback: scan document for the selected text
        let fallbackFound = false
        editor.state.doc.descendants((node, pos) => {
          if (fallbackFound || !node.isText || !node.text) return
          const idx = node.text.indexOf(selection.selectedText!)
          if (idx >= 0) {
            from = pos + idx
            to = from + selection.selectedText!.length
            fallbackFound = true
          }
        })

        if (!fallbackFound) {
          toast({ variant: 'destructive', title: 'Could not apply changes', description: 'The selected text was modified. Please select the text again and retry.' })
          clearSelection()
          return
        }
      }

      // Apply replacement as a single undoable transaction
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .insertContent(improvedText)
        .run()

      toast({ title: 'Text improved', description: 'Changes applied. Use Ctrl+Z to undo.' })
      clearSelection()
    }

    if (toolName === 'improveImageContent') {
      const { newImageUrl } = res.data as { newImageUrl: string }
      const selection = useEditorSelectionStore.getState()

      if (!selection.imageSrc || selection.imageNodePos == null) {
        toast({ variant: 'destructive', title: 'Selection lost', description: 'Could not find the original image. Please try again.' })
        clearSelection()
        return
      }

      // Find the image node at the stored position
      const node = editor.state.doc.nodeAt(selection.imageNodePos)
      if (node?.type.name === 'image') {
        const { tr } = editor.state
        tr.setNodeMarkup(selection.imageNodePos, undefined, {
          ...node.attrs,
          src: newImageUrl,
          width: null,   // Reset dimensions for new image
          height: null,
        })
        editor.view.dispatch(tr)
        toast({ title: 'Image regenerated', description: 'New image applied. Use Ctrl+Z to undo.' })
      } else {
        // Fallback: search for image by src
        let found = false
        editor.state.doc.descendants((n, pos) => {
          if (found) return false
          if (n.type.name === 'image' && n.attrs.src === selection.imageSrc) {
            const { tr } = editor.state
            tr.setNodeMarkup(pos, undefined, {
              ...n.attrs,
              src: newImageUrl,
              width: null,
              height: null,
            })
            editor.view.dispatch(tr)
            found = true
            return false
          }
        })

        if (found) {
          toast({ title: 'Image regenerated', description: 'New image applied. Use Ctrl+Z to undo.' })
        } else {
          toast({ variant: 'destructive', title: 'Could not replace image', description: 'The original image was removed. Please try again.' })
        }
      }
      clearSelection()
    }
  }, [toast, clearSelection])
  // Keep ref current for effects declared before handleContentImproved
  useEffect(() => {
    contentImprovedRef.current = handleContentImproved
  }, [handleContentImproved])

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

  // Auto-save skeleton content (debounced) - saves edits during skeleton review
  useEffect(() => {
    if (!hasUnsavedSkeletonChanges || !artifact?.id) return
    // Only save during skeleton-editable statuses
    if (!['skeleton', 'foundations_approval'].includes(artifact.status)) return

    const timer = setTimeout(async () => {
      try {
        await updateArtifact.mutateAsync({
          id: artifact.id,
          updates: { content: localSkeletonContent },
        })
        setHasUnsavedSkeletonChanges(false)
      } catch (err) {
        console.error('Failed to auto-save skeleton:', err)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [localSkeletonContent, hasUnsavedSkeletonChanges, artifact?.id, artifact?.status, updateArtifact])

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
    <div className="flex flex-col" data-testid="artifact-page">
      {/* Header */}
      <div className="flex items-center gap-4 border-b px-4 py-3" data-testid="artifact-page-header">
        {/* AI Assistant toggle button — leftmost */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => isChatOpen ? closeChat() : openChat({
            contextKey: `artifact:${id}`,
            screenContext,
            onContentImproved: handleContentImproved,
          })}
          data-testid="artifact-page-ai-assistant-button"
          title={isChatOpen ? 'Close panel' : 'Open AI Assistant'}
        >
          {isChatOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>
        <div className="h-6 w-px bg-border" />
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
              // Enable aggressive polling to catch draft→research status transition
              setIsContentCreationTriggered(true)
              // Set the content creation message to auto-send
              // Open AI Assistant (message will be sent by ChatPanel)
              openChat({
                contextKey: `artifact:${id}`,
                screenContext,
                initialMessage: contentMessage,
                onContentImproved: handleContentImproved,
              })
            }}
            className="gap-2"
            data-testid="artifact-page-create-content-button"
          >
            <Sparkles className="h-4 w-4" />
            Create Content
          </Button>
        )}

        {/* Create Social Post button (visible for eligible artifacts) */}
        {canCreateSocialPost(artifact) && (
          <Button
            variant="secondary"
            onClick={handleCreateSocialPost}
            disabled={createArtifact.isPending}
            className="gap-2"
            data-testid="artifact-page-create-social-post-button"
          >
            <Share2 className="h-4 w-4" />
            Create Social Post
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
      <div className="flex-1 flex flex-col">
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

        {/* Phase 4: Foundations Section - Between Research and Editor */}
        {/* Shows writing characteristics + editable skeleton during foundations workflow */}
        <div className={isFoundationsCollapsed ? 'h-auto' : 'h-1/3 min-h-[300px]'}>
          <FoundationsSection
            artifactId={artifact.id}
            status={artifact.status}
            characteristics={writingCharacteristics ?? undefined}
            characteristicsLoading={characteristicsLoading}
            characteristicsError={characteristicsError?.message}
            skeletonContent={localSkeletonContent || localContent}
            onSkeletonChange={handleSkeletonChange}
            onApprove={handleFoundationsApproval}
            approvalLoading={foundationsApproval.isPending}
            isCollapsed={isFoundationsCollapsed}
            onCollapsedChange={setIsFoundationsCollapsed}
          />
        </div>

        {/* Writing/Humanizing Phase: Show shimmer loader instead of editor */}
        {(artifact.status === 'writing' || artifact.status === 'humanity_checking') && (
          <div className="flex-1 overflow-hidden">
            <ContentGenerationLoader artifactType={artifact.type} />
          </div>
        )}

        {/* Editor Area - Collapsible below research (default: expanded) */}
        {/* Phase 4: HIDE editor during skeleton workflow + writing (shimmer shown above) */}
        {/* Content area should only appear AFTER writing completes */}
        {!['foundations', 'skeleton', 'foundations_approval', 'writing', 'humanity_checking'].includes(artifact.status) && (
          <div className={isEditorCollapsed ? 'h-auto' : 'flex-1'}>
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
              tags={artifact.tags ?? []}
              onTagsChange={handleTagsChange}
              onTextAIClick={() => openChat({
                contextKey: `artifact:${id}`,
                screenContext,
                onContentImproved: handleContentImproved,
              })}
              onImageAIClick={() => openChat({
                contextKey: `artifact:${id}`,
                screenContext,
                onContentImproved: handleContentImproved,
              })}
            />
          </div>
        )}
      </div>

      {/* Mobile-only: AI Assistant Sheet overlay (desktop uses AppShell split view) */}
      {isMobile && isChatOpen && chatConfig && (
        <Sheet open onOpenChange={(open) => { if (!open) closeChat() }}>
          <SheetContent side="right" className="w-full p-0" data-portal-ignore-click-outside data-testid="ai-assistant-panel">
            <div className="h-full">
              <ChatPanel
                key={configVersion}
                contextKey={chatConfig.contextKey}
                title={chatConfig.title || 'Content Assistant'}
                showHeader={true}
                height="100%"
                initialMessage={chatConfig.initialMessage}
                screenContext={chatConfig.screenContext}
                onContentImproved={chatConfig.onContentImproved}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

export default ArtifactPage
