/**
 * AI Controller
 *
 * Handles AI chat and content generation endpoints.
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import { aiService } from '../services/ai/AIService.js'
import { logger } from '../lib/logger.js'

// Simple message type for chat
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// =============================================================================
// Validation Schemas
// =============================================================================

// AI SDK v6 message format - can have content OR parts
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().optional(),
  parts: z.array(z.any()).optional(),
}).refine(
  (data) => data.content !== undefined || data.parts !== undefined,
  { message: 'Message must have either content or parts' }
)

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.enum(['claude-sonnet', 'claude-haiku', 'gpt-4o', 'gpt-4o-mini']).optional(),
  includeTools: z.boolean().optional(),
  screenContext: z.object({
    currentPage: z.string(),
    artifactId: z.string().optional(),
    artifactType: z.enum(['social_post', 'blog', 'showcase']).optional(),
    artifactTitle: z.string().optional(),
    artifactStatus: z.string().optional(),
  }).optional(),
})

const generateContentSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(['social_post', 'blog', 'showcase', 'research']),
  model: z.enum(['claude-sonnet', 'claude-haiku', 'gpt-4o', 'gpt-4o-mini']).optional(),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert AI SDK v6 message format to simple ChatMessage format
 * AI SDK v6 messages can have 'parts' array instead of 'content' string
 */
function convertToSimpleMessage(msg: any): ChatMessage {
  // If message has content, use it
  if (msg.content) {
    return { role: msg.role, content: msg.content }
  }

  // If message has parts, extract text content
  if (msg.parts && Array.isArray(msg.parts)) {
    const textContent = msg.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n')

    return { role: msg.role, content: textContent || '' }
  }

  // Fallback to empty content
  return { role: msg.role, content: '' }
}

// =============================================================================
// Controller Functions
// =============================================================================

/**
 * Stream chat endpoint - uses Vercel AI SDK v6 streaming format
 * Uses pipeDataStreamToResponse for multi-step tool execution support
 */
export async function streamChat(req: Request, res: Response) {
  try {
    const parsed = chatRequestSchema.safeParse(req.body)

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      })
      return
    }

    const { messages, model, includeTools, screenContext } = parsed.data

    // Convert AI SDK v6 messages to simple format
    const simpleMessages = messages.map(convertToSimpleMessage)

    logger.debug('Starting chat stream', {
      messageCount: simpleMessages.length,
      model,
      hasScreenContext: !!screenContext,
      screenContext: screenContext ? {
        currentPage: screenContext.currentPage,
        artifactId: screenContext.artifactId,
      } : undefined,
    })

    const result = await aiService.streamChat(simpleMessages, {
      model,
      includeTools,
      screenContext,
      onFinish: ({ text, usage }) => {
        logger.debug('Chat stream finished', {
          responseLength: text.length,
          usage,
        })
      },
    })

    // Use pipeUIMessageStreamToResponse for UI streaming
    // Multi-step execution is controlled by stopWhen in AIService
    result.pipeUIMessageStreamToResponse(res)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Chat stream error', { error: errorMessage })
    console.error('Chat stream error:', error)

    // If headers haven't been sent, return JSON error
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat', details: errorMessage })
    } else {
      res.end()
    }
  }
}

/**
 * Non-streaming chat endpoint
 */
export async function chat(req: Request, res: Response) {
  try {
    const parsed = chatRequestSchema.safeParse(req.body)

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      })
      return
    }

    const { messages, model, includeTools } = parsed.data

    // Convert AI SDK v6 messages to simple format
    const simpleMessages = messages.map(convertToSimpleMessage)

    logger.debug('Processing chat', { messageCount: simpleMessages.length, model })

    const result = await aiService.generateResponse(simpleMessages, {
      model,
      includeTools,
    })

    res.json({
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
      usage: result.usage,
      finishReason: result.finishReason,
    })

  } catch (error) {
    logger.error('Chat error', { error: String(error) })
    res.status(500).json({ error: 'Failed to process chat' })
  }
}

/**
 * Generate specific content type
 */
export async function generateContent(req: Request, res: Response) {
  try {
    const parsed = generateContentSchema.safeParse(req.body)

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      })
      return
    }

    const { prompt, type, model } = parsed.data

    logger.debug('Generating content', { type, model })

    const result = await aiService.generateContent(prompt, type, { model })

    res.json({
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
      usage: result.usage,
    })

  } catch (error) {
    logger.error('Content generation error', { error: String(error) })
    res.status(500).json({ error: 'Failed to generate content' })
  }
}

/**
 * Health check for AI service
 */
export async function healthCheck(_req: Request, res: Response) {
  try {
    // Simple check that AI service is initialized
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY

    res.json({
      status: 'ok',
      providers: {
        anthropic: hasAnthropicKey ? 'configured' : 'missing',
        openai: hasOpenAIKey ? 'configured' : 'missing',
      },
    })
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) })
  }
}
