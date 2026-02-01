// @ts-nocheck
/**
 * AI Service
 *
 * Orchestrates AI chat with streaming and tool execution.
 * Uses Vercel AI SDK v6 for multi-provider support.
 * Note: @ts-nocheck is used because the AI SDK has complex type inference
 * that causes TypeScript OOM during compilation.
 */

import { streamText, generateText, stepCountIs, simulateReadableStream } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { supabaseAdmin } from '../../lib/supabase.js'
import { logger, logToFile } from '../../lib/logger.js'
import { getBaseSystemPrompt } from './prompts/systemPrompts.js'
import { mockService, type AIServiceResponse } from './mocks/index.js'
import * as contentTools from './tools/contentTools.js'
import * as profileTools from './tools/profileTools.js'
import * as responseTools from './tools/responseTools.js'
import * as researchTools from './tools/researchTools.js'
import * as skeletonTools from './tools/skeletonTools.js'
import * as contentWritingTools from './tools/contentWritingTools.js'
import * as humanityCheckTools from './tools/humanityCheckTools.js'
import * as visualsCreatorTool from './tools/visualsCreatorTool.js'
import * as imageNeedsTools from './tools/imageNeedsTools.js'
import { pipelineExecutor } from './PipelineExecutor.js'
import type { UserContext } from '../../types/portfolio.js'

// =============================================================================
// Types
// =============================================================================

export type AIProvider = 'anthropic' | 'openai'
export type AIModel = 'claude-sonnet' | 'claude-haiku' | 'gpt-4o' | 'gpt-4o-mini'

// Simple message type for chat
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatOptions {
  provider?: AIProvider
  model?: AIModel
  systemPrompt?: string
  includeTools?: boolean
}

interface StreamChatOptions extends ChatOptions {
  onFinish?: (result: { text: string; usage: { input: number; output: number } }) => void
  screenContext?: {
    currentPage: string
    artifactId?: string
    artifactType?: string
    artifactTitle?: string
    artifactStatus?: string
  }
}

// =============================================================================
// Model Configuration
// =============================================================================

const MODEL_CONFIG: Record<AIModel, { provider: AIProvider; modelId: string }> = {
  'claude-sonnet': { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' },
  'claude-haiku': { provider: 'anthropic', modelId: 'claude-haiku-4-20250514' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
}

function getModel(modelName: AIModel = 'claude-sonnet') {
  const config = MODEL_CONFIG[modelName]
  if (config.provider === 'anthropic') {
    return anthropic(config.modelId)
  }
  return openai(config.modelId)
}

// =============================================================================
// Tool Registry
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AVAILABLE_TOOLS: Record<string, any> = {
  // Content tools
  createArtifactDraft: contentTools.createArtifactDraft,
  updateArtifactContent: contentTools.updateArtifactContent,
  getArtifactContent: contentTools.getArtifactContent,
  listRecentArtifacts: contentTools.listRecentArtifacts,
  suggestArtifactIdeas: contentTools.suggestArtifactIdeas,
  // Research tools (Phase 1)
  conductDeepResearch: researchTools.conductDeepResearch,
  // Skeleton tools (Phase 1)
  generateContentSkeleton: skeletonTools.generateContentSkeleton,
  // Content writing tools (Phase 2)
  writeContentSection: contentWritingTools.writeContentSection,
  writeFullContent: contentWritingTools.writeFullContent,
  // Humanity check tools (Phase 2)
  applyHumanityCheck: humanityCheckTools.applyHumanityCheck,
  checkContentHumanity: humanityCheckTools.checkContentHumanity,
  // Visuals creator tools (Phase 2 MVP - deprecated)
  generateContentVisuals: visualsCreatorTool.generateContentVisuals,
  // Image needs tools (Phase 3)
  identifyImageNeeds: imageNeedsTools.identifyImageNeeds,
  // Profile tools
  getUserContext: profileTools.getUserContext,
  getUserSkills: profileTools.getUserSkills,
  suggestProfileUpdates: profileTools.suggestProfileUpdates,
  // Response tools
  structuredResponse: responseTools.structuredResponse,
}

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchUserContext(): Promise<UserContext | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_context')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch user context', { error: error.message })
      return null
    }

    return data as UserContext | null
  } catch (err) {
    logger.error('Error fetching user context', { error: String(err) })
    return null
  }
}

// =============================================================================
// AI Service Class
// =============================================================================

export class AIService {
  private static instance: AIService

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  /**
   * Stream a chat response with tool support
   */
  async streamChat(messages: ChatMessage[], options: StreamChatOptions = {}) {
    const {
      model = 'claude-sonnet',
      systemPrompt,
      includeTools = true,
      onFinish,
      screenContext,
    } = options

    // =========================================================================
    // Mock Check - Return mock response if mocking is enabled
    // =========================================================================
    if (mockService.shouldMock('aiService')) {
      logger.info('AIService', 'Using mock response for streamChat', {
        model,
        messageCount: messages.length,
      })

      // Check if this is a content creation request
      const lastMessage = messages[messages.length - 1]?.content || ''
      const isContentCreation = lastMessage.toLowerCase().includes('create content') ||
                                lastMessage.toLowerCase().includes('create the content')
      const artifactId = screenContext?.artifactId

      // If this is a content creation request with a valid artifact ID, trigger the pipeline
      if (isContentCreation && artifactId) {
        logger.info('AIService', 'Mock mode: Triggering pipeline for content creation', {
          artifactId,
          messagePreview: lastMessage.substring(0, 50),
        })

        // Trigger pipeline execution asynchronously (don't await)
        pipelineExecutor.execute(artifactId).catch((error) => {
          logger.error('AIService', error, {
            sourceCode: 'AIService.streamChat.mockPipelineTrigger',
            artifactId,
          })
        })

        // Return a mock response indicating content creation started
        const pipelineResponse = {
          text: `I'll start creating the content now. The AI pipeline is processing your request for "${lastMessage.replace('Create content: "', '').replace('"', '')}". You'll see the status update as the content is being generated.`,
          usage: { promptTokens: 100, completionTokens: 50 },
          finishReason: 'stop' as const,
          toolCalls: [],
          toolResults: [],
        }

        const mockTextStream = simulateReadableStream({
          chunks: pipelineResponse.text.split(' ').map(word => word + ' '),
          initialDelayInMs: 100,
          chunkDelayInMs: 50,
        })

        onFinish?.({
          text: pipelineResponse.text,
          usage: { input: pipelineResponse.usage.promptTokens, output: pipelineResponse.usage.completionTokens },
        })

        return {
          textStream: mockTextStream,
          text: Promise.resolve(pipelineResponse.text),
          usage: Promise.resolve(pipelineResponse.usage),
          finishReason: Promise.resolve(pipelineResponse.finishReason),
          toolCalls: Promise.resolve(pipelineResponse.toolCalls),
          toolResults: Promise.resolve(pipelineResponse.toolResults),
          pipeUIMessageStreamToResponse: (res: any) => {
            // Use Vercel AI SDK Data Stream Protocol format
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            res.setHeader('X-Vercel-AI-Data-Stream', 'v1')

            // Stream text in chunks using protocol: 0:JSON.stringify(text)\n
            const words = pipelineResponse.text.split(' ')
            for (const word of words) {
              res.write(`0:${JSON.stringify(word + ' ')}\n`)
            }

            // Send finish metadata using protocol: d:metadata\n
            res.write(`d:${JSON.stringify({ finishReason: 'stop' })}\n`)

            res.end()
          },
        }
      }

      // Default mock response for non-content-creation messages
      const mockResponse = await mockService.getMockResponse<AIServiceResponse>(
        'streamChat',
        'default',
        { model, messageCount: messages.length }
      )

      // Call onFinish callback with mock data
      onFinish?.({
        text: mockResponse.text,
        usage: {
          input: mockResponse.usage.promptTokens,
          output: mockResponse.usage.completionTokens,
        },
      })

      // Return a mock stream-like result that matches Vercel AI SDK interface
      // Note: This is a simplified mock that works for basic streaming scenarios
      const mockTextStream = simulateReadableStream({
        chunks: mockResponse.text.split(' ').map(word => word + ' '),
        initialDelayInMs: 100,
        chunkDelayInMs: 50,
      })

      return {
        textStream: mockTextStream,
        text: Promise.resolve(mockResponse.text),
        usage: Promise.resolve(mockResponse.usage),
        finishReason: Promise.resolve(mockResponse.finishReason),
        toolCalls: Promise.resolve(mockResponse.toolCalls || []),
        toolResults: Promise.resolve(mockResponse.toolResults || []),
        // Mock the pipeUIMessageStreamToResponse method for controller compatibility
        // Uses Vercel AI SDK Data Stream Protocol format
        pipeUIMessageStreamToResponse: (res: any) => {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Vercel-AI-Data-Stream', 'v1')

          // Stream text in chunks using protocol: 0:JSON.stringify(text)\n
          const words = mockResponse.text.split(' ')
          for (const word of words) {
            res.write(`0:${JSON.stringify(word + ' ')}\n`)
          }

          // Send finish metadata using protocol: d:metadata\n
          res.write(`d:${JSON.stringify({ finishReason: 'stop' })}\n`)

          res.end()
        },
      }
    }

    // Fetch user context for personalization
    const userContext = await fetchUserContext()
    const finalSystemPrompt = systemPrompt ?? getBaseSystemPrompt(userContext, screenContext)

    const toolsToUse = includeTools ? AVAILABLE_TOOLS : undefined

    // =========================================================================
    // LOGGING: Request details (to file for debugging)
    // =========================================================================
    logToFile('='.repeat(80))
    logToFile('🚀 AI REQUEST STARTED')
    logToFile('='.repeat(80))
    logToFile('📋 Model', model)
    logToFile('🔧 Tools enabled', includeTools)
    logToFile('🔧 Available tools', toolsToUse ? Object.keys(toolsToUse).join(', ') : 'none')
    logToFile('')
    logToFile('📝 SYSTEM PROMPT:')
    logToFile('-'.repeat(40))
    logToFile(finalSystemPrompt)
    logToFile('-'.repeat(40))
    logToFile('')
    logToFile('💬 USER MESSAGES:')
    messages.forEach((msg, i) => {
      logToFile(`  [${i}] ${msg.role}`, msg.content)
    })
    logToFile('='.repeat(80))

    // [AI Agent] - message sent (user message to agent)
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    if (lastUserMessage) {
      logger.info('[AI Agent] message sent', {
        artifactId: screenContext?.artifactId || null,
        title: screenContext?.artifactTitle || 'Unknown',
        currentStatus: screenContext?.artifactStatus || 'unknown',
        message: lastUserMessage.content,
      })
    }

    // Log screen context if provided
    if (screenContext) {
      logToFile('')
      logToFile('🖥️ SCREEN CONTEXT:')
      logToFile('-'.repeat(40))
      logToFile(`  Current Page: ${screenContext.currentPage}`)
      if (screenContext.artifactId) {
        logToFile(`  Artifact ID: ${screenContext.artifactId}`)
        logToFile(`  Artifact Type: ${screenContext.artifactType || 'unknown'}`)
        logToFile(`  Artifact Title: ${screenContext.artifactTitle || 'untitled'}`)
        logToFile(`  Artifact Status: ${screenContext.artifactStatus || 'unknown'}`)
      }
      logToFile('-'.repeat(40))
      logToFile('')
    }

    logger.debug('Starting AI stream', {
      model,
      messageCount: messages.length,
      hasTools: includeTools,
      toolNames: toolsToUse ? Object.keys(toolsToUse) : [],
    })

    let stepCount = 0

    const result = streamText({
      model: getModel(model),
      system: finalSystemPrompt,
      messages,
      tools: toolsToUse,
      toolChoice: includeTools ? 'auto' : undefined,
      // AI SDK v6: Use stopWhen for multi-step tool execution
      stopWhen: stepCountIs(10), // Allow up to 10 steps for complex multi-tool workflows

      // Log each step in the chain of thought (to file)
      onStepFinish: (stepResult) => {
        stepCount++
        logToFile('')
        logToFile('-'.repeat(60))
        logToFile(`🔗 STEP ${stepCount} COMPLETED`)
        logToFile('-'.repeat(60))
        logToFile('  Finish reason', stepResult.finishReason)
        logToFile('  Has text', !!stepResult.text)
        logToFile('  Text preview', stepResult.text?.substring(0, 500) || '(no text)')

        if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
          logToFile('  🔧 TOOL CALLS:')
          stepResult.toolCalls.forEach((tc, i) => {
            logToFile(`    [${i}] Tool: ${tc.toolName}`)
            logToFile(`        Args: ${JSON.stringify(tc.args, null, 2)}`)

            // [AI Agent] - tool called
            logger.info('[AI Agent] tool called', {
              artifactId: screenContext?.artifactId || null,
              title: screenContext?.artifactTitle || 'Unknown',
              currentStatus: screenContext?.artifactStatus || 'unknown',
              toolUsed: tc.toolName,
              toolPrompt: JSON.stringify(tc.args),
            })
          })
        } else {
          logToFile('  🔧 Tool calls: NONE')
        }

        if (stepResult.toolResults && stepResult.toolResults.length > 0) {
          logToFile('  📦 TOOL RESULTS:')
          stepResult.toolResults.forEach((tr, i) => {
            logToFile(`    [${i}] ${tr.toolName}:`)
            logToFile(`        Result: ${JSON.stringify(tr.result, null, 2)}`)
          })
        } else {
          logToFile('  📦 Tool results: NONE (waiting for execution)')
        }

        // Log stepResult keys for debugging
        logToFile('  📊 StepResult keys:', Object.keys(stepResult).join(', '))
        logToFile('-'.repeat(60))
      },

      onFinish: (finishResult) => {
        // =========================================================================
        // LOGGING: Response details (to file)
        // =========================================================================
        logToFile('')
        logToFile('='.repeat(80))
        logToFile('✅ AI REQUEST COMPLETED')
        logToFile('='.repeat(80))
        logToFile('  Finish reason', finishResult.finishReason)
        logToFile('  Total steps', stepCount)
        logToFile('  Token usage', {
          prompt: finishResult.usage.promptTokens,
          completion: finishResult.usage.completionTokens,
          total: finishResult.usage.totalTokens,
        })
        logToFile('')
        logToFile('📤 FINAL RESPONSE:')
        logToFile('-'.repeat(40))
        logToFile(finishResult.text || '(no text response)')
        logToFile('-'.repeat(40))
        logToFile('='.repeat(80))

        logger.debug('AI stream completed', {
          finishReason: finishResult.finishReason,
          usage: finishResult.usage,
          stepCount,
        })

        // [AI Agent] - message received (agent response to user)
        if (finishResult.text) {
          logger.info('[AI Agent] message received', {
            artifactId: screenContext?.artifactId || null,
            title: screenContext?.artifactTitle || 'Unknown',
            currentStatus: screenContext?.artifactStatus || 'unknown',
            message: finishResult.text,
          })
        }

        onFinish?.({
          text: finishResult.text,
          usage: {
            input: finishResult.usage.promptTokens,
            output: finishResult.usage.completionTokens,
          },
        })
      },
    })

    return result
  }

  /**
   * Generate a non-streaming response
   */
  async generateResponse(messages: ChatMessage[], options: ChatOptions = {}) {
    const {
      model = 'claude-sonnet',
      systemPrompt,
      includeTools = true,
    } = options

    // =========================================================================
    // Mock Check - Return mock response if mocking is enabled
    // =========================================================================
    if (mockService.shouldMock('aiService')) {
      logger.info('AIService', 'Using mock response for generateResponse', {
        model,
        messageCount: messages.length,
      })

      const mockResponse = await mockService.getMockResponse<AIServiceResponse>(
        'generateResponse',
        'default',
        { model, messageCount: messages.length }
      )

      return {
        text: mockResponse.text,
        toolCalls: mockResponse.toolCalls || [],
        toolResults: mockResponse.toolResults || [],
        usage: mockResponse.usage,
        finishReason: mockResponse.finishReason,
      }
    }

    const userContext = await fetchUserContext()
    const finalSystemPrompt = systemPrompt ?? getBaseSystemPrompt(userContext)

    // =========================================================================
    // LOGGING: Non-streaming request details (to file)
    // =========================================================================
    logToFile('='.repeat(80))
    logToFile('🚀 AI GENERATE REQUEST STARTED (non-streaming)')
    logToFile('='.repeat(80))
    logToFile('📋 Model', model)
    logToFile('🔧 Tools enabled', includeTools)
    logToFile('')
    logToFile('📝 SYSTEM PROMPT:')
    logToFile('-'.repeat(40))
    logToFile(finalSystemPrompt)
    logToFile('-'.repeat(40))
    logToFile('')
    logToFile('💬 USER MESSAGES:')
    messages.forEach((msg, i) => {
      logToFile(`  [${i}] ${msg.role}`, msg.content)
    })
    logToFile('='.repeat(80))

    logger.debug('Generating AI response', {
      model,
      messageCount: messages.length,
      hasTools: includeTools,
    })

    const result = await generateText({
      model: getModel(model),
      system: finalSystemPrompt,
      messages,
      tools: includeTools ? AVAILABLE_TOOLS : undefined,
      // AI SDK v6: Use stopWhen for multi-step tool execution
      stopWhen: stepCountIs(5),
    })

    // =========================================================================
    // LOGGING: Non-streaming response details (to file)
    // =========================================================================
    logToFile('')
    logToFile('='.repeat(80))
    logToFile('✅ AI GENERATE COMPLETED')
    logToFile('='.repeat(80))
    logToFile('  Finish reason', result.finishReason)
    logToFile('  Token usage', result.usage)

    if (result.toolCalls && result.toolCalls.length > 0) {
      logToFile('')
      logToFile('🔧 TOOL CALLS:')
      result.toolCalls.forEach((tc, i) => {
        logToFile(`  [${i}] Tool`, tc.toolName)
        logToFile(`      Args`, JSON.stringify(tc.args, null, 2))
      })
    }

    if (result.toolResults && result.toolResults.length > 0) {
      logToFile('')
      logToFile('📦 TOOL RESULTS:')
      result.toolResults.forEach((tr, i) => {
        logToFile(`  [${i}] ${tr.toolName}`, JSON.stringify(tr.result, null, 2))
      })
    }

    logToFile('')
    logToFile('📤 FINAL RESPONSE:')
    logToFile('-'.repeat(40))
    logToFile(result.text || '(no text response)')
    logToFile('-'.repeat(40))
    logToFile('='.repeat(80))

    logger.debug('AI response generated', {
      finishReason: result.finishReason,
      usage: result.usage,
      toolCalls: result.toolCalls?.length ?? 0,
    })

    return {
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
      usage: result.usage,
      finishReason: result.finishReason,
    }
  }

  /**
   * Generate content for a specific purpose
   */
  async generateContent(
    prompt: string,
    type: 'social_post' | 'blog' | 'showcase' | 'research',
    options: ChatOptions = {}
  ) {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ]

    // Use lighter model for simpler tasks
    const model = type === 'social_post' ? 'claude-haiku' : 'claude-sonnet'

    return this.generateResponse(messages, {
      ...options,
      model: options.model ?? model,
      includeTools: type !== 'research', // No tools for pure research
    })
  }
}

// Export singleton instance
export const aiService = AIService.getInstance()
