/**
 * Content Tools Unit Tests
 *
 * Tests for suggestArtifactIdeas tool with topicType support.
 */

import { describe, it, expect, vi } from 'vitest';
import { suggestArtifactIdeas } from '../../../../../services/ai/agents/portfolio/tools/contentTools.js';
import { callTool } from '../../../../utils/testHelpers.js';

// Mock dependencies
vi.mock('../../../../../lib/logger.js', () => ({
  logToFile: vi.fn(),
}));

describe('suggestArtifactIdeas', () => {
  const baseSuggestion = {
    title: 'Test Topic',
    description: 'A test description',
    type: 'blog' as const,
    rationale: 'Because it is useful',
    tags: ['pm', 'strategy'],
  };

  describe('topicType parameter', () => {
    it('should accept personalized topicType and include it in output', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'personalized',
        suggestions: [baseSuggestion],
      });

      expect(result.success).toBe(true);
      expect(result.topicType).toBe('personalized');
      expect(result.suggestions[0].topicType).toBe('personalized');
    });

    it('should accept trending topicType and include it in output', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'trending',
        suggestions: [baseSuggestion],
      });

      expect(result.success).toBe(true);
      expect(result.topicType).toBe('trending');
      expect(result.suggestions[0].topicType).toBe('trending');
    });

    it('should accept continue_series topicType and include it in output', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'continue_series',
        suggestions: [baseSuggestion],
      });

      expect(result.success).toBe(true);
      expect(result.topicType).toBe('continue_series');
      expect(result.suggestions[0].topicType).toBe('continue_series');
    });

    it('should reject invalid topicType', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'invalid_type',
        suggestions: [baseSuggestion],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('suggestion ID format', () => {
    it('should include topicType in generated IDs', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'trending',
        suggestions: [baseSuggestion],
      });

      expect(result.suggestions[0].id).toMatch(/^suggestion-trending-\d+-0$/);
    });

    it('should generate unique IDs for multiple suggestions', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'personalized',
        suggestions: [baseSuggestion, { ...baseSuggestion, title: 'Second Topic' }],
      });

      const ids = result.suggestions.map((s: { id: string }) => s.id);
      expect(new Set(ids).size).toBe(2);
      expect(ids[0]).toMatch(/^suggestion-personalized-\d+-0$/);
      expect(ids[1]).toMatch(/^suggestion-personalized-\d+-1$/);
    });
  });

  describe('trending-specific fields', () => {
    it('should pass through trendingSource for trending suggestions', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'trending',
        suggestions: [{
          ...baseSuggestion,
          trendingSource: 'https://news.ycombinator.com/item?id=12345',
        }],
      });

      expect(result.suggestions[0].trendingSource).toBe('https://news.ycombinator.com/item?id=12345');
    });
  });

  describe('continue_series-specific fields', () => {
    it('should pass through parentArtifactId and continuationType', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'continue_series',
        suggestions: [{
          ...baseSuggestion,
          parentArtifactId: 'artifact-123',
          continuationType: 'sequel',
        }],
      });

      expect(result.suggestions[0].parentArtifactId).toBe('artifact-123');
      expect(result.suggestions[0].continuationType).toBe('sequel');
    });

    it('should accept all continuation types', async () => {
      for (const ct of ['sequel', 'different_angle', 'updated_version'] as const) {
        const result = await callTool(suggestArtifactIdeas, {
          topicType: 'continue_series',
          suggestions: [{ ...baseSuggestion, continuationType: ct }],
        });
        expect(result.suggestions[0].continuationType).toBe(ct);
      }
    });

    it('should reject invalid continuationType', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'continue_series',
        suggestions: [{ ...baseSuggestion, continuationType: 'invalid' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output format', () => {
    it('should return type: artifact_suggestions', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'personalized',
        suggestions: [baseSuggestion],
      });

      expect(result.type).toBe('artifact_suggestions');
    });

    it('should include count in message', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'personalized',
        suggestions: [baseSuggestion, { ...baseSuggestion, title: 'Second' }, { ...baseSuggestion, title: 'Third' }],
      });

      expect(result.message).toContain('3');
      expect(result.message).toContain('personalized');
    });

    it('should preserve all suggestion fields in output', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'personalized',
        suggestions: [baseSuggestion],
      });

      const s = result.suggestions[0];
      expect(s.title).toBe(baseSuggestion.title);
      expect(s.description).toBe(baseSuggestion.description);
      expect(s.type).toBe(baseSuggestion.type);
      expect(s.rationale).toBe(baseSuggestion.rationale);
      expect(s.tags).toEqual(baseSuggestion.tags);
    });
  });

  describe('validation', () => {
    it('should require at least 1 suggestion', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'personalized',
        suggestions: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 10 suggestions', async () => {
      const suggestions = Array.from({ length: 11 }, (_, i) => ({
        ...baseSuggestion,
        title: `Topic ${i}`,
      }));

      const result = await callTool(suggestArtifactIdeas, {
        topicType: 'personalized',
        suggestions,
      });
      expect(result.success).toBe(false);
    });

    it('should require topicType parameter', async () => {
      const result = await callTool(suggestArtifactIdeas, {
        suggestions: [baseSuggestion],
      });
      expect(result.success).toBe(false);
    });
  });
});
