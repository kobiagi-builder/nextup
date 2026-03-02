/**
 * Storytelling Tools Unit Tests
 *
 * Tests for analyzeStorytellingStructure tool.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeStorytellingStructure } from '../../../../../services/ai/agents/portfolio/tools/storytellingTools.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import {
  callTool,
  assertToolOutputSuccess,
  assertToolOutputError,
  createMockStorytellingGuidance,
} from '../../../../utils/testHelpers.js';

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

describe('analyzeStorytellingStructure', () => {
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
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid artifactId format', async () => {
      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: 'invalid-uuid',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should reject invalid artifactType', async () => {
      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'invalid_type',
      });

      assertToolOutputError(result);
    });

    it('should accept valid inputs', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Mock Response Handling', () => {
    it('should return mock response with default storytelling when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.storytellingGuidance).toBeDefined();
      expect(result.data.narrativeFramework).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
    });

    it('should store mock storytelling in database via upsert', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'artifact_storytelling') {
          return { upsert: upsertMock };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          upsert: upsertMock,
        };
      });

      await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          artifact_id: artifactFixtures.researchComplete.id,
          storytelling_guidance: expect.any(Object),
          narrative_framework: expect.any(String),
          summary: expect.any(String),
          recommendations: expect.any(String),
        }),
        expect.objectContaining({ onConflict: 'artifact_id' }),
      );
    });
  });

  describe('Type-Specific Framework Selection', () => {
    it('should use BAB framework for blog type by default', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.narrativeFramework).toBe('bab');
      expect(result.data.storytellingGuidance.narrative_framework.name).toBe('bab');
    });

    it('should use STAR framework for showcase type by default', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'showcase',
      });

      assertToolOutputSuccess(result);
      expect(result.data.narrativeFramework).toBe('star');
      expect(result.data.storytellingGuidance.narrative_framework.name).toBe('star');
    });

    it('should use BAB micro framework for social_post type by default', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'social_post',
      });

      assertToolOutputSuccess(result);
      expect(result.data.narrativeFramework).toBe('bab');
      expect(result.data.storytellingGuidance.narrative_framework.name).toBe('bab');
    });
  });

  describe('Story Arc Structure', () => {
    it('should include beginning, middle, and end in story arc', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      const arc = result.data.storytellingGuidance.story_arc;
      expect(arc.beginning).toBeTruthy();
      expect(arc.middle).toBeTruthy();
      expect(arc.end).toBeTruthy();
    });

    it('should include section_mapping in story arc', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      const mapping = result.data.storytellingGuidance.story_arc.section_mapping;
      expect(Array.isArray(mapping)).toBe(true);
      expect(mapping.length).toBeGreaterThan(0);
      expect(mapping[0]).toHaveProperty('section_role');
      expect(mapping[0]).toHaveProperty('guidance');
      expect(mapping[0]).toHaveProperty('emotional_target');
    });

    it('should have 3 section roles for social_post', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'social_post',
      });

      assertToolOutputSuccess(result);
      const mapping = result.data.storytellingGuidance.story_arc.section_mapping;
      expect(mapping.length).toBe(3);
      expect(mapping.map((m: any) => m.section_role)).toEqual(
        expect.arrayContaining(['hook', 'tension', 'payoff']),
      );
    });

    it('should have 5 section roles for showcase', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'showcase',
      });

      assertToolOutputSuccess(result);
      const mapping = result.data.storytellingGuidance.story_arc.section_mapping;
      expect(mapping.length).toBe(5);
      expect(mapping.map((m: any) => m.section_role)).toEqual(
        expect.arrayContaining(['context', 'challenge', 'journey', 'transformation', 'framework']),
      );
    });
  });

  describe('Emotional Journey', () => {
    it('should include emotional journey stages', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      const journey = result.data.storytellingGuidance.emotional_journey;
      expect(Array.isArray(journey)).toBe(true);
      expect(journey.length).toBeGreaterThanOrEqual(3);
    });

    it('should have valid emotional journey structure', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      const stage = result.data.storytellingGuidance.emotional_journey[0];
      expect(stage).toHaveProperty('stage');
      expect(stage).toHaveProperty('emotion');
      expect(stage).toHaveProperty('intensity');
      expect(stage).toHaveProperty('technique');
      expect(typeof stage.intensity).toBe('number');
    });
  });

  describe('Hook and Protagonist', () => {
    it('should include hook_strategy', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      const hook = result.data.storytellingGuidance.hook_strategy;
      expect(hook).toHaveProperty('type');
      expect(hook).toHaveProperty('guidance');
      expect(hook.type).toBeTruthy();
    });

    it('should include protagonist guidance', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      const protagonist = result.data.storytellingGuidance.protagonist;
      expect(protagonist).toHaveProperty('type');
      expect(protagonist).toHaveProperty('guidance');
    });

    it('should use customer_as_hero protagonist for showcase', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'showcase',
      });

      assertToolOutputSuccess(result);
      expect(result.data.storytellingGuidance.protagonist.type).toBe('customer_as_hero');
    });
  });

  describe('No Status Transition', () => {
    it('should NOT include statusTransition in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.statusTransition).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should return error when artifact not found (non-mock path)', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Artifact not found' },
            }),
          }),
        }),
      });

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: '00000000-0000-4000-a000-ffffffffffff',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('ARTIFACT_NOT_FOUND');
    });

    it('should provide default storytelling on error', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: '00000000-0000-4000-a000-ffffffffffff',
        artifactType: 'blog',
      });

      assertToolOutputError(result);
      // Should still return default guidance in data even on error
      expect(result.data.storytellingGuidance).toBeDefined();
      expect(result.data.storytellingGuidance.narrative_framework).toBeDefined();
    });

    it('should handle database upsert failure gracefully in mock path', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'artifact_storytelling') {
          return {
            upsert: vi.fn().mockResolvedValue({
              error: { message: 'Upsert failed' },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      // Should still succeed — upsert failure is a warning, not a hard error
      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.data.storytellingGuidance).toBeDefined();
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      expect(result.traceId).toMatch(/^storytelling-\d+-[a-z0-9]+$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);

      const result = await callTool(analyzeStorytellingStructure, {
        artifactId: artifactFixtures.researchComplete.id,
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
