/**
 * Document Folder React Query Hooks
 *
 * Data hooks for CRUD operations on document folders.
 * All operations use the backend API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { customerDocumentKeys } from './useCustomerDocuments'
import type { DocumentFolder } from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const folderKeys = {
  all: (customerId: string) => ['document-folders', customerId] as const,
  list: (customerId: string) => [...folderKeys.all(customerId), 'list'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all document folders for a customer (global + customer-specific).
 */
export function useDocumentFolders(customerId: string | null) {
  return useQuery({
    queryKey: folderKeys.list(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return []
      const res = await api.get<{ folders: DocumentFolder[]; count: number }>(`/api/document-folders?customerId=${customerId}`)
      return res.folders
    },
    enabled: !!customerId,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new document folder.
 */
export function useCreateFolder(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; customerId: string }) => {
      return api.post<DocumentFolder>('/api/document-folders', {
        name: input.name,
        customer_id: input.customerId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all(customerId) })
    },
  })
}

/**
 * Update a document folder (rename).
 */
export function useUpdateFolder(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string }) => {
      return api.put<DocumentFolder>(`/api/document-folders/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all(customerId) })
    },
  })
}

/**
 * Delete a document folder. Documents in the folder are moved to General.
 */
export function useDeleteFolder(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/document-folders/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all(customerId) })
      queryClient.invalidateQueries({
        queryKey: customerDocumentKeys.allByCustomer(customerId),
      })
    },
  })
}
