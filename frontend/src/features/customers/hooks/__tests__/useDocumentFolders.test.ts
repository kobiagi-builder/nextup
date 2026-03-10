/**
 * Unit Tests: useDocumentFolders hooks
 *
 * Tests for folder CRUD hooks: list, create, update, delete.
 * Follows useInitiatives.test.ts patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { get: mockGet, post: mockPost, put: mockPut, delete: mockDelete },
}))

import {
  folderKeys,
  useDocumentFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '../useDocumentFolders'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('folderKeys', () => {
  it('generates correct query keys', () => {
    expect(folderKeys.all('cust-1')).toEqual(['document-folders', 'cust-1'])
    expect(folderKeys.list('cust-1')).toEqual(['document-folders', 'cust-1', 'list'])
  })
})

describe('useDocumentFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns idle when customerId is null', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDocumentFolders(null), { wrapper })

    expect(result.current.data).toBeUndefined()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches folders via API when customerId is provided', async () => {
    const mockFolders = [
      { id: 'f-1', name: 'General', is_system: true },
      { id: 'f-2', name: 'Research', is_system: false },
    ]
    mockGet.mockResolvedValue(mockFolders)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDocumentFolders('cust-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGet).toHaveBeenCalledWith('/api/document-folders?customerId=cust-1')
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0].name).toBe('General')
  })
})

describe('useCreateFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST and invalidates folder queries', async () => {
    const mockFolder = { id: 'f-new', name: 'New Folder' }
    mockPost.mockResolvedValue(mockFolder)

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateFolder('cust-1'), { wrapper })

    result.current.mutate({ name: 'New Folder', customerId: 'cust-1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPost).toHaveBeenCalledWith('/api/document-folders', {
      name: 'New Folder',
      customerId: 'cust-1',
    })
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useUpdateFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT and invalidates folder queries', async () => {
    mockPut.mockResolvedValue({ id: 'f-1', name: 'Renamed' })

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateFolder('cust-1'), { wrapper })

    result.current.mutate({ id: 'f-1', name: 'Renamed' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPut).toHaveBeenCalledWith('/api/document-folders/f-1', { name: 'Renamed' })
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useDeleteFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE and invalidates folder + document queries', async () => {
    mockDelete.mockResolvedValue({})

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteFolder('cust-1'), { wrapper })

    result.current.mutate('f-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDelete).toHaveBeenCalledWith('/api/document-folders/f-1')
    // Should invalidate both folder and document queries
    expect(invalidateSpy).toHaveBeenCalledTimes(2)
  })
})
