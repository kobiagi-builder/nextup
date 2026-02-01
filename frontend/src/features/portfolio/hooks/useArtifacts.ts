/**
 * Artifacts React Query Hooks
 *
 * Data hooks for CRUD operations on artifacts.
 * Uses Supabase directly (hybrid data architecture).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Json, TableInsert, TableUpdate } from '@/types/supabase'
import type {
  Artifact,
  ArtifactType,
  ArtifactStatus,
  CreateArtifactInput,
  UpdateArtifactInput,
} from '../types/portfolio'

// =============================================================================
// Query Keys
// =============================================================================

export const artifactKeys = {
  all: ['artifacts'] as const,
  lists: () => [...artifactKeys.all, 'list'] as const,
  list: (filters: { type?: ArtifactType | 'all'; status?: ArtifactStatus | 'all' }) =>
    [...artifactKeys.lists(), filters] as const,
  details: () => [...artifactKeys.all, 'detail'] as const,
  detail: (id: string) => [...artifactKeys.details(), id] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all artifacts with optional filters
 */
export function useArtifacts(options?: {
  type?: ArtifactType | 'all'
  status?: ArtifactStatus | 'all'
  search?: string
}) {
  const { type = 'all', status = 'all', search = '' } = options ?? {}

  return useQuery({
    queryKey: artifactKeys.list({ type, status }),
    queryFn: async () => {
      let query = supabase
        .from('artifacts')
        .select('*')
        .order('updated_at', { ascending: false })

      // Apply type filter
      if (type !== 'all') {
        query = query.eq('type', type)
      }

      // Apply status filter
      if (status !== 'all') {
        query = query.eq('status', status as any) // Type cast for new statuses not yet in generated types
      }

      // Apply search filter
      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Artifact[]
    },
  })
}

/**
 * Fetch a single artifact by ID
 *
 * Auto-polls every 2 seconds during processing states (research, skeleton, writing, creating_visuals)
 */
export function useArtifact(id: string | null, enableDraftPolling = false) {
  const queryKey = artifactKeys.detail(id ?? '')

  console.log('[useArtifact] 🔑 Query key:', {
    queryKey,
    artifactId: id,
    enableDraftPolling,
    note: 'This key must match Realtime invalidation for real-time updates to work'
  })

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!id) return null

      console.log('[useArtifact] 🔍 Fetching artifact from database:', id)

      const { data, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('[useArtifact] ❌ Error fetching artifact:', error)
        throw error
      }

      console.log('[useArtifact] ✅ Artifact fetched:', {
        id: data.id,
        status: data.status,
        contentLength: data.content?.length || 0,
      })

      return data as Artifact
    },
    enabled: !!id,
    // Poll for status changes during content creation workflow
    // Processing states: research, skeleton, writing, creating_visuals, foundations, foundations_approval
    // NOTE: This is a FALLBACK - Realtime should handle updates in real-time
    refetchInterval: (query) => {
      const artifact = query.state.data as Artifact | undefined

      // Processing states that require polling (editor is locked during these)
      // NOTE: 'skeleton' and 'foundations_approval' are NOT included because they are
      // "paused for approval" states - the pipeline is waiting for user action, not processing
      const processingStates = ['research', 'foundations', 'writing', 'creating_visuals']

      if (artifact?.status && processingStates.includes(artifact.status)) {
        console.log('[useArtifact] ⏱️ POLLING (Fallback): Processing state detected:', {
          artifactId: artifact.id,
          status: artifact.status,
          note: 'Realtime should update faster - if you see this, check Realtime subscription'
        })
        return 2000 // Poll every 2 seconds
      }

      // Poll during draft state when content creation is expected
      // This handles the case where Realtime fails and we need to catch draft→research transition
      if (artifact?.status === 'draft' && enableDraftPolling) {
        console.log('[useArtifact] ⏱️ POLLING (Draft): Content creation in progress, waiting for status change:', {
          artifactId: artifact.id,
          status: artifact.status,
          note: 'Polling to catch draft→research transition when Realtime fails'
        })
        return 3000 // Poll every 3 seconds during draft when content creation triggered
      }

      // Poll once more when ready to ensure content is synced
      if (artifact?.status === 'ready' && !artifact?.content) {
        console.log('[useArtifact] ⏱️ POLLING (Fallback): Waiting for content:', {
          artifactId: artifact.id,
          status: artifact.status,
          hasContent: !!artifact.content,
          note: 'Realtime should have provided content - check Realtime subscription'
        })
        return 2000 // Poll until content appears
      }

      console.log('[useArtifact] ✅ Polling stopped - artifact in stable state:', {
        status: artifact?.status,
        enableDraftPolling,
        note: 'Realtime subscription should handle future updates'
      })

      return false // Stop polling when not in processing state
    },
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new artifact
 */
export function useCreateArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateArtifactInput) => {
      // Build insert payload with proper type
      const insertData: TableInsert<'artifacts'> = {
        type: input.type,
        title: input.title ?? null,
        content: input.content ?? null,
        tone: input.tone ?? 'professional',
        metadata: (input.metadata ?? {}) as Json,
        tags: input.tags ?? [],
        status: 'draft',
      }

      const { data, error } = await supabase
        .from('artifacts')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data as Artifact
    },
    onSuccess: () => {
      // Invalidate all artifact lists
      queryClient.invalidateQueries({ queryKey: artifactKeys.lists() })
    },
  })
}

/**
 * Update an existing artifact
 */
export function useUpdateArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateArtifactInput
    }) => {
      const { data, error } = await supabase
        .from('artifacts')
        .update(updates as TableUpdate<'artifacts'>)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Artifact
    },
    onSuccess: (data) => {
      // Update the specific artifact in cache
      queryClient.setQueryData(artifactKeys.detail(data.id), data)
      // Invalidate lists (status/type might have changed)
      queryClient.invalidateQueries({ queryKey: artifactKeys.lists() })
    },
  })
}

/**
 * Delete an artifact
 */
export function useDeleteArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: artifactKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: artifactKeys.lists() })
    },
  })
}

/**
 * Publish an artifact (update status and set published_at)
 */
export function usePublishArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      publishedUrl,
    }: {
      id: string
      publishedUrl?: string
    }) => {
      const updateData: TableUpdate<'artifacts'> = {
        status: 'published',
        published_at: new Date().toISOString(),
        published_url: publishedUrl ?? null,
      }

      const { data, error } = await supabase
        .from('artifacts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Artifact
    },
    onSuccess: (data) => {
      queryClient.setQueryData(artifactKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: artifactKeys.lists() })
    },
  })
}
