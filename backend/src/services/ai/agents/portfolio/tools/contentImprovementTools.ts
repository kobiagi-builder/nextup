import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { logger, logToFile } from '../../../../../lib/logger.js';
import { editImageWithOpenAI, downloadImage, generateWithRetry, type ImageGenParams } from '../../../../../lib/imageGeneration.js';
import { uploadFinalImage } from '../../../../../lib/storageHelpers.js';
import { ErrorCategory } from '../../../types/contentAgent.js';
import type { ToolOutput } from '../../../types/contentAgent.js';

/**
 * Content Improvement Tools
 *
 * Tools for surgically improving selected text or images in the editor.
 * Called by the Content Agent when selectionContext is present in the request.
 */

// =============================================================================
// Tone Options (shared with other tools)
// =============================================================================

const toneOptions = [
  'formal', 'casual', 'professional', 'conversational',
  'technical', 'friendly', 'authoritative', 'humorous',
] as const;

// =============================================================================
// improveTextContent Tool
// =============================================================================

interface ImprovedTextResult {
  improvedText: string;
  originalLength: number;
  improvedLength: number;
}

export const improveTextContent = tool({
  description:
    'Improve a specific text selection from the editor based on user feedback. ' +
    'Returns ONLY the replacement text — the frontend handles insertion. ' +
    'Use when selectionContext.type === "text" is present.',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('The artifact ID containing the text'),
    selectedText: z.string().min(10).max(5000).describe('The exact selected text to improve'),
    surroundingContext: z.object({
      before: z.string().describe('Text content before the selection (up to 2 paragraphs)'),
      after: z.string().describe('Text content after the selection (up to 2 paragraphs)'),
      sectionHeading: z.string().optional().describe('Nearest section heading above the selection'),
    }).describe('Surrounding context to maintain flow'),
    userInstruction: z.string().min(3).max(1000).describe('What the user wants changed'),
    tone: z.enum(toneOptions).describe('Desired tone for the improved text'),
  }),
  execute: async ({
    artifactId,
    selectedText,
    surroundingContext,
    userInstruction,
    tone,
  }): Promise<ToolOutput<ImprovedTextResult>> => {
    const startTime = Date.now();
    const traceId = `improve-text-${Date.now()}`;

    logToFile(`[improveTextContent] Starting text improvement`, {
      traceId,
      hasArtifactId: !!artifactId,
      selectedTextLength: selectedText.length,
      hasUserInstruction: !!userInstruction,
      userInstructionLength: userInstruction.length,
      tone,
    });

    try {
      // Build the prompt with surrounding context
      const prompt = buildTextImprovementPrompt({
        selectedText,
        surroundingContext,
        userInstruction,
        tone,
      });

      // Use Claude Sonnet for precision in surgical edits
      const { text: improvedText } = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.6,
        maxOutputTokens: Math.max(500, Math.ceil(selectedText.length * 2)),
      });

      const cleanedText = improvedText.trim();

      // Warn if output is significantly longer than input
      if (cleanedText.length > selectedText.length * 2) {
        logger.warn('[improveTextContent] Output significantly longer than input', {
          originalLength: selectedText.length,
          improvedLength: cleanedText.length,
          ratio: (cleanedText.length / selectedText.length).toFixed(2),
        });
      }

      const duration = Date.now() - startTime;
      logToFile(`[improveTextContent] Complete`, {
        traceId,
        duration,
        originalLength: selectedText.length,
        improvedLength: cleanedText.length,
      });

      return {
        success: true,
        traceId,
        duration,
        data: {
          improvedText: cleanedText,
          originalLength: selectedText.length,
          improvedLength: cleanedText.length,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      logger.error('[improveTextContent] Failed', {
        traceId,
        duration,
        error: message,
      });

      return {
        success: false,
        traceId,
        duration,
        data: {
          improvedText: '',
          originalLength: selectedText.length,
          improvedLength: 0,
        },
        error: {
          category: ErrorCategory.TOOL_EXECUTION_FAILED,
          message,
          recoverable: true,
        },
      };
    }
  },
});

function buildTextImprovementPrompt(params: {
  selectedText: string;
  surroundingContext: {
    before: string;
    after: string;
    sectionHeading?: string;
  };
  userInstruction: string;
  tone: string;
}): string {
  const { selectedText, surroundingContext, userInstruction, tone } = params;

  return `You are a surgical text editor. Improve ONLY the selected text based on the user's instruction.

## Context (DO NOT include in your output - this is for flow reference only)
${surroundingContext.sectionHeading ? `Section: ${surroundingContext.sectionHeading}\n` : ''}${surroundingContext.before ? `Before: "${surroundingContext.before}"\n` : ''}${surroundingContext.after ? `After: "${surroundingContext.after}"` : ''}

## Text to Improve
"${selectedText}"

## Instruction
${userInstruction}

## Rules
- Output ONLY the replacement text — no quotes, no preamble, no explanation
- No meta-commentary like "Here's the improved version:" or "I've made the following changes:"
- Maintain seamless flow with the before/after context
- Use a ${tone} tone throughout
- Stay within 130% of the original length unless expansion was explicitly requested
- Preserve any formatting (bold, italic, links) present in the original
- Do not introduce new paragraphs unless the original had them`;
}

// =============================================================================
// improveImageContent Tool
// =============================================================================

interface ImprovedImageResult {
  newImageUrl: string;
  refinedDescription: string;
}

export const improveImageContent = tool({
  description:
    'Regenerate an image in the editor based on user feedback. ' +
    'Creates a new image with a refined prompt incorporating the user\'s changes. ' +
    'Use when selectionContext.type === "image" is present. ' +
    'Note: Images are always fully regenerated (no in-place editing).',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('The artifact ID containing the image'),
    currentImageUrl: z.string().url().describe('URL of the current image to replace'),
    currentDescription: z.string().describe('Current image description/prompt used to generate the image'),
    userFeedback: z.string().min(3).max(500).describe('What the user wants changed about the image'),
    imageStyle: z.enum(['professional', 'modern', 'abstract', 'realistic', 'editorial', 'cinematic'])
      .describe('Visual style for the image'),
    tone: z.enum(toneOptions).describe('Content tone to guide visual mood'),
  }),
  execute: async ({
    artifactId,
    currentImageUrl,
    currentDescription,
    userFeedback,
    imageStyle,
    tone,
  }): Promise<ToolOutput<ImprovedImageResult>> => {
    const startTime = Date.now();
    const traceId = `improve-image-${Date.now()}`;

    logToFile(`[improveImageContent] Starting image improvement`, {
      traceId,
      hasArtifactId: !!artifactId,
      currentDescriptionLength: currentDescription.length,
      hasUserFeedback: !!userFeedback,
      userFeedbackLength: userFeedback.length,
      imageStyle,
    });

    try {
      // Step 1: Download the current image for image-to-image editing
      let sourceImage: Buffer | null = null;
      try {
        sourceImage = await downloadImage(currentImageUrl);
        logToFile(`[improveImageContent] Downloaded source image`, {
          traceId,
          sourceSize: sourceImage.length,
        });
      } catch (dlError) {
        const message = dlError instanceof Error ? dlError.message : String(dlError);
        logToFile(`[improveImageContent] Source download failed, will fall back to text-to-image`, {
          traceId,
          error: message,
        });
      }

      let imageBuffer: Buffer;
      let refinedDescription = userFeedback;

      if (sourceImage) {
        // Step 2a: Image-to-image editing (preserves composition)
        try {
          imageBuffer = await editImageWithOpenAI(sourceImage, userFeedback, {
            size: 'auto',
            quality: 'high',
          });
          logToFile(`[improveImageContent] Image edited via image-to-image`, {
            traceId,
            editedSize: imageBuffer.length,
          });
        } catch (editError) {
          const message = editError instanceof Error ? editError.message : String(editError);
          logToFile(`[improveImageContent] Image edit failed, falling back to text-to-image`, {
            traceId,
            error: message,
          });

          // Fallback: text-to-image with Haiku-refined prompt
          imageBuffer = await fallbackTextToImage({
            currentDescription,
            userFeedback,
            imageStyle,
            tone,
            traceId,
          });
          refinedDescription = `${currentDescription} (modified: ${userFeedback})`;
        }
      } else {
        // Step 2b: No source image available — text-to-image only
        imageBuffer = await fallbackTextToImage({
          currentDescription,
          userFeedback,
          imageStyle,
          tone,
          traceId,
        });
        refinedDescription = `${currentDescription} (modified: ${userFeedback})`;
      }

      // Step 3: Upload to Supabase Storage
      let newImageUrl: string;
      try {
        const imageId = `improved-${Date.now()}`;
        const result = await uploadFinalImage(artifactId, imageId, imageBuffer);
        newImageUrl = result.url;
      } catch (uploadError) {
        const duration = Date.now() - startTime;
        const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
        logger.error('[improveImageContent] Upload failed after successful generation', { traceId, duration, error: message });
        return {
          success: false,
          traceId,
          duration,
          data: { newImageUrl: '', refinedDescription },
          error: { category: ErrorCategory.STORAGE_ERROR, message: 'Image was generated but upload failed. Please try again.', recoverable: true },
        };
      }

      const duration = Date.now() - startTime;
      logToFile(`[improveImageContent] Complete`, {
        traceId,
        duration,
        hasNewUrl: !!newImageUrl,
      });

      return {
        success: true,
        traceId,
        duration,
        data: {
          newImageUrl,
          refinedDescription,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      logger.error('[improveImageContent] Failed', {
        traceId,
        duration,
        error: message,
      });

      return {
        success: false,
        traceId,
        duration,
        data: {
          newImageUrl: '',
          refinedDescription: '',
        },
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
// Fallback: Text-to-Image (when image editing is unavailable)
// =============================================================================

async function fallbackTextToImage(params: {
  currentDescription: string;
  userFeedback: string;
  imageStyle: 'professional' | 'modern' | 'abstract' | 'realistic' | 'editorial' | 'cinematic';
  tone: string;
  traceId: string;
}): Promise<Buffer> {
  const { currentDescription, userFeedback, imageStyle, tone, traceId } = params;

  // Use Haiku to refine the description
  const { text: refinedDescription } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    prompt: `You are an image prompt engineer. Refine the image description based on user feedback.

Current image description:
"${currentDescription}"

User feedback:
"${userFeedback}"

Style: ${imageStyle}
Tone: ${tone}

Rules:
- Output ONLY the refined image generation prompt — no explanations
- Incorporate the user's feedback into the existing description
- Keep the refined description under 1000 characters (DALL-E limit)
- Maintain the ${imageStyle} style
- Ensure the visual mood matches a ${tone} tone
- Be specific about visual elements (colors, lighting, composition, framing)`,
    temperature: 0.7,
    maxOutputTokens: 300,
  });

  logToFile(`[improveImageContent:fallback] Refined description`, {
    traceId,
    refinedLength: refinedDescription.length,
  });

  const imageParams: ImageGenParams = {
    prompt: refinedDescription.trim(),
    style: imageStyle,
    resolution: { width: 1792, height: 1024 },
    quality: 'hd',
  };

  return generateWithRetry(imageParams, 3);
}
