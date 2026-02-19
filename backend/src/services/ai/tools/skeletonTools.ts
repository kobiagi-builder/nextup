import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { mockService, type SkeletonToolResponse } from '../mocks/index.js';
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import type { ToolOutput } from '../types/contentAgent.js';
import type { WritingCharacteristics } from '../../../types/portfolio.js';

/**
 * Skeleton Generation Tools for Content Creation Agent (Phase 1)
 *
 * Generates LLM-based content skeletons (NOT templates) based on:
 * - Artifact type (blog, social_post, showcase)
 * - User's selected tone (8 options)
 * - Research context from artifact_research table
 *
 * Uses Claude (NOT OpenAI) for skeleton generation as specified in requirements.
 */

// Tone options (8 presets for MVP)
type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous';

/**
 * Tone Modifiers - Applied to skeleton generation prompts
 *
 * Each tone has specific linguistic characteristics:
 * - Sentence structure (simple vs complex)
 * - Voice (active vs passive, first-person vs third-person)
 * - Vocabulary (formal vs casual, technical vs accessible)
 * - Style (serious vs lighthearted)
 */
const toneModifiers: Record<ToneOption, string> = {
  formal: 'Use academic language, passive voice where appropriate, complex sentence structures, and sophisticated vocabulary. Maintain professional distance.',
  casual: 'Use contractions, simple everyday language, active voice, and short sentences. Write as if talking to a friend.',
  professional: 'Use clear and direct language, industry-appropriate terminology, confident statements, and balanced sentence structures.',
  conversational: 'Use first-person frequently, rhetorical questions, friendly asides, and natural speech patterns. Engage the reader directly.',
  technical: 'Use precise technical terminology, detailed explanations, active voice, and evidence-based statements. Prioritize accuracy over accessibility.',
  friendly: 'Use warm and supportive language, personal anecdotes where appropriate, encouraging tone, and inclusive pronouns.',
  authoritative: 'Use strong declarative statements, expert positioning, evidence-based claims, and confident assertions. Establish credibility.',
  humorous: 'Include light jokes, wordplay, entertaining examples, and self-deprecating humor where appropriate. Keep it professional.',
};

/**
 * Parse sections from skeleton content
 */
function parseSectionsFromSkeleton(skeleton: string, artifactType: string): string[] {
  const sections: string[] = [];

  if (artifactType === 'blog' || artifactType === 'showcase') {
    const h2Pattern = /^##\s+(.+)$|^\d+\.\s+([^:]+):/gm;
    let match;
    while ((match = h2Pattern.exec(skeleton)) !== null) {
      const sectionTitle = match[1] || match[2];
      if (sectionTitle) {
        sections.push(sectionTitle.trim());
      }
    }
  } else if (artifactType === 'social_post') {
    sections.push('Hook', 'Key Points', 'Call to Action');
  }

  return sections;
}

/**
 * Estimate word count for final content
 */
function estimateWordCount(artifactType: string, sectionsCount: number): number {
  if (artifactType === 'blog') {
    return 150 + (sectionsCount * 400);
  } else if (artifactType === 'showcase') {
    return 200 + (sectionsCount * 400); // Showcases need deep per-section content (framework elements)
  } else if (artifactType === 'social_post') {
    return 200;
  }
  return 500;
}

/**
 * Build skeleton prompt based on artifact type
 *
 * Each artifact type has a specific structure:
 *
 * Blog:
 * - Title
 * - Hook/Introduction
 * - Image placeholder (featured image)
 * - 3-5 H2 sections with placeholders
 * - Image placeholders within content (after sections)
 * - Conclusion
 * - Call to action
 *
 * Social Post:
 * - Hook (first line)
 * - 2-3 key points
 * - Call to action
 * - Image placeholder (post visual)
 * - 3-5 relevant hashtags
 *
 * Showcase:
 * - Title
 * - Hero image placeholder
 * - Project overview
 * - Problem statement with image
 * - Solution approach with image
 * - Results/impact with image
 * - Key learnings
 */
/**
 * Extract characteristics guidance for skeleton generation
 */
function getCharacteristicsGuidance(characteristics?: WritingCharacteristics): string {
  if (!characteristics || Object.keys(characteristics).length === 0) {
    return '';
  }

  const guidance: string[] = ['## Writing Style Characteristics (apply to skeleton structure)'];

  // Extract relevant characteristics for skeleton
  const structureChar = characteristics.structure_preference || characteristics.structure;
  if (structureChar) {
    guidance.push(`- Structure: ${structureChar.value} (confidence: ${structureChar.confidence})`);
  }

  const depthChar = characteristics.depth || characteristics.depth_preference;
  if (depthChar) {
    guidance.push(`- Depth: ${depthChar.value} - adjust section count accordingly`);
  }

  const lengthChar = characteristics.length_preference || characteristics.length;
  if (lengthChar) {
    guidance.push(`- Length preference: ${lengthChar.value}`);
  }

  const visualsChar = characteristics.use_of_visuals || characteristics.visuals;
  if (visualsChar) {
    guidance.push(`- Visuals usage: ${visualsChar.value} - adjust image placeholder count`);
  }

  const formattingChar = characteristics.formatting_preferences || characteristics.formatting;
  if (formattingChar) {
    guidance.push(`- Formatting: ${formattingChar.value}`);
  }

  const audienceChar = characteristics.audience_assumption || characteristics.audience;
  if (audienceChar) {
    guidance.push(`- Target audience level: ${audienceChar.value}`);
  }

  const hookChar = characteristics.hook_style;
  if (hookChar) {
    guidance.push(`- Hook style: ${hookChar.value}`);
  }

  const metaphorChar = characteristics.central_metaphor_strategy;
  if (metaphorChar) {
    guidance.push(`- Central metaphor: ${metaphorChar.value}`);
  }

  const closingChar = characteristics.closing_type;
  if (closingChar) {
    guidance.push(`- Closing type: ${closingChar.value}`);
  }

  const counterArgChar = characteristics.counter_argument_approach;
  if (counterArgChar) {
    guidance.push(`- Counter-arguments: ${counterArgChar.value}`);
  }

  if (guidance.length === 1) {
    return ''; // Only header, no actual characteristics
  }

  return '\n' + guidance.join('\n') + '\n';
}

function buildSkeletonPrompt(
  artifactType: 'blog' | 'social_post' | 'showcase',
  tone: ToneOption,
  topic: string,
  researchContext: string,
  characteristics?: WritingCharacteristics,
  authorBrief?: string
): string {
  const toneModifier = toneModifiers[tone];
  const characteristicsGuidance = getCharacteristicsGuidance(characteristics);

  // Build author's vision section if brief is available
  const authorVisionSection = authorBrief
    ? `
## Author's Vision (PRIMARY GUIDE for structure and argument flow)

The author has a specific narrative in mind. Use this as your primary guide for structuring the skeleton. You may enhance with research findings, but the core argument, key examples, specific analogies, and intended angle MUST be preserved in the skeleton structure.

${authorBrief}

When creating the skeleton:
- Structure sections around the author's key arguments, not generic subtopics
- Preserve the author's specific examples and analogies as section focal points
- Keep the author's intended hook and CTA direction
- Use research to SUPPORT the author's narrative, not replace it
- If the author mentions specific data points, companies, or events, ensure they appear in the skeleton
- For SHOWCASES: The brief comes from a structured interview — treat stakeholder dynamics, emotional moments, and specific observations as essential skeleton elements (not optional color)

`
    : '';

  const researchLabel = authorBrief
    ? 'Research context (use these insights to SUPPORT the author\'s narrative above):'
    : 'Research context (use these insights to inform structure):';

  const basePrompt = `You are creating a content skeleton (NOT final content) for a ${artifactType}.
${authorVisionSection}
${researchLabel}
${researchContext}

Topic: ${topic}

Tone: ${toneModifier}
${characteristicsGuidance}
`;

  if (artifactType === 'blog') {
    return basePrompt + `Generate a blog skeleton that builds an ARGUMENT, not a topic list.

## Skeleton Structure Rules

1. **Title**: Specific, opinionated - hint at the article's novel angle
2. **Hook**: [Write the actual opening hook] - Start with a specific observation, provocative claim, or concrete example. NOT "In today's fast-paced world..."

[IMAGE: Featured image - visual metaphor for the article's central tension or theme]

3. **Setup section (H2)**: Establish the status quo being challenged
   - [Present what the reader currently believes]
   - End with: why the common approach fails or misses something

4. **Central argument section (H2)**: The article's core insight
   - [Present your thesis through a concrete, named example]
   - Develop the example: what happened, WHY it happened (mechanism), what it implies
   [IMAGE: Visual metaphor for this section's core idea]

5. **Evidence/depth section (H2)**: Supporting evidence and nuance
   - [Second example from a different angle that reinforces the thesis]
   - Include a counter-argument or caveat: "To be fair..." / "This doesn't mean..."
   [IMAGE: Visual metaphor for this section's core idea]

6. **Implications section (H2)**: Why this matters for the reader
   - [Connect the thesis back to the reader's situation]
   - Practical takeaway or shift in thinking

7. **(Optional) Additional section (H2)**: Only if depth warrants it
   [IMAGE: Visual metaphor if this section is included]

8. **Closing**: NOT a summary. End with: diagnostic questions the reader can apply to their own situation, a provocative reframe, or a reflective question.

## Key Constraints
- Sections build on each other - NOT interchangeable topic blocks
- At least ONE named example (company, person, event) must appear
- Include at least ONE moment of intellectual honesty (caveat, limitation)
- If the article introduces a new concept, show it through example BEFORE naming it (earned naming)
- Use placeholders like [Write hook here] and [IMAGE: description]
- Reference research sources like "According to [Source]..."
- Keep total length under 2000 characters.`;
  }

  if (artifactType === 'social_post') {
    return basePrompt + `Generate a social post skeleton with:

1. Hook: [Write attention-grabbing first line here]

2. Point 1: [Key insight or takeaway]
   - [Supporting detail or example]

3. Point 2: [Key insight or takeaway]
   - [Supporting detail or example]

4. (Optional) Point 3: [Key insight or takeaway]
   - [Supporting detail if needed]

5. Call to Action: [Suggest engagement - comment, share, follow, etc.]

6. Post Image: [IMAGE: Describe the visual that should accompany this post - should enhance the message and stop scrollers]

7. Hashtags: #hashtag1 #hashtag2 #hashtag3 (3-5 relevant tags)

Use placeholders and keep concise (suitable for LinkedIn/Twitter). Include ONE image placeholder at the end (before hashtags) describing the visual that would accompany the post. Total length under 1500 characters.`;
  }

  if (artifactType === 'showcase') {
    return basePrompt + `Generate a showcase case study skeleton. This is a NARRATIVE article telling the story of a real professional case — NOT a product showcase or project portfolio piece.

## CRITICAL SHOWCASE RULES

1. **Content Ratio**: ~30% situation/context/outcome, ~70% solution/framework/toolbox. The bulk of the article is the implementable framework.
2. **Anonymization**: NEVER use real company names, people names, or identifying details. Use descriptions: "a B2B SaaS company", "the head of sales", "an adjacent enterprise segment".
3. **No Specific Numbers**: Use relative language instead of exact figures. "Several times our average deal size" NOT "$500K deals". "A few dozen customers" NOT "40 customers". "The company grew several times over" NOT "grew 4x".
4. **Stakeholder Story**: Include the human/political dimension — different perspectives, tensions, emotions, and how they were navigated. This is what makes the case real.
5. **Personal Evidence Only**: Use the author's direct experience and observations. NO external quotes, business-book citations, or "studies show" references.

## Skeleton Structure (follow this architecture)

1. **Title**: Specific, intriguing — hint at the framework AND the human dimension
   - Good: "The ICP Expansion Scorecard: A Decision Framework for When Big Deals Pull You Off Course"
   - Bad: "How I Helped a Company Make Better Decisions"

[IMAGE: Hero image - visual metaphor for the article's central tension]

2. **The Situation** (H2): Scene-setting opening — vivid, specific, immediate
   - [Open with a concrete moment the reader can visualize — "Every B2B product leader will face this moment..."]
   - [Establish the stakes and tension within first 100 words]
   - [Reader promise: explicitly state what they'll walk away with — "By the end of this article, you'll have the complete scorecard, the process, and the lessons"]
   - [Introduce the organizational tension — this isn't just a technical problem, it's a people problem]
   - [Show why each stakeholder's perspective was legitimate — CEO saw growth, Sales had real pipeline, Engineering was stretched, Product saw fragmentation]

3. **The Human Process** (H2): The stakeholder facilitation approach — THIS IS CRITICAL
   - [Explain WHY a facilitation process was needed — "presenting a recommendation would create a winner and a loser"]
   - [Step-by-step process for stakeholder alignment BEFORE any analysis]

   ### Step 1: [Stakeholder mapping sub-section]
   - [1:1 conversations with each stakeholder]
   - [Questions to ask: "What excites you?", "What worries you?", "What would need to be true?"]
   - [Document different risk tolerances, time horizons, definitions of success]

   ### Step 2: [Axis ownership sub-section]
   - [Each stakeholder owns the axis closest to their expertise]
   - [Table mapping axes to natural owners]

   ### Step 3: [Preliminary reviews sub-section]
   - [Never surprise people in a room full of peers]
   - [Share findings individually before the group meeting]
   - [The meeting becomes ratification, not debate]

---

4-8. **The Framework Elements** (H2 each): 4-6 elements of the implementable framework
   EACH element MUST follow this repeatable template:

   ### Element N: [Name] (H2)
   **What it answers**: [One sentence — what question this element resolves]

   **How to run it**: [Step-by-step implementation instructions]
   - [Numbered steps with specific actions]
   - [Include formulas, templates, or decision criteria where applicable]
   - [Be prescriptive enough that a reader could execute this tomorrow]

   **How this played out**: [Personal case evidence]
   - [What actually happened when this element was applied]
   - [Include the stakeholder who owned this analysis and what they found]
   - [Show the emotional/political impact — "When the VP of Engineering presented these numbers — numbers he'd calculated himself — the room understood"]

   **Common pitfall**: [Specific mistake to avoid]
   - [What teams typically get wrong with this element]
   - [Why the mistake is seductive and how to avoid it]

   **Signal criteria**: [Go / Conditional Go / No-Go thresholds]
   - [Clear decision criteria for this element]

   [IMAGE: Visual metaphor for this element's core tension or insight — after every 2nd element]

---

9. **Running the Framework** (H2): How to synthesize and decide
   - [Decision matrix: how signals combine into Go/Conditional/No-Go]
   - [The decision meeting format — template with timing]
   - [Handling the aftermath: messages to prospects, framing for the board, communicating to the team]

10. **The Outcome** (H2): Results and reflection — BRIEF (this is the 30%, not the 70%)
    - [What happened after the decision — use relative terms]
    - [The counterintuitive benefit — "saying no was good for the prospects too"]
    - [Circular closure: callback to the opening tension, resolve it]
    - [The stakeholder who pushed hardest for the other direction later agreed — because they helped build the analysis]

11. **When to Use This** (H2): Trigger scenarios — when should the reader pull this out?
    - [Bulleted list of specific situations that call for this framework]
    - [End with a memorable final line — NOT a quote, but an original insight]

## Key Constraints
- Sections build a NARRATIVE ARC — tension → process → framework → resolution
- Each framework element must be IMPLEMENTABLE, not just descriptive
- The human/political dimension must be woven throughout, not just in one section
- Use discovery order (how the story unfolded) not taxonomic listing
- Include at least 3 genuine "I was wrong" or "we underestimated" moments throughout
- Vary section lengths — not every section should be the same weight
- Use [PLACEHOLDER: ...] notes for where the content writer should add specific detail
- Total skeleton under 3000 characters (this is an outline, not final content)`;
  }

  return basePrompt;
}

/**
 * Generate Content Skeleton Tool
 *
 * Uses Claude (claude-sonnet-4-5) to generate intelligent content skeletons.
 * NOT template-based - each skeleton is uniquely generated based on:
 * - Research context from database
 * - User's topic
 * - Selected tone
 * - Artifact type structure
 *
 * Flow:
 * 1. Fetch research results from artifact_research table
 * 2. Build research context summary
 * 3. Generate skeleton prompt with type-specific structure
 * 4. Call Claude API with tone modifiers
 * 5. Validate skeleton length (< 6000 chars for blogs/showcases, < 2000 for social)
 * 6. Update artifact.content in database
 *
 * Returns:
 * - success: true/false
 * - skeleton: generated content (if successful)
 * - error: error message (if failed)
 */
export const generateContentSkeleton = tool({
  description: `Generate an AI-powered content skeleton based on artifact type, tone, research context, and writing characteristics. Uses Claude to create unique structures (NOT templates) with placeholders like [Write hook here]. Updates artifact.content with skeleton.`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to generate skeleton for'),
    topic: z.string().min(3).describe('Content topic or subject'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact'),
    tone: z.enum([
      'formal',
      'casual',
      'professional',
      'conversational',
      'technical',
      'friendly',
      'authoritative',
      'humorous'
    ]).describe('Desired tone/voice for content'),
    useWritingCharacteristics: z.boolean().optional().default(true).describe('Whether to fetch and use writing characteristics from Phase 4 analysis'),
  }),

  execute: async ({ artifactId, topic, artifactType, tone, useWritingCharacteristics = true }) => {
    const startTime = Date.now();
    const traceId = generateMockTraceId('skeleton');

    try {
      logger.info('[GenerateContentSkeleton] Starting skeleton generation', {
        artifactId,
        artifactType,
        tone,
        topicLength: topic.length,
        traceId,
      });

      // =========================================================================
      // MOCK CHECK: Return mock response if mocking is enabled
      // =========================================================================
      if (mockService.shouldMock('skeletonTools')) {
        logger.info('[GenerateContentSkeleton] Using mock response', {
          artifactId,
          artifactType,
          tone,
        });

        const mockResponse = await mockService.getMockResponse<SkeletonToolResponse>(
          'generateContentSkeleton',
          artifactType,
          { artifactId, topic, artifactType, tone }
        );

        // Update database with mock skeleton to maintain workflow
        if (mockResponse.success && mockResponse.skeleton) {
          await supabaseAdmin
            .from('artifacts')
            .update({
              content: mockResponse.skeleton,
              status: 'skeleton',
              updated_at: new Date().toISOString()
            })
            .eq('id', artifactId);
        }

        return mockResponse;
      }

      // 1. Fetch research results from database
      const { data: researchResults, error: researchError } = await supabaseAdmin
        .from('artifact_research')
        .select('*')
        .eq('artifact_id', artifactId)
        .order('relevance_score', { ascending: false })
        .limit(10); // Top 10 most relevant sources

      if (researchError) {
        const duration = Date.now() - startTime;

        logger.error('[GenerateContentSkeleton] Failed to fetch research', {
          error: researchError,
          artifactId,
          stage: 'fetch_research',
          duration,
          traceId,
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            skeleton: '',
            sections: [],
            estimatedWordCount: 0,
          },
          error: {
            category: 'RESEARCH_NOT_FOUND' as const,
            message: `Failed to fetch research: ${researchError.message}`,
            recoverable: true,
          },
        };
      }

      // 2. Build research context summary
      const researchContext = researchResults && researchResults.length > 0
        ? researchResults
            .map((r, i) => `[${i + 1}] ${r.source_name} (${r.source_type}): ${r.excerpt}`)
            .join('\n\n')
        : 'No research context available. Generate skeleton based on topic alone.';

      logger.debug('[GenerateContentSkeleton] Research context prepared', {
        sourceCount: researchResults?.length || 0,
        contextLength: researchContext.length
      });

      // 2.5 Fetch writing characteristics (Phase 4)
      let writingCharacteristics: WritingCharacteristics | undefined;
      if (useWritingCharacteristics) {
        const { data: charData } = await supabaseAdmin
          .from('artifact_writing_characteristics')
          .select('characteristics')
          .eq('artifact_id', artifactId)
          .single();

        if (charData?.characteristics) {
          writingCharacteristics = charData.characteristics as WritingCharacteristics;
          logger.debug('[GenerateContentSkeleton] Writing characteristics loaded', {
            characteristicsCount: Object.keys(writingCharacteristics).length,
          });
        }
      }

      // 2.6 Fetch author's brief from artifact metadata
      let authorBrief: string | undefined;
      {
        const { data: artifactMeta } = await supabaseAdmin
          .from('artifacts')
          .select('metadata')
          .eq('id', artifactId)
          .single();

        const metadata = artifactMeta?.metadata as Record<string, unknown> | null;
        if (metadata?.author_brief && typeof metadata.author_brief === 'string') {
          authorBrief = metadata.author_brief;
          logger.debug('[GenerateContentSkeleton] Author brief loaded from metadata', {
            briefLength: authorBrief.length,
          });
        }
      }

      // 3. Build skeleton prompt
      const prompt = buildSkeletonPrompt(artifactType, tone, topic, researchContext, writingCharacteristics, authorBrief);

      logger.debug('[GenerateContentSkeleton] Prompt built', {
        promptLength: prompt.length
      });

      // 4. Call Claude API
      const { text: skeleton } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.7, // Balanced creativity and consistency
        maxOutputTokens: 2000, // Enough for detailed skeleton
      });

      logger.debug('[GenerateContentSkeleton] Skeleton generated', {
        skeletonLength: skeleton.length
      });

      // 5. Validate skeleton length and truncate if needed
      // Blogs/showcases need more room for section headers + descriptions
      const maxLength = artifactType === 'social_post' ? 2000 : 6000;
      let finalSkeleton = skeleton;
      let warning: string | undefined;

      if (skeleton.length > maxLength) {
        logger.warn('[GenerateContentSkeleton] Skeleton exceeds max length', {
          length: skeleton.length,
          maxLength
        });
        // Truncate with warning
        finalSkeleton = skeleton.substring(0, maxLength - 100) + '\n\n[Skeleton truncated - exceeded max length]';
        warning = 'Skeleton was truncated to fit length constraints';
      }

      // 6. Update artifact content in database (always update, even if truncated)
      // Status: foundations_approval (user reviews skeleton and approves before writeFullContent)
      // Note: We set foundations_approval directly instead of skeleton because:
      // - In non-pipeline mode (AI SDK direct), PipelineExecutor's pauseForApproval logic doesn't run
      // - The skeleton status is transient and should never be visible to the user
      // - Both code paths (pipeline and direct) need to end at foundations_approval
      const { error: updateError } = await supabaseAdmin
        .from('artifacts')
        .update({
          content: finalSkeleton,
          status: 'foundations_approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', artifactId);

      if (updateError) {
        const duration = Date.now() - startTime;

        logger.error('[GenerateContentSkeleton] Failed to update artifact', {
          error: updateError,
          artifactId,
          stage: 'update_artifact',
          duration,
          traceId,
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            skeleton: finalSkeleton,
            sections: parseSectionsFromSkeleton(finalSkeleton, artifactType),
            estimatedWordCount: estimateWordCount(artifactType, parseSectionsFromSkeleton(finalSkeleton, artifactType).length),
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Failed to update artifact: ${updateError.message}`,
            recoverable: false,
          },
        };
      }

      // Parse sections and estimate word count
      const sections = parseSectionsFromSkeleton(finalSkeleton, artifactType);
      const estimatedWords = estimateWordCount(artifactType, sections.length);
      const duration = Date.now() - startTime;

      logger.info('[GenerateContentSkeleton] Skeleton generation completed', {
        artifactId,
        skeletonLength: finalSkeleton.length,
        sectionsCount: sections.length,
        estimatedWords,
        status: 'foundations_approval',
        wasTruncated: !!warning,
        duration,
        traceId,
      });

      // Build standardized response
      const response: ToolOutput<{
        skeleton: string;
        sections: string[];
        estimatedWordCount: number;
        warning?: string;
      }> = {
        success: true,
        traceId,
        duration,
        statusTransition: { from: 'foundations', to: 'foundations_approval' },
        data: {
          skeleton: finalSkeleton,
          sections,
          estimatedWordCount: estimatedWords,
          ...(warning && { warning }),
        },
      };

      // Capture response for mock data generation (if enabled)
      await mockService.captureRealResponse(
        'generateContentSkeleton',
        artifactType,
        { artifactId, topic, artifactType, tone },
        response
      );

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('[GenerateContentSkeleton] Skeleton generation failed', {
        error: error instanceof Error ? error : new Error(String(error)),
        artifactId,
        topic: topic.substring(0, 50),
        duration,
        traceId,
      });

      return {
        success: false,
        traceId,
        duration,
        data: {
          skeleton: '',
          sections: [],
          estimatedWordCount: 0,
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
