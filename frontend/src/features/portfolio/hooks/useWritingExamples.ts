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
  ArtifactType,
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
  artifactType?: ArtifactType
}

export function useWritingExamples(options: UseWritingExamplesOptions = {}) {
  return useQuery<UserWritingExample[]>({
    queryKey: [...writingExamplesKeys.list(), options],
    queryFn: async () => {
      // Use fetch directly instead of api client — the api client does a hard
      // window.location redirect on 401 before the error can be caught, which
      // causes pages to redirect to login on mount if the token is stale.
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams()
        if (options.activeOnly) params.set('active_only', 'true')
        if (options.artifactType) params.set('artifact_type', options.artifactType)
        const qs = params.toString()

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/user/writing-examples${qs ? `?${qs}` : ''}`,
          {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'Content-Type': 'application/json',
            },
          }
        )

        if (!res.ok) return []
        const body: ListWritingExamplesResponse = await res.json()
        return body.examples
      } catch (error) {
        console.error('[useWritingExamples] Failed to fetch:', {
          error: error instanceof Error ? error.message : String(error),
        })
        return []
      }
    },
    // Poll every 2s when any reference is extracting/pending
    refetchInterval: (query) => {
      const data = query.state.data
      const hasExtracting = data?.some(
        (r) => r.extraction_status === 'extracting' || r.extraction_status === 'pending'
      )
      return hasExtracting ? 2000 : false
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
      try {
        const token = await getAccessToken()
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/user/writing-examples/${id}`,
          {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'Content-Type': 'application/json',
            },
          }
        )
        if (!res.ok) return null
        return (await res.json()) as UserWritingExample
      } catch (error) {
        console.error('[useWritingExample] Failed to fetch:', {
          error: error instanceof Error ? error.message : String(error),
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

// =============================================================================
// Upload File Mutation (Phase 2)
// =============================================================================

interface UploadWritingExampleInput {
  file: File
  name: string
  artifact_type: ArtifactType
}

export function useUploadWritingExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UploadWritingExampleInput) => {
      console.log('[useUploadWritingExample] Uploading file:', {
        fileName: input.file.name,
        fileSizeKB: Math.round(input.file.size / 1024),
        hasArtifactType: true,
        timestamp: new Date().toISOString(),
      })

      const token = await getAccessToken()
      const formData = new FormData()
      formData.append('file', input.file)
      formData.append('name', input.name)
      formData.append('artifact_type', input.artifact_type)

      // Use raw fetch for multipart — api.post sets Content-Type: application/json
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/writing-examples/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error(body.message || 'Upload failed')
      }

      return res.json() as Promise<UserWritingExample>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: writingExamplesKeys.list() })
    },
    onError: (error) => {
      console.error('[useUploadWritingExample] Failed to upload:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}

// =============================================================================
// Extract from URL Mutation (Phase 2)
// =============================================================================

interface ExtractFromUrlInput {
  url: string
  name: string
  artifact_type: ArtifactType
}

export function useExtractFromUrl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ExtractFromUrlInput) => {
      console.log('[useExtractFromUrl] Extracting from URL:', {
        hasUrl: true,
        hasArtifactType: true,
        timestamp: new Date().toISOString(),
      })

      const token = await getAccessToken()
      return api.post<UserWritingExample>(
        '/api/user/writing-examples/extract-url',
        input,
        token ? { token } : undefined
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: writingExamplesKeys.list() })
    },
    onError: (error) => {
      console.error('[useExtractFromUrl] Failed to extract:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}

// =============================================================================
// Retry Extraction Mutation (Phase 2)
// =============================================================================

export function useRetryExtraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useRetryExtraction] Retrying extraction:', {
        timestamp: new Date().toISOString(),
      })

      const token = await getAccessToken()
      return api.post<UserWritingExample>(
        `/api/user/writing-examples/${id}/retry`,
        {},
        token ? { token } : undefined
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: writingExamplesKeys.list() })
    },
    onError: (error) => {
      console.error('[useRetryExtraction] Failed to retry:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}

// =============================================================================
// Extract Publication URL Mutation (Phase 3)
// =============================================================================

export function useExtractPublication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ExtractFromUrlInput) => {
      console.log('[useExtractPublication] Extracting from publication URL:', {
        hasUrl: true,
        hasArtifactType: true,
        timestamp: new Date().toISOString(),
      })

      const token = await getAccessToken()
      return api.post<UserWritingExample>(
        '/api/user/writing-examples/extract-publication',
        input,
        token ? { token } : undefined
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: writingExamplesKeys.list() })
    },
    onError: (error) => {
      console.error('[useExtractPublication] Failed to extract:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    },
  })
}
