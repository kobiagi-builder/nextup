/**
 * Extract Profile Mutation Hook
 *
 * Fires POST /api/onboarding/extract-profile and transitions
 * the store to 'extracting' state on 202 success.
 */

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'

interface ExtractProfileInput {
  websiteUrl?: string
  linkedInUrl?: string
  pastedText?: string
}

export function useExtractProfile() {
  const setExtractionStatus = useOnboardingWizardStore((s) => s.setExtractionStatus)

  return useMutation({
    mutationFn: async (input: ExtractProfileInput) => {
      setExtractionStatus('submitted')
      const response = await api.post<{ message: string; status: string }>(
        '/api/onboarding/extract-profile',
        input
      )
      return response
    },
    onSuccess: () => {
      // 202 received — background extraction is running
      setExtractionStatus('extracting')
    },
    onError: () => {
      setExtractionStatus('failed')
    },
  })
}
