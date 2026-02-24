/**
 * Research Tools Unit Tests
 *
 * Tests for conductDeepResearch tool.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conductDeepResearch } from '../../../../../services/ai/tools/researchTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import { callTool, assertToolOutputSuccess, assertToolOutputError } from '../../../../utils/testHelpers.js';

// Mock dependencies
const mockSupabase = { from: vi.fn() };
vi.mock('../../../../../lib/requestContext.js', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

vi.mock('../../../../../services/ai/mocks/index.js', () => ({
  mockService: {
    shouldMock: vi.fn(),
    getMockResponse: vi.fn(),
    captureRealResponse: vi.fn(),
  },
}));

describe('conductDeepResearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chain — tests that need specific behavior override this
    (mockSupabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid artifactId format', async () => {
      const result = await callTool(conductDeepResearch, {
        artifactId: 'invalid-uuid',
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should reject empty topic', async () => {
      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: '',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('TOOL_EXECUTION_FAILED');
    });

    it('should accept valid input', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        artifactType: 'blog',
      });

      // Should not error on valid input
      expect(result.success).toBe(true);
    });
  });

  describe('Mock Response Handling', () => {
    it('should return mock response when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.sourceCount).toBe(5);
    });
  });

  describe('Status Transitions', () => {
    it('should transition from draft to research status', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.statusTransition).toEqual({
        from: 'draft',
        to: 'research',
      });
    });
  });

  describe('Research Data Collection', () => {
    it('should collect research from multiple sources', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.sourceCount).toBe(5);
      expect(result.data.sourcesBreakdown).toBeDefined();
      expect(result.data.keyInsights).toBeDefined();
      expect(result.data.uniqueSourcesCount).toBe(5);
    });

    it('should generate key insights from research', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(Array.isArray(result.data.keyInsights)).toBe(true);
      expect(result.data.keyInsights.length).toBeGreaterThan(0);
      // Inline mock returns keyInsights as objects with sourceType, sourceName, excerpt, relevanceScore
      const firstInsight = result.data.keyInsights[0];
      expect(firstInsight).toHaveProperty('sourceType');
      expect(firstInsight).toHaveProperty('sourceName');
      expect(firstInsight).toHaveProperty('excerpt');
      expect(firstInsight).toHaveProperty('relevanceScore');
    });
  });

  describe('Error Handling', () => {
    it('should handle artifact not found error', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      // Mock Supabase to reject on the update call (which runs first in mock mode)
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: '00000000-0000-4000-a000-ffffffffffff',
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('TOOL_EXECUTION_FAILED');
    });

    it('should return research results in mock mode', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.sourceCount).toBe(5);
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      // generateMockTraceId('research') produces: research-{timestamp}-{9 chars base36}
      expect(result.traceId).toMatch(/^research-\d+-[a-z0-9]{9}$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
