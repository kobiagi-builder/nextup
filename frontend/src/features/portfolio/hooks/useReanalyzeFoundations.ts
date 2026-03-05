/**
 * useReanalyzeFoundations Hook
 *
 * Mutation to re-run foundations analysis (writing characteristics + skeleton)
 * with a new set of selected writing references. Updates artifact metadata and
 * restarts the foundations pipeline steps.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase'
import { artifactKeys } from './useArtifacts'
import { writingCharacteristicsKeys } from './useWritingCharacteristics'

// =============================================================================
// Types
// =============================================================================

interface ReanalyzeFoundationsInput {
  artifactId: string
  selectedReferenceIds: string[]
}

interface ReanalyzeFoundationsResponse {
  success: boolean
  message: string
}

// =============================================================================
// Hook
// =============================================================================

export function useReanalyzeFoundations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      artifactId,
      selectedReferenceIds,
    }: ReanalyzeFoundationsInput) => {
      const token = await getAccessToken()
      const response = await api.post<ReanalyzeFoundationsResponse>(
        `/api/artifacts/${artifactId}/re-analyze-foundations`,
        { selectedReferenceIds },
        token ? { token } : undefined,
      )
      return response
    },
    onSuccess: (_, variables) => {
      // Invalidate artifact to pick up new status + metadata
      queryClient.invalidateQueries({
        queryKey: artifactKeys.detail(variables.artifactId),
      })
      // Invalidate writing characteristics to refetch after re-analysis
      queryClient.invalidateQueries({
        queryKey: writingCharacteristicsKeys.detail(variables.artifactId),
      })
    },
  })
}
