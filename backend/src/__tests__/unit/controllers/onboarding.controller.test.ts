/**
 * Onboarding Controller Unit Tests
 *
 * Tests the 3 onboarding endpoints: getProgress, saveProgress, extractProfileHandler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { getProgress, saveProgress, extractProfileHandler } from '../../../controllers/onboarding.controller.js';

// =============================================================================
// Mocks
// =============================================================================

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: mockMaybeSingle,
      })),
    })),
    upsert: mockUpsert,
    update: mockUpdate,
  })),
};

vi.mock('../../../lib/requestContext.js', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getUserId: vi.fn(() => 'test-user-id'),
}));

vi.mock('../../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../services/ProfileExtractionService.js', () => ({
  extractProfile: vi.fn().mockResolvedValue({
    about_me: { bio: 'Extracted bio' },
  }),
}));

// =============================================================================
// Helpers
// =============================================================================

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: 'test-user-id' },
    body: {},
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 200,
    _json: null,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: unknown) {
      this._json = data;
      return this;
    },
  };
  return res as unknown as Response & { _status: number; _json: unknown };
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getProgress', () => {
  it('returns 401 when no user on request', async () => {
    const req = createMockReq({ user: undefined });
    const res = createMockRes();

    await getProgress(req, res);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: 'Unauthorized' });
  });

  it('returns { progress: null } when no row exists', async () => {
    // Rebuild chain mock for this specific test
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const req = createMockReq();
    const res = createMockRes();

    await getProgress(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ progress: null });
    expect(mockSupabase.from).toHaveBeenCalledWith('onboarding_progress');
  });

  it('returns progress row when it exists', async () => {
    const progressRow = {
      id: '1',
      user_id: 'test-user-id',
      current_step: 2,
      completed_at: null,
      step_data: { about_me: { bio: 'My bio' } },
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: progressRow, error: null }),
        }),
      }),
    });

    const req = createMockReq();
    const res = createMockRes();

    await getProgress(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ progress: progressRow });
  });

  it('returns 500 when Supabase errors', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'DB error' },
          }),
        }),
      }),
    });

    const req = createMockReq();
    const res = createMockRes();

    await getProgress(req, res);

    expect(res._status).toBe(500);
  });
});

describe('saveProgress', () => {
  it('returns 401 when no user on request', async () => {
    const req = createMockReq({ user: undefined });
    const res = createMockRes();

    await saveProgress(req, res);

    expect(res._status).toBe(401);
  });

  it('returns 400 when body is invalid', async () => {
    const req = createMockReq({
      body: { current_step: 99 }, // out of range (max 5)
    });
    const res = createMockRes();

    await saveProgress(req, res);

    expect(res._status).toBe(400);
    expect((res._json as Record<string, unknown>).error).toBe('Invalid input');
  });

  it('upserts progress with valid data', async () => {
    const savedRow = {
      id: '1',
      user_id: 'test-user-id',
      current_step: 3,
      step_data: { about_me: { bio: 'Updated' } },
    };

    mockSupabase.from.mockReturnValueOnce({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: savedRow, error: null }),
        }),
      }),
    });

    const req = createMockReq({
      body: {
        current_step: 3,
        step_data: { about_me: { bio: 'Updated' } },
      },
    });
    const res = createMockRes();

    await saveProgress(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ progress: savedRow });
  });

  it('accepts completed_at in valid datetime format', async () => {
    mockSupabase.from.mockReturnValueOnce({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { completed_at: '2026-03-02T00:00:00Z' },
            error: null,
          }),
        }),
      }),
    });

    const req = createMockReq({
      body: {
        current_step: 0,
        completed_at: '2026-03-02T00:00:00Z',
      },
    });
    const res = createMockRes();

    await saveProgress(req, res);

    expect(res._status).toBe(200);
  });
});

describe('extractProfileHandler', () => {
  it('returns 401 when no user on request', async () => {
    const req = createMockReq({ user: undefined });
    const res = createMockRes();

    await extractProfileHandler(req, res);

    expect(res._status).toBe(401);
  });

  it('returns 400 when no input provided', async () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await extractProfileHandler(req, res);

    expect(res._status).toBe(400);
    expect((res._json as Record<string, unknown>).error).toBe('Invalid input');
  });

  it('returns 400 for invalid URL format', async () => {
    const req = createMockReq({
      body: { websiteUrl: 'not-a-url' },
    });
    const res = createMockRes();

    await extractProfileHandler(req, res);

    expect(res._status).toBe(400);
  });

  it('returns 202 with valid websiteUrl', async () => {
    // Mock the upsert for ensuring row exists
    mockSupabase.from.mockReturnValueOnce({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    // Mock the from call for background update
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const req = createMockReq({
      body: { websiteUrl: 'https://example.com' },
    });
    const res = createMockRes();

    await extractProfileHandler(req, res);

    expect(res._status).toBe(202);
    expect((res._json as Record<string, unknown>).status).toBe('extracting');
  });

  it('returns 202 with pastedText (no URL required)', async () => {
    mockSupabase.from.mockReturnValueOnce({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const req = createMockReq({
      body: { pastedText: 'I am a product consultant with 10 years of experience.' },
    });
    const res = createMockRes();

    await extractProfileHandler(req, res);

    expect(res._status).toBe(202);
  });
});
