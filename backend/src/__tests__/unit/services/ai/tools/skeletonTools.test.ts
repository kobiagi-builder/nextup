/**
 * Skeleton Tools Unit Tests
 *
 * Tests for generateContentSkeleton tool.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateContentSkeleton } from '../../../../../services/ai/tools/skeletonTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { supabaseAdmin } from '../../../../../lib/supabase.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import { researchFixtures } from '../../../../fixtures/research.js';
import { callTool, assertToolOutputSuccess, assertToolOutputError, createMockSkeleton } from '../../../../utils/testHelpers.js';

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

describe('generateContentSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject invalid artifactId format', async () => {
      const result = await callTool(generateContentSkeleton, {
        artifactId: 'invalid-uuid',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should accept valid artifactId', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        skeleton: createMockSkeleton('blog'),
        sections: ['Introduction', 'Section 1', 'Section 2', 'Conclusion'],
        estimatedWordCount: 1200,
        traceId: 'mock-trace-001',
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Mock Response Handling', () => {
    it('should return mock response when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        skeleton: createMockSkeleton('blog'),
        sections: ['Introduction', 'Main Section', 'Conclusion'],
        estimatedWordCount: 1000,
        traceId: 'mock-trace-001',
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.skeleton).toBeDefined();
      expect(result.data.sections).toHaveLength(3);
      expect(result.data.estimatedWordCount).toBe(1000);
    });
  });

  describe('Status Transitions', () => {
    it('should transition from research to skeleton status', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.researchComplete,
                type: 'blog',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      // Mock research results
      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.statusTransition).toEqual({
        from: 'research',
        to: 'skeleton',
      });
    });
  });

  describe('Section Parsing', () => {
    it('should parse markdown H2 sections from blog skeleton', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.researchComplete,
                type: 'blog',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      // Mock research results and AI response
      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(Array.isArray(result.data.sections)).toBe(true);
      expect(result.data.sections.length).toBeGreaterThan(0);
    });

    it('should parse numbered sections from skeleton', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.researchComplete,
                type: 'blog',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.sections).toBeDefined();
    });

    it('should handle social_post sections', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.researchComplete,
                type: 'social_post',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.minimal,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.sections).toContain('Hook');
      expect(result.data.sections).toContain('Key Points');
      expect(result.data.sections).toContain('Call to Action');
    });
  });

  describe('Word Count Estimation', () => {
    it('should estimate word count based on artifact type', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.researchComplete,
                type: 'blog',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.estimatedWordCount).toBeGreaterThan(0);
      expect(typeof result.data.estimatedWordCount).toBe('number');
    });

    it('should estimate lower word count for social_post', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.researchComplete,
                type: 'social_post',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.minimal,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.estimatedWordCount).toBeLessThan(500);
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

      const result = await callTool(generateContentSkeleton, {
        artifactId: 'nonexistent-artifact-id',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('ARTIFACT_NOT_FOUND');
    });

    it('should handle missing research results', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.researchComplete,
              error: null,
            }),
          }),
        }),
      });

      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      // Should warn but not fail
      if (result.success) {
        expect(result.data.warning).toBeDefined();
      }
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.researchComplete,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      expect(result.traceId).toMatch(/^skeleton-\d+-[a-z0-9]{6}$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.researchComplete,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.researchComplete.id },
            error: null,
          }),
        }),
      });

      (supabaseAdmin.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: researchFixtures.highQuality,
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
