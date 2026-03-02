// @ts-nocheck
/**
 * Profile & Context Tools
 *
 * AI tool definitions for user context operations using Vercel AI SDK v6.
 * Note: @ts-nocheck is used because the AI SDK tool() helper has complex
 * type inference that causes TypeScript OOM during compilation.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabase } from '../../../../../lib/requestContext.js'
import { logger, logToFile } from '../../../../../lib/logger.js'

// =============================================================================
// Tool Definitions
// =============================================================================

export const getUserContext = tool({
  description: 'Fetch the user profile and context to personalize content',
  inputSchema: z.object({
    _placeholder: z.boolean().optional().describe('Internal parameter, not used'),
  }),
  execute: async () => {
    logToFile('🔧 TOOL EXECUTED: getUserContext')
    const { data, error } = await getSupabase()
      .from('user_context')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message }
    }

    if (!data) {
      return {
        success: true,
        context: null,
        message: 'No user profile configured yet',
      }
    }

    return {
      success: true,
      context: {
        aboutMe: data.about_me,
        profession: data.profession,
        customers: data.customers,
        goals: data.goals,
      },
    }
  },
})

export const getUserSkills = tool({
  description: 'Fetch user skills to understand expertise areas',
  inputSchema: z.object({
    category: z.enum(['product', 'technical', 'leadership', 'industry', 'all']).optional(),
  }),
  execute: async ({ category }) => {
    logToFile('🔧 TOOL EXECUTED: getUserSkills', { category })
    let query = getSupabase()
      .from('skills')
      .select('id, name, category, proficiency, years_experience')
      .order('proficiency', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      skills: (data ?? []).map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        yearsExperience: s.years_experience,
      })),
      count: data?.length ?? 0,
    }
  },
})

export const suggestProfileUpdates = tool({
  description: 'Suggest improvements to user profile based on content patterns',
  inputSchema: z.object({
    section: z.enum(['about_me', 'profession', 'customers', 'goals']).describe('Profile section to improve'),
    suggestion: z.string().describe('Suggested content or changes'),
    rationale: z.string().describe('Why this change would help'),
  }),
  execute: async ({ section, suggestion, rationale }) => {
    logToFile('🔧 TOOL EXECUTED: suggestProfileUpdates', { section, suggestion, rationale })
    // This tool returns suggestions but doesn't auto-update
    // The user will review and apply changes manually
    return {
      success: true,
      suggestion: {
        section,
        content: suggestion,
        rationale,
      },
      message: `Profile suggestion for ${section} ready for review`,
    }
  },
})
