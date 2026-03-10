// @ts-nocheck
/**
 * conductPMResearch — PM Research Tool
 *
 * Searches the web for current data before creating PM artifacts.
 * Uses shared ResearchService for Tavily-powered multi-source search.
 * Results stored in artifact_research table for UI display.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logToFile } from '../../../../../lib/logger.js'
import { logger } from '../../../../../lib/logger.js'
import { mockService } from '../../../mocks/index.js'
import {
  generateResearchQueries,
  executeWebResearch,
  storeResearchResults,
  generateMockResults,
  type PMResearchType,
} from '../../shared/researchService.js'

export function conductPMResearchTool(supabase: SupabaseClient, customerId: string) {
  return {
    conductPMResearch: tool({
      description: `Search the web for current data before creating PM artifacts. Returns structured findings with sources, excerpts, and relevance scores.

Use BEFORE calling artifact creation tools when live market data would improve quality.

**ALWAYS use before:** analyzeCompetition (competitive data changes constantly)
**RECOMMENDED before:** createGrowthStrategy, buildPersonaIcp, createProductStrategy (when market context is thin), market research via createArtifact
**SKIP for:** PRDs, user flows, decision frameworks, meeting notes, presentations, updates to existing artifacts

After research completes, incorporate key findings into your artifact content and cite sources (e.g., "According to G2 reviews..." or "Crunchbase data shows...").`,

      inputSchema: z.object({
        topic: z.string().min(3).describe('Primary research topic (e.g., "CRM software competitive landscape" or "B2B SaaS retention benchmarks")'),
        researchType: z.enum(['competitive', 'market', 'persona', 'growth', 'general']).describe(
          'Type of research — determines search sources and query strategy. ' +
          'competitive: G2, Capterra, Crunchbase, news, web. ' +
          'market: web, news, LinkedIn, Medium, Reddit. ' +
          'persona: Reddit, Quora, LinkedIn, web, G2. ' +
          'growth: web, Medium, LinkedIn, Reddit, news. ' +
          'general: broad web search across all sources.'
        ),
        queries: z.array(z.string()).optional().describe(
          'Optional specific search queries. If omitted, queries are auto-generated based on topic and researchType using a fast LLM call.'
        ),
        artifactId: z.string().uuid().optional().describe(
          'Link research to an existing artifact for UI display. If provided, results are stored in the artifact_research table.'
        ),
        maxResults: z.number().min(5).max(15).optional().default(10).describe(
          'Maximum research findings to return (5-15). Default: 10.'
        ),
      }),

      execute: async ({ topic, researchType, queries, artifactId, maxResults }) => {
        const startTime = Date.now()

        logToFile('TOOL EXECUTED: conductPMResearch', {
          topic: topic.substring(0, 50),
          researchType,
          hasQueries: !!queries,
          hasArtifactId: !!artifactId,
          maxResults,
        })

        try {
          // =====================================================================
          // Mock Check
          // =====================================================================
          if (mockService.shouldMock('researchTools')) {
            logger.info('[conductPMResearch] Using mock response', {
              topic: topic.substring(0, 50),
              researchType,
            })

            const mockResults = generateMockResults(topic, researchType as PMResearchType, maxResults)

            // Store mock results if artifact linked
            let storedCount = 0
            if (artifactId) {
              storedCount = await storeResearchResults(supabase, artifactId, mockResults)
            }

            const duration = Date.now() - startTime
            return {
              success: true,
              researchType,
              duration,
              findings: mockResults.map(r => ({
                title: r.source_name,
                source: r.source_type,
                sourceType: r.source_type,
                excerpt: r.excerpt.substring(0, 300),
                relevanceScore: r.relevance_score,
                url: r.source_url,
              })),
              summary: `[MOCK] Found ${mockResults.length} sources on "${topic}"`,
              storedCount,
            }
          }

          // =====================================================================
          // 1. Generate queries (or use provided ones)
          // =====================================================================
          const searchQueries = queries && queries.length > 0
            ? queries
            : await generateResearchQueries(topic, researchType as PMResearchType)

          logger.info('[conductPMResearch] Queries prepared', {
            queryCount: searchQueries.length,
            autoGenerated: !queries,
          })

          // =====================================================================
          // 2. Execute parallel web searches
          // =====================================================================
          const results = await executeWebResearch(searchQueries, {
            researchType: researchType as PMResearchType,
            maxResults,
          })

          // =====================================================================
          // 3. Store results if artifact linked
          // =====================================================================
          let storedCount = 0
          if (artifactId && results.length > 0) {
            storedCount = await storeResearchResults(supabase, artifactId, results)
          }

          const duration = Date.now() - startTime

          logger.info('[conductPMResearch] Research completed', {
            researchType,
            findingCount: results.length,
            storedCount,
            duration,
          })

          // =====================================================================
          // 4. Return structured findings to LLM context
          // =====================================================================
          return {
            success: true,
            researchType,
            duration,
            findings: results.map(r => ({
              title: r.source_name,
              source: r.source_type,
              sourceType: r.source_type,
              excerpt: r.excerpt.substring(0, 300),
              relevanceScore: r.relevance_score,
              url: r.source_url,
            })),
            summary: `Found ${results.length} relevant sources on "${topic}" (${storedCount} stored for UI display)`,
            storedCount,
          }

        } catch (error) {
          const duration = Date.now() - startTime

          logger.error('[conductPMResearch] Research failed', {
            topic: topic.substring(0, 50),
            researchType,
            duration,
            error: error instanceof Error ? error.message : String(error),
          })

          return {
            success: false,
            researchType,
            duration,
            findings: [],
            summary: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}. You may proceed without research or try again.`,
            storedCount: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    }),
  }
}
