/**
 * Referenced-By Artifacts Hook
 *
 * Queries portfolio artifacts that reference a given customer artifact
 * via metadata->'linkedCustomerArtifacts' JSONB containment.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ReferencedByArtifact {
  id: string
  title: string | null
  type: string
}

export function useReferencedByArtifacts(customerArtifactId: string | null) {
  return useQuery({
    queryKey: ['referenced-by', customerArtifactId],
    queryFn: async () => {
      if (!customerArtifactId) return []

      const { data, error } = await supabase
        .from('artifacts')
        .select('id, title, type')
        .contains('metadata', { linkedCustomerArtifacts: [{ id: customerArtifactId }] })

      if (error) throw error
      return (data ?? []) as ReferencedByArtifact[]
    },
    enabled: !!customerArtifactId,
    staleTime: 60_000,
  })
}
