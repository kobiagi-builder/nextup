/**
 * Initiative React Query Hooks (formerly useProjects.ts)
 *
 * Data hooks for CRUD operations on customer initiatives.
 * Reads use Supabase directly (RLS-enforced), mutations use backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { customerKeys } from './useCustomers'
import type {
  InitiativeWithCounts,
  CreateInitiativeInput,
  UpdateInitiativeInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const initiativeKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'initiatives'] as const,
  list: (customerId: string) => [...initiativeKeys.all(customerId), 'list'] as const,
  detail: (customerId: string, initiativeId: string) =>
    [...initiativeKeys.all(customerId), 'detail', initiativeId] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all initiatives for a customer with document counts.
 * Uses Supabase directly (RLS enforces ownership via is_customer_owner).
 */
export function useInitiatives(customerId: string | null) {
  return useQuery({
    queryKey: initiativeKeys.list(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_initiatives')
        .select('*, customer_documents(count)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform nested count to flat documents_count
      return (data ?? []).map((row: Record<string, unknown>) => {
        const { customer_documents, ...initiative } = row
        const counts = customer_documents as Array<{ count: number }> | undefined
        return {
          ...initiative,
          documents_count: counts?.[0]?.count ?? 0,
        } as InitiativeWithCounts
      })
    },
    enabled: !!customerId,
  })
}

/**
 * Fetch a single initiative by ID with document count.
 * Uses backend API for the enriched response.
 */
export function useInitiative(customerId: string | null, initiativeId: string | null) {
  return useQuery({
    queryKey: initiativeKeys.detail(customerId ?? '', initiativeId ?? ''),
    queryFn: async () => {
      if (!customerId || !initiativeId) return null
      return api.get<InitiativeWithCounts>(`/api/customers/${customerId}/initiatives/${initiativeId}`)
    },
    enabled: !!customerId && !!initiativeId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new initiative.
 */
export function useCreateInitiative(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateInitiativeInput) => {
      return api.post<InitiativeWithCounts>(`/api/customers/${customerId}/initiatives`, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativeKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Update an initiative.
 */
export function useUpdateInitiative(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateInitiativeInput & { id: string }) => {
      return api.put<InitiativeWithCounts>(`/api/customers/${customerId}/initiatives/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativeKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Delete an initiative and its associated documents.
 */
export function useDeleteInitiative(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/customers/${customerId}/initiatives/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativeKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}
