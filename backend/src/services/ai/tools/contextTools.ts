// @ts-nocheck
/**
 * Context Tools
 *
 * Ad-hoc fetcher tools that provide context to the Content Agent.
 * These tools don't modify state, only retrieve information.
 *
 * Note: @ts-nocheck is used because the AI SDK tool() helper has complex
 * type inference that causes TypeScript OOM during compilation.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger, logToFile } from '../../../lib/logger.js';

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Fetch existing artifact topics to avoid duplication
 * Returns recent artifact titles for reference
 */
export const fetchArtifactTopics = tool({
  description: 'Get existing artifact titles to avoid topic duplication and find inspiration',
  inputSchema: z.object({
    limit: z.number().min(1).max(50).optional().describe('Number of topics to fetch (default: 20)'),
    contentType: z.enum(['social_post', 'blog', 'showcase', 'all']).optional().describe('Filter by type'),
  }),
  execute: async ({ limit, contentType }) => {
    logToFile('🔧 TOOL EXECUTED: fetchArtifactTopics', { limit, contentType });

    const effectiveLimit = limit ?? 20;
    let query = supabaseAdmin
      .from('artifacts')
      .select('id, type, title, tags, created_at')
      .order('created_at', { ascending: false })
      .limit(effectiveLimit);

    if (contentType && contentType !== 'all') {
      query = query.eq('type', contentType);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      topics: (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        tags: a.tags,
      })),
      count: data?.length ?? 0,
    };
  },
});

/**
 * Fetch specific artifact details
 * Provides complete artifact information including content and metadata
 */
export const fetchArtifact = tool({
  description: 'Get complete details of a specific artifact including content, status, and metadata',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to fetch'),
  }),
  execute: async ({ artifactId }) => {
    logToFile('🔧 TOOL EXECUTED: fetchArtifact', { artifactId });

    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Artifact not found' };
    }

    return {
      success: true,
      artifact: {
        id: data.id,
        type: data.type,
        title: data.title,
        content: data.content,
        status: data.status,
        tone: data.tone,
        tags: data.tags,
        metadata: data.metadata,
        writingMetadata: data.writing_metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  },
});

/**
 * Fetch research data for an artifact
 * Returns research results from artifact_research table
 */
export const fetchResearch = tool({
  description: 'Get research data for an artifact to understand gathered sources and insights',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact'),
    limit: z.number().min(1).max(100).optional().describe('Max number of research items (default: 20)'),
  }),
  execute: async ({ artifactId, limit }) => {
    logToFile('🔧 TOOL EXECUTED: fetchResearch', { artifactId, limit });

    const effectiveLimit = limit ?? 20;
    const { data, error } = await supabaseAdmin
      .from('artifact_research')
      .select('*')
      .eq('artifact_id', artifactId)
      .order('relevance_score', { ascending: false })
      .limit(effectiveLimit);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        research: [],
        count: 0,
        message: 'No research data found for this artifact',
      };
    }

    return {
      success: true,
      research: data.map((r) => ({
        id: r.id,
        sourceType: r.source_type,
        sourceName: r.source_name,
        sourceUrl: r.source_url,
        excerpt: r.excerpt,
        relevanceScore: r.relevance_score,
        createdAt: r.created_at,
      })),
      count: data.length,
      // Group by source type for summary
      bySourceType: data.reduce(
        (acc, r) => {
          acc[r.source_type] = (acc[r.source_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  },
});

/**
 * List draft artifacts that need attention
 * Helps agent understand what content is in progress
 */
export const listDraftArtifacts = tool({
  description: 'List artifacts in draft status to see what content needs work',
  inputSchema: z.object({
    limit: z.number().min(1).max(50).optional().describe('Max number of drafts (default: 10)'),
    includeStatus: z
      .array(z.enum(['draft', 'research', 'skeleton', 'writing', 'creating_visuals']))
      .optional()
      .describe('Include specific statuses (default: all in-progress statuses)'),
  }),
  execute: async ({ limit, includeStatus }) => {
    logToFile('🔧 TOOL EXECUTED: listDraftArtifacts', { limit, includeStatus });

    const effectiveLimit = limit ?? 10;
    const statuses = includeStatus ?? ['draft', 'research', 'skeleton', 'writing', 'creating_visuals'];

    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .select('id, type, title, status, tags, created_at, updated_at')
      .in('status', statuses)
      .order('updated_at', { ascending: false })
      .limit(effectiveLimit);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        drafts: [],
        count: 0,
        message: 'No draft artifacts found',
      };
    }

    return {
      success: true,
      drafts: data.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        status: a.status,
        tags: a.tags,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
      count: data.length,
      // Group by status for summary
      byStatus: data.reduce(
        (acc, a) => {
          acc[a.status] = (acc[a.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  },
});
