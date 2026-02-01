/**
 * useResearch Hook (Phase 1)
 *
 * Manages research data fetching and manual entry for artifacts.
 * Polls for updates when artifact status is 'in_progress' or when ready but no research loaded yet.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ArtifactResearch, SourceType, ArtifactStatus } from '../types/portfolio'

// =============================================================================
// Fetch Research Query
// =============================================================================

export function useResearch(artifactId: string, artifactStatus?: ArtifactStatus) {
  return useQuery<ArtifactResearch[]>({
    queryKey: ['research', artifactId],
    queryFn: async () => {
      console.log('[useResearch] Fetching research:', {
        artifactId,
        artifactStatus,
        timestamp: new Date().toISOString(),
      })

      try {
        const research = await api.get<ArtifactResearch[]>(`/api/artifacts/${artifactId}/research`)
        console.log('[useResearch] Research fetched successfully:', {
          artifactId,
          researchCount: research.length,
          timestamp: new Date().toISOString(),
        })
        return research
      } catch (error) {
        console.error('[useResearch] Failed to fetch research:', {
          artifactId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
        return []
      }
    },
    enabled: !!artifactId,
    // Poll only during active processing states
    // Status flow: draft → research → skeleton → writing → creating_visuals → ready → published
    // Once status is 'ready' or beyond, processing is complete - no need to poll
    refetchInterval: () => {
      // Processing states that require polling
      const processingStates = ['research', 'skeleton', 'writing', 'creating_visuals']
      const isInProcessingState = artifactStatus ? processingStates.includes(artifactStatus) : false

      if (isInProcessingState) {
        console.log('[useResearch] Polling enabled:', {
          artifactId,
          artifactStatus,
          reason: 'in_processing_state',
        })
        return 2000 // Poll every 2 seconds
      }

      return false // Stop polling once processing is complete
    },
  })
}

// =============================================================================
// Add Manual Research Entry Mutation
// =============================================================================

interface AddResearchInput {
  artifactId: string
  sourceType: SourceType
  sourceName: string
  sourceUrl?: string
  excerpt: string
}

export function useAddResearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddResearchInput) => {
      const newResearch = await api.post<ArtifactResearch>(
        `/api/artifacts/${input.artifactId}/research`,
        {
          source_type: input.sourceType,
          source_name: input.sourceName,
          source_url: input.sourceUrl,
          excerpt: input.excerpt,
          relevance_score: 1.0, // Manual entries get max relevance
        }
      )
      return newResearch
    },
    onSuccess: (_, variables) => {
      // Invalidate research query to refetch
      queryClient.invalidateQueries({ queryKey: ['research', variables.artifactId] })
    },
  })
}

// =============================================================================
// Delete Research Entry Mutation
// =============================================================================

interface DeleteResearchInput {
  artifactId: string
  researchId: string
}

export function useDeleteResearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DeleteResearchInput) => {
      await api.delete(`/api/artifacts/${input.artifactId}/research/${input.researchId}`)
    },
    onSuccess: (_, variables) => {
      // Invalidate research query to refetch
      queryClient.invalidateQueries({ queryKey: ['research', variables.artifactId] })
    },
  })
}
