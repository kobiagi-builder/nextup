/**
 * Execute Action Item Tool
 *
 * Fetches an action item's details and full customer context to build
 * an execution brief. The agent then uses its existing tools to fulfill
 * the action item objective.
 *
 * Factory pattern: accepts injected supabase client and customerId.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logToFile } from '../../../../../lib/logger.js'
import { buildCustomerContext } from '../../shared/customerContextBuilder.js'

export function createExecuteActionItemTool(supabase: SupabaseClient, customerId: string) {
  return {
    executeActionItem: tool({
      description:
        'Execute an action item by fetching its details and full customer context. ' +
        'Call this when the user sends an "Execute action item" message. ' +
        'Returns an execution brief with the objective, instructions, and customer context. ' +
        'After receiving the brief, use your available tools to fulfill the objective, ' +
        'then call updateActionItemStatus with "done" when complete or "todo" if declining.',
      inputSchema: z.object({
        actionItemId: z.string().uuid().describe('The ID of the action item to execute'),
      }),
      execute: async ({ actionItemId }) => {
        logToFile('TOOL EXECUTED: executeActionItem', {
          hasCustomerId: !!customerId,
          hasActionItemId: !!actionItemId,
        })

        // 1. Fetch the action item and verify ownership
        const { data: actionItem, error: fetchError } = await supabase
          .from('customer_action_items')
          .select('id, type, description, due_date, status, reported_by, created_at')
          .eq('id', actionItemId)
          .eq('customer_id', customerId)
          .single()

        if (fetchError || !actionItem) {
          return { success: false, error: 'Action item not found or does not belong to this customer' }
        }

        // 2. Update status to in_progress (safety net — frontend may have already done this)
        await supabase
          .from('customer_action_items')
          .update({ status: 'in_progress' })
          .eq('id', actionItemId)
          .eq('customer_id', customerId)

        // 3. Build full customer context
        const customerContext = await buildCustomerContext(customerId, supabase)

        // 4. Build execution brief
        const brief = buildExecutionBrief(actionItem, customerContext)

        // 5. Log execution start event
        await supabase.from('customer_events').insert({
          customer_id: customerId,
          event_type: 'update',
          title: `Execution started: ${actionItem.description.slice(0, 60)}`,
          description: `AI agent executing action item (type: ${actionItem.type})`,
        })

        return {
          success: true,
          brief,
          actionItemId,
          customerId,
        }
      },
    }),
  }
}

function buildExecutionBrief(
  actionItem: {
    id: string
    type: string
    description: string
    due_date: string | null
    status: string
    reported_by: string | null
  },
  customerContext: string,
): string {
  return `## Execution Brief

### Objective
Execute the following action item for this customer:
- **Description**: ${actionItem.description}
- **Type**: ${actionItem.type}
- **Due Date**: ${actionItem.due_date || 'No due date'}
- **Reported By**: ${actionItem.reported_by || 'Unknown'}
- **Action Item ID**: ${actionItem.id}

### Instructions
1. Analyze the action item objective in the context of this customer
2. Determine the best approach using your available tools
3. If this is a product-related task (competitive analysis, market research, roadmap, strategy, product spec, feature design, user research, launch planning), hand off to the Product Management Agent
4. If this requires human action (scheduling a meeting, making a phone call, signing a contract), DECLINE: call updateActionItemStatus with status "todo" and explain why in your response
5. Execute the task — create documents, conduct research, update customer info, create follow-up action items, or log events as needed
6. When complete, call updateActionItemStatus with status "done". If you created a document, include its document_id. Always include a brief execution_summary describing what you accomplished
7. Provide a summary of what you accomplished

### Customer Context
${customerContext}`
}
