// @ts-nocheck
/**
 * Handoff Tool — Agent-to-Agent Transfer Signal
 *
 * When an agent determines the user's request is outside its domain,
 * it calls this tool. The controller detects the handoff signal in the
 * stream and starts the other agent with the handoff context.
 *
 * This is a pure signal tool — no database operations.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { logToFile } from '../../../lib/logger.js'

// =============================================================================
// Types
// =============================================================================

export type AgentType = 'customer_mgmt' | 'product_mgmt'

export interface HandoffResult {
  /** Marker for stream detection */
  __handoff: true
  /** Which agent to hand off to */
  targetAgent: AgentType
  /** Why the handoff is needed */
  reason: string
  /** Conversation context summary for the receiving agent */
  summary: string
  /** The specific user request the next agent should address */
  pendingRequest: string
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a handoff tool that signals the controller to switch agents.
 *
 * @param currentAgent - The agent type that currently owns this tool
 * @param previousAgent - The agent that handed off to this one (if any).
 *                        When set, the tool description warns against handing back.
 */
export function createHandoffTool(currentAgent: AgentType, previousAgent?: AgentType) {
  const targetAgent: AgentType = currentAgent === 'customer_mgmt' ? 'product_mgmt' : 'customer_mgmt'
  const targetLabel = targetAgent === 'product_mgmt' ? 'Product Management' : 'Customer Management'

  let description = `Transfer the conversation to the ${targetLabel} Agent. `
    + 'Use this ONLY when the user\'s request clearly requires the other agent\'s tools and capabilities. '
    + 'Do NOT hand off for general questions you can partially address.'

  // Prevent ping-pong: warn if the target agent just transferred to us
  if (previousAgent === targetAgent) {
    description += ` WARNING: The ${targetLabel} Agent just transferred to you. Do NOT hand back unless the user explicitly changed topics.`
  }

  return {
    handoff: tool({
      description,
      inputSchema: z.object({
        reason: z.string().describe('Brief explanation of why the handoff is needed'),
        summary: z.string().describe('Summary of the conversation so far relevant to the next agent'),
        pendingRequest: z.string().describe('The specific user request that needs to be fulfilled by the other agent'),
      }),
      execute: async ({ reason, summary, pendingRequest }): Promise<HandoffResult> => {
        logToFile('HANDOFF TOOL EXECUTED', {
          from: currentAgent,
          to: targetAgent,
          reason,
          pendingRequest,
        })

        return {
          __handoff: true,
          targetAgent,
          reason,
          summary,
          pendingRequest,
        }
      },
    }),
  }
}

// =============================================================================
// Type Guard
// =============================================================================

/**
 * Check if a tool output is a handoff signal.
 * Used by the controller to detect handoff in the stream.
 */
export function isHandoffResult(output: unknown): output is HandoffResult {
  return (
    typeof output === 'object' &&
    output !== null &&
    '__handoff' in output &&
    (output as HandoffResult).__handoff === true
  )
}
