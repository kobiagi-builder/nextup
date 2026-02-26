/**
 * Customer Events React Query Hooks
 *
 * Data hooks for customer event timeline.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { CustomerEvent, CreateEventInput } from '../types'
import { customerKeys } from './useCustomers'

// =============================================================================
// Query Keys
// =============================================================================

export const eventKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'events'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all events for a customer, ordered by event_date descending.
 */
export function useCustomerEvents(customerId: string | null) {
  return useQuery({
    queryKey: eventKeys.all(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_events')
        .select('*')
        .eq('customer_id', customerId)
        .order('event_date', { ascending: false })

      if (error) throw error
      return (data ?? []) as CustomerEvent[]
    },
    enabled: !!customerId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new customer event.
 */
export function useCreateCustomerEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ customerId, ...input }: CreateEventInput & { customerId: string }) => {
      return api.post<CustomerEvent>(`/api/customers/${customerId}/events`, input)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.customerId) })
    },
  })
}
