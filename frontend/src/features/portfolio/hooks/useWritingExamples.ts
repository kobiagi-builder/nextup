/**
 * useWritingExamples Hook (Phase 4)
 *
 * CRUD operations for user writing examples.
 * Used in Writing Style settings page.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase'
import type {
  UserWritingExample,
  CreateWritingExampleInput,
  UpdateWritingExampleInput,
} from '../types/portfolio'

// =============================================================================
// Query Keys
// =============================================================================

export const writingExamplesKeys = {
  all: ['writing-examples'] as const,
  list: () => ['writing-examples', 'list'] as const,
  detail: (id: string) => ['writing-examples', 'detail', id] as const,
}

// =============================================================================
// List Writing Examples Query
// =============================================================================

interface ListWritingExamplesResponse {
  examples: UserWritingExample[]
  count: number
}

interface UseWritingExamplesOptions {
  activeOnly?: boolean
}

export function useWritingExamples(options: UseWritingExamplesOptions = {}) {
  return useQuery<UserWritingExample[]>({
    queryKey: [...writingExamplesKeys.list(), options],
    queryFn: async () => {
      console.log('[useWritingExamples] Fetching examples:', {
        activeOnly: options.activeOnly,
        timestamp: new Date().toISOString(),
      })

      try {
        const token = await getAccessToken()
        const params = options.activeOnly ? '?active_only=true' : ''
        const response = await api.get<ListWritingExamplesResponse>(
          `/api/user/writing-examples${params}`,
          token ? { token } : undefined
        )
        console.log('[useWritingExamples] Examples fetched:', {
          count: response.count,
          timestamp: new Date().toISOString(),
        })
        return response.examples
      } catch (error) {
        console.error('[useWritingExamples] Failed to fetch:', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
        return []
      }
    },
  })
}

// =============================================================================
// Get Single Writing Example Query
// =============================================================================

export function useWritingExample(id: string) {
  return useQuery<UserWritingExample | null>({
    queryKey: writingExamplesKeys.detail(id),
    queryFn: async () => {
      console.log('[useWritingExample] Fetching example:', {
        id,
        timestamp: new Date().toISOString(),
      })

      try {
        const token = await getAccessToken()
        const example = await api.get<UserWritingExample>(
          `/api/user/writing-examples/${id}`,
          token ? { token } : undefined
        )
        return example
      } catch (error) {
        console.error('[useWritingExample] Failed to fetch:', {
          id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
        return null
      }
    },
    enabled: !!id,
  })
}

// =============================================================================
// Create Writing Example Mutation
// =============================================================================

export function useCreateWritingExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateWritingExampleInput) => {
      console.log('[useCreateWritingExample] Creating example:', {
        name: input.name,
        contentLength: input.content.length,
        sourceType: input.source_type,
        timestamp: new Date().toISOString(),
      })

      const token = await getAccessToken()
      const example = await api.post<UserWritingExample>(
        '/api/user/writing-examples',
        input,
        token ? { token } : undefined
      )
      return example
    },
    onSuccess: () => {
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: writingExamplesKeys.list() })
    },
    onError: (error) => {
      console.error('[useCreateWritingExample] Failed to create:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}

// =============================================================================
// Update Writing Example Mutation
// =============================================================================

interface UpdateWritingExampleParams {
  id: string
  data: UpdateWritingExampleInput
}

export function useUpdateWritingExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: UpdateWritingExampleParams) => {
      console.log('[useUpdateWritingExample] Updating example:', {
        id,
        fields: Object.keys(data),
        timestamp: new Date().toISOString(),
      })

      const token = await getAccessToken()
      const example = await api.put<UserWritingExample>(
        `/api/user/writing-examples/${id}`,
        data,
        token ? { token } : undefined
      )
      return example
    },
    onSuccess: (_, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: writingExamplesKeys.list() })
      queryClient.invalidateQueries({
        queryKey: writingExamplesKeys.detail(variables.id),
      })
    },
    onError: (error) => {
      console.error('[useUpdateWritingExample] Failed to update:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}

// =============================================================================
// Delete Writing Example Mutation
// =============================================================================

export function useDeleteWritingExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteWritingExample] Deleting example:', {
        id,
        timestamp: new Date().toISOString(),
      })

      const token = await getAccessToken()
      await api.delete(`/api/user/writing-examples/${id}`, token ? { token } : undefined)
    },
    onSuccess: (_, id) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: writingExamplesKeys.list() })
      // Remove detail from cache
      queryClient.removeQueries({ queryKey: writingExamplesKeys.detail(id) })
    },
    onError: (error) => {
      console.error('[useDeleteWritingExample] Failed to delete:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}
