/**
 * Customer React Query Hooks
 *
 * Data hooks for CRUD operations on customers.
 * List uses RPC for enriched summary data, mutations use backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type {
  Customer,
  CustomerWithCounts,
  CustomerWithSummary,
  DashboardStats,
  CustomerStatus,
  CustomerFilters,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  stats: () => [...customerKeys.all, 'stats'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch customers with summary metrics via RPC.
 * Returns enriched data: active_agreements_count, outstanding_balance,
 * active_projects_count, last_activity.
 */
export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_list_summary', {
        p_status: filters.status?.length ? filters.status.join(',') : undefined,
        p_search: filters.search || undefined,
        p_sort: filters.sort || 'updated_at',
        p_icp: filters.icp?.length ? filters.icp.join(',') : undefined,
      })

      if (error) throw error
      return ((data ?? []) as CustomerWithSummary[]).map(c => ({
        ...c,
        outstanding_balance: Number(c.outstanding_balance) || 0,
      }))
    },
  })
}

/**
 * Dashboard stats: total customers, active customers, outstanding balance,
 * expiring agreements (within 30 days).
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: customerKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_dashboard_stats')

      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row ?? {
        total_customers: 0,
        active_customers: 0,
        total_outstanding: 0,
        expiring_agreements: 0,
      }) as DashboardStats
    },
  })
}

/**
 * Fetch a single customer by ID with tab counts.
 * Uses backend API to get computed counts.
 */
export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      const data = await api.get<CustomerWithCounts>(`/api/customers/${id}`)
      return data
    },
    enabled: !!id,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new customer.
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      return api.post<Customer>('/api/customers', input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

/**
 * Update a customer (partial update).
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCustomerInput & { id: string }) => {
      return api.put<Customer>(`/api/customers/${id}`, data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) })
      }
    },
  })
}

/**
 * Quick status update.
 */
export function useUpdateCustomerStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CustomerStatus }) => {
      return api.patch<Customer>(`/api/customers/${id}/status`, { status })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) })
      }
    },
  })
}

/**
 * Delete (soft) a customer.
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/customers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}
