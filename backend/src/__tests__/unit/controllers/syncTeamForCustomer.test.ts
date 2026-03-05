/**
 * Unit Tests: syncTeamForCustomer Helper
 *
 * Tests the reusable team sync helper used by both the manual
 * sync endpoint and auto-triggers (creation, URL update).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Hoisted mocks ---
const { mockGetById, mockMergeInfo, mockExtractSlug, mockScrape, mockFilterRoles, mockGetSupabase } =
  vi.hoisted(() => ({
    mockGetById: vi.fn(),
    mockMergeInfo: vi.fn(),
    mockExtractSlug: vi.fn(),
    mockScrape: vi.fn(),
    mockFilterRoles: vi.fn(),
    mockGetSupabase: vi.fn(),
  }))

// Mock modules
vi.mock('../../../lib/requestContext.js', () => ({
  getSupabase: mockGetSupabase,
}))

vi.mock('../../../services/CustomerService.js', () => ({
  CustomerService: class MockCustomerService {
    getById = mockGetById
    mergeInfo = mockMergeInfo
  },
}))

vi.mock('../../../services/EnrichmentService.js', () => ({
  EnrichmentService: class MockEnrichmentService {
    scrapeLinkedInPeople = mockScrape
    filterTeamByRoles = mockFilterRoles
  },
  DEFAULT_ROLE_FILTERS: [{ category: 'C-Level', patterns: ['CEO', 'CTO'] }],
  DEFAULT_ROLE_EXCLUSIONS: ['HR'],
}))

vi.mock('../../../services/IcpScoringService.js', () => ({
  IcpScoringService: vi.fn(),
}))

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// Static method mock — must be set before import
const { EnrichmentService } = await import('../../../services/EnrichmentService.js')
;(EnrichmentService as any).extractCompanySlug = mockExtractSlug

import { syncTeamForCustomer } from '../../../controllers/customer.controller.js'

// Mock Supabase client with chainable query
function createMockSupabase(filterRow: any = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: filterRow, error: null }),
      }),
    }),
  }
}

describe('syncTeamForCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSupabase.mockReturnValue(createMockSupabase())
  })

  it('returns null when customer not found', async () => {
    mockGetById.mockResolvedValue(null)

    const result = await syncTeamForCustomer('nonexistent-id')

    expect(result).toBeNull()
    expect(mockScrape).not.toHaveBeenCalled()
  })

  it('returns null when customer has no LinkedIn URL', async () => {
    mockGetById.mockResolvedValue({
      id: 'c-1',
      name: 'TestCorp',
      info: { about: 'A company' },
    })

    const result = await syncTeamForCustomer('c-1')

    expect(result).toBeNull()
    expect(mockExtractSlug).not.toHaveBeenCalled()
  })

  it('returns null when slug extraction fails', async () => {
    mockGetById.mockResolvedValue({
      id: 'c-1',
      name: 'TestCorp',
      info: { linkedin_company_url: 'https://invalid-url.com' },
    })
    mockExtractSlug.mockReturnValue(null)

    const result = await syncTeamForCustomer('c-1')

    expect(result).toBeNull()
    expect(mockScrape).not.toHaveBeenCalled()
  })

  it('returns { added: 0, removed: 0 } when scrape returns empty array', async () => {
    mockGetById.mockResolvedValue({
      id: 'c-1',
      name: 'TestCorp',
      info: { linkedin_company_url: 'https://linkedin.com/company/testcorp' },
    })
    mockExtractSlug.mockReturnValue('testcorp')
    mockScrape.mockResolvedValue([])

    const result = await syncTeamForCustomer('c-1')

    expect(result).toEqual({ added: 0, removed: 0 })
    // Should NOT call mergeInfo (no error clearing on empty scrape)
    expect(mockMergeInfo).not.toHaveBeenCalled()
  })

  it('filters scraped people and merges with existing team', async () => {
    const existingTeam = [{ name: 'Manual Person', role: 'Advisor', source: 'manual' }]
    mockGetById.mockResolvedValue({
      id: 'c-1',
      name: 'TestCorp',
      info: { linkedin_company_url: 'https://linkedin.com/company/testcorp', team: existingTeam },
    })
    mockExtractSlug.mockReturnValue('testcorp')
    mockScrape.mockResolvedValue([
      { name: 'Alice', role: 'CEO' },
      { name: 'Bob', role: 'HR Manager' },
    ])
    mockFilterRoles.mockResolvedValue([{ name: 'Alice', role: 'CEO' }])

    const result = await syncTeamForCustomer('c-1')

    expect(result).toEqual({ added: 1, removed: 0 })
    expect(mockFilterRoles).toHaveBeenCalledWith(
      [{ name: 'Alice', role: 'CEO' }, { name: 'Bob', role: 'HR Manager' }],
      expect.any(Array),
      expect.any(Array),
    )
    expect(mockMergeInfo).toHaveBeenCalledWith('c-1', expect.objectContaining({
      team: expect.any(Array),
    }))
  })

  it('clears enrichment_errors.linkedin on successful sync', async () => {
    mockGetById.mockResolvedValue({
      id: 'c-1',
      name: 'TestCorp',
      info: {
        linkedin_company_url: 'https://linkedin.com/company/testcorp',
        team: [],
        enrichment_errors: { linkedin: 'Previous error', website: 'Keep this' },
      },
    })
    mockExtractSlug.mockReturnValue('testcorp')
    mockScrape.mockResolvedValue([{ name: 'Alice', role: 'CEO' }])
    mockFilterRoles.mockResolvedValue([{ name: 'Alice', role: 'CEO' }])

    await syncTeamForCustomer('c-1')

    expect(mockMergeInfo).toHaveBeenCalledWith('c-1', expect.objectContaining({
      enrichment_errors: expect.objectContaining({
        website: 'Keep this',
        linkedin: undefined,
      }),
    }))
  })

  it('returns merge result counts', async () => {
    mockGetById.mockResolvedValue({
      id: 'c-1',
      name: 'TestCorp',
      info: {
        linkedin_company_url: 'https://linkedin.com/company/testcorp',
        team: [
          { name: 'Stale Person', role: 'VP', source: 'linkedin_scrape' },
        ],
      },
    })
    mockExtractSlug.mockReturnValue('testcorp')
    mockScrape.mockResolvedValue([{ name: 'New Person', role: 'CTO' }])
    mockFilterRoles.mockResolvedValue([{ name: 'New Person', role: 'CTO' }])

    const result = await syncTeamForCustomer('c-1')

    // Stale Person should be soft-deleted (removed: 1), New Person added (added: 1)
    expect(result).toEqual({ added: 1, removed: 1 })
  })
})
