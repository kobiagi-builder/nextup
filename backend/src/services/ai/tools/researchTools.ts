import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';

/**
 * Research Tools for Content Creation Agent (Phase 1)
 *
 * Conducts deep research using multiple sources (Reddit, LinkedIn, Quora, Medium, Substack)
 * to gather context for AI-generated content skeletons.
 *
 * MVP Implementation: Uses mock data for web search
 * Future: Replace querySource() with real web search API (Perplexity/Tavily/Firecrawl)
 */

// Source types for research
type SourceType = 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack' | 'user_provided';

// Research result interface
interface ResearchResult {
  artifact_id: string;
  source_type: SourceType;
  source_name: string;
  source_url?: string;
  excerpt: string;
  relevance_score: number;
}

/**
 * Determine source priority based on topic and artifact type
 *
 * Strategy:
 * - Technical topics → Medium, Substack priority (in-depth analysis)
 * - Business topics → LinkedIn, Medium priority (professional insights)
 * - Community topics → Reddit, Quora priority (authentic experiences)
 */
function determineSourcePriority(topic: string, artifactType: 'blog' | 'social_post' | 'showcase'): SourceType[] {
  const topicLower = topic.toLowerCase();

  // Technical keywords
  const isTechnical = /\b(code|programming|software|api|database|algorithm|framework|library)\b/i.test(topicLower);

  // Business keywords
  const isBusiness = /\b(strategy|marketing|sales|revenue|growth|customer|market)\b/i.test(topicLower);

  // Community/personal keywords
  const isCommunity = /\b(experience|advice|tips|help|question|problem|how to)\b/i.test(topicLower);

  // Determine priority based on content
  if (isTechnical) {
    return ['medium', 'substack', 'linkedin', 'reddit', 'quora'];
  } else if (isBusiness) {
    return ['linkedin', 'medium', 'substack', 'reddit', 'quora'];
  } else if (isCommunity) {
    return ['reddit', 'quora', 'medium', 'linkedin', 'substack'];
  }

  // Default priority (balanced)
  return ['medium', 'linkedin', 'reddit', 'quora', 'substack'];
}

/**
 * Query a specific source for relevant content
 *
 * MVP IMPLEMENTATION: Returns mock data for testing
 *
 * Future Enhancement:
 * - Replace with real web search API (Perplexity, Tavily, or Firecrawl)
 * - Add proper error handling for API failures
 * - Implement rate limiting and retry logic
 * - Add caching for common queries
 */
async function querySource(
  sourceType: SourceType,
  topic: string,
  limit: number = 5
): Promise<ResearchResult[]> {
  logger.debug('QuerySource', 'Querying source', {
    sourceType,
    topic: topic.substring(0, 50),
    limit
  });

  // MVP: Mock data for testing
  // TODO: Replace with real API integration
  const mockResults: ResearchResult[] = [];

  for (let i = 0; i < limit; i++) {
    mockResults.push({
      artifact_id: '', // Will be set by caller
      source_type: sourceType,
      source_name: `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Source ${i + 1}`,
      source_url: `https://${sourceType}.com/research/${i + 1}`,
      excerpt: `Sample research excerpt from ${sourceType} about "${topic}". This would contain relevant insights and information gathered from the source. ${i + 1}`,
      relevance_score: Math.random() * 0.4 + 0.6 // Random score between 0.6 and 1.0
    });
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  return mockResults;
}

/**
 * Conduct Deep Research Tool
 *
 * Queries multiple sources (5+) in parallel to gather diverse perspectives on a topic.
 * Filters results by relevance score (> 0.6) and stores top 20 results in database.
 *
 * Flow:
 * 1. Determine source priority based on topic/type
 * 2. Query top 5 sources in parallel
 * 3. Filter results by relevance (> 0.6)
 * 4. Ensure minimum 5 sources found
 * 5. Store top 20 results in artifact_research table
 *
 * Returns:
 * - success: true/false
 * - sourceCount: number of sources stored (if successful)
 * - error: error message (if failed)
 * - minRequired: 5 (if insufficient sources)
 * - found: actual count (if insufficient sources)
 */
export const conductDeepResearch = tool({
  description: `Conduct deep research using multiple sources (Reddit, LinkedIn, Quora, Medium, Substack) to gather context for content creation. Queries 5+ sources in parallel, filters by relevance (>0.6), and stores top 20 results. Returns success status and source count.`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to research for'),
    topic: z.string().min(3).describe('Research topic or content subject'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact being created'),
  }),

  execute: async ({ artifactId, topic, artifactType }) => {
    try {
      logger.info('ConductDeepResearch', 'Starting research', {
        artifactId,
        topicLength: topic.length,
        artifactType
      });

      // 0. Update artifact status to 'in_progress' (Phase 1: enables frontend polling)
      const { error: statusError } = await supabaseAdmin
        .from('artifacts')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', artifactId);

      if (statusError) {
        logger.error('ConductDeepResearch', statusError, {
          artifactId,
          stage: 'update_status'
        });
        // Continue anyway - status update failure shouldn't block research
      } else {
        logger.debug('ConductDeepResearch', 'Status updated to researching', {
          artifactId
        });
      }

      // 1. Determine source priority based on topic characteristics
      const sourcePriority = determineSourcePriority(topic, artifactType);
      logger.debug('ConductDeepResearch', 'Source priority determined', {
        sources: sourcePriority
      });

      // 2. Query top 5 sources in parallel (4 results per source = 20 total potential)
      const sourceQueries = sourcePriority.slice(0, 5).map(source =>
        querySource(source, topic, 4)
      );

      const results = await Promise.allSettled(sourceQueries);

      // 3. Extract successful results and flatten array
      const allResults = results
        .filter((r): r is PromiseFulfilledResult<ResearchResult[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .map(r => ({ ...r, artifact_id: artifactId })); // Set artifact_id

      logger.debug('ConductDeepResearch', 'Raw results collected', {
        totalResults: allResults.length,
        sources: [...new Set(allResults.map(r => r.source_type))]
      });

      // 4. Filter by relevance score (> 0.6) and take top 20
      const filteredResults = allResults
        .filter(r => r.relevance_score > 0.6)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 20);

      logger.debug('ConductDeepResearch', 'Results filtered', {
        filtered: filteredResults.length,
        minRelevance: Math.min(...filteredResults.map(r => r.relevance_score)),
        maxRelevance: Math.max(...filteredResults.map(r => r.relevance_score))
      });

      // 5. Verify minimum source requirement (5+ sources)
      const uniqueSources = new Set(filteredResults.map(r => r.source_type));
      if (uniqueSources.size < 5) {
        logger.error('ConductDeepResearch', new Error('Insufficient sources found'), {
          found: uniqueSources.size,
          minRequired: 5
        });

        return {
          success: false,
          error: 'Insufficient sources found. Need at least 5 different sources.',
          minRequired: 5,
          found: uniqueSources.size,
        };
      }

      // 6. Store results in database
      const { data, error } = await supabaseAdmin
        .from('artifact_research')
        .insert(filteredResults)
        .select();

      if (error) {
        logger.error('ConductDeepResearch', error, {
          artifactId,
          resultsCount: filteredResults.length
        });

        return {
          success: false,
          error: `Database error: ${error.message}`,
        };
      }

      logger.info('ConductDeepResearch', 'Research completed successfully', {
        artifactId,
        sourceCount: data?.length || 0,
        uniqueSources: uniqueSources.size
      });

      return {
        success: true,
        sourceCount: data?.length || 0,
      };

    } catch (error) {
      logger.error('ConductDeepResearch', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        topic: topic.substring(0, 50)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
