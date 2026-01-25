# Implementation Spec: Phase 3 - Graphics & Completion

**Phase**: 3 of 4
**Status**: Ready for Implementation
**Dependencies**: Phase 2 (content approved, structure and text complete)
**Estimated Effort**: 3-4 weeks

---

## Overview

This specification details the technical implementation for Phase 3, covering:
1. Image needs identification from content structure
2. Placeholder image generation (quick, low-quality concepts)
3. Placeholder approval workflow
4. Gemini Nano Banana integration (from scratch)
5. Final image generation and storage
6. Completion notification system
7. Image regeneration capability

---

## Database Changes

### Migration: `004_add_image_generation_tables.sql`

**Location**: `backend/src/db/migrations/004_add_image_generation_tables.sql`

```sql
-- ============================================================================
-- Phase 3 Migration: Image Generation System
-- ============================================================================

-- Step 1: Add new artifact statuses (Phase 3)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_status') THEN
    -- Add image generation statuses
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'identifying_images';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'generating_placeholders';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'placeholder_review';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'generating_images';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'complete';
  END IF;
END$$;

-- Step 2: Create artifact_images table
CREATE TABLE IF NOT EXISTS artifact_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  placement_after TEXT NOT NULL, -- Heading or line number where image should be placed
  description TEXT NOT NULL, -- What the image should show
  purpose TEXT NOT NULL CHECK (purpose IN ('illustration', 'diagram', 'photo', 'screenshot', 'chart')),
  style TEXT NOT NULL CHECK (style IN ('professional', 'modern', 'abstract', 'realistic')),
  placeholder_url TEXT, -- Temporary placeholder image URL
  final_url TEXT, -- Final high-quality image URL (Supabase storage)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'placeholder_generated', 'approved', 'rejected', 'final_generated', 'failed')),
  generation_attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX idx_artifact_images_artifact_id ON artifact_images(artifact_id);
CREATE INDEX idx_artifact_images_status ON artifact_images(status);

-- Step 4: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_artifact_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifact_images_updated_at
  BEFORE UPDATE ON artifact_images
  FOR EACH ROW
  EXECUTE FUNCTION update_artifact_images_updated_at();

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON artifact_images TO authenticated;
GRANT USAGE ON SEQUENCE artifact_images_id_seq TO authenticated;
```

**Validation Commands**:
```bash
# Apply migration
mcp__supabase__apply_migration({
  project_id: "ohwubfmipnpguunryopl",
  name: "004_add_image_generation_tables",
  query: "<SQL above>"
})

# Verify tables
mcp__supabase__list_tables({ project_id: "ohwubfmipnpguunryopl" })
# Expected: artifact_images table exists

# Verify indexes
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT indexname FROM pg_indexes WHERE tablename = 'artifact_images'"
})
# Expected: 2 indexes

# Verify new statuses
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT unnest(enum_range(NULL::artifact_status))"
})
# Expected: identifying_images, generating_placeholders, placeholder_review, generating_images, complete
```

---

## Supabase Storage Configuration

### Storage Bucket Setup

**Execute via MCP**:

```bash
# Create storage bucket for artifact images
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: `
    -- Create storage bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('artifacts', 'artifacts', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create RLS policies for artifacts bucket
    CREATE POLICY "Users can upload images to their artifacts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'artifacts' AND
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM artifacts WHERE user_id = auth.uid()
      )
    );

    CREATE POLICY "Public read access to artifact images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'artifacts');

    CREATE POLICY "Users can update their artifact images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'artifacts' AND
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM artifacts WHERE user_id = auth.uid()
      )
    );

    CREATE POLICY "Users can delete their artifact images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'artifacts' AND
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM artifacts WHERE user_id = auth.uid()
      )
    );
  `
})
```

**Storage Structure**:
```
artifacts/
├── {artifact-id-1}/
│   ├── images/
│   │   ├── {image-id-1}.png
│   │   ├── {image-id-2}.png
│   │   └── {image-id-3}.png
├── {artifact-id-2}/
│   └── images/
│       └── {image-id-1}.png
```

---

## Backend Implementation

### 1. Gemini Nano Banana Client

**Location**: `backend/src/lib/geminiNanoBananaClient.ts` (NEW FILE)

```typescript
import { LoggerService } from '../services/LoggerService.js';
import fetch from 'node-fetch';

/**
 * Gemini Nano Banana API client for image generation
 *
 * NOTE: This requires configuration from scratch.
 * Gemini Nano Banana is part of Google's Gemini family for image generation.
 *
 * API Documentation: https://ai.google.dev/gemini-api/docs/imagen
 */
export class GeminiNanoBananaClient {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_IMAGEN_API_KEY || '';
    this.apiUrl = process.env.GEMINI_IMAGEN_API_URL || 'https://generativelanguage.googleapis.com/v1beta';

    if (!this.apiKey) {
      throw new Error('GEMINI_IMAGEN_API_KEY environment variable not set');
    }

    LoggerService.info('GeminiNanoBananaClient', 'Initialized', {
      hasApiKey: !!this.apiKey,
      apiUrl: this.apiUrl,
    });
  }

  /**
   * Generate image from text description
   */
  async generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    style: 'professional' | 'modern' | 'abstract' | 'realistic';
    resolution: { width: number; height: number };
    quality: 'standard' | 'hd';
  }): Promise<Buffer> {
    try {
      const enhancedPrompt = this.enhancePrompt(params.prompt, params.style);

      LoggerService.info('GeminiNanoBananaClient', 'Generating image', {
        promptLength: enhancedPrompt.length,
        style: params.style,
        resolution: params.resolution,
        quality: params.quality,
      });

      // Call Gemini Imagen API
      const response = await fetch(`${this.apiUrl}/models/imagen-3.0-generate-001:predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: enhancedPrompt,
              ...(params.negativePrompt && { negativePrompt: params.negativePrompt }),
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: this.getAspectRatio(params.resolution),
            safetyFilterLevel: 'block_some',
            personGeneration: 'allow_adult',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Imagen API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as {
        predictions: Array<{
          bytesBase64Encoded: string;
          mimeType: string;
        }>;
      };

      if (!result.predictions || result.predictions.length === 0) {
        throw new Error('No image generated');
      }

      // Decode base64 to buffer
      const imageData = result.predictions[0].bytesBase64Encoded;
      const imageBuffer = Buffer.from(imageData, 'base64');

      LoggerService.info('GeminiNanoBananaClient', 'Image generated', {
        sizeBytes: imageBuffer.length,
        mimeType: result.predictions[0].mimeType,
      });

      return imageBuffer;
    } catch (error) {
      LoggerService.error('GeminiNanoBananaClient', error instanceof Error ? error : new Error(String(error)), {
        sourceCode: 'generateImage',
      });
      throw error;
    }
  }

  /**
   * Enhance prompt with style modifiers
   */
  private enhancePrompt(prompt: string, style: string): string {
    const styleModifiers = {
      professional: 'Professional, clean, corporate style. High quality, polished appearance.',
      modern: 'Modern, contemporary design. Sleek, minimalist aesthetic.',
      abstract: 'Abstract, artistic interpretation. Creative, non-literal representation.',
      realistic: 'Photorealistic, detailed, lifelike. Natural lighting and perspective.',
    };

    const modifier = styleModifiers[style as keyof typeof styleModifiers] || '';

    return `${prompt}. ${modifier}. No text overlays, no watermarks, high quality digital art.`;
  }

  /**
   * Get aspect ratio string from resolution
   */
  private getAspectRatio(resolution: { width: number; height: number }): string {
    const ratio = resolution.width / resolution.height;

    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
    if (Math.abs(ratio - 4/3) < 0.1) return '4:3';
    if (Math.abs(ratio - 3/4) < 0.1) return '3:4';

    // Default to closest standard ratio
    return ratio > 1 ? '16:9' : '9:16';
  }
}

// Singleton instance
export const geminiNanoBananaClient = new GeminiNanoBananaClient();
```

**Environment Variables** (add to `backend/.env`):
```env
GEMINI_IMAGEN_API_KEY=your_gemini_imagen_api_key_here
GEMINI_IMAGEN_API_URL=https://generativelanguage.googleapis.com/v1beta
```

---

### 2. AI Tool: `identifyImageNeeds`

**Location**: `backend/src/services/ai/tools/imageTools.ts` (NEW FILE)

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../../../lib/supabaseClient.js';
import { LoggerService } from '../../LoggerService.js';

/**
 * Identify where images are needed in artifact content
 */
export const identifyImageNeeds = tool({
  description: `Analyze artifact content to identify where images should be placed.

Type-specific image placement rules:
- Blog: Hero image + 1 image per H2 section (max 6 images)
- Social Post: 1-2 primary images only
- Showcase: Hero + problem illustration + solution diagram + results visualization (max 4)

For each image, specify:
1. Placement: After which heading or paragraph
2. Description: What should the image show?
3. Purpose: illustration, diagram, photo, screenshot, chart
4. Style: professional, modern, abstract, realistic

Returns array of image needs stored in database.`,

  parameters: z.object({
    artifactId: z.string().uuid().describe('Artifact ID'),
    content: z.string().min(100).describe('Artifact content (Markdown)'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Artifact type'),
  }),

  execute: async ({ artifactId, content, artifactType }) => {
    try {
      LoggerService.info('identifyImageNeeds', 'Analyzing content for image needs', {
        artifactId,
        artifactType,
        contentLength: content.length,
      });

      // Build image identification prompt
      const prompt = buildImageIdentificationPrompt(content, artifactType);

      // Use Claude for structural analysis
      const { generateText } = await import('ai');
      const { anthropic } = await import('@ai-sdk/anthropic');

      const { text: response } = await generateText({
        model: anthropic('claude-sonnet-4-5'),
        prompt,
        maxTokens: 2000,
      });

      // Parse response (expect JSON array of image needs)
      const imageNeeds = JSON.parse(response) as Array<{
        placement_after: string;
        description: string;
        purpose: string;
        style: string;
      }>;

      // Store image needs in database
      const { data: storedNeeds, error: dbError } = await supabase
        .from('artifact_images')
        .insert(
          imageNeeds.map(need => ({
            artifact_id: artifactId,
            placement_after: need.placement_after,
            description: need.description,
            purpose: need.purpose,
            style: need.style,
            status: 'pending',
          }))
        )
        .select();

      if (dbError) {
        throw dbError;
      }

      LoggerService.info('identifyImageNeeds', 'Image needs identified', {
        artifactId,
        imageCount: storedNeeds.length,
      });

      return {
        success: true,
        imageNeeds: storedNeeds,
        count: storedNeeds.length,
        message: `Identified ${storedNeeds.length} image placements`,
      };
    } catch (error) {
      LoggerService.error('identifyImageNeeds', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        sourceCode: 'image_identification',
      });

      return {
        success: false,
        error: 'Image identification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Build image identification prompt
 */
function buildImageIdentificationPrompt(content: string, artifactType: string): string {
  const typeRules = {
    blog: 'Hero image (always) + 1 image per H2 section. Maximum 6 images total.',
    social_post: '1-2 primary images only. Keep minimal for social media.',
    showcase: 'Hero image + problem illustration + solution diagram + results visualization. Maximum 4 images.',
  };

  return `You are analyzing content to identify where images would enhance the message.

Artifact Type: ${artifactType}
Image Placement Rules: ${typeRules[artifactType as keyof typeof typeRules]}

Content:
${content}

Identify logical image placements:
- Hero image (always place at the top, before first heading)
- Section illustrations (1 per major section for blogs/showcases)
- Supporting visuals (diagrams, charts, screenshots where appropriate)

For each image, specify:
1. placement_after: The exact heading text or "START" for hero image
2. description: Detailed description of what the image should show
3. purpose: One of: illustration, diagram, photo, screenshot, chart
4. style: One of: professional, modern, abstract, realistic

Return JSON array of image needs:
[
  {
    "placement_after": "START",
    "description": "Hero image showing...",
    "purpose": "illustration",
    "style": "professional"
  },
  {
    "placement_after": "## Introduction",
    "description": "Diagram illustrating...",
    "purpose": "diagram",
    "style": "modern"
  }
]

Return only valid JSON array, no additional text.`;
}
```

---

### 3. AI Tool: `generatePlaceholderImage`

**Location**: `backend/src/services/ai/tools/imageTools.ts` (add to existing file)

```typescript
/**
 * Generate placeholder image (quick, low-quality concept)
 * Uses simple text-to-image service for fast generation
 */
export const generatePlaceholderImage = tool({
  description: `Generate placeholder image for user approval.

Uses fast, simple text-to-image service (NOT Gemini Nano Banana).
Placeholders are sketch/wireframe style for concept approval only.

Returns temporary URL to placeholder image.`,

  parameters: z.object({
    imageId: z.string().uuid().describe('Image ID from artifact_images table'),
    description: z.string().describe('Image description'),
    style: z.enum(['professional', 'modern', 'abstract', 'realistic']).describe('Image style'),
  }),

  execute: async ({ imageId, description, style }) => {
    try {
      LoggerService.info('generatePlaceholderImage', 'Generating placeholder', {
        imageId,
        style,
      });

      // For MVP: Use a simple placeholder generation service
      // Options: DALL-E mini, Replicate's SDXL-Lightning, or simple mockup
      const placeholderUrl = await generateSimplePlaceholder(description, style);

      // Update artifact_images with placeholder URL
      const { error: dbError } = await supabase
        .from('artifact_images')
        .update({
          placeholder_url: placeholderUrl,
          status: 'placeholder_generated',
        })
        .eq('id', imageId);

      if (dbError) {
        throw dbError;
      }

      LoggerService.info('generatePlaceholderImage', 'Placeholder generated', {
        imageId,
        placeholderUrl,
      });

      return {
        success: true,
        imageId,
        placeholderUrl,
        message: 'Placeholder generated successfully',
      };
    } catch (error) {
      LoggerService.error('generatePlaceholderImage', error instanceof Error ? error : new Error(String(error)), {
        imageId,
        sourceCode: 'placeholder_generation',
      });

      return {
        success: false,
        imageId,
        error: 'Placeholder generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Generate simple placeholder (temporary implementation)
 * TODO: Replace with actual placeholder service (DALL-E mini, Replicate, etc.)
 */
async function generateSimplePlaceholder(description: string, style: string): Promise<string> {
  // For MVP: Use placeholder.com or similar service
  // This is a temporary solution - replace with actual image generation
  const width = 800;
  const height = 600;
  const bgColor = '333333';
  const textColor = 'ffffff';
  const text = encodeURIComponent(description.slice(0, 50));

  return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${text}`;
}
```

---

### 4. AI Tool: `generateFinalImage`

**Location**: `backend/src/services/ai/tools/imageTools.ts` (add to existing file)

```typescript
import { geminiNanoBananaClient } from '../../../lib/geminiNanoBananaClient.js';

/**
 * Generate final high-quality image using Gemini Nano Banana
 */
export const generateFinalImage = tool({
  description: `Generate final high-quality image using Gemini Nano Banana.

Only approved placeholders are generated.
Images uploaded to Supabase storage and URLs returned.

Resolution by artifact type:
- Blog: 1200x630
- Social Post: 1080x1080
- Showcase: Variable based on purpose

Format: PNG or JPEG (optimized for web, <500KB).`,

  parameters: z.object({
    imageId: z.string().uuid().describe('Image ID from artifact_images table'),
    description: z.string().describe('Image description'),
    style: z.enum(['professional', 'modern', 'abstract', 'realistic']).describe('Image style'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Artifact type'),
    purpose: z.enum(['illustration', 'diagram', 'photo', 'screenshot', 'chart']).describe('Image purpose'),
  }),

  execute: async ({ imageId, description, style, artifactType, purpose }) => {
    try {
      LoggerService.info('generateFinalImage', 'Generating final image', {
        imageId,
        style,
        artifactType,
        purpose,
      });

      // Get image record
      const { data: imageRecord } = await supabase
        .from('artifact_images')
        .select('*, artifact_id')
        .eq('id', imageId)
        .single();

      if (!imageRecord) {
        throw new Error('Image record not found');
      }

      if (imageRecord.status !== 'approved') {
        throw new Error('Image must be approved before final generation');
      }

      // Increment generation attempts
      await supabase
        .from('artifact_images')
        .update({ generation_attempts: imageRecord.generation_attempts + 1 })
        .eq('id', imageId);

      // Determine resolution
      const resolution = getResolutionForType(artifactType, purpose);

      // Generate image with Gemini Nano Banana
      const imageBuffer = await geminiNanoBananaClient.generateImage({
        prompt: description,
        style,
        resolution,
        quality: 'hd',
      });

      // Upload to Supabase storage
      const storagePath = `${imageRecord.artifact_id}/images/${imageId}.png`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('artifacts')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('artifacts')
        .getPublicUrl(storagePath);

      // Update artifact_images with final URL
      const { error: dbError } = await supabase
        .from('artifact_images')
        .update({
          final_url: publicUrl,
          status: 'final_generated',
        })
        .eq('id', imageId);

      if (dbError) {
        throw dbError;
      }

      LoggerService.info('generateFinalImage', 'Final image generated', {
        imageId,
        finalUrl: publicUrl,
      });

      return {
        success: true,
        imageId,
        finalUrl: publicUrl,
        message: 'Final image generated successfully',
      };
    } catch (error) {
      // Mark as failed if max attempts reached
      const { data: imageRecord } = await supabase
        .from('artifact_images')
        .select('generation_attempts')
        .eq('id', imageId)
        .single();

      if (imageRecord && imageRecord.generation_attempts >= 3) {
        await supabase
          .from('artifact_images')
          .update({ status: 'failed' })
          .eq('id', imageId);
      }

      LoggerService.error('generateFinalImage', error instanceof Error ? error : new Error(String(error)), {
        imageId,
        sourceCode: 'final_image_generation',
      });

      return {
        success: false,
        imageId,
        error: 'Final image generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Get resolution based on artifact type and purpose
 */
function getResolutionForType(
  artifactType: string,
  purpose: string
): { width: number; height: number } {
  if (artifactType === 'blog') {
    return { width: 1200, height: 630 }; // Standard blog post image
  }

  if (artifactType === 'social_post') {
    return { width: 1080, height: 1080 }; // Square for social media
  }

  if (artifactType === 'showcase') {
    // Variable based on purpose
    if (purpose === 'diagram' || purpose === 'chart') {
      return { width: 1200, height: 800 }; // Wide for diagrams
    }
    return { width: 1200, height: 900 }; // Standard showcase
  }

  return { width: 1200, height: 630 }; // Default
}
```

---

### 5. Image Management Controller

**Location**: `backend/src/controllers/imageManagement.controller.ts` (NEW FILE)

```typescript
import { Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { LoggerService } from '../services/LoggerService.js';

/**
 * Get all images for an artifact
 */
export const getArtifactImages = async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate artifact ownership
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('id')
      .eq('id', artifactId)
      .eq('user_id', userId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Get all images for artifact
    const { data: images, error } = await supabase
      .from('artifact_images')
      .select('*')
      .eq('artifact_id', artifactId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return res.status(200).json({ images });
  } catch (error) {
    LoggerService.error('getArtifactImages', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Approve placeholder image
 */
export const approvePlaceholder = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate image ownership through artifact
    const { data: image } = await supabase
      .from('artifact_images')
      .select('*, artifacts!inner(user_id)')
      .eq('id', imageId)
      .single();

    if (!image || image.artifacts.user_id !== userId) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Update status to approved
    const { data: updated, error } = await supabase
      .from('artifact_images')
      .update({ status: 'approved' })
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    LoggerService.info('approvePlaceholder', 'Placeholder approved', { imageId, userId });

    return res.status(200).json({
      success: true,
      image: updated,
      message: 'Placeholder approved',
    });
  } catch (error) {
    LoggerService.error('approvePlaceholder', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reject placeholder image
 */
export const rejectPlaceholder = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate image ownership
    const { data: image } = await supabase
      .from('artifact_images')
      .select('*, artifacts!inner(user_id)')
      .eq('id', imageId)
      .single();

    if (!image || image.artifacts.user_id !== userId) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Update status to rejected
    const { error } = await supabase
      .from('artifact_images')
      .update({ status: 'rejected' })
      .eq('id', imageId);

    if (error) {
      throw error;
    }

    LoggerService.info('rejectPlaceholder', 'Placeholder rejected', { imageId, userId });

    return res.status(200).json({
      success: true,
      message: 'Placeholder rejected',
    });
  } catch (error) {
    LoggerService.error('rejectPlaceholder', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark artifact as complete
 */
export const markArtifactComplete = async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate artifact ownership
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .eq('user_id', userId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Update status to complete
    const { data: updated, error } = await supabase
      .from('artifacts')
      .update({ status: 'complete' })
      .eq('id', artifactId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // TODO: Send notification (email, in-app, WebSocket)

    LoggerService.info('markArtifactComplete', 'Artifact marked complete', { artifactId, userId });

    return res.status(200).json({
      success: true,
      artifact: updated,
      message: 'Content creation complete! Review your artifact and publish when ready.',
    });
  } catch (error) {
    LoggerService.error('markArtifactComplete', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Routes** (`backend/src/routes/imageManagement.routes.ts`):
```typescript
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getArtifactImages,
  approvePlaceholder,
  rejectPlaceholder,
  markArtifactComplete,
} from '../controllers/imageManagement.controller.js';

const router = express.Router();

router.get('/artifacts/:artifactId/images', requireAuth, getArtifactImages);
router.post('/images/:imageId/approve', requireAuth, approvePlaceholder);
router.post('/images/:imageId/reject', requireAuth, rejectPlaceholder);
router.post('/artifacts/:artifactId/complete', requireAuth, markArtifactComplete);

export default router;
```

---

### 6. Register New Tools

**Location**: `backend/src/services/ai/AIService.ts`

```typescript
// Add imports
import { identifyImageNeeds, generatePlaceholderImage, generateFinalImage } from './tools/imageTools.js';

// Update AVAILABLE_TOOLS
const AVAILABLE_TOOLS = {
  // ... existing tools

  // Phase 3: Image Generation
  identifyImageNeeds,
  generatePlaceholderImage,
  generateFinalImage,
};
```

---

## Frontend Implementation

### 1. Create PlaceholderApprovalUI Component

**Location**: `frontend/src/features/portfolio/components/artifact/PlaceholderApprovalUI.tsx` (NEW FILE)

```tsx
import { useState } from 'react';
import { Check, X, Loader2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ArtifactImage } from '../../types/portfolio';

export interface PlaceholderApprovalUIProps {
  images: ArtifactImage[];
  onApprove: (imageId: string) => Promise<void>;
  onReject: (imageId: string) => Promise<void>;
  onEditDescription: (imageId: string, newDescription: string) => Promise<void>;
  onGenerateFinalImages: () => Promise<void>;
}

export function PlaceholderApprovalUI({
  images,
  onApprove,
  onReject,
  onEditDescription,
  onGenerateFinalImages,
}: PlaceholderApprovalUIProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const approvedCount = images.filter(img => img.status === 'approved').length;
  const canGenerate = approvedCount > 0;

  const handleApprove = async (imageId: string) => {
    setProcessingIds(prev => new Set(prev).add(imageId));
    try {
      await onApprove(imageId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const handleReject = async (imageId: string) => {
    setProcessingIds(prev => new Set(prev).add(imageId));
    try {
      await onReject(imageId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const handleGenerateFinal = async () => {
    setIsGenerating(true);
    try {
      await onGenerateFinalImages();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Review Image Placeholders</h3>
        <p className="text-sm text-muted-foreground">
          Approve or reject each placeholder before generating final high-quality images.
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {approvedCount} of {images.length} approved
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerateFinal}
            disabled={!canGenerate || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Final Images
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Placeholder grid */}
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image) => (
            <PlaceholderCard
              key={image.id}
              image={image}
              isProcessing={processingIds.has(image.id)}
              onApprove={() => handleApprove(image.id)}
              onReject={() => handleReject(image.id)}
              onEditDescription={(desc) => onEditDescription(image.id, desc)}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

/**
 * Individual placeholder card
 */
function PlaceholderCard({
  image,
  isProcessing,
  onApprove,
  onReject,
  onEditDescription,
}: {
  image: ArtifactImage;
  isProcessing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEditDescription: (description: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className="p-3 space-y-3">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted rounded overflow-hidden">
        {image.placeholder_url ? (
          <img
            src={image.placeholder_url}
            alt={image.description}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Generating placeholder...
          </div>
        )}

        {/* Status badge */}
        {image.status === 'approved' && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Check className="h-3 w-3" />
            Approved
          </div>
        )}
        {image.status === 'rejected' && (
          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <X className="h-3 w-3" />
            Rejected
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm flex-1">{image.description}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{image.purpose}</span>
          <span>•</span>
          <span className="capitalize">{image.style}</span>
        </div>
      </div>

      {/* Action buttons */}
      {image.status === 'placeholder_generated' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1 gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <X className="h-3 w-3" />
                Reject
              </>
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="h-3 w-3" />
                Approve
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default PlaceholderApprovalUI;
```

---

### 2. Update Types

**Location**: `frontend/src/features/portfolio/types/portfolio.ts`

```typescript
// Add Phase 3 statuses
export type ArtifactStatus =
  | 'draft'
  | 'researching'
  | 'skeleton_ready'
  | 'skeleton_approved'
  | 'writing'
  | 'humanity_checking'
  | 'review_ready'
  | 'content_approved'
  | 'identifying_images'        // NEW
  | 'generating_placeholders'   // NEW
  | 'placeholder_review'        // NEW
  | 'generating_images'         // NEW
  | 'complete'                  // NEW
  | 'ready'
  | 'published';

// Add image interface
export interface ArtifactImage {
  id: string;
  artifact_id: string;
  placement_after: string;
  description: string;
  purpose: 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart';
  style: 'professional' | 'modern' | 'abstract' | 'realistic';
  placeholder_url: string | null;
  final_url: string | null;
  status: 'pending' | 'placeholder_generated' | 'approved' | 'rejected' | 'final_generated' | 'failed';
  generation_attempts: number;
  created_at: string;
  updated_at: string;
}
```

---

## Testing Requirements

### Unit Tests

**Backend**:
1. `geminiNanoBananaClient.test.ts`:
   - Test API initialization
   - Test prompt enhancement
   - Test aspect ratio calculation

2. `imageTools.test.ts`:
   - Test image needs identification
   - Test placeholder generation
   - Test final image generation
   - Test resolution calculation

**Frontend**:
1. `PlaceholderApprovalUI.test.tsx`:
   - Test placeholder card rendering
   - Test approve/reject actions
   - Test "Generate Final Images" button state

---

### Integration Tests

1. Test image workflow:
   - POST `/api/artifacts/:id/images/identify`
   - Verify image needs stored
   - Generate placeholders
   - Approve placeholders
   - Generate final images
   - Verify images uploaded to Supabase storage

---

### E2E Tests (Playwright)

1. **Complete Image Generation Flow**:
   - User approves content
   - System identifies image needs
   - System generates placeholders
   - User reviews placeholders
   - User approves selected placeholders
   - User clicks "Generate Final Images"
   - Wait for generation completion
   - Verify final images appear in content
   - Verify artifact status = 'complete'
   - Verify completion notification shown

---

## Validation Commands

```bash
# Backend
cd backend
npm install @google-cloud/aiplatform  # Or appropriate Gemini Imagen package
npm run build
npm run test:unit

# Frontend
cd frontend
npm run build
npm run test:unit

# Database
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT * FROM artifact_images LIMIT 1"
})
# Verify table structure

# Storage
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT * FROM storage.buckets WHERE id = 'artifacts'"
})
# Verify bucket exists
```

---

## Deployment Checklist

- [ ] Gemini Imagen API key configured
- [ ] Database migration applied (`004_add_image_generation_tables.sql`)
- [ ] Supabase storage bucket created and configured
- [ ] RLS policies applied to storage bucket
- [ ] Gemini Nano Banana client created
- [ ] Image tools created (identify, placeholder, final)
- [ ] Tools registered in AIService
- [ ] Image management controller and routes created
- [ ] PlaceholderApprovalUI component created
- [ ] Types updated (new statuses, ArtifactImage interface)
- [ ] Tests passing
- [ ] Build succeeds

---

## Known Limitations

1. **Gemini Nano Banana Setup**: Requires Google Cloud project setup and API access. May need approval process.

2. **Placeholder Service**: MVP uses simple placeholder.com. Should be replaced with actual sketch generation service.

3. **Image Optimization**: First iteration doesn't optimize/compress images. May exceed 500KB target.

4. **Regeneration Limit**: Hard limit of 3 attempts. May need manual upload option.

5. **Batch Generation**: Generates images sequentially. Parallel generation could improve speed.

---

## Next Steps (After Phase 3 Complete)

**Phase 4 (Future)**: Tone Enhancement
- User-provided writing examples
- Tone analysis and learning
- Custom tone profiles
- Multi-tone blending

**Or:** Begin Phase 1 implementation if all 3 MVP phases approved.

---

**Spec Status**: Ready for Implementation
**Awaiting**: Phase 1-2 completion + User approval for Phase 3
