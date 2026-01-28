/**
 * Image Generation Controller (Phase 3)
 *
 * API endpoints for image generation workflow:
 * 1. Approve/reject image descriptions
 * 2. Generate final images
 * 3. Regenerate specific images
 */

import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { VisualsMetadata } from '../types/portfolio.js';

/**
 * POST /api/artifacts/:id/images/approve
 *
 * Approve or reject image descriptions before final generation.
 */
export async function approveImageDescriptions(req: Request, res: Response) {
  const { id: artifactId } = req.params;
  const { approvedIds, rejectedIds } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate ownership
    const { data: artifact } = await supabaseAdmin
      .from('artifacts')
      .select('visuals_metadata, user_id')
      .eq('id', artifactId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (artifact.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update approval statuses
    const metadata = artifact.visuals_metadata as VisualsMetadata;
    const updatedNeeds = metadata.needs.map((need) => {
      if (approvedIds.includes(need.id)) {
        return { ...need, approved: true };
      }
      if (rejectedIds.includes(need.id)) {
        return { ...need, approved: false };
      }
      return need;
    });

    // Filter out rejected needs
    const filteredNeeds = updatedNeeds.filter((need) =>
      !rejectedIds.includes(need.id)
    );

    // Update artifact metadata
    await supabaseAdmin
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

    return res.status(200).json({
      success: true,
      approved: approvedIds.length,
      rejected: rejectedIds.length,
      remaining: filteredNeeds.length,
    });

  } catch (error: any) {
    logger.error('Failed to approve image descriptions', { error: error.message, artifactId });
    return res.status(500).json({
      error: 'Failed to approve image descriptions',
      message: error.message,
    });
  }
}

/**
 * POST /api/artifacts/:id/images/generate
 *
 * Generate final images for all approved descriptions.
 */
export async function generateFinalImages(req: Request, res: Response) {
  const { id: artifactId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate ownership
    const { data: artifact } = await supabaseAdmin
      .from('artifacts')
      .select('user_id, visuals_metadata')
      .eq('id', artifactId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (artifact.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metadata = artifact.visuals_metadata as VisualsMetadata;
    const approvedCount = metadata.needs.filter((n) => n.approved).length;

    if (approvedCount === 0) {
      return res.status(400).json({
        error: 'No approved image descriptions found',
      });
    }

    // MVP: Skip actual image generation, transition directly to ready
    // In production, this would use DALL-E/Gemini to generate images
    await supabaseAdmin
      .from('artifacts')
      .update({
        status: 'ready', // MVP: Set to ready (images generation skipped)
        visuals_metadata: {
          ...metadata,
          phase: {
            phase: 'complete',
            finals: [], // MVP: No actual images generated
          },
          generation_stats: {
            ...metadata.generation_stats,
            finals_generated: approvedCount, // Mark as "generated" for MVP
          },
        },
      })
      .eq('id', artifactId);

    return res.status(200).json({
      success: true,
      message: 'Images approved. Artifact is now ready.', // MVP message
      count: approvedCount,
    });

  } catch (error: any) {
    logger.error('Failed to start image generation', { error: error.message, artifactId });
    return res.status(500).json({
      error: 'Failed to start image generation',
      message: error.message,
    });
  }
}

/**
 * POST /api/artifacts/:id/images/:imageId/regenerate
 *
 * Regenerate a specific image with optional updated description.
 */
export async function regenerateImage(req: Request, res: Response) {
  const { id: artifactId, imageId } = req.params;
  const { description } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate ownership
    const { data: artifact } = await supabaseAdmin
      .from('artifacts')
      .select('user_id, visuals_metadata')
      .eq('id', artifactId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (artifact.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metadata = artifact.visuals_metadata as VisualsMetadata;
    const existingImage = metadata.finals.find((f) => f.id === imageId);

    if (!existingImage) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Check regeneration limit
    if (existingImage.generation_attempts >= 3) {
      return res.status(400).json({
        error: 'Maximum regeneration attempts reached (3)',
      });
    }

    // Trigger regeneration
    // In production, this would use the regenerateImage tool

    return res.status(202).json({
      success: true,
      message: 'Image regeneration started',
      imageId,
    });

  } catch (error: any) {
    logger.error('Failed to regenerate image', { error: error.message, artifactId, imageId });
    return res.status(500).json({
      error: 'Failed to regenerate image',
      message: error.message,
    });
  }
}

/**
 * GET /api/artifacts/:id/images/status
 *
 * Get current image generation status.
 */
export async function getImageGenerationStatus(req: Request, res: Response) {
  const { id: artifactId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate ownership
    const { data: artifact } = await supabaseAdmin
      .from('artifacts')
      .select('user_id, status, visuals_metadata')
      .eq('id', artifactId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (artifact.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metadata = artifact.visuals_metadata as VisualsMetadata;

    return res.status(200).json({
      status: artifact.status,
      phase: metadata.phase,
      needs: metadata.needs || [],
      finals: metadata.finals || [],
      stats: metadata.generation_stats || {},
    });

  } catch (error: any) {
    logger.error('Failed to get image generation status', { error: error.message, artifactId });
    return res.status(500).json({
      error: 'Failed to get image generation status',
      message: error.message,
    });
  }
}
