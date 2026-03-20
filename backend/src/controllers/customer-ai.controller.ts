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
import { buildCustomerContext } from '../services/ai/agents/shared/customerContextBuilder.js'
import { getCustomerMgmtSystemPrompt } from '../services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.js'
import { getProductMgmtSystemPrompt } from '../services/ai/agents/product-mgmt/prompt/productAgentPrompts.js'
import { createCustomerMgmtTools } from '../services/ai/agents/customer-mgmt/tools/customerMgmtTools.js'
import { createActionItemTools } from '../services/ai/agents/customer-mgmt/tools/actionItemTools.js'
import { createProductMgmtTools } from '../services/ai/agents/product-mgmt/tools/productMgmtTools.js'
import { createProductStrategyTool } from '../services/ai/agents/product-mgmt/tools/createProductStrategyTool.js'
import { evaluateBuildStrategyTool } from '../services/ai/agents/product-mgmt/tools/evaluateBuildStrategyTool.js'
import { applyDecisionFrameworkTool } from '../services/ai/agents/product-mgmt/tools/applyDecisionFrameworkTool.js'
import { assessShipReadinessTool } from '../services/ai/agents/product-mgmt/tools/assessShipReadinessTool.js'
import { analyzeCompetitionTool } from '../services/ai/agents/product-mgmt/tools/analyzeCompetitionTool.js'
import { scopeMvpTool } from '../services/ai/agents/product-mgmt/tools/scopeMvpTool.js'
import { buildPersonaIcpTool } from '../services/ai/agents/product-mgmt/tools/buildPersonaIcpTool.js'
import { planUserResearchTool } from '../services/ai/agents/product-mgmt/tools/planUserResearchTool.js'
import { analyzeProductDataTool } from '../services/ai/agents/product-mgmt/tools/analyzeProductDataTool.js'
import { designUserFlowTool } from '../services/ai/agents/product-mgmt/tools/designUserFlowTool.js'
import { designUxUiTool } from '../services/ai/agents/product-mgmt/tools/designUxUiTool.js'
import { designAiFeatureTool } from '../services/ai/agents/product-mgmt/tools/designAiFeatureTool.js'
import { createGrowthStrategyTool } from '../services/ai/agents/product-mgmt/tools/createGrowthStrategyTool.js'
import { createLaunchPlanTool } from '../services/ai/agents/product-mgmt/tools/createLaunchPlanTool.js'
import { createNarrativeTool } from '../services/ai/agents/product-mgmt/tools/createNarrativeTool.js'
import { prioritizeItemsTool } from '../services/ai/agents/product-mgmt/tools/prioritizeItemsTool.js'
import { conductPMResearchTool } from '../services/ai/agents/product-mgmt/tools/conductPMResearchTool.js'
import { analyzeMeetingNotesTool as pmAnalyzeMeetingNotesTool } from '../services/ai/agents/product-mgmt/tools/analyzeMeetingNotesTool.js'
import { analyzeMeetingNotesTool as cmAnalyzeMeetingNotesTool } from '../services/ai/agents/customer-mgmt/tools/analyzeMeetingNotesTool.js'
import {
  createHandoffTool,
  isHandoffResult,
  type AgentType,
  type HandoffResult,
} from '../services/ai/agents/shared/handoffTools.js'
import { createFetchUrlTool } from '../services/ai/agents/shared/fetchUrlTool.js'
import { getSupabase, getUserId } from '../lib/requestContext.js'
import { logger, logToFile } from '../lib/logger.js'
import { buildMultimodalMessages } from '../lib/attachmentUtils.js'
import crypto from 'crypto'

// =============================================================================
// Constants
// =============================================================================

/** Maximum agent-to-agent handoffs per request to prevent infinite loops */
const MAX_HANDOFFS = 2

// =============================================================================
// Interaction Logging (persistent, survives server restarts)
// =============================================================================

/**
 * Fire-and-forget insert into agent_interaction_logs.
 * Never blocks the stream; failures are logged but silently swallowed.
 */
function logInteraction(
  supabase: any,
  sessionId: string,
  customerId: string,
  agentType: string,
  event: {
    event_type: string
    step_number?: number
    tool_name?: string
    tool_input?: unknown
    tool_output?: unknown
    text_content?: string
    metadata?: Record<string, unknown>
  },
) {
  // Truncate large content fields to keep DB lean
  const truncate = (val: unknown, maxLen = 2000): unknown => {
    if (typeof val === 'string' && val.length > maxLen) {
      return val.slice(0, maxLen) + `... [truncated, total ${val.length} chars]`
    }
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(obj)) {
        result[k] = (k === 'content' || k === 'text_content')
          ? truncate(v, maxLen)
          : truncate(v, 5000)
      }
      return result
    }
    return val
  }

  supabase
    .from('agent_interaction_logs')
    .insert({
      session_id: sessionId,
      customer_id: customerId,
      agent_type: agentType,
      event_type: event.event_type,
      step_number: event.step_number ?? null,
      tool_name: event.tool_name ?? null,
      tool_input: event.tool_input ? truncate(event.tool_input) : null,
      tool_output: event.tool_output ? truncate(event.tool_output) : null,
      text_content: event.text_content ? truncate(event.text_content, 2000) as string : null,
      metadata: event.metadata ?? {},
    })
    .then(() => {})
    .catch((err: any) => {
      logToFile('[InteractionLog] DB insert failed', { error: String(err), eventType: event.event_type })
    })
}

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

const attachmentSchema = z.object({
  type: z.enum(['image', 'document', 'text']),
  data: z.string().optional(),
  content: z.string().optional(),
  mimeType: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
})

const customerChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  customerId: z.string().uuid(),
  attachments: z.array(attachmentSchema).optional(),
  screenContext: z.object({
    currentPage: z.string(),
    activeTab: z.string().optional(),
    activeInitiativeId: z.string().uuid().optional(),
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
  const sharedTools = { ...createFetchUrlTool() }

  const domainTools = agentType === 'product_mgmt'
    ? {
        ...sharedTools,
        ...createProductMgmtTools(supabase, customerId),
        ...createProductStrategyTool(supabase, customerId),
        ...evaluateBuildStrategyTool(supabase, customerId),
        ...applyDecisionFrameworkTool(supabase, customerId),
        ...assessShipReadinessTool(supabase, customerId),
        ...analyzeCompetitionTool(supabase, customerId),
        ...scopeMvpTool(supabase, customerId),
        ...buildPersonaIcpTool(supabase, customerId),
        ...planUserResearchTool(supabase, customerId),
        ...analyzeProductDataTool(supabase, customerId),
        ...designUserFlowTool(supabase, customerId),
        ...designUxUiTool(supabase, customerId),
        ...designAiFeatureTool(supabase, customerId),
        ...createGrowthStrategyTool(supabase, customerId),
        ...createLaunchPlanTool(supabase, customerId),
        ...createNarrativeTool(supabase, customerId),
        ...prioritizeItemsTool(supabase, customerId),
        ...conductPMResearchTool(supabase, customerId),
        ...pmAnalyzeMeetingNotesTool(supabase, customerId),
      }
    : { ...sharedTools, ...createCustomerMgmtTools(supabase, customerId), ...createActionItemTools(supabase, customerId), ...cmAnalyzeMeetingNotesTool(supabase, customerId) }

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

    const { messages, customerId, attachments } = parsed.data
    const supabase = getSupabase()
    const sessionId = crypto.randomUUID()

    // Convert messages for AI processing
    const simpleMessages = messages.map(convertToSimpleMessage)

    // Build customer context (shared across both agents)
    const customerContext = await buildCustomerContext(customerId, supabase)

    // Select initial agent from conversation history metadata
    const initialAgent = selectInitialAgent(simpleMessages)

    // Strip custom metadata — prepare clean messages for the AI model
    const strippedMessages = simpleMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Build multimodal messages when attachments are present
    const aiMessages = buildMultimodalMessages(strippedMessages, attachments) as any[]

    // Log user message to DB
    const lastUserMsg = simpleMessages.filter(m => m.role === 'user').pop()?.content || ''
    logInteraction(supabase, sessionId, customerId, initialAgent, {
      event_type: 'user_message',
      text_content: lastUserMsg,
      metadata: {
        messageCount: simpleMessages.length,
        hasAttachments: !!attachments?.length,
        attachmentCount: attachments?.length || 0,
      },
    })

    logger.debug('[CustomerAI] Starting handoff-capable stream', {
      initialAgent,
      sessionId,
      messageCount: simpleMessages.length,
      contextChars: customerContext.length,
      hasAttachments: !!attachments?.length,
      attachmentCount: attachments?.length || 0,
    })

    // Create composed UI message stream with handoff loop
    const stream = createUIMessageStream({
      async execute({ writer }) {
        let handoffCount = 0
        let currentAgent: AgentType = initialAgent
        let previousAgent: AgentType | undefined = undefined
        let pendingHandoff: HandoffResult | null = null
        const allToolCallNames: string[] = []
        let stepCounter = 0

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
            maxTokens: 16384,
            stopWhen: [
              // Hard ceiling: never exceed 10 total steps
              stepCountIs(10),
              // Soft limit: stop after 4 tool-using steps, but ONLY if the last
              // step was text-only (no tool calls). This guarantees the LLM always
              // gets a final step to communicate results back to the user.
              ({ steps }: { steps: Array<{ toolCalls: unknown[] }> }) => {
                const toolSteps = steps.filter(s => s.toolCalls.length > 0).length
                const lastStep = steps[steps.length - 1]
                const lastStepWasTextOnly = lastStep && lastStep.toolCalls.length === 0
                return toolSteps >= 4 && lastStepWasTextOnly
              },
            ],
            abortSignal: abortController.signal,
            onStepFinish: (stepResult) => {
              const stepToolNames = stepResult.toolCalls?.map((tc: any) => tc.toolName) || []
              allToolCallNames.push(...stepToolNames)
              stepCounter++
              logToFile(`[${currentAgent}] Step finished`, {
                finishReason: stepResult.finishReason,
                hasText: !!stepResult.text,
                toolCalls: stepToolNames,
              })

              // Log each tool call + result pair to DB
              if (stepResult.toolCalls?.length) {
                for (let i = 0; i < stepResult.toolCalls.length; i++) {
                  const tc = stepResult.toolCalls[i] as any
                  const tr = stepResult.toolResults?.[i] as any
                  // Extract tool input: try tc.input, tc.args, then fall back to tr.input
                  const toolInput = tc.input ?? tc.args ?? tr?.input ?? null
                  const toolOutput = tr?.output ?? tr?.result ?? tr ?? null
                  logInteraction(supabase, sessionId, customerId, currentAgent, {
                    event_type: 'tool_call',
                    step_number: stepCounter,
                    tool_name: tc.toolName,
                    tool_input: toolInput,
                    tool_output: toolOutput,
                    metadata: { finishReason: stepResult.finishReason },
                  })
                }
              }

              // Log agent text if any was generated in this step
              if (stepResult.text) {
                logInteraction(supabase, sessionId, customerId, currentAgent, {
                  event_type: 'agent_text',
                  step_number: stepCounter,
                  text_content: stepResult.text,
                  metadata: { finishReason: stepResult.finishReason },
                })
              }
            },
            onFinish: (finishResult) => {
              logger.debug(`[CustomerAI] Agent ${currentAgent} finished`, {
                finishReason: finishResult.finishReason,
                usage: finishResult.usage,
              })
              logInteraction(supabase, sessionId, customerId, currentAgent, {
                event_type: 'agent_finish',
                metadata: {
                  finishReason: finishResult.finishReason,
                  usage: finishResult.usage,
                  totalSteps: stepCounter,
                  allToolCalls: allToolCallNames,
                },
              })
            },
          })

          // Iterate the UI message stream with buffering for handoff transparency.
          // Text chunks are buffered until we confirm no handoff is coming.
          // Buffer flushes on: non-handoff tool start, finish-step, stream end.
          // Buffer discards on: handoff tool detection.
          let detectedHandoff: HandoffResult | null = null
          let handoffToolDetected = false
          const textBuffer: any[] = []

          for await (const chunk of result.toUIMessageStream()) {

            // ── EARLY handoff detection at tool-input-start ──
            if (chunk.type === 'tool-input-start' && chunk.toolName === 'handoff') {
              handoffToolDetected = true
              logToFile('HANDOFF DETECTED (early, at tool-input-start)', {
                from: currentAgent,
                toolCallId: chunk.toolCallId,
                discardedTextChunks: textBuffer.length,
              })
              // Don't flush buffer — continue to capture HandoffResult
              continue
            }

            // ── Capture HandoffResult at tool-output-available ──
            if (
              chunk.type === 'tool-output-available' &&
              isHandoffResult(chunk.output)
            ) {
              detectedHandoff = chunk.output as HandoffResult
              logToFile('HANDOFF RESULT CAPTURED', {
                from: currentAgent,
                to: detectedHandoff.targetAgent,
                reason: detectedHandoff.reason,
                pendingRequest: detectedHandoff.pendingRequest,
              })
              logInteraction(supabase, sessionId, customerId, currentAgent, {
                event_type: 'handoff',
                step_number: stepCounter,
                metadata: {
                  from: currentAgent,
                  to: detectedHandoff.targetAgent,
                  reason: detectedHandoff.reason,
                  summary: detectedHandoff.summary,
                  pendingRequest: detectedHandoff.pendingRequest,
                },
              })
              // Abort the current agent to stop wasted LLM compute
              abortController.abort()
              break
            }

            // If handoff tool already detected, skip all remaining chunks
            if (handoffToolDetected) continue

            // ── Buffer text chunks ──
            if (
              chunk.type === 'text-start' ||
              chunk.type === 'text-delta' ||
              chunk.type === 'text-end'
            ) {
              textBuffer.push(chunk)
              continue
            }

            // ── Flush buffer on non-handoff tool start ──
            if (chunk.type === 'tool-input-start') {
              for (const buffered of textBuffer) writer.write(buffered)
              textBuffer.length = 0
              writer.write(chunk)
              continue
            }

            // ── Flush buffer on step boundary ──
            if (chunk.type === 'finish-step') {
              for (const buffered of textBuffer) writer.write(buffered)
              textBuffer.length = 0
              writer.write(chunk)
              continue
            }

            // ── Forward all other chunks immediately ──
            writer.write(chunk)
          }

          // Flush remaining buffer on normal completion (no handoff)
          if (!detectedHandoff && textBuffer.length > 0) {
            for (const buffered of textBuffer) writer.write(buffered)
            textBuffer.length = 0
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

        // Gap detection: log when the product_mgmt agent completed without
        // any write/capability tool calls (only had read-only or no tool calls).
        // Excludes handoff and CRUD listing tools from the "used" check.
        const readOnlyTools = ['listInitiatives', 'listDocuments', 'handoff']
        const capabilityToolsUsed = allToolCallNames.filter(n => !readOnlyTools.includes(n))
        if (currentAgent === 'product_mgmt' && capabilityToolsUsed.length === 0) {
          try {
            const userId = getUserId()
            const lastUserMsg = simpleMessages.filter(m => m.role === 'user').pop()?.content || ''
            if (lastUserMsg.length > 20) {
              await supabase.from('unmatched_action_requests').insert({
                customer_id: customerId,
                user_id: userId,
                agent_type: 'product_mgmt',
                request_description: lastUserMsg.slice(0, 500),
                tool_calls_made: allToolCallNames.length > 0 ? allToolCallNames : null,
              }).catch(() => {})
            }
          } catch {
            // Gap detection is non-critical — never fail the response
          }
        }
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
