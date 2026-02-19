/**
 * Image Generation React Query Hooks (Phase 3)
 *
 * Data hooks for image generation operations:
 * - Approve/reject image descriptions
 * - Generate final images
 * - Regenerate specific images
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase'
import { artifactKeys } from './useArtifacts'

// =============================================================================
// Mutations
// =============================================================================

/**
 * Approve image descriptions
 */
export function useApproveImageDescriptions(artifactId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (imageIds: string[]) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await api.post(
        `/api/artifacts/${artifactId}/images/approve`,
        {
          approvedIds: imageIds,
          rejectedIds: [],
        },
        { token }
      )

      return response
    },
    onSuccess: () => {
      // Invalidate artifact detail query to refetch updated visuals_metadata
      queryClient.invalidateQueries({ queryKey: artifactKeys.detail(artifactId) })
    },
  })
}

/**
 * Reject image descriptions
 */
export function useRejectImageDescriptions(artifactId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (imageIds: string[]) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await api.post(
        `/api/artifacts/${artifactId}/images/approve`,
        {
          approvedIds: [],
          rejectedIds: imageIds,
        },
        { token }
      )

      return response
    },
    onSuccess: () => {
      // Invalidate artifact detail query to refetch updated visuals_metadata
      queryClient.invalidateQueries({ queryKey: artifactKeys.detail(artifactId) })
    },
  })
}

/**
 * Generate final images for approved descriptions
 */
export function useGenerateFinalImages(artifactId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await api.post(
        `/api/artifacts/${artifactId}/images/generate`,
        undefined,
        { token }
      )

      return response
    },
    onSuccess: () => {
      // Invalidate artifact detail query to refetch updated status and visuals_metadata
      queryClient.invalidateQueries({ queryKey: artifactKeys.detail(artifactId) })
    },
  })
}

/**
 * Regenerate a specific image
 */
export function useRegenerateImage(artifactId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ imageId, description }: { imageId: string; description: string }) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await api.post(
        `/api/artifacts/${artifactId}/images/${imageId}/regenerate`,
        { description },
        { token }
      )

      return response
    },
    onSuccess: () => {
      // Invalidate artifact detail query to refetch updated visuals_metadata
      queryClient.invalidateQueries({ queryKey: artifactKeys.detail(artifactId) })
    },
  })
}

/**
 * Combined hook for all image generation operations
 */
export function useImageGeneration(artifactId: string) {
  const approveDescriptions = useApproveImageDescriptions(artifactId)
  const rejectDescriptions = useRejectImageDescriptions(artifactId)
  const generateFinals = useGenerateFinalImages(artifactId)
  const regenerateImage = useRegenerateImage(artifactId)

  return {
    approveDescriptions: approveDescriptions.mutateAsync,
    rejectDescriptions: rejectDescriptions.mutateAsync,
    generateFinals: generateFinals.mutateAsync,
    regenerateImage: regenerateImage.mutateAsync,
    isLoading:
      approveDescriptions.isPending ||
      rejectDescriptions.isPending ||
      generateFinals.isPending ||
      regenerateImage.isPending,
  }
}
