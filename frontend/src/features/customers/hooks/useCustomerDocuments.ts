/**
 * Customer Document React Query Hooks (formerly useCustomerArtifacts.ts)
 *
 * Data hooks for CRUD operations on customer documents.
 * Reads use Supabase directly (RLS-enforced), mutations use backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { customerKeys } from './useCustomers'
import { initiativeKeys } from './useInitiatives'
import type {
  CustomerDocument,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const customerDocumentKeys = {
  allByCustomer: (customerId: string) =>
    [...customerKeys.detail(customerId), 'documents'] as const,
  listByCustomer: (customerId: string) =>
    [...customerDocumentKeys.allByCustomer(customerId), 'list'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch ALL documents across all initiatives for a customer (flat view).
 */
export function useCustomerDocuments(customerId: string | null) {
  return useQuery({
    queryKey: customerDocumentKeys.listByCustomer(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as CustomerDocument[]
    },
    enabled: !!customerId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new document in an initiative.
 */
export function useCreateDocument(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ initiativeId, ...input }: CreateDocumentInput & { initiativeId: string }) => {
      return api.post<CustomerDocument>(
        `/api/customers/${customerId}/initiatives/${initiativeId}/documents`,
        input
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerDocumentKeys.allByCustomer(customerId),
      })
      queryClient.invalidateQueries({ queryKey: initiativeKeys.list(customerId) })
    },
  })
}

/**
 * Update a document.
 */
export function useUpdateDocument(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, initiativeId, ...data }: UpdateDocumentInput & { id: string; initiativeId: string }) => {
      return api.put<CustomerDocument>(
        `/api/customers/${customerId}/initiatives/${initiativeId}/documents/${id}`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerDocumentKeys.allByCustomer(customerId),
      })
    },
  })
}

/**
 * Delete a document.
 */
export function useDeleteDocument(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, initiativeId }: { id: string; initiativeId: string }) => {
      return api.delete(
        `/api/customers/${customerId}/initiatives/${initiativeId}/documents/${id}`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerDocumentKeys.allByCustomer(customerId),
      })
      queryClient.invalidateQueries({ queryKey: initiativeKeys.list(customerId) })
    },
  })
}

/**
 * Reassign a document to a different initiative (or to General).
 */
export function useReassignDocument(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      documentId,
      currentInitiativeId,
      newInitiativeId,
      folderId,
    }: {
      documentId: string
      currentInitiativeId: string
      newInitiativeId: string
      folderId: string | null
    }) => {
      return api.put<CustomerDocument>(
        `/api/customers/${customerId}/initiatives/${currentInitiativeId}/documents/${documentId}`,
        { initiative_id: newInitiativeId, folder_id: folderId }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerDocumentKeys.allByCustomer(customerId),
      })
      queryClient.invalidateQueries({ queryKey: initiativeKeys.list(customerId) })
    },
  })
}
