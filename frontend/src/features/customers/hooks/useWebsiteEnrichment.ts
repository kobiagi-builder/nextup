/**
 * useWebsiteEnrichment
 *
 * Calls backend to enrich customer data from a company website URL.
 * Returns mutation for on-demand enrichment with loading state.
 */

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface WebsiteEnrichmentResponse {
  enriched: boolean
  message?: string
  name?: string
  about?: string
  vertical?: string
  enrichment?: {
    employee_count: string
    about: string
    industry: string
    specialties: string[]
  }
  website_url?: string
}

export function useWebsiteEnrichment() {
  return useMutation({
    mutationFn: async (websiteUrl: string) => {
      return api.post<WebsiteEnrichmentResponse>('/api/customers/enrich-from-website', {
        website_url: websiteUrl,
      })
    },
  })
}
