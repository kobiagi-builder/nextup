/**
 * Unit Tests: useInitiatives hooks
 *
 * Tests for initiative CRUD hooks: list, create, delete.
 * Follows useUpdateCustomerDelayed.test.ts patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

const { mockPost, mockDelete } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
}))

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { post: mockPost, delete: mockDelete },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}))

import { useInitiatives, useCreateInitiative, useDeleteInitiative, initiativeKeys } from '../useInitiatives'

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

describe('useInitiatives', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when customerId is null', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useInitiatives(null), { wrapper })

    // Should not be loading since enabled = false
    expect(result.current.data).toBeUndefined()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches initiatives with document counts from Supabase', async () => {
    const mockData = [
      {
        id: 'init-1',
        name: 'Q1 Strategy',
        status: 'active',
        customer_id: 'cust-1',
        customer_documents: [{ count: 3 }],
      },
      {
        id: 'init-2',
        name: 'Research',
        status: 'planning',
        customer_id: 'cust-1',
        customer_documents: [{ count: 0 }],
      },
    ]

    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    mockFrom.mockReturnValue(chainMock)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useInitiatives('cust-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('customer_initiatives')
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0].documents_count).toBe(3)
    expect(result.current.data![1].documents_count).toBe(0)
  })
})

describe('useCreateInitiative', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST API and invalidates initiative queries', async () => {
    const mockInitiative = { id: 'init-new', name: 'New Initiative', status: 'planning' }
    mockPost.mockResolvedValue(mockInitiative)

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateInitiative('cust-1'), { wrapper })

    result.current.mutate({ name: 'New Initiative' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPost).toHaveBeenCalledWith(
      '/api/customers/cust-1/initiatives',
      { name: 'New Initiative' }
    )

    // Should invalidate initiative and customer detail queries
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useDeleteInitiative', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE API and invalidates queries', async () => {
    mockDelete.mockResolvedValue({})

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteInitiative('cust-1'), { wrapper })

    result.current.mutate('init-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDelete).toHaveBeenCalledWith('/api/customers/cust-1/initiatives/init-1')
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('initiativeKeys', () => {
  it('generates correct query keys', () => {
    expect(initiativeKeys.all('cust-1')).toEqual(['customers', 'detail', 'cust-1', 'initiatives'])
    expect(initiativeKeys.list('cust-1')).toEqual(['customers', 'detail', 'cust-1', 'initiatives', 'list'])
    expect(initiativeKeys.detail('cust-1', 'init-1')).toEqual([
      'customers', 'detail', 'cust-1', 'initiatives', 'detail', 'init-1',
    ])
  })
})
