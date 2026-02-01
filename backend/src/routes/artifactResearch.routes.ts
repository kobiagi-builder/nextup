/**
 * Artifact Research Routes (Phase 1)
 *
 * API routes for artifact research management.
 */

import { Router } from 'express';
import * as researchController from '../controllers/artifactResearch.controller.js';
import * as imageController from '../controllers/imageGeneration.controller.js';
import * as foundationsController from '../controllers/foundations.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

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

// ============================================
// Phase 4: Writing Characteristics & Foundations Routes
// ============================================

// Get writing characteristics for an artifact
router.get('/:id/writing-characteristics', requireAuth, foundationsController.getWritingCharacteristics);

// Approve foundations and resume pipeline
router.post('/:id/approve-foundations', requireAuth, foundationsController.approveFoundations);

export default router;
