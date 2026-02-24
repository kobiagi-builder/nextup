/**
 * Unit Tests for useImageGeneration Hook (Phase 3)
 *
 * Tests image generation mutations:
 * - Approve image descriptions
 * - Reject image descriptions
 * - Generate final images
 * - Regenerate specific images
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useImageGeneration } from '../../../src/features/portfolio/hooks/useImageGeneration'
import * as apiModule from '../../../src/lib/api'

// =============================================================================
// Mocks
// =============================================================================

vi.mock('../../../src/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

vi.mock('../../../src/lib/supabase', () => ({
  getAccessToken: vi.fn().mockResolvedValue('mock-token'),
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

// =============================================================================
// Test Setup
// =============================================================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// =============================================================================
// Tests
// =============================================================================

describe('useImageGeneration Hook', () => {
  const mockArtifactId = 'test-artifact-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('approveDescriptions', () => {
    it('should approve image descriptions successfully', async () => {
      const mockResponse = { data: { success: true } }
      vi.mocked(apiModule.api.post).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      const imageIds = ['image-1', 'image-2']
      await result.current.approveDescriptions(imageIds)

      expect(apiModule.api.post).toHaveBeenCalledWith(
        `/api/artifacts/${mockArtifactId}/images/approve`,
        {
          approvedIds: imageIds,
          rejectedIds: [],
        },
        { token: 'mock-token' }
      )
    })

    it('should handle approval errors', async () => {
      vi.mocked(apiModule.api.post).mockRejectedValueOnce(new Error('API Error'))

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      await expect(result.current.approveDescriptions(['image-1'])).rejects.toThrow('API Error')
    })
  })

  describe('rejectDescriptions', () => {
    it('should reject image descriptions successfully', async () => {
      const mockResponse = { data: { success: true } }
      vi.mocked(apiModule.api.post).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      const imageIds = ['image-3']
      await result.current.rejectDescriptions(imageIds)

      expect(apiModule.api.post).toHaveBeenCalledWith(
        `/api/artifacts/${mockArtifactId}/images/approve`,
        {
          approvedIds: [],
          rejectedIds: imageIds,
        },
        { token: 'mock-token' }
      )
    })

    it('should handle rejection errors', async () => {
      vi.mocked(apiModule.api.post).mockRejectedValueOnce(new Error('Network Error'))

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      await expect(result.current.rejectDescriptions(['image-1'])).rejects.toThrow(
        'Network Error'
      )
    })
  })

  describe('generateFinals', () => {
    it('should generate final images successfully', async () => {
      const mockResponse = { data: { success: true, generated: 3 } }
      vi.mocked(apiModule.api.post).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      await result.current.generateFinals()

      expect(apiModule.api.post).toHaveBeenCalledWith(
        `/api/artifacts/${mockArtifactId}/images/generate`,
        undefined,
        { token: 'mock-token' }
      )
    })

    it('should handle generation errors', async () => {
      vi.mocked(apiModule.api.post).mockRejectedValueOnce(
        new Error('Image generation failed')
      )

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      await expect(result.current.generateFinals()).rejects.toThrow('Image generation failed')
    })
  })

  describe('regenerateImage', () => {
    it('should regenerate specific image successfully', async () => {
      const mockResponse = { data: { success: true } }
      vi.mocked(apiModule.api.post).mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      const imageId = 'image-1'
      const description = 'Updated image description'
      await result.current.regenerateImage({ imageId, description })

      expect(apiModule.api.post).toHaveBeenCalledWith(
        `/api/artifacts/${mockArtifactId}/images/${imageId}/regenerate`,
        { description },
        { token: 'mock-token' }
      )
    })

    it('should handle regeneration errors', async () => {
      vi.mocked(apiModule.api.post).mockRejectedValueOnce(
        new Error('Regeneration limit exceeded')
      )

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      await expect(
        result.current.regenerateImage({
          imageId: 'image-1',
          description: 'New description',
        })
      ).rejects.toThrow('Regeneration limit exceeded')
    })
  })

  describe('isLoading state', () => {
    it('should be false initially', () => {
      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should be true during approval', async () => {
      vi.mocked(apiModule.api.post).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100))
      )

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      result.current.approveDescriptions(['image-1'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })
    })

    it('should return to false after operation completes', async () => {
      vi.mocked(apiModule.api.post).mockResolvedValueOnce({ data: {} })

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), {
        wrapper: createWrapper(),
      })

      await result.current.approveDescriptions(['image-1'])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('query invalidation', () => {
    it('should invalidate artifact query after approval', async () => {
      const mockResponse = { data: { success: true } }
      vi.mocked(apiModule.api.post).mockResolvedValueOnce(mockResponse)

      const queryClient = new QueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useImageGeneration(mockArtifactId), { wrapper })

      await result.current.approveDescriptions(['image-1'])

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled()
      })
    })
  })
})
