/**
 * Artifact Research Routes (Phase 1)
 *
 * API routes for artifact research management.
 */

import { Router } from 'express';
import * as researchController from '../controllers/artifactResearch.controller.js';

const router = Router();

// Get all research for an artifact
router.get('/:id/research', researchController.getArtifactResearch);

// Add manual research entry
router.post('/:id/research', researchController.addArtifactResearch);

// Delete research entry
router.delete('/:id/research/:researchId', researchController.deleteArtifactResearch);

export default router;
