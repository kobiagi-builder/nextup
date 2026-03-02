// @ts-nocheck
/**
 * Customer Management Agent — Tool Definitions
 *
 * Tools for customer engagement, status management, info updates, and event logging.
 * Uses factory pattern: accepts injected supabase client and customerId for per-request context.
 * customerId is bound into closures — the model never needs to supply it.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logToFile } from '../../../../../lib/logger.js'
import { buildCustomerContext } from '../../shared/customerContextBuilder.js'

export function createCustomerMgmtTools(supabase: SupabaseClient, customerId: string) {
  return {
    updateCustomerStatus: tool({
      description: 'Update the customer lifecycle status (lead, prospect, negotiation, live, on_hold, archive)',
      inputSchema: z.object({
        newStatus: z.enum(['lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive']),
        reason: z.string().describe('Brief explanation for the status change'),
      }),
      execute: async ({ newStatus, reason }) => {
        logToFile('TOOL EXECUTED: updateCustomerStatus', { hasCustomerId: !!customerId, newStatus })

        // Get current status for the event log
        const { data: current } = await supabase
          .from('customers')
          .select('status')
          .eq('id', customerId)
          .single()

        if (!current) return { success: false, error: 'Customer not found or not authorized' }

        const oldStatus = current.status

        const { error, count } = await supabase
          .from('customers')
          .update({ status: newStatus })
          .eq('id', customerId)
          .select('id', { count: 'exact', head: true })

        if (error) return { success: false, error: error.message }
        if (count === 0) return { success: false, error: 'Customer not found or not authorized' }

        // Log status change event
        await supabase.from('customer_events').insert({
          customer_id: customerId,
          event_type: 'status_change',
          title: `Status changed: ${oldStatus} → ${newStatus}`,
          description: reason,
        })

        return { success: true, oldStatus, newStatus, reason }
      },
    }),

    updateCustomerInfo: tool({
      description: 'Update customer information fields (about, vertical, persona, icp, product). Uses atomic JSONB merge — safe for concurrent updates.',
      inputSchema: z.object({
        updates: z.record(z.unknown()).describe('Key-value pairs of info fields to update (e.g., { "vertical": "SaaS", "persona": "VP Product" })'),
      }),
      execute: async ({ updates }) => {
        logToFile('TOOL EXECUTED: updateCustomerInfo', { hasCustomerId: !!customerId, fields: Object.keys(updates) })

        const { data, error } = await supabase.rpc('merge_customer_info', {
          cid: customerId,
          new_info: updates,
        })

        if (error) return { success: false, error: error.message }
        if (!data || data === 0) return { success: false, error: 'Customer not found or not authorized' }

        return { success: true, updatedFields: Object.keys(updates) }
      },
    }),

    createEventLogEntry: tool({
      description: 'Log a customer interaction event (meeting, call, workshop, decision, delivery, feedback, escalation, win, update, analysis, planning)',
      inputSchema: z.object({
        eventType: z.enum(['meeting', 'call', 'workshop', 'decision', 'delivery', 'feedback', 'escalation', 'win', 'update', 'analysis', 'planning']),
        title: z.string(),
        description: z.string().optional(),
        participants: z.array(z.string()).optional(),
        eventDate: z.string().optional().describe('ISO date string for when the event occurred. Defaults to now.'),
      }),
      execute: async ({ eventType, title, description, participants, eventDate }) => {
        logToFile('TOOL EXECUTED: createEventLogEntry', { hasCustomerId: !!customerId, eventType, title })

        const { data, error } = await supabase
          .from('customer_events')
          .insert({
            customer_id: customerId,
            event_type: eventType,
            title,
            description: description || null,
            participants: participants || null,
            ...(eventDate ? { event_date: eventDate } : {}),
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }
        return { success: true, eventId: data.id }
      },
    }),

    getCustomerSummary: tool({
      description: 'Re-fetch the complete customer context including info, agreements, receivables, and projects. Use when data may have changed during the conversation.',
      inputSchema: z.object({}),
      execute: async () => {
        logToFile('TOOL EXECUTED: getCustomerSummary', { hasCustomerId: !!customerId })
        const context = await buildCustomerContext(customerId, supabase)
        return { context }
      },
    }),
  }
}
