/**
 * Research Tools Unit Tests
 *
 * Tests for conductDeepResearch tool.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conductDeepResearch } from '../../../../../services/ai/tools/researchTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { supabaseAdmin } from '../../../../../lib/supabase.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import { researchFixtures } from '../../../../fixtures/research.js';
import { callTool, assertToolOutputSuccess, assertToolOutputError } from '../../../../utils/testHelpers.js';

// Mock dependencies
vi.mock('../../../../../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
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
  });

  describe('Input Validation', () => {
    it('should reject invalid artifactId format', async () => {
      const result = await callTool(conductDeepResearch, {
        artifactId: 'invalid-uuid',
        topic: 'Test Topic',
        minRequired: 5,
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should reject empty topic', async () => {
      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: '',
        minRequired: 5,
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_INPUT');
    });

    it('should accept valid input', async () => {
      // Mock artifact fetch
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.draft,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.draft.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        minRequired: 5,
      });

      // Should not error on valid input
      expect(result.success).toBe(true);
    });
  });

  describe('Mock Response Handling', () => {
    it('should return mock response when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        sourceCount: 5,
        keyInsights: ['Insight 1', 'Insight 2'],
        sourcesBreakdown: { reddit: 2, linkedin: 2, medium: 1 },
        uniqueSourcesCount: 5,
        traceId: 'mock-trace-001',
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        minRequired: 5,
      });

      assertToolOutputSuccess(result);
      expect(result.data.sourceCount).toBe(5);
      expect(mockService.getMockResponse).toHaveBeenCalledWith(
        'conductDeepResearch',
        'default',
        expect.any(Object)
      );
    });
  });

  describe('Status Transitions', () => {
    it('should transition from draft to research status', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      // Mock successful research
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.draft,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.draft.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        minRequired: 5,
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
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.draft,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.draft.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        minRequired: 5,
      });

      assertToolOutputSuccess(result);
      expect(result.data.sourceCount).toBeGreaterThanOrEqual(5);
      expect(result.data.sourcesBreakdown).toBeDefined();
      expect(result.data.keyInsights).toBeDefined();
      expect(result.data.uniqueSourcesCount).toBeGreaterThan(0);
    });

    it('should generate key insights from research', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.draft,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.draft.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Node.js API Best Practices',
        minRequired: 5,
      });

      assertToolOutputSuccess(result);
      expect(Array.isArray(result.data.keyInsights)).toBe(true);
      expect(result.data.keyInsights.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle artifact not found error', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Artifact not found' },
            }),
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: 'nonexistent-artifact-id',
        topic: 'Test Topic',
        minRequired: 5,
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('ARTIFACT_NOT_FOUND');
    });

    it('should handle insufficient research results', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.draft,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: researchFixtures.minimal, // Only 1 result
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        minRequired: 5,
      });

      assertToolOutputError(result);
      expect(result.error?.message).toContain('minimum required');
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.draft,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.draft.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        minRequired: 5,
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      expect(result.traceId).toMatch(/^research-\d+-[a-z0-9]{6}$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.draft,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.draft.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(conductDeepResearch, {
        artifactId: artifactFixtures.draft.id,
        topic: 'Test Topic',
        minRequired: 5,
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
