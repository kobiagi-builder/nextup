/**
 * Foundations Re-analyze Controller
 *
 * Handles re-analyzing foundations (writing characteristics + storytelling + skeleton)
 * when user changes their reference selection.
 *
 * Two modes based on artifact status:
 * - skeleton/foundations_approval: Re-runs foundations steps only, pauses for approval
 * - ready/published: Regenerates full content (foundations + writing + visuals), no pause
 *
 * POST /api/artifacts/:id/re-analyze-foundations
 */

import { Request, Response } from 'express';
import { getSupabase } from '../lib/requestContext.js';
import { logger } from '../lib/logger.js';
import { pipelineExecutor } from '../services/ai/PipelineExecutor.js';

/**
 * Re-analyze foundations with new reference selection
 *
 * POST /api/artifacts/:id/re-analyze-foundations
 * Body: { selectedReferenceIds: string[] }
 *
 * Updates artifact metadata with new selectedReferenceIds, then re-runs
 * foundations pipeline steps (characteristics + storytelling + skeleton).
 * Pipeline pauses again at foundations_approval for user review.
 */
export const reanalyzeFoundations = async (req: Request, res: Response): Promise<void> => {
  try {
    const artifactId = req.params.id as string;
    const { selectedReferenceIds } = req.body || {};
    const userId = req.user?.id;

    if (!artifactId) {
      res.status(400).json({
        error: 'Missing artifact ID',
        message: 'Artifact ID is required in path parameter',
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!Array.isArray(selectedReferenceIds) ||
        !selectedReferenceIds.every((id: unknown) => typeof id === 'string' && id.length > 0)) {
      res.status(400).json({
        error: 'Invalid request body',
        message: 'selectedReferenceIds must be an array of non-empty strings',
      });
      return;
    }

    logger.info('[FoundationsReanalyze] Re-analyzing foundations', {
      artifactId,
      hasUserId: !!userId,
      referenceCount: selectedReferenceIds.length,
    });

    // Verify artifact exists and belongs to user
    const { data: artifact, error: fetchError } = await getSupabase()
      .from('artifacts')
      .select('id, status, user_id, metadata')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      logger.warn('[FoundationsReanalyze] Artifact not found', {
        artifactId,
        error: fetchError?.message,
      });
      res.status(404).json({
        error: 'Artifact not found',
        message: 'The specified artifact does not exist',
      });
      return;
    }

    // Verify ownership
    if (artifact.user_id !== userId) {
      logger.warn('[FoundationsReanalyze] Unauthorized access attempt', {
        artifactId,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this artifact',
      });
      return;
    }

    // Verify artifact is in correct status for re-analysis or regeneration.
    // Note: PipelineExecutor methods also have their own status guards as defense-in-depth
    // (reanalyzeFoundations checks skeleton/foundations_approval, regenerateContent checks ready/published).
    const reanalyzeEligibleStatuses = ['skeleton', 'foundations_approval', 'ready', 'published'];
    if (!reanalyzeEligibleStatuses.includes(artifact.status)) {
      logger.warn('[FoundationsReanalyze] Invalid status for re-analysis', {
        artifactId,
        currentStatus: artifact.status,
        expectedStatuses: reanalyzeEligibleStatuses,
      });
      res.status(400).json({
        error: 'Invalid status',
        message: `Cannot re-analyze foundations: artifact is in '${artifact.status}' status, expected one of: ${reanalyzeEligibleStatuses.join(', ')}`,
      });
      return;
    }

    const originalStatus = artifact.status;

    // Update artifact metadata with new selectedReferenceIds
    const existingMetadata = (artifact.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      selectedReferenceIds,
    };

    const { error: updateError } = await getSupabase()
      .from('artifacts')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', artifactId);

    if (updateError) {
      logger.error(`[FoundationsReanalyze] ${updateError.message}`, {
        artifactId,
        sourceCode: 'reanalyzeFoundations.updateMetadata',
      });
      res.status(500).json({
        error: 'Failed to update references',
        message: 'Could not update reference selection',
      });
      return;
    }

    // Route to correct pipeline method based on original status
    const isPostCreation = ['ready', 'published'].includes(originalStatus);

    logger.info('[FoundationsReanalyze] Starting pipeline', {
      artifactId,
      mode: isPostCreation ? 'regenerate' : 'reanalyze',
      originalStatus,
    });

    const result = isPostCreation
      ? await pipelineExecutor.regenerateContent(artifactId)
      : await pipelineExecutor.reanalyzeFoundations(artifactId);

    if (!result.success) {
      logger.error(`[FoundationsReanalyze] ${result.error?.message || 'Pipeline failed'}`, {
        artifactId,
        error: result.error,
      });
      res.status(500).json({
        error: isPostCreation ? 'Content regeneration failed' : 'Re-analysis failed',
        message: result.error?.message || 'Failed to process foundations',
        details: result.error,
      });
      return;
    }

    logger.info('[FoundationsReanalyze] Pipeline completed', {
      artifactId,
      traceId: result.traceId,
      stepsCompleted: result.stepsCompleted,
      mode: isPostCreation ? 'regenerate' : 'reanalyze',
    });

    res.status(200).json({
      success: true,
      message: isPostCreation
        ? 'Content regeneration started'
        : 'Foundations re-analyzed successfully',
      artifactId,
      traceId: result.traceId,
      pipelineResult: {
        stepsCompleted: result.stepsCompleted,
        totalSteps: result.totalSteps,
        duration: result.duration,
      },
    });
  } catch (error) {
    logger.error(`[FoundationsReanalyze] ${error instanceof Error ? error.message : String(error)}`, {
      sourceCode: 'reanalyzeFoundations',
    });

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
