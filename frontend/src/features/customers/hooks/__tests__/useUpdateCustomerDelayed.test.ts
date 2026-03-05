/**
 * Integration Tests: useUpdateCustomer Delayed Invalidation
 *
 * Tests that the useUpdateCustomer hook fires a 5-second delayed
 * re-invalidation to pick up background team extraction + ICP rescoring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

const { mockPut } = vi.hoisted(() => ({
  mockPut: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { put: mockPut },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    rpc: vi.fn(),
  },
}))

import { useUpdateCustomer, customerKeys } from '../useCustomers'

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

describe('useUpdateCustomer delayed invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls correct API endpoint with id stripped from body', async () => {
    const mockCustomer = { id: 'cust-4', name: 'Endpoint Corp' }
    mockPut.mockResolvedValue(mockCustomer)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateCustomer(), { wrapper })

    result.current.mutate({ id: 'cust-4', name: 'Endpoint Corp' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPut).toHaveBeenCalledWith(
      '/api/customers/cust-4',
      { name: 'Endpoint Corp' },
    )
  })

  it('invalidates queries immediately on success', async () => {
    const mockCustomer = { id: 'cust-1', name: 'Updated Corp' }
    mockPut.mockResolvedValue(mockCustomer)

    const { queryClient, wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper })

    result.current.mutate({ id: 'cust-1', name: 'Updated Corp' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Immediate invalidation: lists + detail
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: customerKeys.lists() }),
    )
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: customerKeys.detail('cust-1') }),
    )
  })

  it('schedules a delayed re-invalidation via setTimeout', async () => {
    const mockCustomer = { id: 'cust-2', name: 'Delayed Corp' }
    mockPut.mockResolvedValue(mockCustomer)

    // Spy on global setTimeout to verify delayed invalidation is scheduled
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateCustomer(), { wrapper })

    result.current.mutate({ id: 'cust-2', name: 'Delayed Corp' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Verify a 5000ms setTimeout was scheduled
    const fiveSecondCalls = setTimeoutSpy.mock.calls.filter(
      call => call[1] === 5000,
    )
    expect(fiveSecondCalls.length).toBeGreaterThanOrEqual(1)

    setTimeoutSpy.mockRestore()
  })

  it('does not schedule delayed invalidation when data has no id', async () => {
    // Edge case: API returns data without id
    mockPut.mockResolvedValue({ name: 'No ID Corp' })

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateCustomer(), { wrapper })

    result.current.mutate({ id: 'cust-3', name: 'No ID Corp' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // No 5000ms setTimeout should be scheduled since data.id is undefined
    const fiveSecondCalls = setTimeoutSpy.mock.calls.filter(
      call => call[1] === 5000,
    )
    expect(fiveSecondCalls.length).toBe(0)

    setTimeoutSpy.mockRestore()
  })
})
