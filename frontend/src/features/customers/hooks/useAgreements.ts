/**
 * Agreement React Query Hooks
 *
 * Data hooks for CRUD operations on customer agreements.
 * Reads use Supabase directly (RLS-enforced), mutations use backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { customerKeys } from './useCustomers'
import type {
  Agreement,
  CreateAgreementInput,
  UpdateAgreementInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const agreementKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'agreements'] as const,
  list: (customerId: string) => [...agreementKeys.all(customerId), 'list'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all agreements for a customer.
 * Uses Supabase directly (RLS enforces ownership via is_customer_owner).
 */
export function useAgreements(customerId: string | null) {
  return useQuery({
    queryKey: agreementKeys.list(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_agreements')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as Agreement[]
    },
    enabled: !!customerId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new agreement.
 */
export function useCreateAgreement(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAgreementInput) => {
      return api.post<Agreement>(`/api/customers/${customerId}/agreements`, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Update an agreement.
 */
export function useUpdateAgreement(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAgreementInput & { id: string }) => {
      return api.put<Agreement>(`/api/customers/${customerId}/agreements/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Delete an agreement.
 */
export function useDeleteAgreement(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/customers/${customerId}/agreements/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}
