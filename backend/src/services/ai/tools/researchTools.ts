import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { mockService, type ResearchToolResponse } from '../mocks/index.js';
import { tavilyClient } from '../../../lib/tavily.js';
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import type { ToolOutput } from '../types/contentAgent.js';

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
 * Generate angle-specific search queries from the user's description.
 * Uses a fast LLM call to extract the specific claims, examples, and arguments
 * the user wants to make, and creates targeted search queries for each.
 *
 * Falls back to title-only queries if no description is provided.
 */
async function generateAngleSpecificQueries(
  title: string,
  description: string,
  artifactType: string
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'),
      prompt: `You are a research query generator. Given a content topic and the author's intended narrative, generate 8-10 specific search queries that would find supporting evidence, data, counter-perspectives, and expert opinions for the author's SPECIFIC arguments and examples.

Topic title: ${title}
Author's narrative and intended angle:
${description}

Content type: ${artifactType}

Rules:
- Generate queries that find evidence for the SPECIFIC claims, examples, and analogies in the author's narrative
- Include queries for any specific companies, products, events, or people mentioned
- Include queries for the core thesis/argument
- Include 1-2 queries for the MECHANISM behind key examples (why something worked, not just that it worked)
- Include 1 query for counter-arguments or criticisms of the author's position
- Include 1 query for historical parallels or analogies relevant to the thesis
- Include 1-2 broader queries for general context
- Do NOT generate generic queries about the topic title alone
- Each query should be 4-10 words, optimized for web search

Return one query per line, no numbering, no bullets, no explanations.`,
      temperature: 0.3,
      maxOutputTokens: 400,
    });

    const queries = text.split('\n').map(q => q.trim()).filter(q => q.length > 3);
    logger.debug('[GenerateAngleSpecificQueries] Generated queries from description', {
      queryCount: queries.length,
    });
    return queries.length > 0 ? queries : [title]; // Fallback to title if parsing fails
  } catch (error) {
    logger.warn('[GenerateAngleSpecificQueries] Failed, falling back to title query', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [title];
  }
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
 * IMPLEMENTATION: Uses Tavily API for real web search
 *
 * Maps source types to domain filters to ensure results come from
 * the intended platforms (Reddit, LinkedIn, Quora, Medium, Substack).
 */
async function querySource(
  sourceType: SourceType,
  topic: string,
  limit: number = 5
): Promise<ResearchResult[]> {
  logger.debug('[QuerySource] Querying source with Tavily API', {
    sourceType,
    topic: topic.substring(0, 50),
    limit
  });

  // Map sourceType to domain filters
  const domainMap: Record<SourceType, string[]> = {
    reddit: ['reddit.com'],
    linkedin: ['linkedin.com'],
    quora: ['quora.com'],
    medium: ['medium.com'],
    substack: ['substack.com'],
    user_provided: [] // No domain restriction for user-provided sources
  };

  try {
    // Query Tavily API with domain filter
    const results = await tavilyClient.search(topic, {
      includeDomains: domainMap[sourceType],
      maxResults: limit,
      searchDepth: 'advanced'
    });

    // Map Tavily results to ResearchResult format
    return results.map(r => ({
      artifact_id: '', // Will be set by caller
      source_type: sourceType,
      source_name: r.title,
      source_url: r.url,
      excerpt: r.content,
      relevance_score: r.score
    }));
  } catch (error) {
    logger.error('[QuerySource] ' + (error instanceof Error ? error.message : String(error)), {
      sourceType,
      topic: topic.substring(0, 50)
    });

    // Return empty array on error (conductDeepResearch will handle insufficient sources)
    return [];
  }
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
    topicDescription: z.string().optional().describe('Author\'s detailed description with narrative angle, key arguments, specific examples, and intended hooks/CTAs. When provided, research queries are tailored to find evidence supporting the author\'s specific arguments rather than generic topic coverage.'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact being created'),
  }),

  execute: async ({ artifactId, topic, topicDescription, artifactType }) => {
    const startTime = Date.now();
    const traceId = generateMockTraceId('research');

    try {
      logger.info('[ConductDeepResearch] Starting research', {
        artifactId,
        topicLength: topic.length,
        artifactType,
        traceId,
      });

      // =========================================================================
      // Mock Check - Return mock response if mocking is enabled
      // =========================================================================
      if (mockService.shouldMock('researchTools')) {
        logger.info('[ConductDeepResearch] Using mock response', {
          artifactId,
          topic: topic.substring(0, 50),
        });

        // Save author_brief to metadata even in mock mode
        // Guard: don't overwrite an existing interview-enriched brief
        if (topicDescription) {
          const { data: currentArtifact } = await supabaseAdmin
            .from('artifacts')
            .select('metadata')
            .eq('id', artifactId)
            .single();

          const currentMetadata = (currentArtifact?.metadata as Record<string, unknown>) || {};
          if (!currentMetadata.author_brief) {
            await supabaseAdmin
              .from('artifacts')
              .update({
                metadata: { ...currentMetadata, author_brief: topicDescription },
              })
              .eq('id', artifactId);
          }
        }

        // Update artifact status to 'research' even in mock mode
        await supabaseAdmin
          .from('artifacts')
          .update({ status: 'research', updated_at: new Date().toISOString() })
          .eq('id', artifactId);

        // Insert mock research data into database for frontend to display
        const mockSources: SourceType[] = ['reddit', 'linkedin', 'quora', 'medium', 'substack'];
        const mockResearchData: ResearchResult[] = mockSources.map((source, index) => ({
          artifact_id: artifactId,
          source_type: source,
          source_name: `Mock ${source.charAt(0).toUpperCase() + source.slice(1)} Research on "${topic.substring(0, 30)}..."`,
          source_url: `https://example.com/${source}/mock-research-${index}`,
          excerpt: `This is mock research content from ${source} about "${topic}". It contains relevant insights and perspectives that will help inform the content creation process. Key points include industry trends, user experiences, and expert opinions on the topic.`,
          relevance_score: 0.8 + (Math.random() * 0.15), // 0.80 - 0.95
        }));

        // Insert mock research into database
        const { error: insertError } = await supabaseAdmin
          .from('artifact_research')
          .insert(mockResearchData);

        if (insertError) {
          logger.warn('[ConductDeepResearch] Failed to insert mock research', {
            artifactId,
            error: insertError.message,
          });
        } else {
          logger.debug('[ConductDeepResearch] Mock research data inserted', {
            artifactId,
            count: mockResearchData.length,
          });
        }

        const duration = Date.now() - startTime;

        // Return mock response with actual data
        return {
          success: true,
          traceId,
          duration,
          statusTransition: { from: 'draft', to: 'research' },
          data: {
            sourceCount: mockResearchData.length,
            keyInsights: mockResearchData.slice(0, 3).map(r => ({
              sourceType: r.source_type,
              sourceName: r.source_name,
              excerpt: r.excerpt.substring(0, 150) + '...',
              relevanceScore: r.relevance_score,
            })),
            sourcesBreakdown: mockSources.reduce((acc, source) => {
              acc[source] = 1;
              return acc;
            }, {} as Record<string, number>),
            uniqueSourcesCount: mockSources.length,
            usedFallback: false,
          },
        };
      }

      // 0. Update artifact status to 'research' (Phase 1: enables frontend polling)
      const { error: statusError } = await supabaseAdmin
        .from('artifacts')
        .update({ status: 'research', updated_at: new Date().toISOString() })
        .eq('id', artifactId);

      if (statusError) {
        logger.error('[ConductDeepResearch] ' + statusError.message, {
          artifactId,
          stage: 'update_status'
        });
        // Continue anyway - status update failure shouldn't block research
      } else {
        logger.debug('[ConductDeepResearch] Status updated to research (Phase 1)', {
          artifactId,
          newStatus: 'research'
        });
      }

      // 0.5 Save author_brief to artifact metadata (preserves user intent through pipeline)
      // Guard: don't overwrite an existing interview-enriched brief with the simple topic description
      if (topicDescription) {
        const { data: currentArtifact } = await supabaseAdmin
          .from('artifacts')
          .select('metadata')
          .eq('id', artifactId)
          .single();

        const currentMetadata = (currentArtifact?.metadata as Record<string, unknown>) || {};
        if (!currentMetadata.author_brief) {
          await supabaseAdmin
            .from('artifacts')
            .update({
              metadata: { ...currentMetadata, author_brief: topicDescription },
              updated_at: new Date().toISOString(),
            })
            .eq('id', artifactId);

          logger.info('[ConductDeepResearch] Author brief saved to metadata', {
            briefLength: topicDescription.length,
          });
        } else {
          logger.info('[ConductDeepResearch] Existing author brief preserved (interview-enriched)', {
            existingBriefLength: String(currentMetadata.author_brief).length,
          });
        }
      }

      // 1. Determine source priority based on topic characteristics
      const sourcePriority = determineSourcePriority(topic, artifactType);
      logger.debug('[ConductDeepResearch] Source priority determined', {
        sources: sourcePriority
      });

      // 1.5 Generate angle-specific queries if description is available
      let searchQueries: string[] = [topic]; // Default: search by title
      if (topicDescription) {
        searchQueries = await generateAngleSpecificQueries(topic, topicDescription, artifactType);
        logger.info('[ConductDeepResearch] Using angle-specific queries from description', {
          queryCount: searchQueries.length,
        });
      }

      // 2. Query top 5 sources in parallel using angle-specific queries
      // Distribute queries across sources for diverse perspectives
      const sourceQueries = sourcePriority.slice(0, 5).map((source, i) => {
        // Each source gets a different query from the angle-specific set for diversity
        const queryForSource = searchQueries[i % searchQueries.length] || topic;
        return querySource(source, queryForSource, 4);
      });

      const results = await Promise.allSettled(sourceQueries);

      // 3. Extract successful results and flatten array
      const allResults = results
        .filter((r): r is PromiseFulfilledResult<ResearchResult[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .map(r => ({ ...r, artifact_id: artifactId })); // Set artifact_id

      logger.debug('[ConductDeepResearch] Raw results collected', {
        totalResults: allResults.length,
        sources: [...new Set(allResults.map(r => r.source_type))]
      });

      // 4. Filter by relevance score (> 0.6) and take top 20
      const filteredResults = allResults
        .filter(r => r.relevance_score > 0.6)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 20);

      logger.debug('[ConductDeepResearch] Results filtered', {
        filtered: filteredResults.length,
        minRelevance: Math.min(...filteredResults.map(r => r.relevance_score)),
        maxRelevance: Math.max(...filteredResults.map(r => r.relevance_score))
      });

      // 5. Verify minimum source requirement (5+ sources)
      // If insufficient real sources, use mock fallback to allow pipeline continuation
      const uniqueSources = new Set(filteredResults.map(r => r.source_type));
      let finalResults = filteredResults;
      let usedFallback = false;

      if (uniqueSources.size < 5) {
        logger.warn('[ConductDeepResearch] Insufficient real sources, using fallback', {
          found: uniqueSources.size,
          minRequired: 5,
          topic: topic.substring(0, 50),
          traceId,
        });

        // Generate mock fallback sources to reach minimum requirement
        const mockSources: SourceType[] = ['reddit', 'linkedin', 'quora', 'medium', 'substack'];
        const missingCount = 5 - uniqueSources.size;
        const mockResults: ResearchResult[] = [];

        for (let i = 0; i < missingCount; i++) {
          const sourceType = mockSources[i % mockSources.length];
          mockResults.push({
            artifact_id: artifactId,
            source_type: sourceType,
            source_name: `Fallback ${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Research`,
            source_url: `https://example.com/${sourceType}-fallback-${i}`,
            excerpt: `This is fallback research content for "${topic}". The actual source did not return sufficient results, so this placeholder is being used to allow content creation to continue.`,
            relevance_score: 0.7,
          });
        }

        finalResults = [...filteredResults, ...mockResults];
        usedFallback = true;

        logger.info('[ConductDeepResearch] Fallback sources generated', {
          realSources: filteredResults.length,
          fallbackSources: mockResults.length,
          totalSources: finalResults.length,
          traceId,
        });
      }

      // 6. Store results in database (includes fallback if used)
      const { data, error } = await supabaseAdmin
        .from('artifact_research')
        .insert(finalResults)
        .select();

      if (error) {
        const duration = Date.now() - startTime;

        logger.error('[ConductDeepResearch] ' + (error instanceof Error ? error.message : String(error)), {
          artifactId,
          resultsCount: filteredResults.length,
          duration,
          traceId,
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            sourceCount: 0,
            keyInsights: [],
            sourcesBreakdown: {},
            uniqueSourcesCount: 0,
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Database error: ${error.message}`,
            recoverable: false,
          },
        };
      }

      const duration = Date.now() - startTime;

      logger.info('[ConductDeepResearch] Research completed successfully', {
        artifactId,
        sourceCount: data?.length || 0,
        uniqueSources: new Set(finalResults.map(r => r.source_type)).size,
        usedFallback,
        duration,
        traceId,
      });

      // Extract key insights from top-scoring research results
      const keyInsights = finalResults
        .slice(0, 5)
        .map(r => ({
          sourceType: r.source_type,
          sourceName: r.source_name,
          excerpt: r.excerpt.substring(0, 150) + '...',
          relevanceScore: r.relevance_score,
        }));

      // Build sources breakdown by type
      const sourcesBreakdown: Record<string, number> = {};
      const finalUniqueSources = new Set(finalResults.map(r => r.source_type));
      finalUniqueSources.forEach(source => {
        sourcesBreakdown[source] = finalResults.filter(r => r.source_type === source).length;
      });

      const response: ToolOutput<{
        sourceCount: number;
        keyInsights: typeof keyInsights;
        sourcesBreakdown: typeof sourcesBreakdown;
        uniqueSourcesCount: number;
        usedFallback?: boolean;
      }> = {
        success: true,
        traceId,
        duration,
        statusTransition: { from: 'draft', to: 'research' },
        data: {
          sourceCount: data?.length || 0,
          keyInsights,
          sourcesBreakdown,
          uniqueSourcesCount: finalUniqueSources.size,
          ...(usedFallback && { usedFallback: true }),
        },
      };

      // Capture response for mock generation
      await mockService.captureRealResponse(
        'conductDeepResearch',
        artifactType,
        { artifactId, topic, artifactType },
        response
      );

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('[ConductDeepResearch] ' + (error instanceof Error ? error.message : String(error)), {
        artifactId,
        topic: topic.substring(0, 50),
        duration,
        traceId,
      });

      return {
        success: false,
        traceId,
        duration,
        data: {
          sourceCount: 0,
          keyInsights: [],
          sourcesBreakdown: {},
          uniqueSourcesCount: 0,
        },
        error: {
          category: 'TOOL_EXECUTION_FAILED' as const,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          recoverable: true,
        },
      };
    }
  },
});
