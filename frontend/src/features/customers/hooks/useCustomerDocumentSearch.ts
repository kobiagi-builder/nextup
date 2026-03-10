/**
 * Customer Document Search Hook (formerly useCustomerArtifactSearch.ts)
 *
 * Searches customer documents by title via the backend API.
 * Used for cross-module linking (portfolio -> customer documents).
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CustomerDocumentSearchResult {
  id: string
  title: string
  type: string
  status: string
  customer_id: string
  customer_name: string
}

export function useCustomerDocumentSearch(query: string) {
  return useQuery({
    queryKey: ['customer-document-search', query],
    queryFn: async () => {
      const encoded = encodeURIComponent(query)
      const res = await api.get<{ documents: CustomerDocumentSearchResult[]; count: number }>(
        `/api/customers/documents/search?q=${encoded}`
      )
      return res.documents
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}
