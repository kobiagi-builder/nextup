/**
 * Image Generation Service - Supports DALL-E 3 and Gemini Imagen
 *
 * Configure via .env:
 * - IMAGE_GENERATION_SERVICE: 'dalle' | 'gemini' (default: 'dalle')
 * - OPENAI_API_KEY: Required for DALL-E 3
 * - GOOGLE_GENERATIVE_AI_API_KEY: Required for Gemini Imagen (requires billing)
 *
 * Documentation:
 * - https://platform.openai.com/docs/guides/images
 * - https://ai.google.dev/gemini-api/docs/imagen
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { logToFile } from './logger.js';

// Service configuration from env
const IMAGE_SERVICE = (process.env.IMAGE_GENERATION_SERVICE || 'dalle').toLowerCase() as 'gemini' | 'dalle';

// Check which services have API keys configured
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const HAS_GEMINI_KEY = GEMINI_API_KEY.length > 0;
const HAS_OPENAI_KEY = OPENAI_API_KEY.length > 0;

// Initialize GenAI client (for Gemini) - only if key is available
const genAI = HAS_GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Initialize OpenAI client (for DALL-E) - only if key is available
const openai = HAS_OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Log configuration status
logToFile(`[ImageGen] Configured service: ${IMAGE_SERVICE}`);
logToFile(`[ImageGen] Available services: dalle=${HAS_OPENAI_KEY ? 'YES' : 'NO'}, gemini=${HAS_GEMINI_KEY ? 'YES' : 'NO'}`);

if (!HAS_GEMINI_KEY && !HAS_OPENAI_KEY) {
  logToFile(`[ImageGen] WARNING: No image generation API keys configured! Add OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to .env`);
}

export interface ImageGenParams {
  prompt: string;
  negativePrompt?: string;
  style: 'professional' | 'modern' | 'abstract' | 'realistic';
  resolution: { width: number; height: number };
  quality: 'standard' | 'hd';
  purpose?: 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart' | 'hero';
  artifactContext?: string;
  // Enhanced prompting fields
  subject?: string;           // Main subject of the image
  mood?: string;              // Emotional tone (inspiring, calm, energetic)
  colorPalette?: string;      // Specific colors to use
  composition?: string;       // Composition style (centered, rule of thirds)
  contentThemes?: string[];   // Key themes from the article content
}

export enum ImageGenerationErrorType {
  RATE_LIMIT = 'rate_limit',
  CONTENT_POLICY = 'content_policy',
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  STORAGE = 'storage',
  BILLING_REQUIRED = 'billing_required',
  AUTHENTICATION_REQUIRED = 'authentication_required',
}

export interface ImageGenerationError {
  type: ImageGenerationErrorType;
  message: string;
  recoverable: boolean;
  retryAfterMs?: number;
}

/**
 * Generate image using DALL-E 3 (OpenAI)
 */
export async function generateImageWithDallE(
  params: ImageGenParams
): Promise<Buffer> {
  // Check if OpenAI API key is configured
  if (!openai) {
    logToFile(`[ImageGen:DALL-E] ERROR: OPENAI_API_KEY not configured`);
    const authError: ImageGenerationError = {
      type: ImageGenerationErrorType.AUTHENTICATION_REQUIRED,
      message: 'DALL-E requires OPENAI_API_KEY in .env',
      recoverable: false,
    };
    throw authError;
  }

  const enhancedPrompt = enhancePrompt(params);
  const size = calculateDallESize(params.resolution);

  logToFile(`[ImageGen:DALL-E] Generating image with prompt: "${enhancedPrompt.substring(0, 100)}..."`);
  logToFile(`[ImageGen:DALL-E] Size: ${size}, Quality: ${params.quality}`);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: size,
      quality: params.quality === 'hd' ? 'hd' : 'standard',
      response_format: 'b64_json',
    });

    logToFile(`[ImageGen:DALL-E] Response received, checking for image data...`);

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data in response');
    }

    const imageData = response.data[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image data in response');
    }

    const buffer = Buffer.from(imageData, 'base64');
    logToFile(`[ImageGen:DALL-E] Image generated successfully, size: ${buffer.length} bytes`);

    return buffer;

  } catch (error: any) {
    const errorMsg = error.message || JSON.stringify(error);
    logToFile(`[ImageGen:DALL-E] ERROR: ${errorMsg}`);

    // Check for content policy error
    if (errorMsg.includes('content_policy') || errorMsg.includes('safety')) {
      const policyError: ImageGenerationError = {
        type: ImageGenerationErrorType.CONTENT_POLICY,
        message: 'Image prompt violates content policy',
        recoverable: false,
      };
      throw policyError;
    }

    throw classifyImageGenerationError(error);
  }
}

/**
 * Generate image using Imagen 4 (Google GenAI)
 */
export async function generateImageWithImagen(
  params: ImageGenParams
): Promise<Buffer> {
  // Check if Gemini API key is configured
  if (!genAI) {
    logToFile(`[ImageGen:Imagen] ERROR: GOOGLE_GENERATIVE_AI_API_KEY not configured`);
    const authError: ImageGenerationError = {
      type: ImageGenerationErrorType.AUTHENTICATION_REQUIRED,
      message: 'Gemini Imagen requires GOOGLE_GENERATIVE_AI_API_KEY in .env',
      recoverable: false,
    };
    throw authError;
  }

  const enhancedPrompt = enhancePrompt(params);
  const aspectRatio = calculateAspectRatio(params.resolution);

  logToFile(`[ImageGen:Imagen] Generating image with prompt: "${enhancedPrompt.substring(0, 100)}..."`);
  logToFile(`[ImageGen:Imagen] Aspect ratio: ${aspectRatio}`);

  try {
    const response = await genAI.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
      }
    });

    logToFile(`[ImageGen:Imagen] Response received, checking for image data...`);

    const generatedImages = response.generatedImages;
    if (!generatedImages || generatedImages.length === 0) {
      throw new Error('No images generated in response');
    }

    const imageData = generatedImages[0].image?.imageBytes;
    if (!imageData) {
      throw new Error('No image data in response');
    }

    const buffer = Buffer.from(imageData, 'base64');
    logToFile(`[ImageGen:Imagen] Image generated successfully, size: ${buffer.length} bytes`);

    return buffer;

  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    logToFile(`[ImageGen:Imagen] ERROR: ${errorStr}`);

    // Check for billing error
    if (errorStr.includes('billed users') || errorStr.includes('billing')) {
      const billingError: ImageGenerationError = {
        type: ImageGenerationErrorType.BILLING_REQUIRED,
        message: 'Imagen API requires billing - falling back to DALL-E',
        recoverable: false,
      };
      throw billingError;
    }

    throw classifyImageGenerationError(error);
  }
}

/**
 * Legacy function name for compatibility
 */
export async function generateImageWithNanoBanana(
  params: ImageGenParams
): Promise<Buffer> {
  return generateImageWithImagen(params);
}

/**
 * Enhanced prompt builder using best practices from research
 *
 * Structure: [Subject + Details] [Setting/Environment] [Style/Medium]
 *            [Lighting] [Composition] [Mood] [Quality Modifiers]
 *
 * Key principles:
 * - Use narrative paragraphs, not keyword lists (especially for DALL-E 3)
 * - Be specific and descriptive
 * - Include mood and atmosphere
 * - Specify composition and camera angle when relevant
 */
function enhancePrompt(params: ImageGenParams): string {
  const { prompt, purpose, style, artifactContext, mood, colorPalette, contentThemes } = params;

  // Build structured prompt based on purpose
  let enhancedPrompt = '';

  switch (purpose) {
    case 'hero':
      enhancedPrompt = buildHeroImagePrompt(prompt, style, artifactContext, mood, colorPalette, contentThemes);
      break;
    case 'illustration':
      enhancedPrompt = buildIllustrationPrompt(prompt, style, artifactContext, mood, colorPalette);
      break;
    case 'diagram':
      enhancedPrompt = buildDiagramPrompt(prompt, style, artifactContext);
      break;
    case 'photo':
      enhancedPrompt = buildPhotoPrompt(prompt, style, artifactContext, mood);
      break;
    default:
      enhancedPrompt = buildGenericPrompt(prompt, style, artifactContext, mood);
  }

  logToFile(`[ImageGen:EnhancePrompt] Purpose: ${purpose}, Enhanced prompt: "${enhancedPrompt.substring(0, 150)}..."`);

  return enhancedPrompt;
}

/**
 * Build hero image prompt - landscape, impactful, sets tone for the article
 */
function buildHeroImagePrompt(
  subject: string,
  style: string,
  context?: string,
  mood?: string,
  colorPalette?: string,
  themes?: string[]
): string {
  const moodText = mood || 'inspiring and professional';
  const themeText = themes?.length ? themes.slice(0, 3).join(', ') : '';

  // Style-specific visual directions
  const styleDirections: Record<string, string> = {
    professional: 'Clean, corporate aesthetic with subtle gradients and minimal visual clutter. Think modern business publication cover.',
    modern: 'Contemporary design with bold shapes, vibrant accents, and dynamic composition. Think tech startup marketing.',
    abstract: 'Artistic interpretation using geometric shapes, flowing forms, and symbolic visual metaphors.',
    realistic: 'High-quality photography style with natural lighting and authentic subject matter.',
  };

  const colorDirection = colorPalette
    ? `Color palette: ${colorPalette}.`
    : 'Use a cohesive color palette that feels professional and trustworthy.';

  // Build narrative prompt (DALL-E 3 prefers prose over keywords)
  let prompt = `Create a visually striking hero image that represents the concept of ${subject}. `;

  if (themeText) {
    prompt += `The image should visually communicate themes of ${themeText}. `;
  }

  prompt += `${styleDirections[style] || styleDirections.professional} `;
  prompt += `The overall mood should be ${moodText}. `;
  prompt += `${colorDirection} `;

  // Composition and technical specs
  prompt += `Composition: wide landscape format with visual interest spread across the frame, suitable as a header image. `;
  prompt += `The image should work well at various sizes and be visually clear even when scaled down. `;

  // Quality and restrictions
  prompt += `High resolution, crisp details, professional quality. `;
  prompt += `IMPORTANT: No text, no words, no letters, no watermarks, no logos in the image.`;

  return prompt;
}

/**
 * Build illustration prompt - supporting visual for content sections
 */
function buildIllustrationPrompt(
  subject: string,
  style: string,
  context?: string,
  mood?: string,
  colorPalette?: string
): string {
  const moodText = mood || 'professional and engaging';

  const styleDirections: Record<string, string> = {
    professional: 'Clean digital illustration with flat design elements, subtle shadows, and clear visual hierarchy.',
    modern: 'Contemporary vector illustration with bold colors, geometric shapes, and playful elements.',
    abstract: 'Artistic illustration using metaphorical imagery, flowing lines, and creative interpretation.',
    realistic: 'Detailed illustration with depth, texture, and realistic proportions.',
  };

  let prompt = `Create a clear, informative illustration that visualizes ${subject}. `;

  if (context) {
    prompt += `This illustration accompanies an article about ${context}. `;
  }

  prompt += `Style: ${styleDirections[style] || styleDirections.professional} `;
  prompt += `The mood should be ${moodText}. `;

  if (colorPalette) {
    prompt += `Use colors: ${colorPalette}. `;
  } else {
    prompt += `Use a limited, harmonious color palette (3-4 main colors). `;
  }

  // Keep it simple and focused
  prompt += `Keep the composition simple and focused on the main concept. Avoid clutter. `;
  prompt += `The illustration should be easily understood at a glance. `;
  prompt += `No text, no labels, no watermarks.`;

  return prompt;
}

/**
 * Build diagram prompt - technical, clear, minimal
 */
function buildDiagramPrompt(
  subject: string,
  style: string,
  context?: string
): string {
  let prompt = `Create a clean, professional diagram that explains ${subject}. `;

  prompt += `Style: Minimal flat design with clear visual hierarchy. `;
  prompt += `Use simple shapes (circles, rectangles, arrows) to represent concepts and relationships. `;
  prompt += `Limited color palette: use 2-3 colors maximum for clarity. `;
  prompt += `White or light neutral background for maximum clarity. `;

  if (context) {
    prompt += `Context: This diagram is for an article about ${context}. `;
  }

  prompt += `The diagram should be self-explanatory through visual design alone. `;
  prompt += `IMPORTANT: No text labels, no words - communicate purely through visual design.`;

  return prompt;
}

/**
 * Build photo-style prompt - realistic, stock photography feel
 */
function buildPhotoPrompt(
  subject: string,
  style: string,
  context?: string,
  mood?: string
): string {
  const moodText = mood || 'professional and authentic';

  let prompt = `Professional photograph of ${subject}. `;

  prompt += `Photography style: Editorial photography with natural lighting, `;
  prompt += `shallow depth of field creating soft bokeh in background. `;
  prompt += `Shot with high-end camera, sharp focus on subject. `;

  prompt += `Mood: ${moodText}. `;

  if (context) {
    prompt += `The photo should feel relevant to ${context}. `;
  }

  prompt += `Composition: Rule of thirds, with breathing room around subject. `;
  prompt += `Colors: Natural, slightly desaturated for professional look. `;
  prompt += `8K quality, detailed, photorealistic. `;
  prompt += `No artificial elements, no text overlays, no watermarks.`;

  return prompt;
}

/**
 * Build generic prompt with good defaults
 */
function buildGenericPrompt(
  subject: string,
  style: string,
  context?: string,
  mood?: string
): string {
  const moodText = mood || 'professional';

  const styleText: Record<string, string> = {
    professional: 'clean corporate design',
    modern: 'contemporary minimal design',
    abstract: 'artistic conceptual design',
    realistic: 'photorealistic rendering',
  };

  let prompt = `Create an image representing ${subject}. `;
  prompt += `Visual style: ${styleText[style] || styleText.professional}. `;
  prompt += `Mood: ${moodText}. `;

  if (context) {
    prompt += `Context: ${context}. `;
  }

  prompt += `High quality, professional finish. No text or watermarks.`;

  return prompt;
}

/**
 * Calculate size for DALL-E 3 (supports: 1024x1024, 1792x1024, 1024x1792)
 */
function calculateDallESize(
  resolution: { width: number; height: number }
): '1024x1024' | '1792x1024' | '1024x1792' {
  const { width, height } = resolution;
  const ratio = width / height;

  // Square
  if (Math.abs(ratio - 1) < 0.2) return '1024x1024';
  // Landscape
  if (ratio > 1) return '1792x1024';
  // Portrait
  return '1024x1792';
}

/**
 * Calculate aspect ratio for Imagen (supports: 1:1, 3:4, 4:3, 9:16, 16:9)
 */
function calculateAspectRatio(
  resolution: { width: number; height: number }
): string {
  const { width, height } = resolution;
  const ratio = width / height;

  if (Math.abs(ratio - 1) < 0.1) return '1:1';
  if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
  if (Math.abs(ratio - 4/3) < 0.1) return '4:3';
  if (Math.abs(ratio - 3/4) < 0.1) return '3:4';

  return ratio > 1 ? '16:9' : '9:16';
}

/**
 * Classify image generation errors for retry logic
 */
function classifyImageGenerationError(error: any): ImageGenerationError {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('rate limit') || message.includes('quota')) {
    return {
      type: ImageGenerationErrorType.RATE_LIMIT,
      message: 'Image generation rate limit exceeded',
      recoverable: true,
      retryAfterMs: 60000,
    };
  }

  if (message.includes('content policy') || message.includes('safety') || message.includes('blocked')) {
    return {
      type: ImageGenerationErrorType.CONTENT_POLICY,
      message: 'Image prompt violates content policy',
      recoverable: false,
    };
  }

  if (message.includes('timeout')) {
    return {
      type: ImageGenerationErrorType.TIMEOUT,
      message: 'Image generation timeout',
      recoverable: true,
      retryAfterMs: 5000,
    };
  }

  return {
    type: ImageGenerationErrorType.NETWORK,
    message: error.message || 'Image generation failed',
    recoverable: true,
    retryAfterMs: 2000,
  };
}

/**
 * Generate image with automatic retry and fallback logic
 * Uses IMAGE_GENERATION_SERVICE env var to determine primary service
 * Falls back to the other service if primary fails
 *
 * @param params - Image generation parameters
 * @param maxRetries - Maximum number of retry attempts per service (default: 2)
 * @returns Buffer containing the generated image
 */
export async function generateWithRetry(
  params: ImageGenParams,
  maxRetries = 2
): Promise<Buffer> {
  const primaryService = IMAGE_SERVICE;
  const fallbackService = primaryService === 'gemini' ? 'dalle' : 'gemini';

  logToFile(`[ImageGen] Using ${primaryService} as primary, ${fallbackService} as fallback`);

  // Try primary service first
  const primaryFn = primaryService === 'gemini' ? generateImageWithImagen : generateImageWithDallE;
  const fallbackFn = primaryService === 'gemini' ? generateImageWithDallE : generateImageWithImagen;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logToFile(`[ImageGen] ${primaryService} attempt ${attempt}/${maxRetries}`);
      return await primaryFn(params);
    } catch (error: any) {
      const imgError = error as ImageGenerationError;

      logToFile(`[ImageGen] ${primaryService} attempt ${attempt} failed: ${imgError.message}`);

      // If authentication or billing required, skip retries and fall through to fallback
      if (imgError.type === ImageGenerationErrorType.BILLING_REQUIRED) {
        logToFile(`[ImageGen] ${primaryService} requires billing, falling back to ${fallbackService}`);
        break;
      }

      if (imgError.type === ImageGenerationErrorType.AUTHENTICATION_REQUIRED) {
        logToFile(`[ImageGen] ${primaryService} missing API key, falling back to ${fallbackService}`);
        break;
      }

      if (!imgError.recoverable || attempt === maxRetries) {
        logToFile(`[ImageGen] ${primaryService} failed, falling back to ${fallbackService}`);
        break;
      }

      const delayMs = imgError.retryAfterMs || (1000 * Math.pow(2, attempt));
      logToFile(`[ImageGen] Retrying ${primaryService} in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Fallback to other service
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logToFile(`[ImageGen] ${fallbackService} attempt ${attempt}/${maxRetries}`);
      return await fallbackFn(params);
    } catch (error: any) {
      const imgError = error as ImageGenerationError;

      logToFile(`[ImageGen] ${fallbackService} attempt ${attempt} failed: ${imgError.message}`);

      // If both services need authentication/billing, provide clear guidance
      if (imgError.type === ImageGenerationErrorType.AUTHENTICATION_REQUIRED ||
          imgError.type === ImageGenerationErrorType.BILLING_REQUIRED) {
        const errorMsg = `Image generation failed. Both services unavailable:
- DALL-E 3: Requires OPENAI_API_KEY
- Gemini Imagen: Requires billing enabled on Google Cloud

Add OPENAI_API_KEY to your .env file for the easiest setup.`;
        logToFile(`[ImageGen] FATAL: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      if (!imgError.recoverable || attempt === maxRetries) {
        throw error;
      }

      const delayMs = imgError.retryAfterMs || (1000 * Math.pow(2, attempt));
      logToFile(`[ImageGen] Retrying ${fallbackService} in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('All image generation attempts failed');
}

/**
 * Get resolution for artifact type and image purpose
 *
 * DALL-E 3 supported sizes:
 * - 1024x1024 (square) - social posts, inline illustrations
 * - 1792x1024 (landscape) - hero images, blog headers
 * - 1024x1792 (portrait) - vertical content, mobile-first
 *
 * Resolution is chosen based on:
 * 1. Image purpose (hero vs inline)
 * 2. Artifact type context
 */
export function getResolutionForType(
  type: string,
  purpose?: string
): { width: number; height: number } {
  // Purpose-based resolution (takes priority)
  if (purpose) {
    switch (purpose) {
      case 'hero':
        // Hero images are always landscape for maximum visual impact
        return { width: 1792, height: 1024 };

      case 'illustration':
      case 'chart':
        // Illustrations and charts work best as squares or landscape
        // Use landscape for blog context, square otherwise
        return type === 'blog'
          ? { width: 1792, height: 1024 }
          : { width: 1024, height: 1024 };

      case 'diagram':
        // Diagrams are usually landscape for better readability
        return { width: 1792, height: 1024 };

      case 'photo':
        // Photos vary - use artifact type to decide
        return type === 'social_post'
          ? { width: 1024, height: 1024 }
          : { width: 1792, height: 1024 };

      case 'screenshot':
        // Screenshots are typically landscape
        return { width: 1792, height: 1024 };
    }
  }

  // Type-based defaults (fallback when purpose not specified)
  const typeDefaults: Record<string, { width: number; height: number }> = {
    blog: { width: 1792, height: 1024 },         // Landscape for headers
    social_post: { width: 1024, height: 1024 },  // Square for social
    showcase: { width: 1792, height: 1024 },     // Landscape for portfolio
  };

  return typeDefaults[type] || typeDefaults.blog;
}
