// @ts-nocheck
/**
 * Product Management Agent — Tool Definitions
 *
 * Tools for initiative/document creation, listing, and updates.
 * Uses factory pattern: accepts injected supabase client and customerId for per-request context.
 * customerId is bound into closures — the model never needs to supply it.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logToFile } from '../../../../../lib/logger.js'

export function createProductMgmtTools(supabase: SupabaseClient, customerId: string) {
  return {
    createInitiative: tool({
      description: 'Create a new product workflow initiative for the customer',
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        agreementId: z.string().uuid().optional(),
      }),
      execute: async ({ name, description, agreementId }) => {
        logToFile('TOOL EXECUTED: createInitiative', { hasCustomerId: !!customerId, name })

        const { data, error } = await supabase
          .from('customer_initiatives')
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
        return { success: true, initiativeId: data.id, initiativeName: name }
      },
    }),

    createDocument: tool({
      description: 'Create a document for types without a specialized tool (roadmaps, product specs, meeting notes, presentations, ideation, custom). Do NOT use for strategy, competitive analysis, user research, or other types that have dedicated tools.',
      inputSchema: z.object({
        initiativeId: z.string().uuid(),
        type: z.enum(['roadmap', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom']),
        title: z.string(),
        content: z.string().describe('The full document content in Markdown format'),
      }),
      execute: async ({ initiativeId, type, title, content }) => {
        logToFile('TOOL EXECUTED: createDocument', { hasInitiativeId: !!initiativeId, type, title, contentLength: content.length })

        const { data, error } = await supabase
          .from('customer_documents')
          .insert({
            initiative_id: initiativeId,
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
          title: `Created document: ${title}`,
          description: `Type: ${type}`,
        })

        return { success: true, documentId: data.id, title, type, initiativeId }
      },
    }),

    updateDocument: tool({
      description: 'Update an existing document content, title, or status',
      inputSchema: z.object({
        documentId: z.string().uuid(),
        content: z.string().optional().describe('New content in Markdown format'),
        title: z.string().optional(),
        status: z.enum(['draft', 'in_progress', 'review', 'final', 'archived']).optional(),
      }),
      execute: async ({ documentId, content, title, status }) => {
        logToFile('TOOL EXECUTED: updateDocument', { hasDocumentId: !!documentId, hasContent: !!content, hasTitle: !!title, status })

        const updates: Record<string, unknown> = {}
        if (content !== undefined) updates.content = content
        if (title !== undefined) updates.title = title
        if (status !== undefined) updates.status = status

        const { error } = await supabase
          .from('customer_documents')
          .update(updates)
          .eq('id', documentId)

        if (error) return { success: false, error: error.message }
        return { success: true, documentId }
      },
    }),

    listInitiatives: tool({
      description: 'List all initiatives for the customer',
      inputSchema: z.object({}),
      execute: async () => {
        logToFile('TOOL EXECUTED: listInitiatives', { hasCustomerId: !!customerId })

        const { data, error } = await supabase
          .from('customer_initiatives')
          .select('id, name, status, description')
          .eq('customer_id', customerId)
          .order('updated_at', { ascending: false })

        if (error) return { success: false, error: error.message }
        return { initiatives: data || [] }
      },
    }),

    listDocuments: tool({
      description: 'List documents in an initiative or all documents for the customer',
      inputSchema: z.object({
        initiativeId: z.string().uuid().optional(),
      }),
      execute: async ({ initiativeId }) => {
        logToFile('TOOL EXECUTED: listDocuments', { hasCustomerId: !!customerId, hasInitiativeId: !!initiativeId })

        let query = supabase
          .from('customer_documents')
          .select('id, title, type, status, initiative_id, updated_at')
          .eq('customer_id', customerId)

        if (initiativeId) query = query.eq('initiative_id', initiativeId)

        const { data, error } = await query.order('updated_at', { ascending: false })

        if (error) return { success: false, error: error.message }
        return { documents: data || [] }
      },
    }),
  }
}
