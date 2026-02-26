/**
 * Receivable React Query Hooks
 *
 * Data hooks for CRUD operations on customer receivables + financial summary.
 * Reads use Supabase directly (RLS-enforced), mutations use backend API.
 * Financial summary uses backend API (PostgreSQL NUMERIC arithmetic).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { customerKeys } from './useCustomers'
import type {
  Receivable,
  FinancialSummary,
  CreateReceivableInput,
  UpdateReceivableInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const receivableKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'receivables'] as const,
  list: (customerId: string) => [...receivableKeys.all(customerId), 'list'] as const,
  summary: (customerId: string) => [...receivableKeys.all(customerId), 'summary'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all receivables for a customer.
 * Uses Supabase directly (RLS enforces ownership via is_customer_owner).
 */
export function useReceivables(customerId: string | null) {
  return useQuery({
    queryKey: receivableKeys.list(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_receivables')
        .select('*')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })

      if (error) throw error
      return (data ?? []) as Receivable[]
    },
    enabled: !!customerId,
  })
}

/**
 * Fetch financial summary for a customer.
 * Uses backend API to leverage PostgreSQL NUMERIC arithmetic.
 * Amounts returned as strings to preserve precision.
 */
export function useReceivableSummary(customerId: string | null) {
  return useQuery({
    queryKey: receivableKeys.summary(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return null
      return api.get<FinancialSummary>(`/api/customers/${customerId}/receivables/summary`)
    },
    enabled: !!customerId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new receivable (invoice or payment).
 */
export function useCreateReceivable(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateReceivableInput) => {
      return api.post<Receivable>(`/api/customers/${customerId}/receivables`, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Update a receivable.
 */
export function useUpdateReceivable(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateReceivableInput & { id: string }) => {
      return api.put<Receivable>(`/api/customers/${customerId}/receivables/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Delete a receivable.
 */
export function useDeleteReceivable(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/customers/${customerId}/receivables/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}
