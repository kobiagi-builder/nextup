import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger, logToFile } from '../../../lib/logger.js';
import { type ToolOutput, ErrorCategory } from '../types/contentAgent.js';
import { buildHumanityCheckPrompt } from './humanityCheckTools.js';

/**
 * Social Post Tools
 *
 * Generates viral social media posts that promote existing blog/showcase artifacts.
 * Called when users trigger "Create Social Post" from an eligible artifact.
 */

// =============================================================================
// Types
// =============================================================================

const toneOptions = [
  'formal', 'casual', 'professional', 'conversational',
  'technical', 'friendly', 'authoritative', 'humorous',
] as const;

interface SocialPostResult {
  content: string;
  hashtags: string[];
  characterCount: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract the first image URL from HTML content (hero image from source artifact)
 */
function extractHeroImageUrl(htmlContent: string): string | null {
  // Match <img> tags and extract src attribute
  const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  // Match markdown images ![alt](url)
  const mdMatch = htmlContent.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (mdMatch) return mdMatch[1];

  return null;
}

/**
 * Strip HTML tags to get plain text content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<img[^>]*>/gi, '') // Remove images
    .replace(/<[^>]*>/g, ' ')    // Remove all other tags
    .replace(/\s+/g, ' ')        // Collapse whitespace
    .trim();
}

/**
 * Post-process humanized text to catch remaining AI patterns
 */
function postProcessHumanization(text: string): string {
  // Replace em dashes with regular dashes
  let result = text.replace(/—/g, ' - ');
  // Clean up double spaces that might result
  result = result.replace(/  +/g, ' ');
  return result;
}

// =============================================================================
// writeSocialPostContent Tool
// =============================================================================

export const writeSocialPostContent = tool({
  description:
    'Generate a viral social media post that promotes a source article (blog or showcase). ' +
    'The post should drive visits to the article. Includes a [LINK_PLACEHOLDER] for the article URL. ' +
    'Use when the user message contains "Create social post promoting this article:".',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('The NEW social post artifact ID to write content to'),
    sourceArtifactId: z.string().uuid().describe('The source article artifact ID to fetch content from'),
    sourceTitle: z.string().describe('Title of the source article'),
    sourceType: z.enum(['blog', 'showcase']).describe('Type of the source artifact'),
    sourceTags: z.array(z.string()).describe('Tags from the source article'),
    tone: z.enum(toneOptions).describe('Desired tone for the social post'),
  }),
  execute: async ({
    artifactId,
    sourceArtifactId,
    sourceTitle,
    sourceType,
    sourceTags,
    tone,
  }): Promise<ToolOutput<SocialPostResult>> => {
    const startTime = Date.now();
    const traceId = `social-post-${Date.now()}`;

    logToFile(`[writeSocialPostContent] Starting social post generation`, {
      traceId,
      hasArtifactId: !!artifactId,
      hasSourceArtifactId: !!sourceArtifactId,
      sourceType,
      sourceTitleLength: sourceTitle.length,
      tagCount: sourceTags.length,
      tone,
    });

    try {
      // --- Fetch source content from database ---
      const { data: sourceArtifact, error: fetchError } = await supabaseAdmin
        .from('artifacts')
        .select('content')
        .eq('id', sourceArtifactId)
        .single();

      if (fetchError || !sourceArtifact?.content) {
        logger.error('[writeSocialPostContent] Failed to fetch source artifact content', {
          traceId,
          error: fetchError?.message || 'No content found',
        });
        return {
          success: false,
          traceId,
          duration: Date.now() - startTime,
          data: { content: '', hashtags: [], characterCount: 0 },
          error: {
            category: ErrorCategory.TOOL_EXECUTION_FAILED,
            message: `Failed to fetch source article content: ${fetchError?.message || 'No content'}`,
            recoverable: false,
          },
        };
      }

      const rawSourceContent = sourceArtifact.content;
      const heroImageUrl = extractHeroImageUrl(rawSourceContent);
      const sourceContent = stripHtml(rawSourceContent).slice(0, 15000);

      logToFile(`[writeSocialPostContent] Source content fetched`, {
        traceId,
        sourceContentLength: sourceContent.length,
        hasHeroImage: !!heroImageUrl,
      });

      // --- Generate social post text ---
      const prompt = buildSocialPostPrompt({
        sourceContent,
        sourceTitle,
        sourceType,
        sourceTags,
        tone,
      });

      const { text: generatedPost } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.8,
        maxOutputTokens: 2000,
      });

      const cleanedPost = generatedPost.trim();
      const hashtags = sourceTags.map(tag => `#${tag.replace(/\s+/g, '')}`);

      // --- Humanization: remove AI writing patterns ---
      let finalPost = cleanedPost;
      try {
        const humanizePrompt = buildHumanityCheckPrompt(cleanedPost, tone);
        const { text: humanizedPost } = await generateText({
          model: anthropic('claude-sonnet-4-20250514'),
          prompt: humanizePrompt,
          temperature: 0.5,
          maxOutputTokens: Math.ceil(cleanedPost.length * 1.5),
        });
        finalPost = humanizedPost.trim();
        logToFile(`[writeSocialPostContent] Humanization complete`, {
          traceId,
          originalLength: cleanedPost.length,
          humanizedLength: finalPost.length,
        });
      } catch (humanizeError) {
        logger.warn('[writeSocialPostContent] Humanization failed, using original', {
          traceId,
          error: humanizeError instanceof Error ? humanizeError.message : String(humanizeError),
        });
      }

      // Post-process: catch remaining AI patterns (em dashes etc.)
      finalPost = postProcessHumanization(finalPost);

      // --- Attach hero image from source article ---
      if (heroImageUrl) {
        finalPost = `${finalPost}\n\n![${sourceTitle}](${heroImageUrl})`;
        logToFile(`[writeSocialPostContent] Attached hero image from source article`, { traceId });
      }

      // Fetch existing metadata to merge (preserves source_artifact_id etc.)
      const { data: existing } = await supabaseAdmin
        .from('artifacts')
        .select('metadata')
        .eq('id', artifactId)
        .single();

      const currentMetadata = (existing?.metadata as Record<string, unknown>) || {};

      // Save final content and mark as ready
      const { error: updateError } = await supabaseAdmin
        .from('artifacts')
        .update({
          content: finalPost,
          status: 'ready',
          metadata: { ...currentMetadata, hashtags },
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifactId);

      if (updateError) {
        logger.error('[writeSocialPostContent] Failed to save content to artifact', {
          traceId,
          error: updateError.message,
        });
        return {
          success: false,
          traceId,
          duration: Date.now() - startTime,
          data: { content: finalPost, hashtags, characterCount: finalPost.length },
          error: {
            category: ErrorCategory.TOOL_EXECUTION_FAILED,
            message: `Content generated but failed to save: ${updateError.message}`,
            recoverable: true,
          },
        };
      }

      const duration = Date.now() - startTime;
      logToFile(`[writeSocialPostContent] Complete`, {
        traceId,
        duration,
        characterCount: finalPost.length,
        hashtagCount: hashtags.length,
        hasImage: !!heroImageUrl,
      });

      return {
        success: true,
        traceId,
        duration,
        data: {
          content: finalPost,
          hashtags,
          characterCount: finalPost.length,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      logger.error('[writeSocialPostContent] Failed', {
        traceId,
        duration,
        error: message,
      });

      return {
        success: false,
        traceId,
        duration,
        data: { content: '', hashtags: [], characterCount: 0 },
        error: {
          category: ErrorCategory.TOOL_EXECUTION_FAILED,
          message,
          recoverable: true,
        },
      };
    }
  },
});

// =============================================================================
// Prompt Builder
// =============================================================================

function buildSocialPostPrompt(params: {
  sourceContent: string;
  sourceTitle: string;
  sourceType: 'blog' | 'showcase';
  sourceTags: string[];
  tone: string;
}): string {
  const { sourceContent, sourceTitle, sourceType, sourceTags, tone } = params;

  const typeLabel = sourceType === 'blog' ? 'blog article' : 'case study';
  const hashtags = sourceTags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');

  return `You are an expert social media copywriter who creates viral, high-engagement posts.

## Your Task
Create a compelling social media post that promotes the following ${typeLabel} and drives maximum visits.

## Source Article
**Title:** ${sourceTitle}
**Type:** ${typeLabel}
**Tags:** ${sourceTags.join(', ')}

**Full Content:**
${sourceContent}

## Requirements

1. **Hook (first line):** Start with a bold, attention-grabbing statement or question that stops the scroll. Use the article's most provocative insight, surprising data point, or contrarian take.

2. **Value proposition (2-4 lines):** Distill the article's key takeaways into concise, punchy points. Make the reader feel they MUST read the full article.

3. **CTA with link placeholder:** Include a clear call-to-action with [LINK_PLACEHOLDER] where the article link goes. Examples: "Read the full breakdown here: [LINK_PLACEHOLDER]" or "Full article: [LINK_PLACEHOLDER]"

4. **Hashtags:** End with relevant hashtags: ${hashtags}

## Style Guidelines
- Tone: ${tone}
- Platform-agnostic (works for LinkedIn, Twitter/X, etc.)
- Use line breaks for readability
- No emojis unless they genuinely add value
- Keep under 1500 characters for cross-platform compatibility
- Do NOT use generic filler phrases like "In today's fast-paced world" or "Let me tell you"
- Be specific - reference actual insights, examples, or data from the article
- NEVER use em dashes. Use commas, periods, or " - " instead.

## Output
Return ONLY the social post text - no preamble, no explanation, no meta-commentary.`;
}
