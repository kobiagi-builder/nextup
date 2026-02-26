/**
 * Project React Query Hooks
 *
 * Data hooks for CRUD operations on customer projects.
 * Reads use Supabase directly (RLS-enforced), mutations use backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { customerKeys } from './useCustomers'
import type {
  ProjectWithCounts,
  CreateProjectInput,
  UpdateProjectInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const projectKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'projects'] as const,
  list: (customerId: string) => [...projectKeys.all(customerId), 'list'] as const,
  detail: (customerId: string, projectId: string) =>
    [...projectKeys.all(customerId), 'detail', projectId] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all projects for a customer with artifact counts.
 * Uses Supabase directly (RLS enforces ownership via is_customer_owner).
 */
export function useProjects(customerId: string | null) {
  return useQuery({
    queryKey: projectKeys.list(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_projects')
        .select('*, customer_artifacts(count)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform nested count to flat artifacts_count
      return (data ?? []).map((row: Record<string, unknown>) => {
        const { customer_artifacts, ...project } = row
        const counts = customer_artifacts as Array<{ count: number }> | undefined
        return {
          ...project,
          artifacts_count: counts?.[0]?.count ?? 0,
        } as ProjectWithCounts
      })
    },
    enabled: !!customerId,
  })
}

/**
 * Fetch a single project by ID with artifact count.
 * Uses backend API for the enriched response.
 */
export function useProject(customerId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: projectKeys.detail(customerId ?? '', projectId ?? ''),
    queryFn: async () => {
      if (!customerId || !projectId) return null
      return api.get<ProjectWithCounts>(`/api/customers/${customerId}/projects/${projectId}`)
    },
    enabled: !!customerId && !!projectId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new project.
 */
export function useCreateProject(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      return api.post<ProjectWithCounts>(`/api/customers/${customerId}/projects`, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Update a project.
 */
export function useUpdateProject(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateProjectInput & { id: string }) => {
      return api.put<ProjectWithCounts>(`/api/customers/${customerId}/projects/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}

/**
 * Delete a project (cascades to artifacts).
 */
export function useDeleteProject(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/customers/${customerId}/projects/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
    },
  })
}
