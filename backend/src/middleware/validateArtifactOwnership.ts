/**
 * Artifact Ownership Validation Middleware
 *
 * Ensures users can only access artifacts they own.
 * Critical security pattern for multi-tenant data isolation.
 */

import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

// =============================================================================
// Middleware
// =============================================================================

/**
 * Validate that the authenticated user owns the artifact
 *
 * Extracts artifactId from:
 * - req.body.artifactId
 * - req.params.artifactId
 * - req.query.artifactId
 *
 * Requires tokenValidationMiddleware to run first (sets req.user)
 */
export async function validateArtifactOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get artifactId from request
    const artifactId = req.body?.artifactId || req.params?.artifactId || req.query?.artifactId;

    if (!artifactId) {
      res.status(400).json({
        error: 'Missing artifact ID',
        category: 'VALIDATION_ERROR',
      });
      return;
    }

    // Get user ID from auth token (set by tokenValidationMiddleware)
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        category: 'AUTH_ERROR',
      });
      return;
    }

    // Query artifact ownership
    const { data: artifact, error } = await supabaseAdmin
      .from('artifacts')
      .select('id, user_id')
      .eq('id', artifactId)
      .single();

    if (error || !artifact) {
      logger.warn('[ArtifactOwnershipValidation] Artifact not found', {
        artifactId,
        error: error?.message,
      });

      res.status(404).json({
        error: 'Artifact not found',
        category: 'ARTIFACT_NOT_FOUND',
      });
      return;
    }

    // Verify ownership
    if (artifact.user_id !== userId) {
      logger.warn('[ArtifactOwnershipValidation] Access denied - ownership mismatch', {
        artifactId,
        requestedBy: userId,
        ownedBy: artifact.user_id,
      });

      res.status(403).json({
        error: 'Access denied',
        category: 'OWNERSHIP_ERROR',
      });
      return;
    }

    // Ownership verified - proceed
    next();
  } catch (error) {
    logger.error('[ArtifactOwnershipValidation] Error in validation', {
      artifactId: req.body?.artifactId || req.params?.artifactId,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    res.status(500).json({
      error: 'Internal server error',
      category: 'SERVER_ERROR',
    });
  }
}

// =============================================================================
// Batch Validation
// =============================================================================

/**
 * Validate ownership of multiple artifacts
 *
 * Useful for endpoints that operate on multiple artifacts at once.
 */
export async function validateMultipleArtifactOwnership(
  artifactIds: string[],
  userId: string
): Promise<{
  valid: boolean;
  ownedArtifacts: string[];
  unauthorizedArtifacts: string[];
}> {
  if (artifactIds.length === 0) {
    return {
      valid: true,
      ownedArtifacts: [],
      unauthorizedArtifacts: [],
    };
  }

  const { data: artifacts, error } = await supabaseAdmin
    .from('artifacts')
    .select('id, user_id')
    .in('id', artifactIds);

  if (error) {
    logger.error('[ValidateMultipleArtifactOwnership] Error in validation', {
      artifactCount: artifactIds.length,
      error: error,
    });
    throw error;
  }

  const ownedArtifacts: string[] = [];
  const unauthorizedArtifacts: string[] = [];

  for (const artifactId of artifactIds) {
    const artifact = artifacts?.find(a => a.id === artifactId);

    if (!artifact) {
      unauthorizedArtifacts.push(artifactId);
    } else if (artifact.user_id === userId) {
      ownedArtifacts.push(artifactId);
    } else {
      unauthorizedArtifacts.push(artifactId);
    }
  }

  return {
    valid: unauthorizedArtifacts.length === 0,
    ownedArtifacts,
    unauthorizedArtifacts,
  };
}
