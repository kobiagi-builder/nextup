/**
 * Final Image Generation Tool
 *
 * Generates high-quality final images using Nano Banana (Google Gemini).
 * Only generates images for approved descriptions (no placeholders).
 *
 * Phase 3 - Simplified MVP workflow:
 * 1. User approves text descriptions
 * 2. Generate finals directly with Nano Banana
 * 3. Upload to Supabase Storage
 * 4. Embed in content
 */

import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import type { VisualsMetadata } from '../../../types/portfolio.js';
import {
  generateWithRetry,
  getResolutionForType,
  type ImageGenParams,
} from '../../../lib/imageGeneration.js';
import {
  uploadFinalImage,
  uploadRejectedImage,
} from '../../../lib/storageHelpers.js';
import type { ImageNeed } from './imageNeedsTools.js';

interface FinalImage {
  id: string;
  image_need_id: string;
  url: string;
  storage_path: string;
  resolution: { width: number; height: number };
  file_size_kb: number;
  generated_at: string;
  generation_attempts: number;
}

/**
 * Generate final images tool
 *
 * Generates high-quality images for all approved image needs.
 */
export const generateFinalImages = tool({
  description: 'Generate high-quality final images using Nano Banana for approved image needs',
  parameters: z.object({
    artifactId: z.string().uuid(),
  }),
  execute: async ({ artifactId }) => {
    try {
      // Fetch artifact metadata
      const { data: artifact, error: fetchError } = await supabase
        .from('artifacts')
        .select('visuals_metadata, type, content, user_id')
        .eq('id', artifactId)
        .single();

      if (fetchError || !artifact) {
        throw new Error('Artifact not found');
      }

      const metadata = artifact.visuals_metadata as VisualsMetadata;
      const approvedNeeds = metadata.needs.filter((need: ImageNeed) => need.approved);

      if (approvedNeeds.length === 0) {
        return {
          success: false,
          error: 'No approved image needs found',
          finals_generated: 0,
        };
      }

      // Update phase to generating_images
      await supabase
        .from('artifacts')
        .update({
          visuals_metadata: {
            ...metadata,
            phase: {
              phase: 'generating_images',
              completed: 0,
              total: approvedNeeds.length,
            },
          },
        })
        .eq('id', artifactId);

      const finals: FinalImage[] = [];
      let failures = 0;

      // Generate images sequentially (to avoid rate limits)
      for (let i = 0; i < approvedNeeds.length; i++) {
        const need = approvedNeeds[i] as ImageNeed;

        try {
          // Determine resolution based on artifact type
          const resolution = getResolutionForType(artifact.type, need.purpose);

          // Generate final image with Nano Banana
          const imageParams: ImageGenParams = {
            prompt: need.description,
            style: need.style,
            resolution,
            quality: 'standard', // MVP uses standard quality
            purpose: need.purpose,
            artifactContext: `For a ${artifact.type} artifact`, // Brief context
          };

          const buffer = await generateWithRetry(imageParams, 3);

          // Upload to storage
          const { url, path } = await uploadFinalImage(artifactId, need.id, buffer);

          finals.push({
            id: need.id,
            image_need_id: need.id,
            url,
            storage_path: path,
            resolution,
            file_size_kb: Math.round(buffer.length / 1024),
            generated_at: new Date().toISOString(),
            generation_attempts: 1,
          });

          // Replace in content
          await replaceImageInContent(artifactId, need.id, url, need.description);

          // Update progress
          await supabase
            .from('artifacts')
            .update({
              visuals_metadata: {
                ...metadata,
                phase: {
                  phase: 'generating_images',
                  completed: i + 1,
                  total: approvedNeeds.length,
                },
                finals,
              },
            })
            .eq('id', artifactId);

        } catch (error: any) {
          logger.error('Failed to generate image', {
            needId: need.id,
            artifactId,
            error: error.message,
          });
          failures++;

          // Track failed need in metadata (don't upload corrupt files)
          // Failed needs will be visible in visuals_metadata.generation_stats
        }
      }

      // Update final metadata
      const { error: finalUpdateError } = await supabase
        .from('artifacts')
        .update({
          visuals_metadata: {
            ...metadata,
            phase: { phase: 'complete', finals },
            finals,
            generation_stats: {
              ...metadata.generation_stats,
              finals_generated: finals.length,
              failures,
            },
          },
          status: 'ready', // Move to ready status after completion
        })
        .eq('id', artifactId);

      if (finalUpdateError) {
        throw new Error(`Failed to update final metadata: ${finalUpdateError.message}`);
      }

      return {
        success: true,
        finals_generated: finals.length,
        failures,
        message: `Generated ${finals.length} of ${approvedNeeds.length} images successfully`,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Final image generation failed',
        finals_generated: 0,
      };
    }
  },
});

/**
 * Regenerate specific image
 *
 * Allows user to regenerate a specific image with updated description.
 */
export const regenerateImage = tool({
  description: 'Regenerate a specific image with updated description',
  parameters: z.object({
    artifactId: z.string().uuid(),
    imageId: z.string().uuid(),
    newDescription: z.string().optional(),
  }),
  execute: async ({ artifactId, imageId, newDescription }) => {
    try {
      // Fetch artifact metadata
      const { data: artifact, error: fetchError } = await supabase
        .from('artifacts')
        .select('visuals_metadata, type, content')
        .eq('id', artifactId)
        .single();

      if (fetchError || !artifact) {
        throw new Error('Artifact not found');
      }

      const metadata = artifact.visuals_metadata as VisualsMetadata;
      const need = metadata.needs.find((n: ImageNeed) => n.id === imageId);
      const existingImage = metadata.finals.find((f: FinalImage) => f.id === imageId);

      if (!need || !existingImage) {
        throw new Error('Image not found');
      }

      // Check regeneration limit (max 3 attempts)
      if (existingImage.generation_attempts >= 3) {
        return {
          success: false,
          error: 'Maximum regeneration attempts reached (3)',
        };
      }

      // Use new description if provided
      const description = newDescription || need.description;

      // Determine resolution
      const resolution = getResolutionForType(artifact.type, need.purpose);

      // Generate new image
      const imageParams: ImageGenParams = {
        prompt: description,
        style: need.style,
        resolution,
        quality: 'standard',
        purpose: need.purpose,
        artifactContext: `For a ${artifact.type} artifact`,
      };

      const buffer = await generateWithRetry(imageParams, 3);

      // Upload new image (overwrites old one)
      const { url, path } = await uploadFinalImage(artifactId, imageId, buffer);

      // Update finals metadata
      const updatedFinals = metadata.finals.map((f: FinalImage) =>
        f.id === imageId
          ? {
              ...f,
              url,
              storage_path: path,
              file_size_kb: Math.round(buffer.length / 1024),
              generated_at: new Date().toISOString(),
              generation_attempts: f.generation_attempts + 1,
            }
          : f
      );

      // Update need description if changed
      if (newDescription) {
        const updatedNeeds = metadata.needs.map((n: ImageNeed) =>
          n.id === imageId ? { ...n, description: newDescription } : n
        );

        await supabase
          .from('artifacts')
          .update({
            visuals_metadata: {
              ...metadata,
              needs: updatedNeeds,
              finals: updatedFinals,
            },
          })
          .eq('id', artifactId);
      } else {
        await supabase
          .from('artifacts')
          .update({
            visuals_metadata: {
              ...metadata,
              finals: updatedFinals,
            },
          })
          .eq('id', artifactId);
      }

      // Replace in content
      await replaceImageInContent(artifactId, imageId, url, description);

      return {
        success: true,
        url,
        attempts: existingImage.generation_attempts + 1,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Image regeneration failed',
      };
    }
  },
});

/**
 * Replace image markdown or placeholder in content
 *
 * Handles multiple formats:
 * 1. [IMAGE: description] - text placeholder from content writing
 * 2. ![description](url) - existing markdown image
 * 3. Inserts hero image after title if placement_after is 'title'
 */
async function replaceImageInContent(
  artifactId: string,
  imageId: string,
  url: string,
  description: string
): Promise<void> {
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('content, visuals_metadata')
    .eq('id', artifactId)
    .single();

  if (!artifact) return;

  let updatedContent = artifact.content;
  const imageMarkdown = `![${description}](${url})`;

  // Get the image need to check placement_after
  const metadata = artifact.visuals_metadata as VisualsMetadata | null;
  const imageNeed = metadata?.needs?.find((n: ImageNeed) => n.id === imageId);
  const placementAfter = imageNeed?.placement_after || '';

  // Pattern 1: Replace [IMAGE: ...] placeholder anywhere in content
  const textPlaceholderPattern = /\[IMAGE:\s*[^\]]+\]/i;
  if (textPlaceholderPattern.test(updatedContent)) {
    updatedContent = updatedContent.replace(textPlaceholderPattern, imageMarkdown);
    logger.debug('ReplaceImageInContent', 'Replaced [IMAGE: ...] placeholder', {
      artifactId,
      imageId,
    });
  }
  // Pattern 2: Replace existing markdown image with comment
  else {
    const markdownPattern = new RegExp(
      `!\\[[^\\]]*\\]\\([^\\)]+\\)\\s*(?:<!-- IMAGE: ${imageId} -->)?`,
      'g'
    );
    if (markdownPattern.test(updatedContent)) {
      updatedContent = updatedContent.replace(markdownPattern, imageMarkdown);
      logger.debug('ReplaceImageInContent', 'Replaced markdown image', {
        artifactId,
        imageId,
      });
    }
    // Pattern 3: Insert hero image after title if placement_after is 'title'
    else if (placementAfter === 'title') {
      // Find the first heading (# Title or ## Title)
      const titlePattern = /^(#+ .+)$/m;
      const match = updatedContent.match(titlePattern);
      if (match) {
        updatedContent = updatedContent.replace(
          titlePattern,
          `$1\n\n${imageMarkdown}`
        );
        logger.debug('ReplaceImageInContent', 'Inserted hero image after title', {
          artifactId,
          imageId,
        });
      } else {
        // Fallback: prepend image to content
        updatedContent = `${imageMarkdown}\n\n${updatedContent}`;
        logger.debug('ReplaceImageInContent', 'Prepended hero image to content', {
          artifactId,
          imageId,
        });
      }
    }
  }

  await supabase
    .from('artifacts')
    .update({ content: updatedContent })
    .eq('id', artifactId);
}
