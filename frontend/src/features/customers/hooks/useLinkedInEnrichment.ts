/**
 * useLinkedInEnrichment
 *
 * Calls backend to enrich customer data from a LinkedIn URL.
 * Returns mutation for on-demand enrichment with loading state.
 */

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface LinkedInEnrichmentResponse {
  enriched: boolean
  message?: string
  type?: 'company' | 'person'
  name?: string
  about?: string
  vertical?: string
  enrichment?: {
    employee_count: string
    about: string
    industry: string
    specialties: string[]
  }
  team_member?: {
    name: string
    role?: string
    linkedin_url: string
  }
  linkedin_company_url?: string
}

export function useLinkedInEnrichment() {
  return useMutation({
    mutationFn: async (linkedinUrl: string) => {
      return api.post<LinkedInEnrichmentResponse>('/api/customers/enrich-from-linkedin', {
        linkedin_url: linkedinUrl,
      })
    },
  })
}
