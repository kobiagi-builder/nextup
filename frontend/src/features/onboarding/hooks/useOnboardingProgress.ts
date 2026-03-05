/**
 * Onboarding Progress React Query Hooks
 *
 * Manages fetching and updating onboarding progress from the backend.
 * Supports polling for extraction results via refetchInterval.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { OnboardingProgress } from '../types/onboarding'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'

// =============================================================================
// Query Keys
// =============================================================================

export const onboardingKeys = {
  all: ['onboarding'] as const,
  progress: () => [...onboardingKeys.all, 'progress'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch current user's onboarding progress.
 * Returns null if no onboarding row exists (new user).
 *
 * When extractionStatus === 'extracting', polls every 2s to check
 * for extraction_results arriving from the background job.
 */
export function useOnboardingProgress() {
  const extractionStatus = useOnboardingWizardStore((s) => s.extractionStatus)

  return useQuery({
    queryKey: onboardingKeys.progress(),
    queryFn: async () => {
      const response = await api.get<{ progress: OnboardingProgress | null }>(
        '/api/onboarding/progress'
      )
      return response.progress
    },
    refetchInterval: () => {
      // Poll every 2s while extraction is running
      if (extractionStatus === 'extracting' || extractionStatus === 'submitted') {
        return 2000
      }
      return false
    },
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Save onboarding progress (current_step, step_data, completed_at).
 * Never writes extraction_results — that's handled by the extract endpoint.
 */
export function useSaveOnboardingProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      current_step?: number
      step_data?: Record<string, unknown>
      completed_at?: string | null
    }) => {
      const response = await api.put<{ progress: OnboardingProgress }>(
        '/api/onboarding/progress',
        input
      )
      return response.progress
    },
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.progress(), data)
    },
  })
}
