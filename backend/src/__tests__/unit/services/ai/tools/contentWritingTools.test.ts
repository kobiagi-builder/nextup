/**
 * Content Writing Tools Unit Tests
 *
 * Tests for writeContentSection and writeFullContent tools.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writeContentSection, writeFullContent } from '../../../../../services/ai/agents/portfolio/tools/contentWritingTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import { researchFixtures } from '../../../../fixtures/research.js';
import { callTool, assertToolOutputSuccess, assertToolOutputError, createMockContent } from '../../../../utils/testHelpers.js';

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

describe('writeContentSection', () => {
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
      const result = await callTool(writeContentSection, {
        artifactId: 'invalid-uuid',
        sectionHeading: 'Test Section',
        sectionPlaceholder: 'Write about test topic',
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should reject invalid tone', async () => {
      const result = await callTool(writeContentSection, {
        artifactId: artifactFixtures.skeletonReady.id,
        sectionHeading: 'Test Section',
        sectionPlaceholder: 'Write about test topic',
        tone: 'invalid-tone',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_TONE');
    });

    it('should accept valid input', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        data: {
          content: 'Test content',
          sectionHeading: 'Test Section',
          researchSourcesUsed: 3,
          wordCount: 150,
          tone: 'professional',
        },
      });

      const result = await callTool(writeContentSection, {
        artifactId: artifactFixtures.skeletonReady.id,
        sectionHeading: 'Test Section',
        sectionPlaceholder: 'Write about test topic',
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Word Count Tracking', () => {
    it('should calculate word count for generated content', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      const mockContent = 'This is a test section with multiple words to count the total word count accurately.';
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        data: {
          content: mockContent,
          sectionHeading: 'Test Section',
          researchSourcesUsed: 3,
          wordCount: mockContent.split(/\s+/).length,
          tone: 'professional',
        },
      });

      const result = await callTool(writeContentSection, {
        artifactId: artifactFixtures.skeletonReady.id,
        sectionHeading: 'Test Section',
        sectionPlaceholder: 'Write content',
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.wordCount).toBeGreaterThan(0);
      expect(typeof result.data.wordCount).toBe('number');
    });
  });

  describe('Research Integration', () => {
    it('should indicate number of research sources used', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        data: {
          content: 'Content with research',
          sectionHeading: 'Test Section',
          researchSourcesUsed: 5,
          wordCount: 100,
          tone: 'professional',
        },
      });

      const result = await callTool(writeContentSection, {
        artifactId: artifactFixtures.skeletonReady.id,
        sectionHeading: 'Test Section',
        sectionPlaceholder: 'Write content',
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.researchSourcesUsed).toBeGreaterThanOrEqual(0);
      expect(typeof result.data.researchSourcesUsed).toBe('number');
    });
  });
});

describe('writeFullContent', () => {
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
      const result = await callTool(writeFullContent, {
        artifactId: 'invalid-uuid',
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should reject invalid tone', async () => {
      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'invalid-tone',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_TONE');
    });

    it('should accept valid input', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'skeleton', to: 'creating_visuals' },
        data: {
          totalLength: 2500,
          sectionsWritten: 4,
          sectionResults: [
            { section: 'Introduction', wordCount: 200, success: true },
            { section: 'Section 1', wordCount: 800, success: true },
            { section: 'Section 2', wordCount: 800, success: true },
            { section: 'Conclusion', wordCount: 700, success: true },
          ],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Status Transitions', () => {
    it('should transition from skeleton to creating_visuals status', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'skeleton', to: 'creating_visuals' },
        data: {
          totalLength: 2500,
          sectionsWritten: 4,
          sectionResults: [
            { section: 'Section 1', wordCount: 600, success: true },
            { section: 'Section 2', wordCount: 600, success: true },
            { section: 'Section 3', wordCount: 650, success: true },
            { section: 'Section 4', wordCount: 650, success: true },
          ],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.statusTransition).toEqual({
        from: 'skeleton',
        to: 'creating_visuals',
      });
    });
  });

  describe('Section Results Tracking', () => {
    it('should track results for each section', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        data: {
          totalLength: 3000,
          sectionsWritten: 5,
          sectionResults: [
            { section: 'Introduction', wordCount: 250, success: true },
            { section: 'Section 1', wordCount: 700, success: true },
            { section: 'Section 2', wordCount: 750, success: true },
            { section: 'Section 3', wordCount: 800, success: true },
            { section: 'Conclusion', wordCount: 500, success: true },
          ],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(Array.isArray(result.data.sectionResults)).toBe(true);
      expect(result.data.sectionResults.length).toBe(5);

      result.data.sectionResults.forEach((section: any) => {
        expect(section).toHaveProperty('section');
        expect(section).toHaveProperty('wordCount');
        expect(section).toHaveProperty('success');
        expect(typeof section.section).toBe('string');
        expect(typeof section.wordCount).toBe('number');
        expect(typeof section.success).toBe('boolean');
      });
    });

    it('should track failed sections', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        data: {
          totalLength: 1500,
          sectionsWritten: 3,
          sectionResults: [
            { section: 'Introduction', wordCount: 250, success: true },
            { section: 'Section 1', wordCount: 0, success: false },
            { section: 'Section 2', wordCount: 750, success: true },
            { section: 'Conclusion', wordCount: 500, success: true },
          ],
          errors: ['Failed to generate Section 1: AI timeout'],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);

      const failedSection = result.data.sectionResults.find((s: any) => !s.success);
      expect(failedSection).toBeDefined();
      expect(failedSection?.wordCount).toBe(0);
      expect(result.data.errors).toBeDefined();
      expect(result.data.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Content Length Tracking', () => {
    it('should track total content length', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        data: {
          totalLength: 2800,
          sectionsWritten: 4,
          sectionResults: [
            { section: 'Section 1', wordCount: 700, success: true },
            { section: 'Section 2', wordCount: 700, success: true },
            { section: 'Section 3', wordCount: 700, success: true },
            { section: 'Section 4', wordCount: 700, success: true },
          ],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.totalLength).toBeGreaterThan(0);
      expect(typeof result.data.totalLength).toBe('number');
    });

    it('should count number of sections written', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        data: {
          totalLength: 2400,
          sectionsWritten: 4,
          sectionResults: [
            { section: 'Section 1', wordCount: 600, success: true },
            { section: 'Section 2', wordCount: 600, success: true },
            { section: 'Section 3', wordCount: 600, success: true },
            { section: 'Section 4', wordCount: 600, success: true },
          ],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.sectionsWritten).toBe(4);
      expect(result.data.sectionsWritten).toBe(result.data.sectionResults.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle artifact not found error', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Artifact not found' },
            }),
          }),
        }),
      });

      const result = await callTool(writeFullContent, {
        artifactId: '00000000-0000-4000-a000-ffffffffffff',
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('ARTIFACT_NOT_FOUND');
    });

    it('should handle missing skeleton error', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: false,
        traceId: 'mock-err-001',
        data: {
          totalLength: 0,
          sectionsWritten: 0,
          sectionResults: [],
        },
        error: {
          category: 'MISSING_SKELETON',
          message: 'No skeleton content found',
          recoverable: false,
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.message).toContain('skeleton');
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'content-writing-123456-abc123',
        data: {
          totalLength: 2000,
          sectionsWritten: 3,
          sectionResults: [
            { section: 'Section 1', wordCount: 700, success: true },
            { section: 'Section 2', wordCount: 700, success: true },
            { section: 'Section 3', wordCount: 600, success: true },
          ],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      expect(result.traceId).toMatch(/^content-writing-\d+-[a-z0-9]{6}$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 5432,
        data: {
          totalLength: 2000,
          sectionsWritten: 3,
          sectionResults: [
            { section: 'Section 1', wordCount: 700, success: true },
            { section: 'Section 2', wordCount: 700, success: true },
            { section: 'Section 3', wordCount: 600, success: true },
          ],
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId: artifactFixtures.skeletonReady.id,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
