// @ts-nocheck
/**
 * Product Management Agent — Tool Definitions
 *
 * Tools for project/artifact creation, listing, and updates.
 * Uses factory pattern: accepts injected supabase client and customerId for per-request context.
 * customerId is bound into closures — the model never needs to supply it.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logToFile } from '../../../lib/logger.js'

export function createProductMgmtTools(supabase: SupabaseClient, customerId: string) {
  return {
    createProject: tool({
      description: 'Create a new product workflow project for the customer',
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        agreementId: z.string().uuid().optional(),
      }),
      execute: async ({ name, description, agreementId }) => {
        logToFile('TOOL EXECUTED: createProject', { hasCustomerId: !!customerId, name })

        const { data, error } = await supabase
          .from('customer_projects')
          .insert({
            customer_id: customerId,
            name,
            description: description || null,
            agreement_id: agreementId || null,
            status: 'active',
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }
        return { success: true, projectId: data.id, projectName: name }
      },
    }),

    createArtifact: tool({
      description: 'Create a new artifact (strategy, research, roadmap, etc.) within a project. Write the full content in Markdown format.',
      inputSchema: z.object({
        projectId: z.string().uuid(),
        type: z.enum(['strategy', 'research', 'roadmap', 'competitive_analysis', 'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom']),
        title: z.string(),
        content: z.string().describe('The full artifact content in Markdown format'),
      }),
      execute: async ({ projectId, type, title, content }) => {
        logToFile('TOOL EXECUTED: createArtifact', { hasProjectId: !!projectId, type, title, contentLength: content.length })

        const { data, error } = await supabase
          .from('customer_artifacts')
          .insert({
            project_id: projectId,
            customer_id: customerId,
            type,
            title,
            content,
            status: 'draft',
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }

        // Log delivery event
        await supabase.from('customer_events').insert({
          customer_id: customerId,
          event_type: 'delivery',
          title: `Created artifact: ${title}`,
          description: `Type: ${type}`,
        })

        return { success: true, artifactId: data.id, title, type, projectId }
      },
    }),

    updateArtifact: tool({
      description: 'Update an existing artifact content, title, or status',
      inputSchema: z.object({
        artifactId: z.string().uuid(),
        content: z.string().optional().describe('New content in Markdown format'),
        title: z.string().optional(),
        status: z.enum(['draft', 'in_progress', 'review', 'final', 'archived']).optional(),
      }),
      execute: async ({ artifactId, content, title, status }) => {
        logToFile('TOOL EXECUTED: updateArtifact', { hasArtifactId: !!artifactId, hasContent: !!content, hasTitle: !!title, status })

        const updates: Record<string, unknown> = {}
        if (content !== undefined) updates.content = content
        if (title !== undefined) updates.title = title
        if (status !== undefined) updates.status = status

        const { error } = await supabase
          .from('customer_artifacts')
          .update(updates)
          .eq('id', artifactId)

        if (error) return { success: false, error: error.message }
        return { success: true, artifactId }
      },
    }),

    listProjects: tool({
      description: 'List all projects for the customer',
      inputSchema: z.object({}),
      execute: async () => {
        logToFile('TOOL EXECUTED: listProjects', { hasCustomerId: !!customerId })

        const { data, error } = await supabase
          .from('customer_projects')
          .select('id, name, status, description')
          .eq('customer_id', customerId)
          .order('updated_at', { ascending: false })

        if (error) return { success: false, error: error.message }
        return { projects: data || [] }
      },
    }),

    listArtifacts: tool({
      description: 'List artifacts in a project or all artifacts for the customer',
      inputSchema: z.object({
        projectId: z.string().uuid().optional(),
      }),
      execute: async ({ projectId }) => {
        logToFile('TOOL EXECUTED: listArtifacts', { hasCustomerId: !!customerId, hasProjectId: !!projectId })

        let query = supabase
          .from('customer_artifacts')
          .select('id, title, type, status, project_id, updated_at')
          .eq('customer_id', customerId)

        if (projectId) query = query.eq('project_id', projectId)

        const { data, error } = await query.order('updated_at', { ascending: false })

        if (error) return { success: false, error: error.message }
        return { artifacts: data || [] }
      },
    }),
  }
}
