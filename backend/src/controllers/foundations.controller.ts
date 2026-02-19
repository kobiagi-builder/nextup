/**
 * Foundations Controller (Phase 4)
 *
 * Handles HTTP requests for the foundations workflow:
 * - Approving foundations (skeleton + characteristics)
 * - Getting writing characteristics
 * - Managing writing examples
 */

import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { pipelineExecutor } from '../services/ai/PipelineExecutor.js';
import type { WritingCharacteristics } from '../types/portfolio.js';

/**
 * Approve foundations and continue pipeline
 *
 * POST /api/artifact/:id/approve-foundations
 *
 * Changes artifact status from 'foundations_approval' to continue with content writing.
 * Triggers the pipeline to resume from writeFullContent step.
 */
export const approveFoundations = async (req: Request, res: Response): Promise<void> => {
  try {
    const artifactId = req.params.id as string;
    const { skeleton_content } = req.body || {};
    const userId = req.user?.id;

    if (!artifactId) {
      res.status(400).json({
        error: 'Missing artifact ID',
        message: 'Artifact ID is required in path parameter',
      });
      return;
    }

    logger.info('[FoundationsController] Approving foundations', {
      artifactId,
      hasUserId: !!userId,
      hasSkeletonContent: !!skeleton_content,
    });

    // Verify artifact exists and belongs to user
    const { data: artifact, error: fetchError } = await supabaseAdmin
      .from('artifacts')
      .select('id, status, user_id')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      logger.warn('[FoundationsController] Artifact not found', {
        artifactId,
        error: fetchError?.message,
      });
      res.status(404).json({
        error: 'Artifact not found',
        message: 'The specified artifact does not exist',
      });
      return;
    }

    // Verify ownership if userId available
    if (userId && artifact.user_id !== userId) {
      logger.warn('[FoundationsController] Unauthorized access attempt', {
        artifactId,
        artifactUserId: artifact.user_id,
        requestUserId: userId,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this artifact',
      });
      return;
    }

    // Verify artifact is in correct status for approval
    // Accept both 'skeleton' (legacy) and 'foundations_approval' (current flow)
    const approvalEligibleStatuses = ['skeleton', 'foundations_approval'];
    if (!approvalEligibleStatuses.includes(artifact.status)) {
      logger.warn('[FoundationsController] Invalid status for approval', {
        artifactId,
        currentStatus: artifact.status,
        expectedStatuses: approvalEligibleStatuses,
      });
      res.status(400).json({
        error: 'Invalid status',
        message: `Cannot approve foundations: artifact is in '${artifact.status}' status, expected one of: ${approvalEligibleStatuses.join(', ')}`,
      });
      return;
    }

    // Save user's skeleton edits if provided
    if (skeleton_content && typeof skeleton_content === 'string') {
      logger.info('[FoundationsController] Saving user skeleton edits', {
        artifactId,
        contentLength: skeleton_content.length,
      });

      const { error: updateError } = await supabaseAdmin
        .from('artifacts')
        .update({
          content: skeleton_content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifactId);

      if (updateError) {
        logger.error(`[FoundationsController] ${updateError.message}`, {
          artifactId,
          sourceCode: 'approveFoundations.saveSkeletonContent',
        });
        res.status(500).json({
          error: 'Failed to save skeleton',
          message: 'Could not save your skeleton edits',
        });
        return;
      }
    }

    // Resume pipeline from approval point
    logger.info('[FoundationsController] Resuming pipeline from approval', {
      artifactId,
    });

    const result = await pipelineExecutor.resumeFromApproval(artifactId);

    if (!result.success) {
      logger.error(`[FoundationsController] ${result.error?.message || 'Pipeline failed'}`, {
        artifactId,
        error: result.error,
      });
      res.status(500).json({
        error: 'Pipeline execution failed',
        message: result.error?.message || 'Failed to continue content generation',
        details: result.error,
      });
      return;
    }

    logger.info('[FoundationsController] Foundations approved, pipeline resumed', {
      artifactId,
      traceId: result.traceId,
      stepsCompleted: result.stepsCompleted,
    });

    res.status(200).json({
      success: true,
      message: 'Foundations approved, content generation started',
      artifactId,
      traceId: result.traceId,
      pipelineResult: {
        stepsCompleted: result.stepsCompleted,
        totalSteps: result.totalSteps,
        duration: result.duration,
      },
    });
  } catch (error) {
    logger.error(`[FoundationsController] ${error instanceof Error ? error.message : String(error)}`, {
        sourceCode: 'approveFoundations',
      });

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * Get writing characteristics for an artifact
 *
 * GET /api/artifact/:id/writing-characteristics
 *
 * Returns the analyzed writing characteristics for the specified artifact.
 */
export const getWritingCharacteristics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: artifactId } = req.params;
    const userId = req.user?.id;

    if (!artifactId) {
      res.status(400).json({
        error: 'Missing artifact ID',
        message: 'Artifact ID is required in path parameter',
      });
      return;
    }

    logger.debug('[FoundationsController] Fetching writing characteristics', {
      artifactId,
    });

    // Verify artifact exists and belongs to user (via join)
    const { data, error } = await supabaseAdmin
      .from('artifact_writing_characteristics')
      .select(`
        id,
        artifact_id,
        characteristics,
        summary,
        recommendations,
        created_at,
        updated_at,
        artifacts!inner(user_id)
      `)
      .eq('artifact_id', artifactId)
      .single();

    if (error || !data) {
      logger.debug('[FoundationsController] Writing characteristics not found', {
        artifactId,
        error: error?.message,
      });
      res.status(404).json({
        error: 'Not found',
        message: 'Writing characteristics not found for this artifact',
      });
      return;
    }

    // Verify ownership if userId available
    const artifactUserId = (data.artifacts as any)?.user_id;
    if (userId && artifactUserId !== userId) {
      logger.warn('[FoundationsController] Unauthorized access attempt', {
        artifactId,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this artifact',
      });
      return;
    }

    res.status(200).json({
      id: data.id,
      artifactId: data.artifact_id,
      characteristics: data.characteristics as WritingCharacteristics,
      summary: data.summary,
      recommendations: data.recommendations,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    logger.error(`[FoundationsController] ${error instanceof Error ? error.message : String(error)}`, {
        sourceCode: 'getWritingCharacteristics',
      });

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
