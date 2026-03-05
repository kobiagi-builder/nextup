/**
 * Unit Tests: Auto-Trigger Integration Points
 *
 * Tests that updateCustomer handler triggers team sync when
 * LinkedIn company URL is present in the update payload.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Hoisted mocks ---
const {
  mockGetById, mockMergeInfo, mockUpdate, mockUpdateEnrichment, mockUpdateIcpScore,
  mockExtractSlug, mockScrape, mockFilterRoles, mockGetSupabase,
  mockEnrichCompany, mockListWithSummary, mockList, mockGetWithCounts,
} = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockMergeInfo: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEnrichment: vi.fn(),
  mockUpdateIcpScore: vi.fn(),
  mockExtractSlug: vi.fn(),
  mockScrape: vi.fn(),
  mockFilterRoles: vi.fn(),
  mockGetSupabase: vi.fn(),
  mockEnrichCompany: vi.fn(),
  mockListWithSummary: vi.fn(),
  mockList: vi.fn(),
  mockGetWithCounts: vi.fn(),
}))

vi.mock('../../../lib/requestContext.js', () => ({
  getSupabase: mockGetSupabase,
}))

vi.mock('../../../services/CustomerService.js', () => ({
  CustomerService: class MockCustomerService {
    getById = mockGetById
    mergeInfo = mockMergeInfo
    update = mockUpdate
    updateEnrichment = mockUpdateEnrichment
    updateIcpScore = mockUpdateIcpScore
    listWithSummary = mockListWithSummary
    list = mockList
    getWithCounts = mockGetWithCounts
  },
}))

vi.mock('../../../services/EnrichmentService.js', () => ({
  EnrichmentService: class MockEnrichmentService {
    scrapeLinkedInPeople = mockScrape
    filterTeamByRoles = mockFilterRoles
    enrichCompany = mockEnrichCompany
  },
  DEFAULT_ROLE_FILTERS: [{ category: 'C-Level', patterns: ['CEO', 'CTO'] }],
  DEFAULT_ROLE_EXCLUSIONS: ['HR'],
}))

vi.mock('../../../services/IcpScoringService.js', () => ({
  IcpScoringService: class MockIcpScoringService {
    scoreCustomer = vi.fn()
  },
}))

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// Static method mock
const { EnrichmentService } = await import('../../../services/EnrichmentService.js')
;(EnrichmentService as any).extractCompanySlug = mockExtractSlug

import { updateCustomer } from '../../../controllers/customer.controller.js'

// Mock Supabase client with chainable query
function createMockSupabase(filterRow: any = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: filterRow, error: null }),
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }
}

function createMockReq(overrides: any = {}) {
  return {
    user: { id: 'user-1' },
    params: { id: 'c-1' },
    body: {},
    query: {},
    ...overrides,
  }
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    jsonData: null,
  }
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  res.json = vi.fn((data: any) => { res.jsonData = data; return res })
  return res
}

describe('updateCustomer auto-triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSupabase.mockReturnValue(createMockSupabase())
  })

  it('triggers team sync when info with LinkedIn URL is in update payload', async () => {
    const updatedCustomer = {
      id: 'c-1',
      name: 'TestCorp',
      info: { linkedin_company_url: 'https://linkedin.com/company/testcorp' },
    }
    mockUpdate.mockResolvedValue(updatedCustomer)
    mockExtractSlug.mockReturnValue('testcorp')
    // syncTeamForCustomer will call these internally
    mockGetById.mockResolvedValue(updatedCustomer)
    mockScrape.mockResolvedValue([{ name: 'Alice', role: 'CEO' }])
    mockFilterRoles.mockResolvedValue([{ name: 'Alice', role: 'CEO' }])
    mockMergeInfo.mockResolvedValue(undefined)

    const req = createMockReq({
      body: { info: { linkedin_company_url: 'https://linkedin.com/company/testcorp' } },
    })
    const res = createMockRes()

    await updateCustomer(req, res)

    // Response should succeed immediately (fire-and-forget)
    expect(res.statusCode).toBe(200)

    // Let fire-and-forget promises resolve
    await vi.waitFor(() => {
      expect(mockScrape).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('does NOT trigger team sync when info is absent from payload', async () => {
    const updatedCustomer = {
      id: 'c-1',
      name: 'TestCorp',
      status: 'live',
      info: { linkedin_company_url: 'https://linkedin.com/company/testcorp' },
    }
    mockUpdate.mockResolvedValue(updatedCustomer)

    const req = createMockReq({
      body: { status: 'live' },
    })
    const res = createMockRes()

    await updateCustomer(req, res)

    expect(res.statusCode).toBe(200)

    // Give fire-and-forget time to run (if it were going to)
    await new Promise(r => setTimeout(r, 50))

    // syncTeamForCustomer should NOT have been called — no info in payload
    expect(mockScrape).not.toHaveBeenCalled()
    expect(mockExtractSlug).not.toHaveBeenCalled()
  })

  it('does NOT trigger team sync when LinkedIn URL is invalid', async () => {
    const updatedCustomer = {
      id: 'c-1',
      name: 'TestCorp',
      info: { linkedin_company_url: 'not-a-linkedin-url' },
    }
    mockUpdate.mockResolvedValue(updatedCustomer)
    mockExtractSlug.mockReturnValue(null) // invalid slug

    const req = createMockReq({
      body: { info: { linkedin_company_url: 'not-a-linkedin-url' } },
    })
    const res = createMockRes()

    await updateCustomer(req, res)

    expect(res.statusCode).toBe(200)

    await new Promise(r => setTimeout(r, 50))

    // extractCompanySlug was called but returned null — scrape should not happen
    expect(mockScrape).not.toHaveBeenCalled()
  })

  it('returns HTTP response even if team sync fails', async () => {
    const updatedCustomer = {
      id: 'c-1',
      name: 'TestCorp',
      info: { linkedin_company_url: 'https://linkedin.com/company/testcorp' },
    }
    mockUpdate.mockResolvedValue(updatedCustomer)
    mockExtractSlug.mockReturnValue('testcorp')
    // Make syncTeamForCustomer fail
    mockGetById.mockRejectedValue(new Error('DB connection lost'))

    const req = createMockReq({
      body: { info: { linkedin_company_url: 'https://linkedin.com/company/testcorp' } },
    })
    const res = createMockRes()

    await updateCustomer(req, res)

    // Response should still succeed — team sync failure is fire-and-forget
    expect(res.statusCode).toBe(200)
    expect(res.jsonData).toEqual(updatedCustomer)
  })
})
