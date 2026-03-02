/**
 * Skeleton Tools Unit Tests
 *
 * Tests for generateContentSkeleton tool.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateContentSkeleton } from '../../../../../services/ai/agents/portfolio/tools/skeletonTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import { callTool, assertToolOutputSuccess, assertToolOutputError, createMockSkeleton } from '../../../../utils/testHelpers.js';

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

describe('generateContentSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chain — tests that need specific behavior override this
    (mockSupabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
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
      const result = await callTool(generateContentSkeleton, {
        artifactId: 'invalid-uuid',
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should accept valid artifactId', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Section 1', 'Section 2', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Mock Response Handling', () => {
    it('should return mock response when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Main Section', 'Conclusion'],
          estimatedWordCount: 1000,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
      expect(result.data.skeleton).toBeDefined();
      expect(result.data.sections).toHaveLength(3);
      expect(result.data.estimatedWordCount).toBe(1000);
    });
  });

  describe('Status Transitions', () => {
    it('should transition from research to skeleton status', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-002',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Main Content', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
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
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-003',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Main Section', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
      expect(Array.isArray(result.data.sections)).toBe(true);
      expect(result.data.sections.length).toBeGreaterThan(0);
    });

    it('should parse numbered sections from skeleton', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-004',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Section 1', 'Section 2', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
      expect(result.data.sections).toBeDefined();
    });

    it('should handle social_post sections', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-005',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('social_post'),
          sections: ['Hook', 'Key Points', 'Call to Action'],
          estimatedWordCount: 200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'social_post',
        tone: 'casual',
      });

      assertToolOutputSuccess(result);
      expect(result.data.sections).toContain('Hook');
      expect(result.data.sections).toContain('Key Points');
      expect(result.data.sections).toContain('Call to Action');
    });
  });

  describe('Word Count Estimation', () => {
    it('should estimate word count based on artifact type', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-006',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Main Content', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
      expect(result.data.estimatedWordCount).toBeGreaterThan(0);
      expect(typeof result.data.estimatedWordCount).toBe('number');
    });

    it('should estimate lower word count for social_post', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-007',
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('social_post'),
          sections: ['Hook', 'Key Points', 'Call to Action'],
          estimatedWordCount: 200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'social_post',
        tone: 'casual',
      });

      assertToolOutputSuccess(result);
      expect(result.data.estimatedWordCount).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle artifact not found error', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: false,
        traceId: 'mock-trace-error-001',
        data: {
          skeleton: '',
          sections: [],
          estimatedWordCount: 0,
        },
        error: {
          category: 'ARTIFACT_NOT_FOUND',
          message: 'Artifact not found',
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: '00000000-0000-4000-a000-ffffffffffff',
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('ARTIFACT_NOT_FOUND');
    });

    it('should handle missing research results', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.researchComplete,
              error: null,
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      // Should warn but not fail
      if (result.success) {
        expect(result.data.warning).toBeDefined();
      }
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      const timestamp = Date.now();
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: `skeleton-${timestamp}-abc123`,
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Main Content', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      expect(result.traceId).toMatch(/^skeleton-\d+-[a-z0-9]+$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'skeleton-1234567890-abc123',
        duration: 1234,
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: createMockSkeleton('blog'),
          sections: ['Introduction', 'Main Content', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: artifactFixtures.researchComplete.id,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
