import { tool } from 'ai';
import { z } from 'zod';
import { tavilyClient } from '../../../../../lib/tavily.js';
import { logger } from '../../../../../lib/logger.js';
import { mockService } from '../../../mocks/index.js';
import { generateMockTraceId } from '../../../mocks/utils/dynamicReplacer.js';

/**
 * Topics Research Tool
 *
 * Generates topic IDEAS/suggestions for content creation using web search.
 * Different from conductDeepResearch which researches a SPECIFIC topic.
 *
 * This tool:
 * - Queries multiple sources (Reddit, LinkedIn, Quora, Medium, Substack)
 * - Identifies trending topics and content gaps
 * - Analyzes competition levels
 * - Suggests unique angles for each topic
 *
 * Use cases:
 * - User asks "give me blog post ideas"
 * - User asks "what should I write about"
 * - User wants content inspiration
 */

// Topic suggestion interface
interface TopicSuggestion {
  title: string;
  description: string;
  rationale: string;
  trendingScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  suggestedAngle: string;
}

// Topics research output
interface TopicsResearchOutput {
  success: boolean;
  topics: TopicSuggestion[];
  sourcesQueried: string[];
  traceId: string;
}

/**
 * Determine search queries based on content type and focus area
 */
function generateSearchQueries(
  contentType: 'blog' | 'social_post' | 'showcase',
  focusArea?: string
): string[] {
  const baseQueries: Record<typeof contentType, string[]> = {
    blog: [
      'trending blog topics 2026',
      'popular blog post ideas',
      'viral blog content',
      'what to write about blog',
    ],
    social_post: [
      'trending social media topics',
      'viral post ideas',
      'popular social content',
      'engaging post topics',
    ],
    showcase: [
      'portfolio showcase ideas',
      'project presentation topics',
      'case study examples',
      'work portfolio ideas',
    ],
  };

  // Add focus area to queries if provided
  if (focusArea) {
    return baseQueries[contentType].map((query) => `${query} ${focusArea}`);
  }

  return baseQueries[contentType];
}

/**
 * Analyze search results to extract topic suggestions
 */
function extractTopicSuggestions(
  searchResults: Array<{ title: string; content: string; url: string; score: number }>,
  contentType: 'blog' | 'social_post' | 'showcase',
  count: number
): TopicSuggestion[] {
  // Group results by topic similarity (simple keyword-based grouping)
  const topicGroups: Map<string, Array<{ title: string; content: string; score: number }>> = new Map();

  searchResults.forEach((result) => {
    // Extract keywords from title
    const keywords = result.title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4)
      .slice(0, 3)
      .join(' ');

    if (!topicGroups.has(keywords)) {
      topicGroups.set(keywords, []);
    }
    topicGroups.get(keywords)!.push(result);
  });

  // Convert groups to topic suggestions
  const suggestions: TopicSuggestion[] = [];

  for (const [keywords, results] of topicGroups.entries()) {
    if (suggestions.length >= count) break;

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const resultCount = results.length;

    // Determine competition level based on result count
    let competitionLevel: 'low' | 'medium' | 'high';
    if (resultCount < 3) {
      competitionLevel = 'low';
    } else if (resultCount < 6) {
      competitionLevel = 'medium';
    } else {
      competitionLevel = 'high';
    }

    // Use first result as primary source
    const primaryResult = results[0];

    suggestions.push({
      title: primaryResult.title,
      description: primaryResult.content.substring(0, 200) + '...',
      rationale: `Found ${resultCount} related articles. Average relevance score: ${avgScore.toFixed(2)}.`,
      trendingScore: avgScore * 10, // Scale 0-10
      competitionLevel,
      suggestedAngle: `Focus on unique perspective: analyze gaps in existing content and provide actionable insights.`,
    });
  }

  return suggestions.slice(0, count);
}

/**
 * Topics Research Tool
 *
 * Generate topic ideas/suggestions for content creation.
 * Uses Tavily API to search multiple sources and identify trending topics.
 */
export const topicsResearch = tool({
  description: `Generate topic ideas/suggestions for content creation by analyzing trending content across multiple sources (Reddit, LinkedIn, Quora, Medium, Substack). Returns array of topic suggestions with trending scores, competition levels, and suggested angles.`,

  inputSchema: z.object({
    contentType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of content to generate topics for'),
    focusArea: z.string().optional().describe('Optional focus area/niche (e.g., "AI", "productivity", "marketing")'),
    count: z.number().min(1).max(10).optional().describe('Number of topic suggestions to generate (default: 5)'),
  }),

  execute: async ({ contentType, focusArea, count }) => {
    const effectiveCount = count ?? 5;
    const traceId = generateMockTraceId('topics-research');

    try {
      logger.info('[TopicsResearch] Starting topics research', {
        contentType,
        focusArea: focusArea || 'general',
        count: effectiveCount,
        traceId,
      });

      // =========================================================================
      // Mock Check - Return mock response if mocking is enabled
      // =========================================================================
      if (mockService.shouldMock('topicsResearchTools')) {
        logger.info('[TopicsResearch] Using mock response', {
          contentType,
          traceId,
        });

        const mockResponse = await mockService.getMockResponse<TopicsResearchOutput>(
          'topicsResearch',
          contentType,
          { contentType, focusArea, count: effectiveCount, traceId }
        );

        return mockResponse;
      }

      // =========================================================================
      // Real Implementation - Use Tavily API
      // =========================================================================

      // Generate search queries
      const searchQueries = generateSearchQueries(contentType, focusArea);
      logger.debug('[TopicsResearch] Generated search queries', {
        queries: searchQueries,
        traceId,
      });

      // Execute searches in parallel
      const searchPromises = searchQueries.map((query) =>
        tavilyClient.search(query, {
          searchDepth: 'basic',
          maxResults: 5,
        })
      );

      const searchResultsArray = await Promise.all(searchPromises);

      // Flatten results
      const allResults = searchResultsArray.flat();
      logger.debug('[TopicsResearch] Search results collected', {
        totalResults: allResults.length,
        traceId,
      });

      // Extract topic suggestions
      const topics = extractTopicSuggestions(allResults, contentType, effectiveCount);

      // Track sources queried
      const sourcesQueried = [
        ...new Set(
          allResults.map((r) => {
            try {
              return new URL(r.url).hostname;
            } catch {
              return 'unknown';
            }
          })
        ),
      ];

      logger.info('[TopicsResearch] Topics research completed', {
        topicsCount: topics.length,
        sourcesCount: sourcesQueried.length,
        traceId,
      });

      const response: TopicsResearchOutput = {
        success: true,
        topics,
        sourcesQueried,
        traceId,
      };

      // Capture response for mock generation
      await mockService.captureRealResponse(
        'topicsResearch',
        contentType,
        { contentType, focusArea, count: effectiveCount },
        response
      );

      return response;
    } catch (error) {
      logger.error('[TopicsResearch] ' + (error instanceof Error ? error.message : String(error)), {
        contentType,
        focusArea,
        count: effectiveCount,
        traceId,
      });

      return {
        success: false,
        topics: [],
        sourcesQueried: [],
        traceId,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
