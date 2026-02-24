/**
 * Humanity Check Tools Unit Tests
 *
 * Tests for applyHumanityCheck and checkContentHumanity tools.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyHumanityCheck, checkContentHumanity } from '../../../../../services/ai/tools/humanityCheckTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';

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

// Shared test execution options matching ToolExecutionOptions interface
const toolOptions = { toolCallId: 'test-call-id', messages: [] as any[] };

// Default test content for applyHumanityCheck (requires content + tone)
const defaultContent = 'This is a test article about building scalable web applications with modern frameworks and best practices.';
const defaultTone = 'professional' as const;

// Helper to setup supabase mock for update operations
function mockSupabaseUpdate(error: { message: string } | null = null) {
  (mockSupabase.from as any).mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error }),
    }),
  });
}

describe('applyHumanityCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mock Mode', () => {
    it('should return mock response when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 500,
        data: {
          originalLength: 2500,
          humanizedLength: 2450,
          lengthChange: -50,
          humanityScoreBefore: 65,
          humanityScoreAfter: 92,
          patternsFixed: 8,
          patternsChecked: 24,
          message: 'Content humanized successfully',
        },
      });
      mockSupabaseUpdate();

      const result: any = await applyHumanityCheck.execute!({
        artifactId: artifactFixtures.creatingVisuals.id,
        content: defaultContent,
        tone: defaultTone,
      }, toolOptions);

      expect(result.success).toBe(true);
    });

    it('should update database status in mock mode', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        status: 'creating_visuals',
        traceId: 'mock-trace-001',
        data: {
          originalLength: 2500,
          humanizedLength: 2450,
          lengthChange: -50,
          humanityScoreBefore: 60,
          humanityScoreAfter: 90,
          patternsFixed: 10,
          patternsChecked: 24,
          message: 'Content humanized',
        },
      });
      mockSupabaseUpdate();

      await applyHumanityCheck.execute!({
        artifactId: artifactFixtures.creatingVisuals.id,
        content: defaultContent,
        tone: defaultTone,
      }, toolOptions);

      expect(mockSupabase.from).toHaveBeenCalledWith('artifacts');
    });
  });

  describe('Humanity Score Calculation', () => {
    it('should return scores in mock response', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 600,
        data: {
          originalLength: 2500,
          humanizedLength: 2480,
          lengthChange: -20,
          humanityScoreBefore: 55,
          humanityScoreAfter: 88,
          patternsFixed: 12,
          patternsChecked: 24,
          message: 'Content improved',
        },
      });
      mockSupabaseUpdate();

      const result: any = await applyHumanityCheck.execute!({
        artifactId: artifactFixtures.creatingVisuals.id,
        content: defaultContent,
        tone: defaultTone,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(result.data.humanityScoreBefore).toBeGreaterThanOrEqual(0);
      expect(result.data.humanityScoreBefore).toBeLessThanOrEqual(100);
      expect(result.data.humanityScoreAfter).toBeGreaterThanOrEqual(0);
      expect(result.data.humanityScoreAfter).toBeLessThanOrEqual(100);
      expect(result.data.humanityScoreAfter).toBeGreaterThan(result.data.humanityScoreBefore);
    });
  });

  describe('Pattern Fixing', () => {
    it('should count patterns fixed', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 400,
        data: {
          originalLength: 2500,
          humanizedLength: 2470,
          lengthChange: -30,
          humanityScoreBefore: 62,
          humanityScoreAfter: 91,
          patternsFixed: 7,
          patternsChecked: 24,
          message: 'Fixed 7 AI patterns',
        },
      });
      mockSupabaseUpdate();

      const result: any = await applyHumanityCheck.execute!({
        artifactId: artifactFixtures.creatingVisuals.id,
        content: defaultContent,
        tone: defaultTone,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(result.data.patternsFixed).toBeGreaterThanOrEqual(0);
      expect(typeof result.data.patternsFixed).toBe('number');
    });

    it('should check 24 pattern types', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 350,
        data: {
          originalLength: 2500,
          humanizedLength: 2490,
          lengthChange: -10,
          humanityScoreBefore: 70,
          humanityScoreAfter: 93,
          patternsFixed: 3,
          patternsChecked: 24,
          message: 'Checked all patterns',
        },
      });
      mockSupabaseUpdate();

      const result: any = await applyHumanityCheck.execute!({
        artifactId: artifactFixtures.creatingVisuals.id,
        content: defaultContent,
        tone: defaultTone,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(result.data.patternsChecked).toBe(24);
    });
  });

  describe('Length Tracking', () => {
    it('should track content length changes', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 500,
        data: {
          originalLength: 2500,
          humanizedLength: 2450,
          lengthChange: -50,
          humanityScoreBefore: 65,
          humanityScoreAfter: 90,
          patternsFixed: 5,
          patternsChecked: 24,
          message: 'Length optimized',
        },
      });
      mockSupabaseUpdate();

      const result: any = await applyHumanityCheck.execute!({
        artifactId: artifactFixtures.creatingVisuals.id,
        content: defaultContent,
        tone: defaultTone,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(result.data.originalLength).toBeGreaterThan(0);
      expect(result.data.humanizedLength).toBeGreaterThan(0);
      expect(result.data.lengthChange).toBe(
        result.data.humanizedLength - result.data.originalLength
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database update error gracefully', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      // Mock generateText to return humanized content
      vi.mock('ai', async () => {
        const actual = await vi.importActual('ai');
        return {
          ...(actual as object),
          generateText: vi.fn().mockResolvedValue({
            text: 'Humanized content without AI patterns.',
          }),
        };
      });

      mockSupabaseUpdate({ message: 'Database update failed' });

      const result: any = await applyHumanityCheck.execute!({
        artifactId: artifactFixtures.creatingVisuals.id,
        content: defaultContent,
        tone: defaultTone,
      }, toolOptions);

      expect(result.success).toBe(false);
    });
  });
});

describe('checkContentHumanity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mock Mode', () => {
    it('should return mock response when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 300,
        data: {
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
        },
      });

      const result: any = await checkContentHumanity.execute!({
        content: defaultContent,
      }, toolOptions);

      expect(result.success).toBe(true);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect AI patterns in content', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 400,
        data: {
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
        },
      });

      const result: any = await checkContentHumanity.execute!({
        content: defaultContent,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.detectedPatterns)).toBe(true);
      expect(result.data.detectedPatterns.length).toBeGreaterThan(0);

      result.data.detectedPatterns.forEach((pattern: any) => {
        expect(pattern).toHaveProperty('category');
        expect(pattern).toHaveProperty('example');
        expect(pattern).toHaveProperty('fix');
      });
    });

    it('should provide pattern count', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 250,
        data: {
          detectedPatterns: [],
          patternCount: 5,
          humanityScore: 82,
          topIssues: ['Minor issues'],
          suggestions: ['Keep current style'],
          contentLength: 2400,
          verdict: 'Good quality',
        },
      });

      const result: any = await checkContentHumanity.execute!({
        content: defaultContent,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(typeof result.data.patternCount).toBe('number');
      expect(result.data.patternCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Humanity Scoring', () => {
    it('should calculate humanity score', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 200,
        data: {
          detectedPatterns: [],
          patternCount: 3,
          humanityScore: 88,
          topIssues: [],
          suggestions: ['Content looks good'],
          contentLength: 2300,
          verdict: 'Excellent quality',
        },
      });

      const result: any = await checkContentHumanity.execute!({
        content: defaultContent,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(result.data.humanityScore).toBeGreaterThanOrEqual(0);
      expect(result.data.humanityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Recommendations', () => {
    it('should provide top issues and suggestions', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 350,
        data: {
          detectedPatterns: [],
          patternCount: 7,
          humanityScore: 74,
          topIssues: ['AI vocabulary', 'Repetitive patterns', 'Em dash overuse'],
          suggestions: ['Simplify language', 'Vary sentence structure', 'Use diverse punctuation'],
          contentLength: 2600,
          verdict: 'Needs improvement',
        },
      });

      const result: any = await checkContentHumanity.execute!({
        content: defaultContent,
      }, toolOptions);

      expect(result.success).toBe(true);
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
        traceId: 'humanity-analysis-123456-abc123',
        duration: 300,
        data: {
          detectedPatterns: [],
          patternCount: 4,
          humanityScore: 85,
          topIssues: [],
          suggestions: [],
          contentLength: 2200,
          verdict: 'Good',
        },
      });

      const result: any = await checkContentHumanity.execute!({
        content: defaultContent,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(result.traceId).toBeDefined();
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 1234,
        data: {
          detectedPatterns: [],
          patternCount: 4,
          humanityScore: 85,
          topIssues: [],
          suggestions: [],
          contentLength: 2200,
          verdict: 'Good',
        },
      });

      const result: any = await checkContentHumanity.execute!({
        content: defaultContent,
      }, toolOptions);

      expect(result.success).toBe(true);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
