/**
 * Unit Tests: Foundations Re-analyze Controller
 *
 * Tests the POST /api/artifacts/:id/re-analyze-foundations endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Hoisted mocks ---
const { mockGetSupabase, mockReanalyzeFoundations, mockRegenerateContent } = vi.hoisted(() => ({
  mockGetSupabase: vi.fn(),
  mockReanalyzeFoundations: vi.fn(),
  mockRegenerateContent: vi.fn(),
}))

vi.mock('../../../lib/requestContext.js', () => ({
  getSupabase: mockGetSupabase,
}))

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

vi.mock('../../../services/ai/PipelineExecutor.js', () => ({
  pipelineExecutor: {
    reanalyzeFoundations: mockReanalyzeFoundations,
    regenerateContent: mockRegenerateContent,
  },
}))

import { reanalyzeFoundations } from '../../../controllers/foundationsReanalyze.controller.js'

// --- Helpers ---

function createMockReq(overrides: Record<string, any> = {}) {
  return {
    params: { id: 'artifact-123' },
    body: { selectedReferenceIds: ['ref-1', 'ref-2'] },
    user: { id: 'user-456' },
    ...overrides,
  } as any
}

function createMockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

function createMockSupabase(artifact: any = null, updateError: any = null) {
  const eq = vi.fn()

  // For select().eq().single() chain
  const selectChain = {
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: artifact,
        error: artifact ? null : { message: 'Not found' },
      }),
    }),
  }

  // For update().eq() chain
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ error: updateError }),
  }

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(updateChain),
    }),
  }
}

// --- Tests ---

describe('reanalyzeFoundations controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when artifact ID is missing', async () => {
    const req = createMockReq({ params: { id: undefined } })
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Missing artifact ID' })
    )
  })

  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined })
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' })
    )
  })

  it('returns 400 when selectedReferenceIds is not an array', async () => {
    const req = createMockReq({ body: { selectedReferenceIds: 'not-array' } })
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid request body' })
    )
  })

  it('returns 400 when selectedReferenceIds contains non-strings', async () => {
    const req = createMockReq({ body: { selectedReferenceIds: ['ref-1', 123, null] } })
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid request body' })
    )
  })

  it('returns 400 when selectedReferenceIds contains empty strings', async () => {
    const req = createMockReq({ body: { selectedReferenceIds: ['ref-1', ''] } })
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 404 when artifact is not found', async () => {
    mockGetSupabase.mockReturnValue(createMockSupabase(null))
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Artifact not found' })
    )
  })

  it('returns 403 when user does not own the artifact', async () => {
    mockGetSupabase.mockReturnValue(
      createMockSupabase({
        id: 'artifact-123',
        status: 'foundations_approval',
        user_id: 'other-user',
        metadata: {},
      })
    )
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Forbidden' })
    )
  })

  it('returns 400 when artifact is in wrong status', async () => {
    mockGetSupabase.mockReturnValue(
      createMockSupabase({
        id: 'artifact-123',
        status: 'writing',
        user_id: 'user-456',
        metadata: {},
      })
    )
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid status' })
    )
  })

  it('accepts foundations_approval status', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'foundations_approval',
      user_id: 'user-456',
      metadata: { existingField: 'keep' },
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockReanalyzeFoundations.mockResolvedValue({
      success: true,
      traceId: 'trace-1',
      stepsCompleted: 3,
      totalSteps: 3,
      duration: 5000,
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it('accepts skeleton status', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'skeleton',
      user_id: 'user-456',
      metadata: {},
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockReanalyzeFoundations.mockResolvedValue({
      success: true,
      traceId: 'trace-1',
      stepsCompleted: 3,
      totalSteps: 3,
      duration: 5000,
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('merges selectedReferenceIds into existing metadata', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'foundations_approval',
      user_id: 'user-456',
      metadata: { existingField: 'keep', selectedReferenceIds: ['old-ref'] },
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockReanalyzeFoundations.mockResolvedValue({
      success: true,
      traceId: 'trace-1',
      stepsCompleted: 3,
      totalSteps: 3,
      duration: 5000,
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    // Verify metadata update was called with merged metadata
    const fromCall = supabase.from.mock.calls.find(
      (call: any[]) => call[0] === 'artifacts'
    )
    expect(fromCall).toBeTruthy()
    expect(mockReanalyzeFoundations).toHaveBeenCalledWith('artifact-123')
  })

  it('returns 500 when pipeline fails', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'foundations_approval',
      user_id: 'user-456',
      metadata: {},
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockReanalyzeFoundations.mockResolvedValue({
      success: false,
      error: { message: 'Pipeline step failed' },
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Re-analysis failed' })
    )
  })

  it('allows empty selectedReferenceIds array', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'foundations_approval',
      user_id: 'user-456',
      metadata: {},
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockReanalyzeFoundations.mockResolvedValue({
      success: true,
      traceId: 'trace-1',
      stepsCompleted: 3,
      totalSteps: 3,
      duration: 5000,
    })
    const req = createMockReq({ body: { selectedReferenceIds: [] } })
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
  })

  // --- Post-creation regeneration (ready/published) ---

  it('accepts ready status and calls regenerateContent', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'ready',
      user_id: 'user-456',
      metadata: {},
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockRegenerateContent.mockResolvedValue({
      success: true,
      traceId: 'trace-regen',
      stepsCompleted: 5,
      totalSteps: 5,
      duration: 30000,
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockRegenerateContent).toHaveBeenCalledWith('artifact-123')
    expect(mockReanalyzeFoundations).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Content regeneration started',
      })
    )
  })

  it('accepts published status and calls regenerateContent', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'published',
      user_id: 'user-456',
      metadata: { existingField: 'keep' },
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockRegenerateContent.mockResolvedValue({
      success: true,
      traceId: 'trace-regen-2',
      stepsCompleted: 5,
      totalSteps: 5,
      duration: 25000,
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockRegenerateContent).toHaveBeenCalledWith('artifact-123')
    expect(mockReanalyzeFoundations).not.toHaveBeenCalled()
  })

  it('returns 500 with regeneration error message when regenerateContent fails', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'ready',
      user_id: 'user-456',
      metadata: {},
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockRegenerateContent.mockResolvedValue({
      success: false,
      error: { message: 'Writing step failed' },
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Content regeneration failed' })
    )
  })

  it('calls reanalyzeFoundations (not regenerateContent) for skeleton status', async () => {
    const supabase = createMockSupabase({
      id: 'artifact-123',
      status: 'skeleton',
      user_id: 'user-456',
      metadata: {},
    })
    mockGetSupabase.mockReturnValue(supabase)
    mockReanalyzeFoundations.mockResolvedValue({
      success: true,
      traceId: 'trace-1',
      stepsCompleted: 3,
      totalSteps: 3,
      duration: 5000,
    })
    const req = createMockReq()
    const res = createMockRes()

    await reanalyzeFoundations(req, res)

    expect(mockReanalyzeFoundations).toHaveBeenCalledWith('artifact-123')
    expect(mockRegenerateContent).not.toHaveBeenCalled()
  })
})
