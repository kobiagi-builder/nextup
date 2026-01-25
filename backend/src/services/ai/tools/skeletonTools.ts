import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';

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
 * Build skeleton prompt based on artifact type
 *
 * Each artifact type has a specific structure:
 *
 * Blog:
 * - Title
 * - Hook/Introduction
 * - 3-5 H2 sections with placeholders
 * - Conclusion
 * - Call to action
 *
 * Social Post:
 * - Hook (first line)
 * - 2-3 key points
 * - Call to action
 * - 3-5 relevant hashtags
 *
 * Showcase:
 * - Project overview
 * - Problem statement
 * - Solution approach
 * - Results/impact
 * - Key learnings
 */
function buildSkeletonPrompt(
  artifactType: 'blog' | 'social_post' | 'showcase',
  tone: ToneOption,
  topic: string,
  researchContext: string
): string {
  const toneModifier = toneModifiers[tone];

  const basePrompt = `You are creating a content skeleton (NOT final content) for a ${artifactType}.

Research context (use these insights to inform structure):
${researchContext}

Topic: ${topic}

Tone: ${toneModifier}

`;

  if (artifactType === 'blog') {
    return basePrompt + `Generate a blog skeleton with:

1. Title: Compelling and specific
2. Hook: [Write engaging hook here] - 2-3 sentences to grab attention
3. Section 1 (H2): [Main point 1]
   - [Expand on this point - reference research sources]
4. Section 2 (H2): [Main point 2]
   - [Expand on this point - reference research sources]
5. Section 3 (H2): [Main point 3]
   - [Expand on this point - reference research sources]
6. (Optional) Section 4 (H2): [Main point 4]
   - [Expand on this point if needed]
7. Conclusion: [Summarize key takeaways]
8. Call to Action: [Suggest next steps for reader]

Use placeholders like [Write hook here] and [Expand on this point]. Reference research sources like "According to [Source]...". Keep total length under 2000 characters.`;
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

6. Hashtags: #hashtag1 #hashtag2 #hashtag3 (3-5 relevant tags)

Use placeholders and keep concise (suitable for LinkedIn/Twitter). Total length under 1500 characters.`;
  }

  if (artifactType === 'showcase') {
    return basePrompt + `Generate a project showcase skeleton with:

1. Title: [Project name and brief descriptor]

2. Overview: [Write compelling project overview here]
   - What it is
   - Who it's for

3. Problem: [Describe the problem or challenge]
   - Why it matters
   - Current pain points

4. Solution: [Explain your approach]
   - Key features or methods
   - Technical highlights

5. Results: [Share outcomes and impact]
   - Measurable results
   - User feedback or testimonials

6. Learnings: [Key takeaways from the project]
   - What went well
   - What you'd do differently

Use placeholders and reference research. Keep under 2000 characters.`;
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
 * 5. Validate skeleton length (< 2000 chars for blogs/showcases, < 1500 for social)
 * 6. Update artifact.content in database
 *
 * Returns:
 * - success: true/false
 * - skeleton: generated content (if successful)
 * - error: error message (if failed)
 */
export const generateContentSkeleton = tool({
  description: `Generate an AI-powered content skeleton based on artifact type, tone, and research context. Uses Claude to create unique structures (NOT templates) with placeholders like [Write hook here]. Updates artifact.content with skeleton.`,

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
  }),

  execute: async ({ artifactId, topic, artifactType, tone }) => {
    try {
      logger.info('GenerateContentSkeleton', 'Starting skeleton generation', {
        artifactId,
        artifactType,
        tone,
        topicLength: topic.length
      });

      // 1. Fetch research results from database
      const { data: researchResults, error: researchError } = await supabaseAdmin
        .from('artifact_research')
        .select('*')
        .eq('artifact_id', artifactId)
        .order('relevance_score', { ascending: false })
        .limit(10); // Top 10 most relevant sources

      if (researchError) {
        logger.error('GenerateContentSkeleton', researchError, {
          artifactId,
          stage: 'fetch_research'
        });

        return {
          success: false,
          error: `Failed to fetch research: ${researchError.message}`,
        };
      }

      // 2. Build research context summary
      const researchContext = researchResults && researchResults.length > 0
        ? researchResults
            .map((r, i) => `[${i + 1}] ${r.source_name} (${r.source_type}): ${r.excerpt}`)
            .join('\n\n')
        : 'No research context available. Generate skeleton based on topic alone.';

      logger.debug('GenerateContentSkeleton', 'Research context prepared', {
        sourceCount: researchResults?.length || 0,
        contextLength: researchContext.length
      });

      // 3. Build skeleton prompt
      const prompt = buildSkeletonPrompt(artifactType, tone, topic, researchContext);

      logger.debug('GenerateContentSkeleton', 'Prompt built', {
        promptLength: prompt.length
      });

      // 4. Call Claude API
      const { text: skeleton } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.7, // Balanced creativity and consistency
        maxTokens: 2000, // Enough for detailed skeleton
      });

      logger.debug('GenerateContentSkeleton', 'Skeleton generated', {
        skeletonLength: skeleton.length
      });

      // 5. Validate skeleton length
      const maxLength = artifactType === 'social_post' ? 1500 : 2000;
      if (skeleton.length > maxLength) {
        logger.warn('GenerateContentSkeleton', 'Skeleton exceeds max length', {
          length: skeleton.length,
          maxLength
        });
        // Truncate with warning
        const truncated = skeleton.substring(0, maxLength - 100) + '\n\n[Skeleton truncated - exceeded max length]';
        return {
          success: true,
          skeleton: truncated,
          warning: 'Skeleton was truncated to fit length constraints'
        };
      }

      // 6. Update artifact content in database
      const { error: updateError } = await supabaseAdmin
        .from('artifacts')
        .update({
          content: skeleton,
          status: 'skeleton_ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', artifactId);

      if (updateError) {
        logger.error('GenerateContentSkeleton', updateError, {
          artifactId,
          stage: 'update_artifact'
        });

        return {
          success: false,
          error: `Failed to update artifact: ${updateError.message}`,
        };
      }

      logger.info('GenerateContentSkeleton', 'Skeleton generation completed', {
        artifactId,
        skeletonLength: skeleton.length,
        status: 'skeleton_ready'
      });

      return {
        success: true,
        skeleton,
      };

    } catch (error) {
      logger.error('GenerateContentSkeleton', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        topic: topic.substring(0, 50)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
