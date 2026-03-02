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
      description: 'Create a new action item for the current customer. Use for follow-ups, proposals, meetings, deliveries, or reviews.',
      inputSchema: z.object({
        type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).default('follow_up'),
        description: z.string().describe('What needs to happen'),
        due_date: z.string().optional().describe('ISO date string (YYYY-MM-DD) for when this is due'),
        status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
      }),
      execute: async ({ type, description, due_date, status }) => {
        logToFile('TOOL EXECUTED: createActionItem', { hasCustomerId: !!customerId, type })

        const { data, error } = await supabase
          .from('customer_action_items')
          .insert({
            customer_id: customerId,
            type,
            description,
            due_date: due_date || null,
            status,
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

        return { success: true, actionItem: { id: data.id, type, description, due_date: due_date || null, status } }
      },
    }),

    updateActionItemStatus: tool({
      description: 'Update the status of an existing action item (e.g., mark as done or in progress)',
      inputSchema: z.object({
        actionItemId: z.string().uuid().describe('The ID of the action item to update'),
        status: z.enum(['todo', 'in_progress', 'done', 'cancelled']),
      }),
      execute: async ({ actionItemId, status }) => {
        logToFile('TOOL EXECUTED: updateActionItemStatus', { hasCustomerId: !!customerId, hasActionItemId: !!actionItemId, status })

        const { data, error } = await supabase
          .from('customer_action_items')
          .update({ status })
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
        status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional().describe('Filter by status. Omit to list all.'),
      }),
      execute: async ({ status }) => {
        logToFile('TOOL EXECUTED: listActionItems', { hasCustomerId: !!customerId, statusFilter: status || 'all' })

        let query = supabase
          .from('customer_action_items')
          .select('id, type, description, due_date, status, created_at')
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
          })),
        }
      },
    }),
  }
}
