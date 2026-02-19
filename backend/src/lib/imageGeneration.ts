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
import OpenAI, { toFile } from 'openai';
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

/** Unified visual identity applied to ALL images in an artifact for consistency */
export interface VisualIdentity {
  primaryStyle: string;       // e.g., "editorial photography with muted film grain"
  colorPalette: string;       // e.g., "warm earth tones: burnt sienna, deep teal, cream"
  lightingApproach: string;   // e.g., "natural golden hour with soft shadows"
  compositionStyle: string;   // e.g., "rule of thirds, shallow DOF"
  visualTone: string;         // e.g., "confident and slightly provocative"
  consistencyAnchors: string; // e.g., "all images use warm color temperature"
}

export interface ImageGenParams {
  prompt: string;
  negativePrompt?: string;
  style: 'professional' | 'modern' | 'abstract' | 'realistic' | 'editorial' | 'cinematic';
  resolution: { width: number; height: number };
  quality: 'standard' | 'hd';
  purpose?: 'illustration' | 'photo' | 'hero';
  artifactContext?: string;
  // Enhanced prompting fields
  subject?: string;
  mood?: string;
  colorPalette?: string;
  composition?: string;
  contentThemes?: string[];
  // Content-aware fields (threaded from pipeline)
  sectionContent?: string;      // Summary of the section this image belongs to
  authorBrief?: string;         // Author's original narrative intent
  tone?: string;                // Artifact's tone setting (casual, formal, etc.)
  visualIdentity?: VisualIdentity;  // Unified visual standard for all images
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
        negativePrompt: 'text, words, letters, numbers, labels, captions, watermarks, logos, signatures, charts, graphs, tables, dashboards, presentation slides, UI mockups, screenshots, blurry text, misspelled words',
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
 * Edit an existing image using OpenAI's gpt-image-1 model.
 * Uses image-to-image editing to preserve composition while applying targeted changes.
 *
 * @param sourceImageBuffer - The source image as a Buffer (PNG/JPEG/WebP)
 * @param editPrompt - Natural language description of the desired edit
 * @param options - Optional size and quality settings
 * @returns Buffer containing the edited image
 */
export async function editImageWithOpenAI(
  sourceImageBuffer: Buffer,
  editPrompt: string,
  options: {
    size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
    quality?: 'low' | 'medium' | 'high' | 'auto';
  } = {}
): Promise<Buffer> {
  if (!openai) {
    logToFile(`[ImageGen:Edit] ERROR: OPENAI_API_KEY not configured`);
    const authError: ImageGenerationError = {
      type: ImageGenerationErrorType.AUTHENTICATION_REQUIRED,
      message: 'Image editing requires OPENAI_API_KEY in .env',
      recoverable: false,
    };
    throw authError;
  }

  const { size = 'auto', quality = 'high' } = options;

  logToFile(`[ImageGen:Edit] Editing image with prompt: "${editPrompt.substring(0, 100)}..."`);
  logToFile(`[ImageGen:Edit] Size: ${size}, Quality: ${quality}, Source size: ${sourceImageBuffer.length} bytes`);

  try {
    const imageFile = await toFile(sourceImageBuffer, 'source.png', { type: 'image/png' });

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: editPrompt,
      size,
      quality,
      n: 1,
    });

    logToFile(`[ImageGen:Edit] Response received, checking for image data...`);

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data in edit response');
    }

    const imageData = response.data[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image data in edit response');
    }

    const buffer = Buffer.from(imageData, 'base64');
    logToFile(`[ImageGen:Edit] Image edited successfully, size: ${buffer.length} bytes`);

    return buffer;

  } catch (error: any) {
    const errorMsg = error.message || JSON.stringify(error);
    logToFile(`[ImageGen:Edit] ERROR: ${errorMsg}`);

    if (errorMsg.includes('content_policy') || errorMsg.includes('safety')) {
      const policyError: ImageGenerationError = {
        type: ImageGenerationErrorType.CONTENT_POLICY,
        message: 'Image edit prompt violates content policy',
        recoverable: false,
      };
      throw policyError;
    }

    throw classifyImageGenerationError(error);
  }
}

/**
 * Download an image from a URL and return as Buffer.
 * Used to fetch existing images for image-to-image editing.
 */
export async function downloadImage(url: string): Promise<Buffer> {
  logToFile(`[ImageGen:Download] Fetching image from URL (length: ${url.length})`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  logToFile(`[ImageGen:Download] Downloaded ${buffer.length} bytes`);

  return buffer;
}

/**
 * Unified content-aware prompt builder
 *
 * Builds prompts in 5 parts:
 * 1. Subject/scene (from placeholder description)
 * 2. Content context (section content, author's brief, themes)
 * 3. Visual identity (unified style, palette, lighting, composition)
 * 4. Purpose-specific composition (hero/photo/illustration)
 * 5. Negative prompt (NO text, words, labels, etc.)
 *
 * Key principles:
 * - Use narrative prose (DALL-E 3 and Imagen prefer prose over keyword lists)
 * - Thread artifact context so images reflect the article's message
 * - Apply unified visual identity so all images in one artifact feel cohesive
 * - NEVER include text, graphs, charts, or data visualizations
 */
function enhancePrompt(params: ImageGenParams): string {
  const {
    prompt, purpose, style, mood, colorPalette, contentThemes,
    sectionContent, authorBrief, tone, visualIdentity,
  } = params;

  const parts: string[] = [];

  // --- Part 1: Subject/Scene ---
  parts.push(prompt.trim());

  // --- Part 2: CRITICAL Negative Constraints (front-loaded for DALL-E 3 rewriter) ---
  parts.push(
    'CRITICAL: Absolutely NO text, NO words, NO letters, NO numbers, NO labels, NO captions, ' +
    'NO watermarks, NO logos anywhere in the image. ' +
    'No charts, graphs, tables, dashboards, slides, UI mockups, or screenshots. Pure visual imagery only.'
  );

  // --- Part 3: Visual Identity (ensures cross-image consistency) ---
  if (visualIdentity) {
    parts.push(
      `Visual style: ${visualIdentity.primaryStyle}. ` +
      `Color palette: ${visualIdentity.colorPalette}. ` +
      `Lighting: ${visualIdentity.lightingApproach}. ` +
      `Composition approach: ${visualIdentity.compositionStyle}. ` +
      `Visual tone: ${visualIdentity.visualTone}. ` +
      `Consistency: ${visualIdentity.consistencyAnchors}.`
    );
  } else {
    // Fallback when no visual identity is provided
    const fallbackStyle = buildFallbackStyle(style, mood, tone, colorPalette);
    parts.push(fallbackStyle);
  }

  // --- Part 4: Content Context (makes images content-aware) ---
  if (sectionContent || authorBrief || contentThemes?.length) {
    const contextParts: string[] = [];

    if (sectionContent) {
      contextParts.push(`This image accompanies a section about: ${sectionContent.substring(0, 400)}.`);
    }

    if (authorBrief) {
      contextParts.push(`The article's core narrative: ${authorBrief.substring(0, 200)}.`);
    }

    if (contentThemes?.length) {
      contextParts.push(`Key themes to reflect visually: ${contentThemes.slice(0, 3).join(', ')}.`);
    }

    parts.push(contextParts.join(' '));
  }

  // --- Part 5: Purpose-Specific Composition ---
  parts.push(buildPurposeComposition(purpose));

  const enhancedPrompt = parts.join('\n\n');
  logToFile(`[ImageGen:EnhancePrompt] Purpose: ${purpose}, Style: ${style}, HasVisualIdentity: ${!!visualIdentity}, Prompt length: ${enhancedPrompt.length}, Full prompt: ${enhancedPrompt.substring(0, 300)}`);

  return enhancedPrompt;
}

/**
 * Build fallback style direction when no VisualIdentity is provided
 */
function buildFallbackStyle(
  style: string,
  mood?: string,
  tone?: string,
  colorPalette?: string
): string {
  const styleDirections: Record<string, string> = {
    professional: 'Clean, polished aesthetic with subtle gradients and minimal visual clutter.',
    modern: 'Contemporary design with bold shapes, vibrant accents, and dynamic composition.',
    abstract: 'Artistic interpretation using geometric shapes, flowing forms, and symbolic visual metaphors.',
    realistic: 'High-quality photography style with natural lighting and authentic subject matter.',
    editorial: 'Editorial photography feel with intentional framing, muted film grain, and authentic moments.',
    cinematic: 'Cinematic wide-angle with dramatic lighting, rich color grading, and atmospheric depth.',
  };

  const toneToMood: Record<string, string> = {
    casual: 'warm, approachable, and slightly irreverent',
    formal: 'refined, authoritative, and polished',
    provocative: 'bold, confrontational, and thought-provoking',
    conversational: 'friendly, relatable, and inviting',
  };

  const resolvedMood = mood || (tone && toneToMood[tone]) || 'professional and engaging';
  const resolvedStyle = styleDirections[style] || styleDirections.professional;

  let fallback = `Visual style: ${resolvedStyle} Mood: ${resolvedMood}.`;

  if (colorPalette) {
    fallback += ` Color palette: ${colorPalette}.`;
  }

  return fallback;
}

/**
 * Build purpose-specific composition guidance
 */
function buildPurposeComposition(purpose?: string): string {
  switch (purpose) {
    case 'hero':
      return (
        'Composition: Wide landscape format filling the entire frame. ' +
        'Visual interest spread across the image, suitable as a bold article header. ' +
        'Dramatic scale and depth. Should work well when cropped to various aspect ratios.'
      );

    case 'photo':
      return (
        'Shallow depth of field with soft background blur (bokeh). Subject sharply in focus. ' +
        'Natural lighting, slightly warm color temperature. ' +
        'Rule of thirds composition with breathing room around the subject. ' +
        'Photorealistic, high detail, editorial photography quality.'
      );

    case 'illustration':
      return (
        'Single clear focal point with minimal surrounding elements. ' +
        'The visual metaphor should be immediately understandable at a glance. ' +
        'Clean composition without clutter. ' +
        'Works well as an inline content image at medium size.'
      );

    default:
      return (
        'Clean composition with a clear focal point. ' +
        'Professional quality, high resolution, crisp details.'
      );
  }
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
        // Illustrations: landscape for blog, square otherwise
        return type === 'blog'
          ? { width: 1792, height: 1024 }
          : { width: 1024, height: 1024 };

      case 'photo':
        // Photos vary - use artifact type to decide
        return type === 'social_post'
          ? { width: 1024, height: 1024 }
          : { width: 1792, height: 1024 };
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
