import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getSupabase } from '../../../lib/requestContext.js';
import { logger } from '../../../lib/logger.js';
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import { mockService } from '../mocks/index.js';
import type { ToolOutput } from '../types/contentAgent.js';
import type {
  WritingCharacteristics,
  WritingCharacteristicValue,
  UserWritingExample,
} from '../../../types/portfolio.js';

/**
 * Writing Characteristics Analysis Tools for Content Creation Agent (Phase 4)
 *
 * Analyzes user's writing style based on:
 * - Artifact content and research context
 * - User's writing examples (if available)
 * - User context (profession, goals, audience)
 *
 * Uses Claude to generate flexible writing characteristics that guide
 * skeleton generation and content writing.
 *
 * Characteristics are flexible (JSONB) - AI can add any characteristic
 * with value, confidence, source, and reasoning.
 */

/**
 * Build the writing characteristics analysis prompt
 */
function buildCharacteristicsPrompt(
  artifactType: string,
  artifactTitle: string | null,
  researchContext: string,
  writingExamples: string,
  userContext: string,
  authorBrief?: string
): string {
  const authorBriefSection = authorBrief
    ? `### Author's Intended Narrative
The author has described their intended angle and narrative for this content. Factor this into your style analysis - if the author's description suggests a provocative, contrarian, or unconventional tone, your characteristics should reflect that rather than defaulting to safe/neutral recommendations.

${authorBrief}

`
    : '';

  return `You are an expert writing style analyst. Analyze the available context and generate writing characteristics that will guide content creation.

## Context

**Artifact Type**: ${artifactType}
**Artifact Title**: ${artifactTitle || 'Not yet defined'}

${authorBriefSection}### Research Context
${researchContext}

### User's Writing Examples
${writingExamples || 'No writing examples provided. Use defaults based on artifact type.'}

### User Profile Context
${userContext || 'No user context available.'}

## Task

Analyze the above context and generate writing characteristics. Be flexible - you can include any characteristics that are relevant.${authorBrief ? ' Pay special attention to the author\'s intended narrative when determining tone, emotional appeal, and audience assumptions.' : ''}

**Common characteristics to consider** (not required, use judgment):
- tone (formal, casual, professional, conversational, etc.)
- voice (first-person, third-person, we/our, etc.)
- sentence_structure (simple, complex, varied, etc.)
- vocabulary_complexity (basic, intermediate, advanced, industry-specific)
- pacing (fast, measured, thorough)
- use_of_evidence (heavy citations, light references, anecdotal)
- use_of_examples (frequent, occasional, minimal)
- cta_style (direct, subtle, none)
- formatting_preferences (lists, paragraphs, headers, etc.)
- emotional_appeal (logical, emotional, balanced)
- audience_assumption (expert, intermediate, beginner)
- structure_preference (linear, non-linear, problem-solution)
- depth (surface, moderate, deep-dive)
- length_preference (concise, moderate, comprehensive)
- use_of_visuals (heavy, moderate, minimal)

**Additional voice characteristics** (analyze from writing examples when available):
- hook_style (question, bold_claim, story, statistic, contrarian_statement)
- central_metaphor_strategy (single_extended, multiple_brief, none)
- example_development_depth (mention_only, explore_mechanism, full_narrative)
- counter_argument_approach (preemptive, responsive, absent)
- intellectual_honesty_level (high_with_caveats, moderate, low_certainty_bias)
- vulnerability_frequency (frequent_admissions, occasional, rare)
- humor_level (frequent, occasional_wit, dry_asides, none)
- rhetorical_question_usage (frequent, occasional, rare)
- conversational_markers (frequent_asides, occasional, formal_only)
- closing_type (diagnostic_questions, reflective_question, provocative_reframe, summary)
- reader_as_peer_level (peer_equals, teacher_student, mentor)
- distinctive_phrasing (list 2-3 signature phrases or constructions the author reuses)

## Output Format

Return a valid JSON object where each key is a characteristic name and the value is an object with:
- value: the characteristic value (string, number, boolean, or array of strings)
- confidence: number from 0 to 1 indicating confidence in this assessment
- source: "artifact" | "examples" | "mix" | "default"
- reasoning: brief explanation of why this characteristic was chosen

Also include:
- _summary: A 2-3 sentence human-readable summary of the writing style
- _recommendations: Specific recommendations for content generation based on these characteristics

Example format:
{
  "tone": {
    "value": "professional",
    "confidence": 0.85,
    "source": "examples",
    "reasoning": "User's examples consistently use formal language with industry terminology"
  },
  "voice": {
    "value": "first-person-plural",
    "confidence": 0.7,
    "source": "mix",
    "reasoning": "Mix of 'we' statements in examples, appropriate for ${artifactType}"
  },
  "_summary": "Professional, authoritative writing style with moderate technical depth...",
  "_recommendations": "Use industry terminology, maintain professional tone, include data-driven examples..."
}

Return ONLY the JSON object, no markdown code blocks or additional text.`;
}

/**
 * Parse and validate characteristics from Claude response
 */
function parseCharacteristicsResponse(
  response: string
): { characteristics: WritingCharacteristics; summary: string; recommendations: string } {
  try {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    // Extract summary and recommendations
    const summary = parsed._summary || 'Writing style analysis complete.';
    const recommendations = parsed._recommendations || 'No specific recommendations.';

    // Remove meta fields and keep only characteristics
    const characteristics: WritingCharacteristics = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!key.startsWith('_') && typeof value === 'object' && value !== null) {
        const charValue = value as WritingCharacteristicValue;
        // Validate required fields
        if ('value' in charValue && 'confidence' in charValue) {
          characteristics[key] = {
            value: charValue.value,
            confidence: Math.min(1, Math.max(0, Number(charValue.confidence) || 0.5)),
            source: charValue.source || 'default',
            reasoning: charValue.reasoning,
          };
        }
      }
    }

    return { characteristics, summary, recommendations };
  } catch (error) {
    logger.warn('[ParseCharacteristicsResponse] Failed to parse response, using defaults', {
      error: error instanceof Error ? error.message : String(error),
      responseLength: response.length,
    });

    // Return default characteristics
    return {
      characteristics: getDefaultCharacteristics(),
      summary: 'Default writing style applied due to parsing error.',
      recommendations: 'Using balanced, professional defaults. Consider providing writing examples for better personalization.',
    };
  }
}

/**
 * Get default characteristics when analysis fails or no context available
 */
function getDefaultCharacteristics(): WritingCharacteristics {
  return {
    tone: {
      value: 'professional',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default professional tone for content creation',
    },
    voice: {
      value: 'first-person',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default first-person voice for personal branding',
    },
    sentence_structure: {
      value: 'varied',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default varied structure for engaging content',
    },
    vocabulary_complexity: {
      value: 'intermediate',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default intermediate vocabulary for broad accessibility',
    },
    pacing: {
      value: 'measured',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default measured pacing for clarity',
    },
    use_of_evidence: {
      value: 'moderate',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default moderate evidence usage',
    },
    hook_style: {
      value: 'bold_claim',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default bold claim hook for engaging openings',
    },
    example_development_depth: {
      value: 'explore_mechanism',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default mechanism-level example development for credibility',
    },
    intellectual_honesty_level: {
      value: 'high_with_caveats',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default high honesty with appropriate caveats for trust-building',
    },
    reader_as_peer_level: {
      value: 'peer_equals',
      confidence: 0.5,
      source: 'default',
      reasoning: 'Default peer-level reader treatment for engagement',
    },
  };
}

/**
 * Analyze Writing Characteristics Tool
 *
 * Uses Claude to analyze writing style based on:
 * - Artifact research context
 * - User's writing examples
 * - User profile context
 *
 * Flow:
 * 1. Fetch artifact data (title, type, research)
 * 2. Fetch user's active writing examples
 * 3. Fetch user context (profession, goals)
 * 4. Build comprehensive analysis prompt
 * 5. Call Claude API for analysis
 * 6. Parse and validate characteristics
 * 7. Store in artifact_writing_characteristics table
 * 8. Update artifact status: research → foundations
 *
 * Returns:
 * - success: true/false
 * - characteristics: WritingCharacteristics object
 * - summary: human-readable summary
 * - recommendations: content generation recommendations
 */
export const analyzeWritingCharacteristics = tool({
  description: `Analyze writing style and generate characteristics for content creation. Uses AI to analyze artifact context, user writing examples, and profile to generate flexible writing characteristics that guide skeleton and content generation.`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to analyze characteristics for'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact'),
  }),

  execute: async ({ artifactId, artifactType }) => {
    const startTime = Date.now();
    const traceId = generateMockTraceId('characteristics');

    try {
      logger.info('[AnalyzeWritingCharacteristics] Starting characteristics analysis', {
        artifactId,
        artifactType,
        traceId,
      });

      // =========================================================================
      // MOCK CHECK: Return mock response if mocking is enabled
      // =========================================================================
      if (mockService.shouldMock('writingCharacteristicsTools')) {
        logger.info('[AnalyzeWritingCharacteristics] Using mock response', {
          traceId,
          artifactId,
          artifactType,
        });

        // Get default characteristics as mock data
        const mockCharacteristics = getDefaultCharacteristics();
        const mockSummary = 'Mock writing style: Professional and engaging tone with clear structure.';
        const mockRecommendations = 'Use active voice, include relevant examples, maintain consistent formatting.';

        // Store mock characteristics in database
        const { error: insertError } = await getSupabase()
          .from('artifact_writing_characteristics')
          .upsert({
            artifact_id: artifactId,
            characteristics: mockCharacteristics,
            summary: mockSummary,
            recommendations: mockRecommendations,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'artifact_id',
          });

        if (insertError) {
          logger.warn('[AnalyzeWritingCharacteristics] Failed to store mock characteristics', {
            error: insertError.message,
            artifactId,
          });
        }

        // Update artifact status: research → foundations
        await getSupabase()
          .from('artifacts')
          .update({
            status: 'foundations',
            updated_at: new Date().toISOString(),
          })
          .eq('id', artifactId);

        const duration = Date.now() - startTime;

        logger.info('[AnalyzeWritingCharacteristics] Mock characteristics analysis completed', {
          artifactId,
          characteristicsCount: Object.keys(mockCharacteristics).length,
          status: 'foundations',
          duration,
          traceId,
        });

        return {
          success: true,
          traceId,
          duration,
          statusTransition: { from: 'research', to: 'foundations' },
          data: {
            characteristics: mockCharacteristics,
            summary: mockSummary,
            recommendations: mockRecommendations,
            examplesUsed: 0,
            artifactAnalyzed: true,
          },
        };
      }

      // 1. Fetch artifact data
      const { data: artifact, error: artifactError } = await getSupabase()
        .from('artifacts')
        .select('id, user_id, title, content, tone')
        .eq('id', artifactId)
        .single();

      if (artifactError || !artifact) {
        const duration = Date.now() - startTime;
        logger.error(`[AnalyzeWritingCharacteristics] ${artifactError?.message || 'Artifact not found'}`, {
          artifactId,
          duration,
          traceId,
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            characteristics: {},
            summary: '',
            recommendations: '',
            examplesUsed: 0,
            artifactAnalyzed: false,
          },
          error: {
            category: 'ARTIFACT_NOT_FOUND' as const,
            message: artifactError?.message || 'Artifact not found',
            recoverable: false,
          },
        };
      }

      // 2. Fetch research results
      const { data: researchResults } = await getSupabase()
        .from('artifact_research')
        .select('source_type, source_name, excerpt, relevance_score')
        .eq('artifact_id', artifactId)
        .order('relevance_score', { ascending: false })
        .limit(10);

      const researchContext = researchResults && researchResults.length > 0
        ? researchResults
            .map((r, i) => `[${i + 1}] ${r.source_name} (${r.source_type}): ${r.excerpt?.substring(0, 200)}...`)
            .join('\n\n')
        : 'No research context available.';

      logger.debug('[AnalyzeWritingCharacteristics] Research context fetched', {
        researchCount: researchResults?.length || 0,
      });

      // 3. Fetch user's active writing examples (filtered by artifact type)
      const { data: writingExamples } = await getSupabase()
        .from('user_writing_examples')
        .select('name, content, analyzed_characteristics')
        .eq('user_id', artifact.user_id)
        .eq('is_active', true)
        .eq('artifact_type', artifactType)
        .limit(5);

      const writingExamplesContext = writingExamples && writingExamples.length > 0
        ? writingExamples
            .map((ex, i) => `### Example ${i + 1}: ${ex.name}\n${ex.content.substring(0, 1000)}...`)
            .join('\n\n')
        : '';

      logger.debug('[AnalyzeWritingCharacteristics] Writing examples fetched', {
        examplesCount: writingExamples?.length || 0,
      });

      // 4. Fetch user context
      const { data: userContext } = await getSupabase()
        .from('user_context')
        .select('about_me, profession, customers, goals')
        .eq('user_id', artifact.user_id)
        .single();

      const userContextStr = userContext
        ? `
**About**: ${userContext.about_me?.bio || 'Not specified'}
**Value Proposition**: ${userContext.about_me?.value_proposition || 'Not specified'}
**Expertise**: ${userContext.profession?.expertise_areas || 'Not specified'}
**Target Audience**: ${userContext.customers?.target_audience || 'Not specified'}
**Content Goals**: ${userContext.goals?.content_goals || 'Not specified'}
        `.trim()
        : '';

      logger.debug('[AnalyzeWritingCharacteristics] User context fetched', {
        hasContext: !!userContext,
      });

      // 4.5. Fetch author's brief from artifact metadata
      let authorBrief: string | undefined;
      {
        const { data: artifactMeta } = await getSupabase()
          .from('artifacts')
          .select('metadata')
          .eq('id', artifactId)
          .single();

        const metadata = artifactMeta?.metadata as Record<string, unknown> | null;
        if (metadata?.author_brief && typeof metadata.author_brief === 'string') {
          authorBrief = metadata.author_brief;
          logger.debug('[AnalyzeWritingCharacteristics] Author brief loaded from metadata', {
            briefLength: authorBrief.length,
          });
        }
      }

      // 5. Build and execute Claude prompt
      const prompt = buildCharacteristicsPrompt(
        artifactType,
        artifact.title,
        researchContext,
        writingExamplesContext,
        userContextStr,
        authorBrief
      );

      logger.debug('[AnalyzeWritingCharacteristics] Prompt built', {
        promptLength: prompt.length,
      });

      // [Agent flow] - writing references sent
      logger.info('[Agent flow] writing references sent', {
        artifactId,
        title: artifact.title || 'Untitled',
        writingExamplesCount: writingExamples?.length || 0,
        writingExamples: writingExamples?.map(ex => ({
          name: ex.name,
          contentPreview: ex.content?.substring(0, 200) + '...',
        })) || [],
        hasUserContext: !!userContext,
        researchResultsCount: researchResults?.length || 0,
        fullPrompt: prompt,
      });

      const { text: response } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxOutputTokens: 2000,
      });

      logger.debug('[AnalyzeWritingCharacteristics] Claude response received', {
        responseLength: response.length,
      });

      // 6. Parse and validate characteristics
      const { characteristics, summary, recommendations } = parseCharacteristicsResponse(response);

      logger.debug('[AnalyzeWritingCharacteristics] Characteristics parsed', {
        characteristicsCount: Object.keys(characteristics).length,
      });

      // 7. Store in database
      const { error: insertError } = await getSupabase()
        .from('artifact_writing_characteristics')
        .upsert({
          artifact_id: artifactId,
          characteristics,
          summary,
          recommendations,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'artifact_id',
        });

      if (insertError) {
        const duration = Date.now() - startTime;
        logger.error(`[AnalyzeWritingCharacteristics] ${insertError.message}`, {
          artifactId,
          stage: 'store_characteristics',
          duration,
          traceId,
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            characteristics,
            summary,
            recommendations,
            examplesUsed: writingExamples?.length || 0,
            artifactAnalyzed: true,
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Failed to store characteristics: ${insertError.message}`,
            recoverable: false,
          },
        };
      }

      // 8. Update artifact status: research → foundations
      const { error: statusError } = await getSupabase()
        .from('artifacts')
        .update({
          status: 'foundations',
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifactId);

      if (statusError) {
        logger.warn('[AnalyzeWritingCharacteristics] Failed to update status', {
          artifactId,
          error: statusError.message,
        });
        // Continue anyway - characteristics were stored successfully
      }

      const duration = Date.now() - startTime;

      logger.info('[AnalyzeWritingCharacteristics] Characteristics analysis completed', {
        artifactId,
        characteristicsCount: Object.keys(characteristics).length,
        examplesUsed: writingExamples?.length || 0,
        status: 'foundations',
        duration,
        traceId,
      });

      const result: ToolOutput<{
        characteristics: WritingCharacteristics;
        summary: string;
        recommendations: string;
        examplesUsed: number;
        artifactAnalyzed: boolean;
      }> = {
        success: true,
        traceId,
        duration,
        statusTransition: { from: 'research', to: 'foundations' },
        data: {
          characteristics,
          summary,
          recommendations,
          examplesUsed: writingExamples?.length || 0,
          artifactAnalyzed: true,
        },
      };

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`[AnalyzeWritingCharacteristics] ${error instanceof Error ? error.message : String(error)}`, {
        artifactId,
        duration,
        traceId,
      });

      return {
        success: false,
        traceId,
        duration,
        data: {
          characteristics: getDefaultCharacteristics(),
          summary: 'Analysis failed, using defaults.',
          recommendations: 'Using default characteristics due to error.',
          examplesUsed: 0,
          artifactAnalyzed: false,
        },
        error: {
          category: 'TOOL_EXECUTION_FAILED' as const,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          recoverable: true,
        },
      };
    }
  },
});
