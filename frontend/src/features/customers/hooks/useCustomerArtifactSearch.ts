/**
 * Customer Artifact Search Hook
 *
 * Searches customer artifacts by title via the backend API.
 * Used for cross-module linking (portfolio -> customer artifacts).
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface CustomerArtifactSearchResult {
  id: string
  title: string
  type: string
  status: string
  customer_id: string
  customer_name: string
}

export function useCustomerArtifactSearch(query: string) {
  return useQuery({
    queryKey: ['customer-artifact-search', query],
    queryFn: async () => {
      const encoded = encodeURIComponent(query)
      const res = await api.get<{ artifacts: CustomerArtifactSearchResult[]; count: number }>(
        `/api/customers/artifacts/search?q=${encoded}`
      )
      return res.artifacts
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}
