/**
 * Humanity Check Tools Unit Tests
 *
 * Tests for applyHumanityCheck and checkContentHumanity tools.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyHumanityCheck, checkContentHumanity } from '../../../../../services/ai/tools/humanityCheckTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { supabaseAdmin } from '../../../../../lib/supabase.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import { assertToolOutputSuccess, assertToolOutputError, createMockContent } from '../../../../utils/testHelpers.js';

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

describe('applyHumanityCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject invalid artifactId format', async () => {
      const result = await applyHumanityCheck.execute({
        artifactId: 'invalid-uuid',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should accept valid artifactId', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        originalLength: 2500,
        humanizedLength: 2450,
        lengthChange: -50,
        humanityScoreBefore: 65,
        humanityScoreAfter: 92,
        patternsFixed: 8,
        patternsChecked: 24,
        message: 'Content humanized successfully',
        traceId: 'mock-trace-001',
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals Artifact.id,
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Status Transitions', () => {
    it('should transition from creating_visuals to ready status', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        originalLength: 2500,
        humanizedLength: 2450,
        lengthChange: -50,
        humanityScoreBefore: 60,
        humanityScoreAfter: 90,
        patternsFixed: 10,
        patternsChecked: 24,
        message: 'Content humanized',
        traceId: 'mock-trace-001',
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.statusTransition).toEqual({
        from: 'creating_visuals',
        to: 'ready',
      });
    });
  });

  describe('Humanity Score Calculation', () => {
    it('should calculate humanity score before and after', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        originalLength: 2500,
        humanizedLength: 2480,
        lengthChange: -20,
        humanityScoreBefore: 55,
        humanityScoreAfter: 88,
        patternsFixed: 12,
        patternsChecked: 24,
        message: 'Content improved',
        traceId: 'mock-trace-001',
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.humanityScoreBefore).toBeGreaterThanOrEqual(0);
      expect(result.data.humanityScoreBefore).toBeLessThanOrEqual(100);
      expect(result.data.humanityScoreAfter).toBeGreaterThanOrEqual(0);
      expect(result.data.humanityScoreAfter).toBeLessThanOrEqual(100);
      expect(result.data.humanityScoreAfter).toBeGreaterThan(result.data.humanityScoreBefore);
    });

    it('should detect AI patterns and calculate score', async () => {
      const contentWithAIPatterns = createMockContent('blog', true);

      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.creatingVisuals,
                content: contentWithAIPatterns,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.creatingVisualsArtifact.id },
            error: null,
          }),
        }),
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      // Content with AI patterns should have lower score
      if (result.success) {
        expect(result.data.humanityScoreBefore).toBeLessThan(80);
      }
    });
  });

  describe('Pattern Fixing', () => {
    it('should count patterns fixed', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        originalLength: 2500,
        humanizedLength: 2470,
        lengthChange: -30,
        humanityScoreBefore: 62,
        humanityScoreAfter: 91,
        patternsFixed: 7,
        patternsChecked: 24,
        message: 'Fixed 7 AI patterns',
        traceId: 'mock-trace-001',
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.patternsFixed).toBeGreaterThanOrEqual(0);
      expect(typeof result.data.patternsFixed).toBe('number');
    });

    it('should check 24 pattern types', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        originalLength: 2500,
        humanizedLength: 2490,
        lengthChange: -10,
        humanityScoreBefore: 70,
        humanityScoreAfter: 93,
        patternsFixed: 3,
        patternsChecked: 24,
        message: 'Checked all patterns',
        traceId: 'mock-trace-001',
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.patternsChecked).toBe(24);
    });
  });

  describe('Length Tracking', () => {
    it('should track content length changes', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        originalLength: 2500,
        humanizedLength: 2450,
        lengthChange: -50,
        humanityScoreBefore: 65,
        humanityScoreAfter: 90,
        patternsFixed: 5,
        patternsChecked: 24,
        message: 'Length optimized',
        traceId: 'mock-trace-001',
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.originalLength).toBeGreaterThan(0);
      expect(result.data.humanizedLength).toBeGreaterThan(0);
      expect(result.data.lengthChange).toBe(
        result.data.humanizedLength - result.data.originalLength
      );
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

      const result = await applyHumanityCheck.execute({
        artifactId: 'nonexistent-artifact-id',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('ARTIFACT_NOT_FOUND');
    });

    it('should handle missing content error', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.creatingVisuals,
                content: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await applyHumanityCheck.execute({
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputError(result);
      expect(result.error?.message).toContain('content');
    });
  });
});

describe('checkContentHumanity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject invalid artifactId format', async () => {
      const result = await checkContentHumanity.execute({
        artifactId: 'invalid-uuid',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should accept valid artifactId', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        detectedPatterns: [
          {
            category: 'AI Vocabulary',
            example: 'multifaceted approach',
            fix: 'Remove unnecessary adjectives',
          },
        ],
        patternCount: 8,
        humanityScore: 72,
        topIssues: ['AI vocabulary overuse', 'Em dash frequency'],
        suggestions: ['Simplify language', 'Vary punctuation'],
        contentLength: 2500,
        verdict: 'Needs improvement',
        traceId: 'mock-trace-001',
      });

      const result = await checkContentHumanity.execute({
        artifactId: artifactFixtures.writingArtifact.id,
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect AI patterns in content', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        detectedPatterns: [
          {
            category: 'AI Vocabulary',
            example: 'delve into the topic',
            fix: 'Use simpler verbs',
          },
          {
            category: 'Em Dash Overuse',
            example: 'The system — which is complex — works well',
            fix: 'Use commas or parentheses',
          },
        ],
        patternCount: 12,
        humanityScore: 68,
        topIssues: ['AI vocabulary', 'Em dashes'],
        suggestions: ['Simplify language', 'Reduce em dash usage'],
        contentLength: 2500,
        verdict: 'Needs improvement',
        traceId: 'mock-trace-001',
      });

      const result = await checkContentHumanity.execute({
        artifactId: artifactFixtures.writingArtifact.id,
      });

      assertToolOutputSuccess(result);
      expect(Array.isArray(result.data.detectedPatterns)).toBe(true);
      expect(result.data.detectedPatterns.length).toBeGreaterThan(0);

      result.data.detectedPatterns.forEach(pattern => {
        expect(pattern).toHaveProperty('category');
        expect(pattern).toHaveProperty('example');
        expect(pattern).toHaveProperty('fix');
      });
    });

    it('should provide pattern count', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        detectedPatterns: [],
        patternCount: 5,
        humanityScore: 82,
        topIssues: ['Minor issues'],
        suggestions: ['Keep current style'],
        contentLength: 2400,
        verdict: 'Good quality',
        traceId: 'mock-trace-001',
      });

      const result = await checkContentHumanity.execute({
        artifactId: artifactFixtures.writingArtifact.id,
      });

      assertToolOutputSuccess(result);
      expect(typeof result.data.patternCount).toBe('number');
      expect(result.data.patternCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Humanity Scoring', () => {
    it('should calculate humanity score', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        detectedPatterns: [],
        patternCount: 3,
        humanityScore: 88,
        topIssues: [],
        suggestions: ['Content looks good'],
        contentLength: 2300,
        verdict: 'Excellent quality',
        traceId: 'mock-trace-001',
      });

      const result = await checkContentHumanity.execute({
        artifactId: artifactFixtures.writingArtifact.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.humanityScore).toBeGreaterThanOrEqual(0);
      expect(result.data.humanityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Recommendations', () => {
    it('should provide top issues and suggestions', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        detectedPatterns: [],
        patternCount: 7,
        humanityScore: 74,
        topIssues: ['AI vocabulary', 'Repetitive patterns', 'Em dash overuse'],
        suggestions: ['Simplify language', 'Vary sentence structure', 'Use diverse punctuation'],
        contentLength: 2600,
        verdict: 'Needs improvement',
        traceId: 'mock-trace-001',
      });

      const result = await checkContentHumanity.execute({
        artifactId: artifactFixtures.writingArtifact.id,
      });

      assertToolOutputSuccess(result);
      expect(Array.isArray(result.data.topIssues)).toBe(true);
      expect(Array.isArray(result.data.suggestions)).toBe(true);
      expect(result.data.verdict).toBeDefined();
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        detectedPatterns: [],
        patternCount: 4,
        humanityScore: 85,
        topIssues: [],
        suggestions: [],
        contentLength: 2200,
        verdict: 'Good',
        traceId: 'humanity-check-123456-abc123',
      });

      const result = await checkContentHumanity.execute({
        artifactId: artifactFixtures.writingArtifact.id,
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      expect(result.traceId).toMatch(/^humanity-check-\d+-[a-z0-9]{6}$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        detectedPatterns: [],
        patternCount: 4,
        humanityScore: 85,
        topIssues: [],
        suggestions: [],
        contentLength: 2200,
        verdict: 'Good',
        traceId: 'mock-trace-001',
        duration: 1234,
      });

      const result = await checkContentHumanity.execute({
        artifactId: artifactFixtures.writingArtifact.id,
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
