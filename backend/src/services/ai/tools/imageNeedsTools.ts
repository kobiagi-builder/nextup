/**
 * Image Needs Identification Tool
 *
 * Analyzes artifact content to identify where images should be placed.
 * Generates images using Gemini Nano Banana and uploads to Supabase storage.
 *
 * Phase 3 - Auto-generation workflow:
 * 1. Tool generates image needs based on artifact type
 * 2. Images are generated using Gemini Nano Banana
 * 3. Images are uploaded to Supabase storage
 * 4. Status transitions directly to 'ready'
 */

import { tool } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getSupabase } from '../../../lib/requestContext.js';
import { logToFile } from '../../../lib/logger.js';
import { generateWithRetry, getResolutionForType, type ImageGenParams, type VisualIdentity } from '../../../lib/imageGeneration.js';
import { uploadFinalImage } from '../../../lib/storageHelpers.js';
import type { VisualsMetadata } from '../../../types/portfolio.js';

// Image need schema
const imageNeedSchema = z.object({
  id: z.string(),
  placement_after: z.string(),
  description: z.string(),
  purpose: z.enum(['illustration', 'photo', 'hero']),
  style: z.enum(['professional', 'modern', 'abstract', 'realistic', 'editorial', 'cinematic']),
  approved: z.boolean().default(false),
});

export type ImageNeed = z.infer<typeof imageNeedSchema>;

/**
 * Extract key themes and concepts from content for better image prompts
 */
function extractContentThemes(content: string, title: string): string[] {
  const themes: string[] = [];

  // Extract from title (clean of markdown)
  const cleanTitle = title.replace(/[#*_]/g, '').trim();
  if (cleanTitle.length > 3) {
    themes.push(cleanTitle);
  }

  // Extract headings as topic indicators
  const headingMatches = content.matchAll(/^##?\s+(.+)$/gm);
  for (const match of headingMatches) {
    const heading = match[1].replace(/[#*_]/g, '').trim();
    if (heading.length > 3 && heading.length < 100) {
      themes.push(heading);
    }
  }

  // Extract key phrases (look for bold text which indicates emphasis)
  const boldMatches = content.matchAll(/\*\*([^*]+)\*\*/g);
  for (const match of boldMatches) {
    const phrase = match[1].trim();
    if (phrase.length > 3 && phrase.length < 50) {
      themes.push(phrase);
    }
  }

  // Return unique themes, limited to top 5
  return [...new Set(themes)].slice(0, 5);
}

/**
 * Determine mood based on tone (primary) and content analysis (secondary)
 */
function analyzeMood(content: string, artifactType: string, tone?: string): string {
  // Tone takes priority when available (set by the user)
  if (tone) {
    const toneToMood: Record<string, string> = {
      casual: 'warm, approachable, and slightly irreverent',
      formal: 'refined, authoritative, and polished',
      professional: 'confident and polished',
      conversational: 'friendly, relatable, and inviting',
      provocative: 'bold, confrontational, and thought-provoking',
    };
    if (toneToMood[tone]) return toneToMood[tone];
  }

  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('success') || lowerContent.includes('achieve') || lowerContent.includes('growth')) {
    return 'inspiring and optimistic';
  }
  if (lowerContent.includes('problem') || lowerContent.includes('challenge') || lowerContent.includes('solve')) {
    return 'thoughtful and solution-oriented';
  }
  if (lowerContent.includes('innovative') || lowerContent.includes('future') || lowerContent.includes('transform')) {
    return 'dynamic and forward-thinking';
  }
  if (lowerContent.includes('trust') || lowerContent.includes('reliable') || lowerContent.includes('secure')) {
    return 'trustworthy and professional';
  }

  const defaultMoods: Record<string, string> = {
    blog: 'engaging and informative',
    social_post: 'attention-grabbing and energetic',
    showcase: 'confident and professional',
  };

  return defaultMoods[artifactType] || 'professional and polished';
}

/**
 * Generate a unified visual identity for ALL images in an artifact.
 * Called once per artifact to ensure visual consistency across all generated images.
 */
export function generateVisualIdentity(tone?: string, _artifactType?: string, mood?: string): VisualIdentity {
  // Map tone to visual style
  const toneStyles: Record<string, Partial<VisualIdentity>> = {
    casual: {
      primaryStyle: 'editorial photography with warm film grain and authentic moments',
      colorPalette: 'warm earth tones: burnt sienna, deep teal, cream, muted gold',
      lightingApproach: 'natural golden hour lighting with soft shadows',
      compositionStyle: 'rule of thirds with intentional negative space',
      visualTone: 'warm, approachable, slightly irreverent',
    },
    formal: {
      primaryStyle: 'refined studio photography with clean lines and precise framing',
      colorPalette: 'sophisticated neutrals: charcoal, navy, silver, white',
      lightingApproach: 'controlled studio lighting with subtle rim light',
      compositionStyle: 'centered subjects with symmetrical balance',
      visualTone: 'authoritative, polished, premium',
    },
    professional: {
      primaryStyle: 'modern editorial with clean composition and purposeful framing',
      colorPalette: 'muted business tones: slate blue, warm gray, ivory, deep navy',
      lightingApproach: 'soft directional lighting with gentle shadows',
      compositionStyle: 'rule of thirds with clear focal hierarchy',
      visualTone: 'confident, credible, approachable',
    },
    conversational: {
      primaryStyle: 'candid editorial photography with natural warmth',
      colorPalette: 'friendly warm palette: terracotta, sage green, soft cream, dusty rose',
      lightingApproach: 'natural window light with warm color temperature',
      compositionStyle: 'slightly off-center subjects with environmental context',
      visualTone: 'friendly, relatable, inviting',
    },
    provocative: {
      primaryStyle: 'high-contrast editorial with dramatic framing and bold composition',
      colorPalette: 'striking contrasts: deep black, bright amber, crimson accent, cool white',
      lightingApproach: 'dramatic chiaroscuro with strong directional light',
      compositionStyle: 'unconventional angles with tension-creating asymmetry',
      visualTone: 'bold, confrontational, thought-provoking',
    },
  };

  const defaults: VisualIdentity = {
    primaryStyle: 'clean editorial photography with intentional framing',
    colorPalette: 'harmonious muted tones with one accent color',
    lightingApproach: 'natural soft lighting with gentle shadows',
    compositionStyle: 'rule of thirds with clear focal point',
    visualTone: mood || 'professional and engaging',
    consistencyAnchors: 'all images use the same color temperature and level of saturation',
  };

  const toneStyle = tone ? toneStyles[tone] : undefined;

  return {
    ...defaults,
    ...toneStyle,
    consistencyAnchors: `All images share ${toneStyle?.colorPalette || defaults.colorPalette} and ${toneStyle?.lightingApproach || defaults.lightingApproach}`,
  };
}

/**
 * Generate a specific, descriptive subject for the hero image
 */
function generateHeroSubject(title: string, themes: string[], artifactType: string): string {
  // Clean the title
  const cleanTitle = title.replace(/[#*_:"]/g, '').trim();

  // Create a visual subject description based on title and themes
  const primaryTheme = themes[0] || cleanTitle;
  const secondaryTheme = themes[1] || '';

  // Create a conceptual visual subject, not a literal illustration
  let subject = `Evocative visual metaphor capturing the tension or insight of "${primaryTheme}"`;
  if (secondaryTheme && secondaryTheme !== primaryTheme) {
    subject += `, connecting it to ${secondaryTheme}`;
  }
  subject += '. Focus on mood, symbolism, and emotional resonance rather than literal depiction.';
  return subject;
}

/**
 * Insert generated images into artifact content
 * Replaces [IMAGE: ...] placeholders with actual images, or inserts at positions
 */
function insertImagesIntoContent(
  content: string,
  needs: ImageNeed[],
  finals: Array<{ id: string; url: string; image_need_id: string }>
): string {
  let updatedContent = content;

  // Create a map of need ID to final image URL
  const imageUrlMap = new Map<string, string>();
  for (const final of finals) {
    imageUrlMap.set(final.image_need_id, final.url);
  }

  // Process each image need
  for (const need of needs) {
    const imageUrl = imageUrlMap.get(need.id);
    if (!imageUrl) continue;

    // Create markdown image with alt text from description (clean version)
    const cleanDescription = need.description.split('. Context:')[0]; // Remove context suffix
    const altText = cleanDescription.substring(0, 100).replace(/"/g, "'").replace(/\[|\]/g, '');
    const imageMarkdown = `![${altText}](${imageUrl})`;

    // Check if placement_after is a placeholder pattern [IMAGE: ...]
    if (need.placement_after.startsWith('[IMAGE:')) {
      // Replace the placeholder with the image
      const placeholderEscaped = need.placement_after.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const placeholderRegex = new RegExp(placeholderEscaped, 'g');

      if (updatedContent.includes(need.placement_after)) {
        updatedContent = updatedContent.replace(need.placement_after, imageMarkdown);
        logToFile(`[insertImagesIntoContent] Replaced placeholder: "${need.placement_after.substring(0, 50)}..."`);
      } else {
        logToFile(`[insertImagesIntoContent] WARNING: Placeholder not found in content: "${need.placement_after.substring(0, 50)}..."`);
      }
    } else {
      // Fallback: position-based insertion for backward compatibility
      let insertionIndex = -1;
      const imageMarkdownWithNewlines = `\n\n${imageMarkdown}\n\n`;

      switch (need.placement_after) {
        case 'title': {
          const h1Match = updatedContent.match(/^#\s+.+$/m);
          if (h1Match) {
            insertionIndex = (h1Match.index || 0) + h1Match[0].length;
          } else {
            const firstLineEnd = updatedContent.indexOf('\n');
            insertionIndex = firstLineEnd > 0 ? firstLineEnd : 0;
          }
          break;
        }
        case 'first section': {
          const h2Match = updatedContent.match(/^##\s+.+$/m);
          if (h2Match) {
            const h2End = (h2Match.index || 0) + h2Match[0].length;
            const nextDoubleNewline = updatedContent.indexOf('\n\n', h2End);
            insertionIndex = nextDoubleNewline > 0 ? nextDoubleNewline : h2End;
          } else {
            const firstSection = updatedContent.indexOf('\n\n');
            insertionIndex = firstSection > 0 ? firstSection : updatedContent.length;
          }
          break;
        }
        case 'problem section': {
          const problemMatch = updatedContent.match(/^##\s+.*(problem|challenge|issue|pain).*/im);
          if (problemMatch) {
            const sectionEnd = (problemMatch.index || 0) + problemMatch[0].length;
            const nextDoubleNewline = updatedContent.indexOf('\n\n', sectionEnd);
            insertionIndex = nextDoubleNewline > 0 ? nextDoubleNewline : sectionEnd;
          }
          break;
        }
        case 'solution section': {
          const solutionMatch = updatedContent.match(/^##\s+.*(solution|approach|how|result|outcome).*/im);
          if (solutionMatch) {
            const sectionEnd = (solutionMatch.index || 0) + solutionMatch[0].length;
            const nextDoubleNewline = updatedContent.indexOf('\n\n', sectionEnd);
            insertionIndex = nextDoubleNewline > 0 ? nextDoubleNewline : sectionEnd;
          }
          break;
        }
      }

      if (insertionIndex >= 0) {
        updatedContent =
          updatedContent.slice(0, insertionIndex) +
          imageMarkdownWithNewlines +
          updatedContent.slice(insertionIndex);
        logToFile(`[insertImagesIntoContent] Inserted at position ${insertionIndex} for "${need.placement_after}"`);
      } else {
        logToFile(`[insertImagesIntoContent] No insertion point for "${need.placement_after}", appending to end`);
        updatedContent += imageMarkdownWithNewlines;
      }
    }
  }

  return updatedContent;
}

/**
 * Extract image placeholders from content
 * Finds all [IMAGE: ...] patterns and extracts their descriptions
 */
function extractImagePlaceholders(content: string): Array<{
  fullMatch: string;
  description: string;
  index: number;
  purpose: 'hero' | 'illustration' | 'photo';
}> {
  const placeholders: Array<{
    fullMatch: string;
    description: string;
    index: number;
    purpose: 'hero' | 'illustration' | 'photo';
  }> = [];

  const imagePattern = /\[IMAGE:\s*([^\]]+)\]/gi;
  let match;

  while ((match = imagePattern.exec(content)) !== null) {
    const description = match[1].trim();
    const lowerDesc = description.toLowerCase();

    // All purposes map to hero, photo, or illustration (default)
    // chart/diagram/graph/dashboard/screenshot all become 'illustration' (visual metaphor)
    let purpose: 'hero' | 'illustration' | 'photo' = 'illustration';
    if (lowerDesc.includes('hero') || lowerDesc.includes('featured')) {
      purpose = 'hero';
    } else if (lowerDesc.includes('photo') || lowerDesc.includes('photograph') || lowerDesc.includes('close-up') || lowerDesc.includes('portrait')) {
      purpose = 'photo';
    }

    placeholders.push({
      fullMatch: match[0],
      description,
      index: match.index,
      purpose,
    });
  }

  logToFile(`[extractImagePlaceholders] Found ${placeholders.length} image placeholders in content`);
  return placeholders;
}

/**
 * Get surrounding context for an image placeholder
 */
function getPlaceholderContext(content: string, placeholderIndex: number): string {
  const contentBefore = content.substring(0, placeholderIndex);
  const headingMatch = contentBefore.match(/^##?\s+(.+)$/gm);
  const nearestHeading = headingMatch ? headingMatch[headingMatch.length - 1] : '';
  const contentAfter = content.substring(placeholderIndex);
  const nextParagraph = contentAfter.split('\n\n')[1]?.substring(0, 200) || '';
  return `${nearestHeading} ${nextParagraph}`.trim();
}

/**
 * Generate image needs from content placeholders
 * Parses [IMAGE: ...] placeholders and creates ImageNeed objects
 */
function generateImageNeedsFromPlaceholders(
  artifactType: 'blog' | 'social_post' | 'showcase',
  title: string,
  content: string
): ImageNeed[] {
  const needs: ImageNeed[] = [];
  const placeholders = extractImagePlaceholders(content);
  const mood = analyzeMood(content, artifactType);

  logToFile(`[generateImageNeedsFromPlaceholders] Processing ${placeholders.length} placeholders, mood: ${mood}`);

  for (let i = 0; i < placeholders.length; i++) {
    const placeholder = placeholders[i];
    const context = getPlaceholderContext(content, placeholder.index);
    let enhancedDescription = placeholder.description;

    if (context && placeholder.description.length < 100) {
      enhancedDescription = `${placeholder.description}. Context: ${context.substring(0, 150)}`;
    }

    const isHero = i === 0 || placeholder.purpose === 'hero';

    needs.push({
      id: randomUUID(),
      placement_after: placeholder.fullMatch,
      description: enhancedDescription,
      purpose: isHero ? 'hero' : placeholder.purpose,
      style: artifactType === 'social_post' ? 'modern' : 'professional',
      approved: true,
    });

    logToFile(`[generateImageNeedsFromPlaceholders] Need ${i + 1}: "${placeholder.description.substring(0, 50)}..." purpose: ${placeholder.purpose}`);
  }

  if (needs.length === 0) {
    logToFile(`[generateImageNeedsFromPlaceholders] No placeholders found, falling back to basic needs`);
    return generateBasicImageNeeds(artifactType, title, content);
  }

  return needs;
}

/**
 * Generate basic image needs (fallback when no placeholders exist)
 */
function generateBasicImageNeeds(
  artifactType: 'blog' | 'social_post' | 'showcase',
  title: string,
  content?: string
): ImageNeed[] {
  const needs: ImageNeed[] = [];
  const contentText = content || title;
  const themes = extractContentThemes(contentText, title);
  const mood = analyzeMood(contentText, artifactType);
  const heroSubject = generateHeroSubject(title, themes, artifactType);

  logToFile(`[generateBasicImageNeeds] Fallback mode - Themes: ${themes.join(', ')}, Mood: ${mood}`);

  needs.push({
    id: randomUUID(),
    placement_after: 'title',
    description: heroSubject,
    purpose: 'hero',
    style: artifactType === 'social_post' ? 'modern' : 'professional',
    approved: true,
  });

  if (artifactType === 'blog') {
    const supportingTheme = themes[1] || themes[0] || 'key concept';
    needs.push({
      id: randomUUID(),
      placement_after: 'first section',
      description: `Illustration visualizing ${supportingTheme}`,
      purpose: 'illustration',
      style: 'professional',
      approved: true,
    });
  } else if (artifactType === 'showcase') {
    needs.push({
      id: randomUUID(),
      placement_after: 'problem section',
      description: 'Abstract visualization of a challenge being addressed',
      purpose: 'illustration',
      style: 'modern',
      approved: true,
    });
    needs.push({
      id: randomUUID(),
      placement_after: 'solution section',
      description: 'Visualization of solution and positive outcome',
      purpose: 'illustration',
      style: 'professional',
      approved: true,
    });
  }

  return needs;
}

/**
 * Identify image needs tool
 *
 * Analyzes artifact content structure to suggest optimal image placements.
 */
export const identifyImageNeeds = tool({
  description: 'Analyze artifact content to identify where images should be placed',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to analyze'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of the artifact'),
    content: z.string().describe('The full content to analyze for image placements'),
  }),
  execute: async ({ artifactId, artifactType, content }) => {
    try {
      logToFile(`[identifyImageNeeds] Starting for artifact ${artifactId}, type: ${artifactType}`);

      // Extract title from content (first line or first heading)
      const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

      // Fetch tone and author_brief from artifact metadata
      let artifactTone: string | undefined;
      let authorBrief: string | undefined;
      {
        const { data: artifactRecord } = await getSupabase()
          .from('artifacts')
          .select('tone, metadata')
          .eq('id', artifactId)
          .single();

        if (artifactRecord) {
          artifactTone = artifactRecord.tone || undefined;
          const metadata = artifactRecord.metadata as Record<string, unknown> | null;
          if (metadata?.author_brief && typeof metadata.author_brief === 'string') {
            authorBrief = metadata.author_brief;
          }
        }
        logToFile(`[identifyImageNeeds] Artifact context: tone=${artifactTone || 'none'}, hasAuthorBrief=${!!authorBrief}`);
      }

      // Extract themes and mood (tone-aware)
      const themes = extractContentThemes(content, title);
      const mood = analyzeMood(content, artifactType, artifactTone);

      // Generate unified visual identity for cross-image consistency
      const visualIdentity = generateVisualIdentity(artifactTone, artifactType, mood);

      logToFile(`[identifyImageNeeds] Title: "${title}", Themes: ${themes.join(', ')}, Mood: ${mood}, VisualStyle: ${visualIdentity.primaryStyle.substring(0, 50)}`);

      // Generate image needs from placeholders (or fall back to basic needs)
      const imageNeeds = generateImageNeedsFromPlaceholders(artifactType, title, content);

      logToFile(`[identifyImageNeeds] Generated ${imageNeeds.length} image needs for "${title}"`);

      // Update status to creating_visuals while we generate images
      await getSupabase()
        .from('artifacts')
        .update({
          status: 'creating_visuals',
          visuals_metadata: {
            phase: { phase: 'generating_images', completed: 0, total: imageNeeds.length },
            needs: imageNeeds,
            finals: [],
            generation_stats: {
              total_needed: imageNeeds.length,
              finals_generated: 0,
              failures: 0,
            },
          },
        })
        .eq('id', artifactId);

      // Generate and upload images
      const finals: Array<{
        id: string;
        image_need_id: string;
        url: string;
        storage_path: string;
        resolution: { width: number; height: number };
        file_size_kb: number;
        generated_at: string;
        generation_attempts: number;
      }> = [];
      let failures = 0;

      for (let i = 0; i < imageNeeds.length; i++) {
        const need = imageNeeds[i];

        // Determine if this is a hero image (first image, placed after title)
        const isHeroImage = i === 0 && need.placement_after === 'title';
        const purposeForResolution = isHeroImage ? 'hero' : need.purpose;

        const resolution = getResolutionForType(artifactType, purposeForResolution);

        // Get section content for this image (text near the placeholder)
        const sectionContent = getPlaceholderContext(content, need.placement_after.startsWith('[IMAGE:')
          ? content.indexOf(need.placement_after)
          : 0
        );

        logToFile(`[identifyImageNeeds] Generating image ${i + 1}/${imageNeeds.length} (${isHeroImage ? 'hero' : need.purpose}): "${need.description.substring(0, 50)}..."`);
        logToFile(`[identifyImageNeeds] Resolution: ${resolution.width}x${resolution.height}`);

        try {
          // Generate image with full content-aware parameters
          const imageParams: ImageGenParams = {
            prompt: need.description,
            style: need.style,
            resolution,
            quality: 'standard',
            purpose: isHeroImage ? 'hero' : need.purpose,
            artifactContext: title,
            mood,
            contentThemes: themes,
            // Content-aware fields
            sectionContent: sectionContent || undefined,
            authorBrief,
            tone: artifactTone,
            visualIdentity,
          };

          const imageBuffer = await generateWithRetry(imageParams, 2);

          logToFile(`[identifyImageNeeds] Image generated successfully, size: ${imageBuffer.length} bytes`);

          // Upload to Supabase storage
          const { url, path } = await uploadFinalImage(artifactId, need.id, imageBuffer);

          logToFile(`[identifyImageNeeds] Image uploaded to: ${path}`);

          finals.push({
            id: need.id,
            image_need_id: need.id,
            url,
            storage_path: path,
            resolution,
            file_size_kb: Math.round(imageBuffer.length / 1024),
            generated_at: new Date().toISOString(),
            generation_attempts: 1,
          });

          // Update progress
          await getSupabase()
            .from('artifacts')
            .update({
              visuals_metadata: {
                phase: { phase: 'generating_images', completed: i + 1, total: imageNeeds.length },
                needs: imageNeeds,
                finals,
                generation_stats: {
                  total_needed: imageNeeds.length,
                  finals_generated: finals.length,
                  failures,
                },
              },
            })
            .eq('id', artifactId);

        } catch (genError: any) {
          logToFile(`[identifyImageNeeds] ERROR generating image: ${genError.message}`);
          failures++;
        }
      }

      // Insert images into content
      let updatedContent = content;
      if (finals.length > 0) {
        logToFile(`[identifyImageNeeds] Inserting ${finals.length} images into content`);
        updatedContent = insertImagesIntoContent(content, imageNeeds, finals);
        logToFile(`[identifyImageNeeds] Content updated, new length: ${updatedContent.length} (was ${content.length})`);
      }

      // Final update with completed status and updated content
      const { error: updateError } = await getSupabase()
        .from('artifacts')
        .update({
          content: updatedContent,
          visuals_metadata: {
            phase: { phase: 'complete', finals },
            needs: imageNeeds,
            finals,
            generation_stats: {
              total_needed: imageNeeds.length,
              finals_generated: finals.length,
              failures,
            },
          },
          status: 'ready',
        })
        .eq('id', artifactId);

      if (updateError) {
        logToFile(`[identifyImageNeeds] ERROR: Failed to update artifact: ${updateError.message}`);
        throw new Error(`Failed to update artifact: ${updateError.message}`);
      }

      logToFile(`[identifyImageNeeds] Successfully completed artifact ${artifactId} - generated ${finals.length}/${imageNeeds.length} images`);

      return {
        success: true,
        imageNeeds: imageNeeds,
        count: imageNeeds.length,
        imagesGenerated: finals.length,
        imagesFailed: failures,
        message: `Generated ${finals.length}/${imageNeeds.length} images. Artifact is now ready.`,
      };

    } catch (error: any) {
      logToFile(`[identifyImageNeeds] ERROR: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Image needs identification failed',
        count: 0,
      };
    }
  },
});

/**
 * Update image needs approval status
 *
 * Called when user approves/rejects specific image descriptions.
 */
export const updateImageApproval = tool({
  description: 'Update approval status for image needs',
  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact'),
    approvedIds: z.array(z.string().uuid()).describe('IDs of image needs to approve'),
    rejectedIds: z.array(z.string().uuid()).describe('IDs of image needs to reject'),
  }),
  execute: async ({ artifactId, approvedIds, rejectedIds }) => {
    try {
      // Fetch current metadata
      const { data: artifact, error: fetchError } = await getSupabase()
        .from('artifacts')
        .select('visuals_metadata')
        .eq('id', artifactId)
        .single();

      if (fetchError || !artifact) {
        throw new Error('Artifact not found');
      }

      const metadata = artifact.visuals_metadata as VisualsMetadata;
      const updatedNeeds = metadata.needs.map((need: ImageNeed) => {
        if (approvedIds.includes(need.id)) {
          return { ...need, approved: true };
        }
        if (rejectedIds.includes(need.id)) {
          return { ...need, approved: false };
        }
        return need;
      });

      // Remove rejected needs entirely
      const filteredNeeds = updatedNeeds.filter((need: ImageNeed) =>
        !rejectedIds.includes(need.id)
      );

      // Update metadata
      const { error: updateError } = await getSupabase()
        .from('artifacts')
        .update({
          visuals_metadata: {
            ...metadata,
            needs: filteredNeeds,
            generation_stats: {
              ...metadata.generation_stats,
              total_needed: filteredNeeds.length,
            },
          },
        })
        .eq('id', artifactId);

      if (updateError) {
        throw new Error(`Failed to update approval: ${updateError.message}`);
      }

      return {
        success: true,
        approved: approvedIds.length,
        rejected: rejectedIds.length,
        remaining: filteredNeeds.length,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update image approval',
      };
    }
  },
});
