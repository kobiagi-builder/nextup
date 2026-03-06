/**
 * Action Items Board Hooks
 *
 * React Query hooks for the Kanban board.
 * Fetches via backend API (needs customer_name JOIN).
 * Optimistic updates for drag-and-drop status changes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { customerKeys } from '@/features/customers/hooks/useCustomers'
import { actionItemKeys } from '@/features/customers/hooks/useActionItems'
import type { ActionItemWithCustomer, BoardFilters } from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const boardActionItemKeys = {
  all: ['action-items', 'board'] as const,
  list: (filters?: BoardFilters) =>
    [...boardActionItemKeys.all, 'list', filters] as const,
}

// =============================================================================
// Queries
// =============================================================================

export function useActionItemsBoard(filters?: BoardFilters) {
  return useQuery({
    queryKey: boardActionItemKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.customer_id) params.set('customer_id', filters.customer_id)
      if (filters?.status?.length) params.set('status', filters.status.join(','))

      const qs = params.toString()
      const endpoint = `/api/action-items${qs ? `?${qs}` : ''}`

      const res = await api.get<{ data: ActionItemWithCustomer[]; count: number }>(endpoint)
      return res.data
    },
  })
}

// =============================================================================
// Mutations
// =============================================================================

export function useCreateBoardActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      type?: string
      description: string
      due_date?: string | null
      customer_id?: string | null
    }) => api.post<ActionItemWithCustomer>('/api/action-items', data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardActionItemKeys.all })
    },
    onError: () => {
      toast({ title: 'Failed to create action item', variant: 'destructive' })
    },
  })
}

export function useUpdateBoardActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      api.put<ActionItemWithCustomer>(`/api/action-items/${id}`, data),

    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: boardActionItemKeys.all })
      const previousData = queryClient.getQueryData<ActionItemWithCustomer[]>(boardActionItemKeys.list())

      queryClient.setQueryData<ActionItemWithCustomer[]>(boardActionItemKeys.list(), (old) => {
        if (!old) return old
        return old.map((item) => item.id === id ? { ...item, ...data } as ActionItemWithCustomer : item)
      })

      return { previousData }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(boardActionItemKeys.list(), context.previousData)
      }
      toast({ title: 'Failed to update action item', variant: 'destructive' })
    },

    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: boardActionItemKeys.all })
      // Cross-view cache invalidation for customer detail tab
      if (variables && typeof variables === 'object') {
        const customerId = (variables as Record<string, unknown>).customer_id as string | undefined
        if (customerId) {
          queryClient.invalidateQueries({
            queryKey: actionItemKeys.all(customerId),
          })
          queryClient.invalidateQueries({
            queryKey: customerKeys.detail(customerId),
          })
        }
      }
    },
  })
}

export function useDeleteBoardActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/action-items/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardActionItemKeys.all })
    },
    onError: () => {
      toast({ title: 'Failed to delete action item', variant: 'destructive' })
    },
  })
}
