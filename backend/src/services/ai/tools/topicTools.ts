// @ts-nocheck
/**
 * Topic Tools
 *
 * AI tool definitions for topic management using Vercel AI SDK v6.
 * Topics represent content ideas that can be converted into artifacts.
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
 * Create a new topic idea
 * Topics are potential content ideas that can later be turned into artifacts
 */
export const createTopic = tool({
  description: 'Create a new topic idea for potential content creation',
  inputSchema: z.object({
    title: z.string().describe('Topic title'),
    description: z.string().describe('Topic description'),
    contentType: z.enum(['social_post', 'blog', 'showcase']).describe('Suggested content type'),
    tags: z.array(z.string()).optional().describe('Relevant tags'),
  }),
  execute: async ({ title, description, contentType, tags }) => {
    logToFile('🔧 TOOL EXECUTED: createTopic', { title, contentType, tags });

    // For now, topics are stored as metadata on draft artifacts
    // Future: Create dedicated topics table
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .insert({
        type: contentType,
        title,
        content: description,
        tags: tags ?? [],
        status: 'draft',
        metadata: { is_topic: true, created_via: 'topic_tool' },
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      topic: { id: data.id, title: data.title, contentType: data.type },
      message: `Created topic: "${title}"`,
    };
  },
});

/**
 * Update an existing topic
 */
export const updateTopic = tool({
  description: 'Update an existing topic idea',
  inputSchema: z.object({
    topicId: z.string().uuid().describe('ID of the topic to update'),
    title: z.string().optional().describe('New title'),
    description: z.string().optional().describe('New description'),
    tags: z.array(z.string()).optional().describe('New tags'),
  }),
  execute: async ({ topicId, title, description, tags }) => {
    logToFile('🔧 TOOL EXECUTED: updateTopic', { topicId, title });

    const updates: Record<string, unknown> = {};
    if (title) updates.title = title;
    if (description) updates.content = description;
    if (tags) updates.tags = tags;

    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .update(updates)
      .eq('id', topicId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      topic: { id: data.id, title: data.title },
      message: `Updated topic: "${data.title}"`,
    };
  },
});

/**
 * Get details of a specific topic
 */
export const getTopic = tool({
  description: 'Fetch details of a specific topic',
  inputSchema: z.object({
    topicId: z.string().uuid().describe('ID of the topic to fetch'),
  }),
  execute: async ({ topicId }) => {
    logToFile('🔧 TOOL EXECUTED: getTopic', { topicId });

    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .select('*')
      .eq('id', topicId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      topic: {
        id: data.id,
        title: data.title,
        description: data.content,
        contentType: data.type,
        tags: data.tags,
        status: data.status,
      },
    };
  },
});

/**
 * List available topics
 */
export const listTopics = tool({
  description: 'List available topic ideas for content creation',
  inputSchema: z.object({
    limit: z.number().min(1).max(20).optional().describe('Number of topics to fetch (default: 10)'),
    contentType: z.enum(['social_post', 'blog', 'showcase', 'all']).optional().describe('Filter by content type'),
  }),
  execute: async ({ limit, contentType }) => {
    logToFile('🔧 TOOL EXECUTED: listTopics', { limit, contentType });

    const effectiveLimit = limit ?? 10;
    let query = supabaseAdmin
      .from('artifacts')
      .select('id, type, title, tags, content, status, created_at')
      .eq('status', 'draft')
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
      topics: (data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        contentType: t.type,
        description: t.content?.substring(0, 200) + '...',
        tags: t.tags,
      })),
      count: data?.length ?? 0,
    };
  },
});

/**
 * Execute a topic by converting it to a full artifact
 * This transitions a topic idea into active content creation
 */
export const executeTopicToArtifact = tool({
  description: 'Convert a topic idea into an active artifact for content creation',
  inputSchema: z.object({
    topicId: z.string().uuid().describe('ID of the topic to convert'),
    tone: z.enum(['formal', 'casual', 'professional', 'conversational', 'technical', 'friendly', 'authoritative', 'humorous']).optional().describe('Desired tone for the content'),
  }),
  execute: async ({ topicId, tone }) => {
    logToFile('🔧 TOOL EXECUTED: executeTopicToArtifact', { topicId, tone });

    // Get the topic
    const { data: topic, error: fetchError } = await supabaseAdmin
      .from('artifacts')
      .select('*')
      .eq('id', topicId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Update status to indicate it's being worked on
    const updates: Record<string, unknown> = { status: 'in_progress' };
    if (tone) updates.tone = tone;

    // Remove topic metadata since it's now a full artifact
    if (topic.metadata?.is_topic) {
      updates.metadata = { ...topic.metadata, is_topic: false, converted_at: new Date().toISOString() };
    }

    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .update(updates)
      .eq('id', topicId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      artifact: {
        id: data.id,
        type: data.type,
        title: data.title,
        status: data.status,
        tone: data.tone,
      },
      message: `Converted topic "${data.title}" to active artifact`,
    };
  },
});
