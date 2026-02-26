/**
 * Customer Artifact React Query Hooks
 *
 * Data hooks for CRUD operations on customer artifacts.
 * Reads use Supabase directly (RLS-enforced), mutations use backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { customerKeys } from './useCustomers'
import { projectKeys } from './useProjects'
import type {
  CustomerArtifact,
  CreateArtifactInput,
  UpdateArtifactInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const customerArtifactKeys = {
  allByProject: (customerId: string, projectId: string) =>
    [...projectKeys.detail(customerId, projectId), 'artifacts'] as const,
  listByProject: (customerId: string, projectId: string) =>
    [...customerArtifactKeys.allByProject(customerId, projectId), 'list'] as const,
  allByCustomer: (customerId: string) =>
    [...customerKeys.detail(customerId), 'artifacts'] as const,
  listByCustomer: (customerId: string) =>
    [...customerArtifactKeys.allByCustomer(customerId), 'list'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all artifacts for a project.
 * Uses Supabase directly (RLS enforces ownership through project->customer chain).
 */
export function useProjectArtifacts(customerId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: customerArtifactKeys.listByProject(customerId ?? '', projectId ?? ''),
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('customer_artifacts')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as CustomerArtifact[]
    },
    enabled: !!customerId && !!projectId,
  })
}

/**
 * Fetch ALL artifacts across all projects for a customer (flat view).
 */
export function useCustomerArtifacts(customerId: string | null) {
  return useQuery({
    queryKey: customerArtifactKeys.listByCustomer(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_artifacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as CustomerArtifact[]
    },
    enabled: !!customerId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new artifact in a project.
 */
export function useCreateArtifact(customerId: string, projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateArtifactInput) => {
      return api.post<CustomerArtifact>(
        `/api/customers/${customerId}/projects/${projectId}/artifacts`,
        input
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerArtifactKeys.allByProject(customerId, projectId),
      })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(customerId, projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.list(customerId) })
    },
  })
}

/**
 * Update an artifact.
 */
export function useUpdateArtifact(customerId: string, projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateArtifactInput & { id: string }) => {
      return api.put<CustomerArtifact>(
        `/api/customers/${customerId}/projects/${projectId}/artifacts/${id}`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerArtifactKeys.allByProject(customerId, projectId),
      })
    },
  })
}

/**
 * Delete an artifact.
 */
export function useDeleteArtifact(customerId: string, projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(
        `/api/customers/${customerId}/projects/${projectId}/artifacts/${id}`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerArtifactKeys.allByProject(customerId, projectId),
      })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(customerId, projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.list(customerId) })
    },
  })
}
