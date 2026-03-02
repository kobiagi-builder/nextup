/**
 * Follow-Up Topics Tools
 *
 * AI tool for analyzing existing content and suggesting follow-up topics.
 * Uses Claude Haiku for cost-efficient analysis of published artifacts.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { logToFile } from '../../../../../lib/logger.js'
import { getSupabase } from '../../../../../lib/requestContext.js'

// =============================================================================
// Types
// =============================================================================

interface FollowUpOpportunity {
  parentArtifactId: string
  parentTitle: string
  parentType: string
  continuationType: 'sequel' | 'different_angle' | 'updated_version'
  suggestedTitle: string
  suggestedDescription: string
  rationale: string
  suggestedTags: string[]
}

// =============================================================================
// Tool Definition
// =============================================================================

export const analyzeFollowUpTopics = tool({
  description: 'Analyze existing published content and suggest follow-up topic opportunities. Returns sequel ideas, different angles, and updated versions for the user\'s best content. Use this tool for the "Continue a Series" topic type.',

  inputSchema: z.object({
    contentType: z.enum(['social_post', 'blog', 'showcase', 'all']).default('all').describe('Filter by content type (default: all)'),
    limit: z.number().min(1).max(15).default(10).describe('Number of recent artifacts to analyze (default: 10, max: 15)'),
  }),

  execute: async ({ contentType, limit }) => {
    logToFile('🔧 TOOL EXECUTED: analyzeFollowUpTopics', { contentType, limit })

    // Fetch recent published/ready artifacts
    let query = getSupabase()
      .from('artifacts')
      .select('id, type, title, tags, content, created_at')
      .in('status', ['ready', 'published'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (contentType && contentType !== 'all') {
      query = query.eq('type', contentType)
    }

    const { data: artifacts, error } = await query

    if (error) {
      logToFile('❌ analyzeFollowUpTopics: Supabase error', { error: error.message })
      return {
        success: false,
        error: error.message,
        type: 'follow_up_analysis' as const,
        opportunities: [],
        analyzedCount: 0,
        message: 'Failed to fetch artifacts for analysis',
      }
    }

    if (!artifacts || artifacts.length === 0) {
      return {
        success: true,
        type: 'follow_up_analysis' as const,
        opportunities: [],
        analyzedCount: 0,
        message: 'No published content found to analyze for follow-up topics. Create and publish some content first.',
      }
    }

    // Build artifact summaries for analysis
    const summaries = artifacts.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      tags: a.tags || [],
      contentPreview: (a.content || '').substring(0, 300),
    }))

    // Use Claude Haiku for cost-efficient analysis
    const anthropic = createAnthropic()

    try {
      const { text } = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        prompt: `Analyze these published content pieces and suggest follow-up topic opportunities.

For each piece worth continuing, suggest ONE of these continuation types:
- "sequel": A Part 2 or deeper dive into a subtopic
- "different_angle": The same topic from a completely different perspective or audience
- "updated_version": A refreshed/updated take (if the content could benefit from new developments)

Return a JSON array of opportunities. Only suggest follow-ups for content that would genuinely benefit from continuation (not everything needs a follow-up). Suggest 3-5 total.

Content to analyze:
${JSON.stringify(summaries, null, 2)}

Return ONLY valid JSON array with this structure:
[{
  "parentArtifactId": "string",
  "parentTitle": "string",
  "parentType": "string",
  "continuationType": "sequel" | "different_angle" | "updated_version",
  "suggestedTitle": "string",
  "suggestedDescription": "string (1-2 sentences)",
  "rationale": "string (why this follow-up would be valuable)",
  "suggestedTags": ["string"]
}]`,
        maxOutputTokens: 1500,
      })

      // Parse the LLM response
      let opportunities: FollowUpOpportunity[] = []
      try {
        // Extract JSON from possible markdown code fence
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          opportunities = JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        logToFile('⚠️ analyzeFollowUpTopics: JSON parse failed', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        })
        return {
          success: true,
          type: 'follow_up_analysis' as const,
          opportunities: [],
          analyzedCount: artifacts.length,
          message: `Analyzed ${artifacts.length} artifacts but could not generate follow-up suggestions. Try again.`,
        }
      }

      logToFile('✅ analyzeFollowUpTopics complete', {
        analyzedCount: artifacts.length,
        opportunityCount: opportunities.length,
      })

      return {
        success: true,
        type: 'follow_up_analysis' as const,
        opportunities,
        analyzedCount: artifacts.length,
        message: `Analyzed ${artifacts.length} artifacts, found ${opportunities.length} follow-up opportunities`,
      }
    } catch (llmError) {
      logToFile('❌ analyzeFollowUpTopics: LLM error', {
        error: llmError instanceof Error ? llmError.message : String(llmError),
      })
      return {
        success: false,
        type: 'follow_up_analysis' as const,
        opportunities: [],
        analyzedCount: artifacts.length,
        message: 'Failed to analyze content for follow-up topics',
      }
    }
  },
})
