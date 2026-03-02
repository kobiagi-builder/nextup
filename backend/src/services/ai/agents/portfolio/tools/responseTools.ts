// @ts-nocheck
/**
 * Response Structure Tools
 *
 * AI tool definitions for structured response output using Vercel AI SDK v6.
 * Ensures consistent, parseable output for UI rendering.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { logToFile } from '../../../../../lib/logger.js'

// =============================================================================
// Schema Definitions
// =============================================================================

const RequestDecisionSchema = z.enum(['SUPPORTED', 'PARTIAL', 'CLARIFY', 'UNSUPPORTED'])

const InterpretationSchema = z.object({
  userRequest: z.string().describe('Brief summary of what the user asked for'),
  requestDecision: RequestDecisionSchema.describe('How the system will handle this request'),
  supportedParts: z.array(z.string()).optional().describe('Parts of the request that can be fulfilled'),
  unsupportedParts: z.array(z.string()).optional().describe('Parts that cannot be fulfilled'),
  clarifyingQuestions: z.array(z.string()).optional().describe('Questions to ask for unclear/partial requests'),
})

const ActionableItemSchema = z.object({
  type: z.enum(['topic_suggestion', 'artifact_preview', 'content_draft', 'profile_update']).describe('Type of actionable item'),
  id: z.string().describe('Unique identifier for this item'),
  title: z.string().describe('Display title'),
  description: z.string().describe('Description or content preview'),
  metadata: z.record(z.unknown()).optional().describe('Additional type-specific data'),
  sectionGroup: z.string().optional().describe('Group label for visual sectioning (e.g., "Personalized", "Trending", "Continue a Series")'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const structuredResponse = tool({
  description: `ALWAYS call this tool as the FINAL step after executing other tools. This structures your response for the UI.

Use this to:
- Summarize what you interpreted from the user's request
- Provide a title for the response
- Present actionable items (topic suggestions, content drafts, etc.) as interactive cards
- End with a call-to-action text

Request decisions:
- "SUPPORTED": Request is fully understood and supported
- "PARTIAL": Some parts can be handled, others cannot
- "CLARIFY": Need more information to proceed
- "UNSUPPORTED": Request is outside the system's capabilities`,

  inputSchema: z.object({
    interpretation: InterpretationSchema.describe('Your interpretation of the user request'),
    title: z.string().describe('Main title for the response section (e.g., "Topic Ideas for Your Portfolio")'),
    actionableItems: z.array(ActionableItemSchema).optional().describe('Interactive items to display as cards'),
    ctaText: z.string().describe('Friendly closing text with optional follow-up suggestion'),
  }),

  execute: async ({ interpretation, title, actionableItems, ctaText }) => {
    logToFile('🔧 TOOL EXECUTED: structuredResponse', {
      requestDecision: interpretation.requestDecision,
      itemCount: actionableItems?.length ?? 0,
      hasQuestions: (interpretation.clarifyingQuestions?.length ?? 0) > 0,
    })

    return {
      success: true,
      type: 'structured_response',
      response: {
        interpretation,
        title,
        actionableItems: actionableItems ?? [],
        ctaText,
      },
    }
  },
})
