/**
 * useFoundationsApproval Hook (Phase 4)
 *
 * Mutation to approve foundations and continue the content pipeline.
 * Triggers status change from 'foundations_approval' to 'writing'.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { artifactKeys } from './useArtifacts'

// =============================================================================
// Types
// =============================================================================

interface ApproveFoundationsResponse {
  success: boolean
  message: string
  artifactId: string
  newStatus: string
}

interface ApproveFoundationsInput {
  artifactId: string
  skeletonContent?: string // Optional: Send updated skeleton content if edited
}

// =============================================================================
// Approve Foundations Mutation
// =============================================================================

export function useFoundationsApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ artifactId, skeletonContent }: ApproveFoundationsInput) => {
      console.log('[useFoundationsApproval] Approving foundations:', {
        artifactId,
        hasSkeletonUpdate: !!skeletonContent,
        timestamp: new Date().toISOString(),
      })

      const response = await api.post<ApproveFoundationsResponse>(
        `/api/artifacts/${artifactId}/approve-foundations`,
        skeletonContent ? { skeleton_content: skeletonContent } : {}
      )

      console.log('[useFoundationsApproval] Approval successful:', {
        artifactId,
        newStatus: response.newStatus,
        timestamp: new Date().toISOString(),
      })

      return response
    },
    onSuccess: (_, variables) => {
      console.log('[useFoundationsApproval] Invalidating artifact cache:', {
        artifactId: variables.artifactId,
        timestamp: new Date().toISOString(),
      })

      // Invalidate artifact query to refetch with new status
      queryClient.invalidateQueries({
        queryKey: artifactKeys.detail(variables.artifactId),
      })

      // Also invalidate all artifact lists to update status in portfolio view
      queryClient.invalidateQueries({
        queryKey: artifactKeys.lists(),
      })
    },
    onError: (error, variables) => {
      console.error('[useFoundationsApproval] Approval failed:', {
        artifactId: variables.artifactId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}

export default useFoundationsApproval
