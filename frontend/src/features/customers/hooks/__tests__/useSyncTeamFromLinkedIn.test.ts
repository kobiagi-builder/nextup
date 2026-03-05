/**
 * Integration Tests: useSyncTeamFromLinkedIn Hook
 *
 * Tests the sync mutation hook calls the correct endpoint
 * and invalidates the right query keys on success.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

// vi.mock factories are hoisted — use vi.hoisted to create shared refs
const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { post: mockPost },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    rpc: vi.fn(),
  },
}))

import { useSyncTeamFromLinkedIn, customerKeys } from '../useCustomers'
import type { TeamSyncResult } from '../../types'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useSyncTeamFromLinkedIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the correct API endpoint', async () => {
    const mockResult: TeamSyncResult = {
      added: 3,
      removed: 1,
      total: 5,
      members: [
        { name: 'Alice', role: 'CEO', source: 'linkedin_scrape' },
      ],
    }
    mockPost.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useSyncTeamFromLinkedIn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('customer-123')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPost).toHaveBeenCalledWith(
      '/api/customers/customer-123/sync-team-from-linkedin',
      {}
    )
  })

  it('returns the sync result data', async () => {
    const mockResult: TeamSyncResult = {
      added: 2,
      removed: 0,
      total: 4,
      members: [],
    }
    mockPost.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useSyncTeamFromLinkedIn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('customer-456')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResult)
  })

  it('handles API errors', async () => {
    mockPost.mockRejectedValue(new Error('Bad Request'))

    const { result } = renderHook(() => useSyncTeamFromLinkedIn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('customer-789')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('uses correct query key patterns', () => {
    expect(customerKeys.detail('abc')).toEqual(['customers', 'detail', 'abc'])
    expect(customerKeys.lists()).toEqual(['customers', 'list'])
  })
})
