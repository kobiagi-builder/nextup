// @ts-nocheck
/**
 * Action Item Agent — Tool Definitions
 *
 * Tools for creating, updating, and listing customer action items.
 * Uses factory pattern: accepts injected supabase client and customerId for per-request context.
 * customerId is bound into closures — the model never needs to supply it.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logToFile } from '../../../../../lib/logger.js'

export function createActionItemTools(supabase: SupabaseClient, customerId: string) {
  return {
    createActionItem: tool({
      description: 'Create a new action item for the current customer. Use for follow-ups, proposals, meetings, deliveries, reviews, bugs, new features, or enhancements.',
      inputSchema: z.object({
        type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'bug', 'new_feature', 'enhancement', 'custom']).default('follow_up'),
        description: z.string().describe('What needs to happen'),
        due_date: z.string().optional().describe('ISO date string (YYYY-MM-DD) for when this is due'),
        status: z.enum(['todo', 'in_progress', 'on_hold', 'done', 'cancelled']).default('todo'),
        reported_by: z.string().optional().describe('Name of the person who reported or raised this item (e.g., from meeting notes or feedback)'),
      }),
      execute: async ({ type, description, due_date, status, reported_by }) => {
        logToFile('TOOL EXECUTED: createActionItem', { hasCustomerId: !!customerId, type })

        // user_id is auto-set by DEFAULT auth.uid() — requires user-scoped Supabase client
        const { data, error } = await supabase
          .from('customer_action_items')
          .insert({
            customer_id: customerId,
            type,
            description,
            due_date: due_date || null,
            status,
            reported_by: reported_by || null,
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }

        // Log event
        await supabase.from('customer_events').insert({
          customer_id: customerId,
          event_type: 'update',
          title: `Action item created: ${description.slice(0, 60)}`,
          description: `Type: ${type}${due_date ? `, Due: ${due_date}` : ''}`,
        })

        return { success: true, actionItem: { id: data.id, type, description, due_date: due_date || null, status, reported_by: reported_by || null } }
      },
    }),

    updateActionItemStatus: tool({
      description: 'Update the status of an existing action item (e.g., mark as done or in progress). When setting status to done after execution, optionally include document_id and execution_summary.',
      inputSchema: z.object({
        actionItemId: z.string().uuid().describe('The ID of the action item to update'),
        status: z.enum(['todo', 'in_progress', 'on_hold', 'done', 'cancelled']),
        document_id: z.string().uuid().optional().describe('ID of a document created during execution (only when status is done)'),
        execution_summary: z.string().optional().describe('Brief summary of what was accomplished (only when status is done)'),
      }),
      execute: async ({ actionItemId, status, document_id, execution_summary }) => {
        logToFile('TOOL EXECUTED: updateActionItemStatus', { hasCustomerId: !!customerId, hasActionItemId: !!actionItemId, status })

        const update: Record<string, unknown> = { status }
        if (status === 'done') {
          if (document_id) update.document_id = document_id
          if (execution_summary) update.execution_summary = execution_summary
        }

        const { data, error } = await supabase
          .from('customer_action_items')
          .update(update)
          .eq('id', actionItemId)
          .eq('customer_id', customerId)
          .select('id, description, type, status')
          .single()

        if (error) return { success: false, error: error.message }
        if (!data) return { success: false, error: 'Action item not found' }

        // Log event
        await supabase.from('customer_events').insert({
          customer_id: customerId,
          event_type: 'update',
          title: `Action item ${status}: ${data.description.slice(0, 60)}`,
        })

        return { success: true, actionItem: data }
      },
    }),

    listActionItems: tool({
      description: 'List action items for the current customer. Optionally filter by status.',
      inputSchema: z.object({
        status: z.enum(['todo', 'in_progress', 'on_hold', 'done', 'cancelled']).optional().describe('Filter by status. Omit to list all.'),
      }),
      execute: async ({ status }) => {
        logToFile('TOOL EXECUTED: listActionItems', { hasCustomerId: !!customerId, statusFilter: status || 'all' })

        let query = supabase
          .from('customer_action_items')
          .select('id, type, description, due_date, status, reported_by, created_at')
          .eq('customer_id', customerId)
          .order('due_date', { ascending: true, nullsFirst: false })

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) return { success: false, error: error.message }

        return {
          success: true,
          count: (data ?? []).length,
          action_items: (data ?? []).map((item: any) => ({
            id: item.id,
            type: item.type,
            description: item.description,
            due_date: item.due_date,
            status: item.status,
            reported_by: item.reported_by || null,
          })),
        }
      },
    }),
  }
}
