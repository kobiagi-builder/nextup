// @ts-nocheck
/**
 * Content Generation Tools
 *
 * AI tool definitions for content operations using Vercel AI SDK v6.
 * Note: @ts-nocheck is used because the AI SDK tool() helper has complex
 * type inference that causes TypeScript OOM during compilation.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { supabaseAdmin } from '../../../lib/supabase.js'
import { logger, logToFile } from '../../../lib/logger.js'
import type { ArtifactType } from '../../../types/portfolio.js'

// =============================================================================
// Tool Definitions
// =============================================================================

export const createArtifactDraft = tool({
  description: 'Create a new content artifact draft with the generated content',
  inputSchema: z.object({
    type: z.enum(['social_post', 'blog', 'showcase']).describe('Type of content'),
    title: z.string().describe('Title for the content'),
    content: z.string().describe('The generated content in Markdown format'),
    tags: z.array(z.string()).optional().describe('Relevant tags for the content'),
  }),
  execute: async ({ type, title, content, tags }) => {
    logToFile('🔧 TOOL EXECUTED: createArtifactDraft', { type, title, contentLength: content?.length, tags })
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .insert({
        type: type as ArtifactType,
        title,
        content,
        tags: tags ?? [],
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      artifact: { id: data.id, type: data.type, title: data.title, status: data.status },
      message: `Created ${type} draft: "${title}"`,
    }
  },
})

export const updateArtifactContent = tool({
  description: 'Update the content of an existing artifact',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to update'),
    content: z.string().describe('The new content in Markdown format'),
    title: z.string().optional().describe('Optional new title'),
  }),
  execute: async ({ artifactId, content, title }) => {
    logToFile('🔧 TOOL EXECUTED: updateArtifactContent', { artifactId, contentLength: content?.length, title })
    const updates: Record<string, unknown> = { content }
    if (title) updates.title = title

    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .update(updates)
      .eq('id', artifactId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      artifact: { id: data.id, title: data.title, status: data.status },
      message: `Updated artifact: "${data.title}"`,
    }
  },
})

export const getArtifactContent = tool({
  description: 'Fetch the content of an artifact to analyze or improve it',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to fetch'),
  }),
  execute: async ({ artifactId }) => {
    logToFile('🔧 TOOL EXECUTED: getArtifactContent', { artifactId })
    const { data, error } = await supabaseAdmin
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      artifact: {
        id: data.id,
        type: data.type,
        title: data.title,
        content: data.content,
        status: data.status,
        tags: data.tags,
      },
    }
  },
})

export const listRecentArtifacts = tool({
  description: 'List recent artifacts to understand content patterns and avoid repetition',
  inputSchema: z.object({
    limit: z.number().min(1).max(20).optional().describe('Number of artifacts to fetch (default: 5)'),
    type: z.enum(['social_post', 'blog', 'showcase', 'all']).optional().describe('Filter by type'),
  }),
  execute: async ({ limit, type }) => {
    logToFile('🔧 TOOL EXECUTED: listRecentArtifacts', { limit, type })
    const effectiveLimit = limit ?? 5
    let query = supabaseAdmin
      .from('artifacts')
      .select('id, type, title, tags, created_at')
      .order('created_at', { ascending: false })
      .limit(effectiveLimit)

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      artifacts: (data ?? []).map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        tags: a.tags,
      })),
      count: data?.length ?? 0,
    }
  },
})

/**
 * Suggest artifact ideas for the user to review and create
 * Returns suggestions WITHOUT saving to database
 */
export const suggestArtifactIdeas = tool({
  description: 'Suggest content artifact ideas for the user to review. Returns structured suggestions that can be created as draft artifacts.',
  inputSchema: z.object({
    suggestions: z.array(z.object({
      title: z.string().describe('Title of the suggested content'),
      description: z.string().describe('Brief description of the content idea'),
      type: z.enum(['social_post', 'blog', 'showcase']).describe('Artifact type'),
      rationale: z.string().describe('Why this content would be valuable'),
      tags: z.array(z.string()).optional().describe('Suggested tags'),
    })).min(1).max(10),
  }),
  execute: async ({ suggestions }) => {
    logToFile('🔧 TOOL EXECUTED: suggestArtifactIdeas', { count: suggestions.length })
    return {
      success: true,
      type: 'artifact_suggestions',
      suggestions: suggestions.map((s, i) => ({
        id: `suggestion-${Date.now()}-${i}`,
        ...s,
      })),
      message: `Generated ${suggestions.length} content suggestions`,
    }
  },
})
