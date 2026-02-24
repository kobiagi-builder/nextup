import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getSupabase } from '../../../lib/requestContext.js';
import { logger } from '../../../lib/logger.js';
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import { mockService } from '../mocks/index.js';
import type { ToolOutput } from '../types/contentAgent.js';
import type { StorytellingGuidance } from '../../../types/portfolio.js';

/**
 * Storytelling Analysis Tools for Content Creation Agent
 *
 * Analyzes artifact context and generates storytelling guidance:
 * - Narrative framework selection (StoryBrand, BAB, PAS, STAR, Hero's Journey, etc.)
 * - Story arc structure (beginning/middle/end mapped to sections)
 * - Emotional journey design
 * - Hook strategy, protagonist identification, tension points, resolution
 *
 * The guidance is consumed by:
 * - skeletonTools.ts — shapes H2 section ordering and narrative arc
 * - contentWritingTools.ts — provides section-level narrative instructions
 */

// =============================================================================
// Prompt Building
// =============================================================================

function buildStorytellingPrompt(
  artifactType: 'blog' | 'social_post' | 'showcase',
  artifactTitle: string | null,
  researchContext: string,
  userContext: string,
  authorBrief?: string
): string {
  const authorBriefSection = authorBrief
    ? `### Author's Intended Narrative
The author has described their intended angle. Factor this into your storytelling analysis — the narrative framework and story arc should amplify the author's vision, not override it.

${authorBrief}

`
    : '';

  const typeSpecificFrameworks = getTypeSpecificFrameworks(artifactType);

  return `You are an expert storytelling strategist. Analyze the context below and generate storytelling guidance that will shape both the content structure (skeleton) and the actual writing.

## Context

**Artifact Type**: ${artifactType}
**Artifact Title**: ${artifactTitle || 'Not yet defined'}

${authorBriefSection}### Research Context
${researchContext || 'No research context available.'}

### User Profile Context
${userContext || 'No user context available.'}

## Task

Generate a comprehensive storytelling strategy for this ${artifactType}. Your output will be used in two ways:
1. **Skeleton generation**: To structure sections as a narrative arc (not a topic list)
2. **Content writing**: To guide section-by-section storytelling (hooks, tension, resolution)

${typeSpecificFrameworks}

## Output Format

Return a valid JSON object with this exact structure:

{
  "narrative_framework": {
    "name": "framework_name",
    "description": "Why this framework is the best fit for this specific artifact",
    "confidence": 0.85
  },
  "story_arc": {
    "beginning": "Specific strategy for the opening — what to establish, what emotion to evoke",
    "middle": "Specific strategy for the middle — how to build tension, develop the argument through narrative",
    "end": "Specific strategy for the ending — how to resolve, what transformation to reveal",
    "section_mapping": [
      {
        "section_role": "setup",
        "guidance": "Specific guidance for what this section achieves in the narrative",
        "emotional_target": "curiosity"
      }
    ]
  },
  "emotional_journey": [
    {
      "stage": "opening",
      "emotion": "curiosity",
      "intensity": 7,
      "technique": "Specific technique to evoke this emotion"
    }
  ],
  "hook_strategy": {
    "type": "hook_type",
    "guidance": "Specific instructions for the opening hook"
  },
  "protagonist": {
    "type": "protagonist_type",
    "guidance": "How to position the protagonist throughout"
  },
  "tension_points": [
    {
      "location": "after_setup",
      "type": "tension_type",
      "description": "What creates tension at this point"
    }
  ],
  "resolution_strategy": {
    "type": "resolution_type",
    "guidance": "Specific instructions for how the content resolves"
  },
  "_summary": "2-3 sentence human-readable summary of the storytelling approach",
  "_recommendations": "Specific narrative recommendations for this artifact"
}

### Guidelines for section_mapping
- Include 3-6 section roles depending on artifact type
- Blog: setup, rising_action, climax, falling_action, resolution (4-5 roles)
- Showcase: context, challenge, journey, transformation, framework, resolution (5-6 roles)
- Social post: hook, tension, payoff (3 roles)

### Guidelines for emotional_journey
- Include 3-5 stages that map to the overall content flow
- Intensity should vary (not all high or all low) — create an emotional arc
- Techniques should be specific and actionable, not generic

### Framework name options
Use one of: storybrand, heros_journey, story_spine, bab, pas, star, resonate, mckee, stories_that_stick, moth_method

Return ONLY the JSON object, no markdown code blocks or additional text.`;
}

function getTypeSpecificFrameworks(artifactType: 'blog' | 'social_post' | 'showcase'): string {
  if (artifactType === 'blog') {
    return `## Recommended Frameworks for Blog

Choose the most appropriate framework based on the topic and author intent:

- **Before-After-Bridge (BAB)**: Best for argument-driven posts that challenge status quo. Show the "before" (current belief), the "after" (better reality), and the "bridge" (how to get there).
- **Problem-Agitate-Solve (PAS)**: Best for pain-point-driven posts. Identify the problem, agitate the emotional stakes, then present the solution.
- **StoryBrand SB7**: Best for posts positioning the reader as the hero. Structure: Customer Hero > Problem > Guide > Plan > Call to Action > Failure to Avoid > Success.
- **Nancy Duarte's Resonate**: Best for persuasive/visionary posts. Oscillate between "what is" (today) and "what could be" (tomorrow).
- **Story Spine**: Best for narrative-driven posts. "Once upon a time... Every day... Until one day... Because of that..."

**Blog storytelling principles**:
- The content should read as ONE argument developing through narrative, not a list of subtopics
- Use in medias res hooks (start in the middle of the action/insight)
- Each section should advance the narrative, not just add information
- Include at least one named example (company, person, event) as narrative anchor
- End with transformation, not summary`;
  }

  if (artifactType === 'showcase') {
    return `## Recommended Frameworks for Showcase/Case Study

Choose the most appropriate framework:

- **STAR Method**: Best for structured professional case studies. Situation > Task > Action > Result.
- **Hero's Journey** (customer as hero): Best for transformation-focused showcases. The customer/reader overcomes challenges through methodology.
- **McKee's Story Structure**: Best for complex multi-phase case studies. Inciting Incident > Progressive Complications > Crisis > Climax > Resolution.
- **Stories That Stick** (Customer Story): Best for empathy-driven showcases. Focus on the customer's emotional journey.

**Showcase storytelling principles**:
- The customer/author is the HERO, not the product or methodology
- 4-part narrative arc: Before > Tipping Point > Journey > After
- ~30% situation/context/outcome, ~70% implementable framework
- Each framework element follows: What it answers > How to run it > How it played out > Common pitfall
- Anonymize but preserve narrative richness (role-based references, not names)
- Show transformation: the reader should feel the change, not just read about results`;
  }

  // social_post
  return `## Recommended Frameworks for Social Post

Choose the most appropriate micro-storytelling framework:

- **Story Spine (condensed)**: "Once upon a time... Until one day... Because of that..." compressed to 3-4 sentences.
- **Before-After-Bridge (BAB)**: Micro-version. Before (1 line) > After (1 line) > Bridge (how).
- **Moth Method**: Personal, true, vulnerable micro-story that illustrates a professional insight.
- **Problem-Agitate-Solve (PAS)**: Quick problem statement > emotional agitation > insight/solution.

**Social post storytelling principles**:
- Hook-first: you have 3 seconds to capture attention
- Complete narrative in 150-280 characters for single posts
- Emotional triggers: curiosity gaps, surprising contrasts, relatable moments
- End with a twist, question, or call-to-action — never trail off
- One insight per post, one story per post`;
}

// =============================================================================
// Response Parsing
// =============================================================================

function parseStorytellingResponse(
  response: string,
  artifactType: string
): { guidance: StorytellingGuidance; summary: string; recommendations: string } {
  try {
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    const summary = parsed._summary || 'Storytelling analysis complete.';
    const recommendations = parsed._recommendations || 'No specific storytelling recommendations.';

    // Validate required fields exist
    const guidance: StorytellingGuidance = {
      narrative_framework: parsed.narrative_framework || { name: 'bab', description: 'Default', confidence: 0.5 },
      story_arc: parsed.story_arc || { beginning: '', middle: '', end: '', section_mapping: [] },
      emotional_journey: Array.isArray(parsed.emotional_journey) ? parsed.emotional_journey : [],
      hook_strategy: parsed.hook_strategy || { type: 'bold_claim', guidance: '' },
      protagonist: parsed.protagonist || { type: 'reader_as_hero', guidance: '' },
      tension_points: Array.isArray(parsed.tension_points) ? parsed.tension_points : [],
      resolution_strategy: parsed.resolution_strategy || { type: 'call_to_action', guidance: '' },
      _summary: summary,
      _recommendations: recommendations,
    };

    return { guidance, summary, recommendations };
  } catch (error) {
    logger.warn('[ParseStorytellingResponse] Failed to parse response, using defaults', {
      error: error instanceof Error ? error.message : String(error),
      responseLength: response.length,
    });

    return {
      guidance: getDefaultStorytelling(artifactType),
      summary: 'Default storytelling applied due to parsing error.',
      recommendations: 'Using balanced narrative defaults.',
    };
  }
}

// =============================================================================
// Default Storytelling
// =============================================================================

function getDefaultStorytelling(artifactType: string): StorytellingGuidance {
  if (artifactType === 'showcase') {
    return {
      narrative_framework: { name: 'star', description: 'STAR method for structured case study', confidence: 0.5 },
      story_arc: {
        beginning: 'Set the scene: what was the situation and why did it matter',
        middle: 'Walk through the approach, showing challenges overcome',
        end: 'Reveal the transformation and measurable results',
        section_mapping: [
          { section_role: 'context', guidance: 'Establish the starting situation and stakes', emotional_target: 'empathy' },
          { section_role: 'challenge', guidance: 'Present the core problem or constraint', emotional_target: 'tension' },
          { section_role: 'journey', guidance: 'Walk through the methodology and decisions', emotional_target: 'engagement' },
          { section_role: 'transformation', guidance: 'Show the measurable change and impact', emotional_target: 'satisfaction' },
          { section_role: 'framework', guidance: 'Distill into a reusable framework the reader can apply', emotional_target: 'empowerment' },
        ],
      },
      emotional_journey: [
        { stage: 'opening', emotion: 'empathy', intensity: 6, technique: 'Relatable professional scenario' },
        { stage: 'challenge', emotion: 'tension', intensity: 7, technique: 'Present the stakes and constraints' },
        { stage: 'insight', emotion: 'aha', intensity: 8, technique: 'Reveal the counter-intuitive approach that worked' },
        { stage: 'resolution', emotion: 'empowerment', intensity: 8, technique: 'Framework the reader can apply immediately' },
      ],
      hook_strategy: { type: 'in_medias_res', guidance: 'Start in the middle of a key decision moment' },
      protagonist: { type: 'customer_as_hero', guidance: 'Position the author/customer as someone who overcame a challenge' },
      tension_points: [
        { location: 'after_setup', type: 'stakes_raise', description: 'Highlight what was at risk if the approach failed' },
      ],
      resolution_strategy: { type: 'transformation_reveal', guidance: 'Show the before/after with specific metrics' },
      _summary: 'Default STAR storytelling for showcase with customer-as-hero arc.',
      _recommendations: 'Focus on transformation narrative with implementable framework.',
    };
  }

  if (artifactType === 'social_post') {
    return {
      narrative_framework: { name: 'bab', description: 'Before-After-Bridge for concise social post', confidence: 0.5 },
      story_arc: {
        beginning: 'Hook with a surprising insight or relatable pain point',
        middle: 'Deliver the core value or lesson',
        end: 'Close with a question or call-to-action',
        section_mapping: [
          { section_role: 'hook', guidance: 'Grab attention in the first line', emotional_target: 'curiosity' },
          { section_role: 'tension', guidance: 'Create a curiosity gap or emotional resonance', emotional_target: 'recognition' },
          { section_role: 'payoff', guidance: 'Deliver the insight and call to engagement', emotional_target: 'empowerment' },
        ],
      },
      emotional_journey: [
        { stage: 'opening', emotion: 'curiosity', intensity: 8, technique: 'Surprising statement or question' },
        { stage: 'middle', emotion: 'recognition', intensity: 7, technique: 'Relatable scenario' },
        { stage: 'close', emotion: 'empowerment', intensity: 7, technique: 'Actionable takeaway' },
      ],
      hook_strategy: { type: 'startling_statistic', guidance: 'Open with a surprising number or counter-intuitive claim' },
      protagonist: { type: 'reader_as_hero', guidance: 'Address the reader directly' },
      tension_points: [],
      resolution_strategy: { type: 'call_to_action', guidance: 'End with engagement prompt' },
      _summary: 'Default BAB micro-storytelling for social post.',
      _recommendations: 'Hook-first, one insight, close with engagement.',
    };
  }

  // Blog default
  return {
    narrative_framework: { name: 'bab', description: 'Before-After-Bridge for argument-driven blog', confidence: 0.5 },
    story_arc: {
      beginning: 'Establish the status quo or common belief being challenged',
      middle: 'Develop the argument through concrete examples and evidence',
      end: 'Bridge to the transformed understanding with practical application',
      section_mapping: [
        { section_role: 'setup', guidance: 'Establish the common belief or practice being challenged', emotional_target: 'curiosity' },
        { section_role: 'rising_action', guidance: 'Build the case through a concrete named example', emotional_target: 'tension' },
        { section_role: 'climax', guidance: 'Deliver the core insight with evidence', emotional_target: 'aha' },
        { section_role: 'resolution', guidance: 'Connect back to the reader with actionable takeaway', emotional_target: 'empowerment' },
      ],
    },
    emotional_journey: [
      { stage: 'opening', emotion: 'curiosity', intensity: 7, technique: 'Provocative question or bold claim' },
      { stage: 'problem', emotion: 'recognition', intensity: 6, technique: 'Relatable scenario the reader has experienced' },
      { stage: 'insight', emotion: 'aha', intensity: 9, technique: 'Counter-intuitive finding backed by evidence' },
      { stage: 'resolution', emotion: 'empowerment', intensity: 8, technique: 'Diagnostic questions for self-application' },
    ],
    hook_strategy: { type: 'provocative_question', guidance: 'Open with a question that challenges conventional wisdom' },
    protagonist: { type: 'reader_as_hero', guidance: 'Position the reader as someone about to gain an important insight' },
    tension_points: [
      { location: 'after_setup', type: 'counter_argument', description: 'Acknowledge why the common approach seems reasonable' },
      { location: 'mid_argument', type: 'stakes_raise', description: 'Show what is at stake if the reader does not change approach' },
    ],
    resolution_strategy: { type: 'diagnostic_questions', guidance: 'End with questions the reader can apply to their own situation' },
    _summary: 'Default BAB storytelling with reader-as-hero and curiosity-to-empowerment emotional arc.',
    _recommendations: 'Use provocative opening, build through examples, end with diagnostic questions.',
  };
}

// =============================================================================
// Tool Definition
// =============================================================================

export const analyzeStorytellingStructure = tool({
  description: `Analyze content context and generate storytelling guidance for an artifact. Selects the best narrative framework, designs a story arc, emotional journey, hook strategy, tension points, and resolution strategy. Output is used by skeleton generation (structure) and content writing (section-level narrative).`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to analyze storytelling for'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact'),
  }),

  execute: async ({ artifactId, artifactType }) => {
    const startTime = Date.now();
    const traceId = generateMockTraceId('storytelling');

    try {
      logger.info('[AnalyzeStorytellingStructure] Starting storytelling analysis', {
        artifactId,
        artifactType,
        traceId,
      });

      // =========================================================================
      // MOCK CHECK
      // =========================================================================
      if (mockService.shouldMock('storytellingTools')) {
        logger.info('[AnalyzeStorytellingStructure] Using mock response', {
          traceId,
          artifactId,
          artifactType,
        });

        const mockGuidance = getDefaultStorytelling(artifactType);
        const mockSummary = mockGuidance._summary;
        const mockRecommendations = mockGuidance._recommendations;

        // Store mock storytelling in database
        const { error: insertError } = await getSupabase()
          .from('artifact_storytelling')
          .upsert({
            artifact_id: artifactId,
            storytelling_guidance: mockGuidance,
            narrative_framework: mockGuidance.narrative_framework.name,
            summary: mockSummary,
            recommendations: mockRecommendations,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'artifact_id',
          });

        if (insertError) {
          logger.warn('[AnalyzeStorytellingStructure] Failed to store mock storytelling', {
            error: insertError.message,
            artifactId,
          });
        }

        // NO status transition — stays at 'foundations'
        const duration = Date.now() - startTime;

        logger.info('[AnalyzeStorytellingStructure] Mock storytelling analysis completed', {
          artifactId,
          framework: mockGuidance.narrative_framework.name,
          duration,
          traceId,
        });

        return {
          success: true,
          traceId,
          duration,
          data: {
            storytellingGuidance: mockGuidance,
            narrativeFramework: mockGuidance.narrative_framework.name,
            summary: mockSummary,
            recommendations: mockRecommendations,
          },
        };
      }

      // 1. Fetch artifact data
      const { data: artifact, error: artifactError } = await getSupabase()
        .from('artifacts')
        .select('id, user_id, title, metadata')
        .eq('id', artifactId)
        .single();

      if (artifactError || !artifact) {
        const duration = Date.now() - startTime;
        logger.error(`[AnalyzeStorytellingStructure] ${artifactError?.message || 'Artifact not found'}`, {
          artifactId,
          duration,
          traceId,
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            storytellingGuidance: getDefaultStorytelling(artifactType),
            narrativeFramework: 'bab',
            summary: '',
            recommendations: '',
          },
          error: {
            category: 'ARTIFACT_NOT_FOUND' as const,
            message: artifactError?.message || 'Artifact not found',
            recoverable: false,
          },
        };
      }

      // 2. Fetch research context
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

      logger.debug('[AnalyzeStorytellingStructure] Research context fetched', {
        researchCount: researchResults?.length || 0,
      });

      // 3. Fetch user context
      const { data: userContext } = await getSupabase()
        .from('user_context')
        .select('about_me, profession, customers, goals')
        .eq('user_id', artifact.user_id)
        .single();

      const userContextStr = userContext
        ? `
**About**: ${userContext.about_me?.bio || 'Not specified'}
**Expertise**: ${userContext.profession?.expertise_areas || 'Not specified'}
**Target Audience**: ${userContext.customers?.target_audience || 'Not specified'}
**Content Goals**: ${userContext.goals?.content_goals || 'Not specified'}
        `.trim()
        : '';

      // 4. Fetch author's brief from metadata
      let authorBrief: string | undefined;
      {
        const metadata = artifact.metadata as Record<string, unknown> | null;
        if (metadata?.author_brief && typeof metadata.author_brief === 'string') {
          authorBrief = metadata.author_brief;
          logger.debug('[AnalyzeStorytellingStructure] Author brief loaded', {
            briefLength: authorBrief.length,
          });
        }
      }

      // 5. Build and execute Claude prompt
      const prompt = buildStorytellingPrompt(
        artifactType,
        artifact.title,
        researchContext,
        userContextStr,
        authorBrief
      );

      logger.debug('[AnalyzeStorytellingStructure] Prompt built', {
        promptLength: prompt.length,
      });

      const { text: response } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.4,
        maxOutputTokens: 2000,
      });

      logger.debug('[AnalyzeStorytellingStructure] Claude response received', {
        responseLength: response.length,
      });

      // 6. Parse and validate storytelling guidance
      const { guidance, summary, recommendations } = parseStorytellingResponse(response, artifactType);

      logger.debug('[AnalyzeStorytellingStructure] Storytelling guidance parsed', {
        framework: guidance.narrative_framework.name,
        sectionMappingCount: guidance.story_arc.section_mapping.length,
        emotionalJourneyStages: guidance.emotional_journey.length,
      });

      // 7. Store in database
      const { error: insertError } = await getSupabase()
        .from('artifact_storytelling')
        .upsert({
          artifact_id: artifactId,
          storytelling_guidance: guidance,
          narrative_framework: guidance.narrative_framework.name,
          summary,
          recommendations,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'artifact_id',
        });

      if (insertError) {
        const duration = Date.now() - startTime;
        logger.error(`[AnalyzeStorytellingStructure] ${insertError.message}`, {
          artifactId,
          stage: 'store_storytelling',
          duration,
          traceId,
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            storytellingGuidance: guidance,
            narrativeFramework: guidance.narrative_framework.name,
            summary,
            recommendations,
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Failed to store storytelling: ${insertError.message}`,
            recoverable: false,
          },
        };
      }

      // NO status transition — tool runs within 'foundations' status
      const duration = Date.now() - startTime;

      logger.info('[AnalyzeStorytellingStructure] Storytelling analysis completed', {
        artifactId,
        framework: guidance.narrative_framework.name,
        sectionMappingCount: guidance.story_arc.section_mapping.length,
        duration,
        traceId,
      });

      const result: ToolOutput<{
        storytellingGuidance: StorytellingGuidance;
        narrativeFramework: string;
        summary: string;
        recommendations: string;
      }> = {
        success: true,
        traceId,
        duration,
        // No statusTransition — stays at 'foundations'
        data: {
          storytellingGuidance: guidance,
          narrativeFramework: guidance.narrative_framework.name,
          summary,
          recommendations,
        },
      };

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`[AnalyzeStorytellingStructure] ${error instanceof Error ? error.message : String(error)}`, {
        artifactId,
        duration,
        traceId,
      });

      return {
        success: false,
        traceId,
        duration,
        data: {
          storytellingGuidance: getDefaultStorytelling(artifactType),
          narrativeFramework: 'bab',
          summary: 'Analysis failed, using defaults.',
          recommendations: 'Using default storytelling due to error.',
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
