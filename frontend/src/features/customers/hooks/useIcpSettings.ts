/**
 * ICP Settings React Query Hooks
 *
 * Data hooks for user-level ICP settings (GET + PUT).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { IcpSettings, IcpSettingsInput } from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const icpSettingsKeys = {
  all: ['icp-settings'] as const,
  mine: () => [...icpSettingsKeys.all, 'mine'] as const,
}

// =============================================================================
// Queries
// =============================================================================

export function useIcpSettings() {
  return useQuery({
    queryKey: icpSettingsKeys.mine(),
    queryFn: async () => {
      const res = await api.get<{ data: IcpSettings | null }>('/api/icp-settings')
      return res.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// =============================================================================
// Mutations
// =============================================================================

export function useUpsertIcpSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: IcpSettingsInput) => {
      const res = await api.put<{ data: IcpSettings }>('/api/icp-settings', input)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: icpSettingsKeys.all })
    },
  })
}
