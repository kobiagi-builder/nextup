// @ts-nocheck
/**
 * Customer AI Controller
 *
 * Handles customer-specific AI chat streaming with LLM-driven agent handoff.
 * Uses createUIMessageStream for composed streaming — each agent can hand off
 * to the other mid-conversation by calling the `handoff` tool.
 *
 * Flow:
 *   User message → selectInitialAgent (from metadata) → Agent 1 streams
 *   → if handoff tool detected → abort Agent 1, start Agent 2 with context
 *   → single seamless stream to client via pipeUIMessageStreamToResponse
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import { createUIMessageStream, pipeUIMessageStreamToResponse, streamText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildCustomerContext } from '../services/ai/prompts/customerContextBuilder.js'
import { getCustomerMgmtSystemPrompt } from '../services/ai/prompts/customerAgentPrompts.js'
import { getProductMgmtSystemPrompt } from '../services/ai/prompts/productAgentPrompts.js'
import { createCustomerMgmtTools } from '../services/ai/tools/customerMgmtTools.js'
import { createActionItemTools } from '../services/ai/tools/actionItemTools.js'
import { createProductMgmtTools } from '../services/ai/tools/productMgmtTools.js'
import {
  createHandoffTool,
  isHandoffResult,
  type AgentType,
  type HandoffResult,
} from '../services/ai/tools/handoffTools.js'
import { getSupabase } from '../lib/requestContext.js'
import { logger, logToFile } from '../lib/logger.js'

// =============================================================================
// Constants
// =============================================================================

/** Maximum agent-to-agent handoffs per request to prevent infinite loops */
const MAX_HANDOFFS = 2

// =============================================================================
// Validation
// =============================================================================

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().optional(),
  parts: z.array(z.any()).optional(),
  metadata: z.object({
    agentType: z.enum(['customer_mgmt', 'product_mgmt']).optional(),
  }).optional(),
}).refine(
  (data) => data.content !== undefined || data.parts !== undefined,
  { message: 'Message must have either content or parts' }
)

const customerChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  customerId: z.string().uuid(),
  screenContext: z.object({
    currentPage: z.string(),
    activeTab: z.string().optional(),
  }).optional(),
})

// =============================================================================
// Helpers
// =============================================================================

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  metadata?: { agentType?: AgentType }
}

function convertToSimpleMessage(msg: any): ChatMessage {
  const content = msg.content || (msg.parts || [])
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.text)
    .join('\n') || ''

  return {
    role: msg.role,
    content,
    metadata: msg.metadata,
  }
}

/**
 * Determine the initial agent from the last assistant message's metadata.
 * Defaults to 'customer_mgmt' for the first message in a conversation.
 */
function selectInitialAgent(messages: ChatMessage[]): AgentType {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].metadata?.agentType) {
      return messages[i].metadata!.agentType!
    }
  }
  return 'customer_mgmt'
}

/**
 * Build the tool set for an agent, optionally including the handoff tool.
 */
function buildAgentTools(
  agentType: AgentType,
  supabase: any,
  customerId: string,
  includeHandoff: boolean,
  previousAgent?: AgentType,
) {
  const domainTools = agentType === 'product_mgmt'
    ? createProductMgmtTools(supabase, customerId)
    : { ...createCustomerMgmtTools(supabase, customerId), ...createActionItemTools(supabase, customerId) }

  if (!includeHandoff) return domainTools

  return { ...domainTools, ...createHandoffTool(agentType, previousAgent) }
}

/**
 * Build the system prompt for an agent, optionally injecting handoff context
 * so the receiving agent knows what was discussed and what the user needs.
 */
function buildSystemPrompt(
  agentType: AgentType,
  customerContext: string,
  handoffData?: HandoffResult | null,
): string {
  const basePrompt = agentType === 'product_mgmt'
    ? getProductMgmtSystemPrompt(customerContext)
    : getCustomerMgmtSystemPrompt(customerContext)

  if (!handoffData) return basePrompt

  const fromAgent = handoffData.targetAgent === agentType
    ? (agentType === 'product_mgmt' ? 'Customer Management' : 'Product Management')
    : 'the other'

  const handoffSection = `
## Handoff Context
You received this conversation from the ${fromAgent} Agent.
**Reason for transfer**: ${handoffData.reason}
**Conversation summary**: ${handoffData.summary}
**User's pending request**: ${handoffData.pendingRequest}

Address the user's pending request directly. Do not mention the handoff or the other agent to the user.`

  return basePrompt + '\n\n' + handoffSection
}

// =============================================================================
// Controller
// =============================================================================

/**
 * Stream customer chat with LLM-driven agent handoff.
 *
 * Uses createUIMessageStream to compose a single HTTP response stream
 * that can contain output from multiple sequential agent invocations.
 * Each agent has a `handoff` tool — when called, the controller detects it
 * in the stream, aborts the current agent, and starts the other agent.
 */
export async function streamCustomerChat(req: Request, res: Response) {
  try {
    const parsed = customerChatRequestSchema.safeParse(req.body)

    if (!parsed.success) {
      logger.warn('[CustomerAI] Validation failed', {
        errors: parsed.error.errors.map(e => ({ path: e.path, message: e.message })),
        messageCount: Array.isArray(req.body?.messages) ? req.body.messages.length : 0,
      })
      res.status(400).json({ error: 'Invalid request', details: parsed.error.errors })
      return
    }

    const { messages, customerId } = parsed.data
    const supabase = getSupabase()

    // Convert messages for AI processing
    const simpleMessages = messages.map(convertToSimpleMessage)

    // Build customer context (shared across both agents)
    const customerContext = await buildCustomerContext(customerId, supabase)

    // Select initial agent from conversation history metadata
    const initialAgent = selectInitialAgent(simpleMessages)

    // Strip custom metadata — prepare clean messages for the AI model
    const aiMessages = simpleMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    logger.debug('[CustomerAI] Starting handoff-capable stream', {
      initialAgent,
      messageCount: simpleMessages.length,
      contextChars: customerContext.length,
    })

    // Create composed UI message stream with handoff loop
    const stream = createUIMessageStream({
      async execute({ writer }) {
        let handoffCount = 0
        let currentAgent: AgentType = initialAgent
        let previousAgent: AgentType | undefined = undefined
        let pendingHandoff: HandoffResult | null = null

        do {
          const isLastIteration = handoffCount >= MAX_HANDOFFS
          const includeHandoff = !isLastIteration

          // Build agent configuration
          const systemPrompt = buildSystemPrompt(currentAgent, customerContext, pendingHandoff)
          const tools = buildAgentTools(currentAgent, supabase, customerId, includeHandoff, previousAgent)
          const abortController = new AbortController()

          logToFile('='.repeat(60))
          logToFile('AGENT ITERATION', {
            agent: currentAgent,
            handoffCount,
            isLastIteration,
            includeHandoff,
            previousAgent: previousAgent || 'none',
            hasPendingHandoff: !!pendingHandoff,
          })
          logToFile('SYSTEM PROMPT:')
          logToFile(systemPrompt)
          logToFile('='.repeat(60))

          // Call streamText directly (bypasses AIService portfolio-specific logic)
          const result = streamText({
            model: anthropic('claude-sonnet-4-20250514'),
            system: systemPrompt,
            messages: aiMessages,
            tools,
            toolChoice: 'auto',
            stopWhen: stepCountIs(10),
            abortSignal: abortController.signal,
            onStepFinish: (stepResult) => {
              logToFile(`[${currentAgent}] Step finished`, {
                finishReason: stepResult.finishReason,
                hasText: !!stepResult.text,
                toolCalls: stepResult.toolCalls?.map((tc: any) => tc.toolName) || [],
              })
            },
            onFinish: (finishResult) => {
              logger.debug(`[CustomerAI] Agent ${currentAgent} finished`, {
                finishReason: finishResult.finishReason,
                usage: finishResult.usage,
              })
            },
          })

          // Iterate the UI message stream, forwarding chunks and detecting handoff
          let detectedHandoff: HandoffResult | null = null

          for await (const chunk of result.toUIMessageStream()) {
            // Detect handoff tool output in the stream
            if (
              chunk.type === 'tool-output-available' &&
              isHandoffResult(chunk.output)
            ) {
              detectedHandoff = chunk.output as HandoffResult
              logToFile('HANDOFF DETECTED', {
                from: currentAgent,
                to: detectedHandoff.targetAgent,
                reason: detectedHandoff.reason,
                pendingRequest: detectedHandoff.pendingRequest,
              })
              // Abort the current agent to stop wasted LLM compute
              abortController.abort()
              break // Stop consuming this agent's stream
            }

            // Forward all non-handoff chunks to the client
            writer.write(chunk)
          }

          // If handoff occurred, prepare for next iteration
          if (detectedHandoff) {
            previousAgent = currentAgent
            currentAgent = detectedHandoff.targetAgent
            pendingHandoff = detectedHandoff
            handoffCount++
          } else {
            // Normal completion — exit loop
            pendingHandoff = null
          }

        } while (pendingHandoff && handoffCount <= MAX_HANDOFFS)
      },
    })

    // Pipe the composed stream to the HTTP response
    pipeUIMessageStreamToResponse({ response: res, stream })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('[CustomerAI] Stream error', { error: errorMessage })

    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process customer chat', details: errorMessage })
    } else {
      res.end()
    }
  }
}
