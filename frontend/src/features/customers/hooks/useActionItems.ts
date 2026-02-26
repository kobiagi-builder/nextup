/**
 * Action Item React Query Hooks
 *
 * Data hooks for CRUD operations on customer action items.
 * Reads use Supabase directly (RLS-enforced), mutations use backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { customerKeys } from './useCustomers'
import type {
  ActionItem,
  CreateActionItemInput,
  UpdateActionItemInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const actionItemKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'action_items'] as const,
  list: (customerId: string) => [...actionItemKeys.all(customerId), 'list'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all action items for a customer.
 * Uses Supabase directly (RLS enforces ownership via is_customer_owner).
 * Default order: due_date ascending (nulls last), then created_at descending.
 */
export function useActionItems(customerId: string | null) {
  return useQuery({
    queryKey: actionItemKeys.list(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_action_items')
        .select('*')
        .eq('customer_id', customerId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as ActionItem[]
    },
    enabled: !!customerId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new action item.
 */
export function useCreateActionItem(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateActionItemInput) => {
      return api.post<ActionItem>(`/api/customers/${customerId}/action-items`, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Update an action item.
 */
export function useUpdateActionItem(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateActionItemInput & { id: string }) => {
      return api.put<ActionItem>(`/api/customers/${customerId}/action-items/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Delete an action item.
 */
export function useDeleteActionItem(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/customers/${customerId}/action-items/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}
