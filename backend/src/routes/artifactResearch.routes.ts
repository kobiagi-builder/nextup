/**
 * Artifact Routes
 *
 * API routes for artifact CRUD and sub-resource management.
 */

import { Router } from 'express';
import * as researchController from '../controllers/artifactResearch.controller.js';
import * as imageController from '../controllers/imageGeneration.controller.js';
import * as foundationsController from '../controllers/foundations.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ============================================
// Artifact CRUD
// ============================================

// Delete an artifact (uses service role to bypass PostgREST anon restrictions)
// Also cleans up storage objects via the Storage API (direct SQL on storage.objects is blocked by Supabase)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.debug('[DeleteArtifact] Deleting artifact', { hasId: !!id });

    // Step 1: Clean up storage objects for this artifact via Storage API
    const { data: files } = await supabaseAdmin.storage
      .from('artifacts')
      .list(id, { limit: 1000 });

    if (files && files.length > 0) {
      // Build full paths (prefix with artifact id)
      const paths = files.map((f) => `${id}/${f.name}`);

      // Also list nested directories (e.g., images/final/)
      const { data: imgDir } = await supabaseAdmin.storage
        .from('artifacts')
        .list(`${id}/images/final`, { limit: 1000 });

      if (imgDir && imgDir.length > 0) {
        paths.push(...imgDir.map((f) => `${id}/images/final/${f.name}`));
      }

      const { error: storageError } = await supabaseAdmin.storage
        .from('artifacts')
        .remove(paths);

      if (storageError) {
        logger.warn('[DeleteArtifact] Storage cleanup failed (non-blocking)', { error: storageError.message });
      } else {
        logger.debug('[DeleteArtifact] Storage cleaned up', { fileCount: paths.length });
      }
    }

    // Step 2: Delete the artifact row (cascades to research, writing_characteristics, ai_conversations)
    const { error } = await supabaseAdmin
      .from('artifacts')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('[DeleteArtifact] Failed', { error: error.message });
      return res.status(500).json({ error: 'Failed to delete artifact' });
    }

    logger.debug('[DeleteArtifact] Success');
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[DeleteArtifact] Internal error', { error: message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Research Sub-resource Routes
// ============================================

// Get all research for an artifact
router.get('/:id/research', researchController.getArtifactResearch);

// Add manual research entry
router.post('/:id/research', researchController.addArtifactResearch);

// Delete research entry
router.delete('/:id/research/:researchId', researchController.deleteArtifactResearch);

// ============================================
// Phase 3: Image Generation Routes (Authentication Required)
// ============================================

// Get image generation status
router.get('/:id/images/status', requireAuth, imageController.getImageGenerationStatus);

// Approve/reject image descriptions
router.post('/:id/images/approve', requireAuth, imageController.approveImageDescriptions);

// Generate final images for approved descriptions
router.post('/:id/images/generate', requireAuth, imageController.generateFinalImages);

// Regenerate specific image
router.post('/:id/images/:imageId/regenerate', requireAuth, imageController.regenerateImage);

// Upload cropped image
router.post('/:id/images/crop', imageController.uploadCroppedImage);

// ============================================
// Phase 4: Writing Characteristics & Foundations Routes
// ============================================

// Get writing characteristics for an artifact
// Uses optionalAuth: app has no auth session yet, but attaches user when available
router.get('/:id/writing-characteristics', optionalAuth, foundationsController.getWritingCharacteristics);

// Approve foundations and resume pipeline
// Uses optionalAuth: app has no auth session yet, but attaches user when available
router.post('/:id/approve-foundations', optionalAuth, foundationsController.approveFoundations);

export default router;
