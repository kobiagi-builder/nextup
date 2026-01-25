/**
 * Artifact Research Controller (Phase 1)
 *
 * Handles research data CRUD operations for artifacts.
 * Research is stored in artifact_research table.
 */

import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { ArtifactResearch } from '../types/portfolio.js';

// =============================================================================
// Get Research for Artifact
// =============================================================================

export async function getArtifactResearch(req: Request, res: Response) {
  try {
    const { id: artifactId } = req.params;

    logger.debug('[GetArtifactResearch] Fetching research', { artifactId });

    // Fetch research results ordered by relevance
    const { data: research, error } = await supabaseAdmin
      .from('artifact_research')
      .select('*')
      .eq('artifact_id', artifactId)
      .order('relevance_score', { ascending: false });

    if (error) {
      logger.error('[GetArtifactResearch] Failed to fetch research', {
        artifactId,
        error: error.message
      });
      return res.status(500).json({ error: 'Failed to fetch research' });
    }

    logger.debug('[GetArtifactResearch] Research fetched', {
      artifactId,
      count: research?.length || 0,
    });

    return res.status(200).json(research || []);
  } catch (error) {
    logger.error('[GetArtifactResearch] Internal server error', {
      artifactId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================================================
// Add Manual Research Entry
// =============================================================================

export async function addArtifactResearch(req: Request, res: Response) {
  try {
    const { id: artifactId } = req.params;
    const { source_type, source_name, source_url, excerpt, relevance_score } = req.body;

    logger.debug('[AddArtifactResearch] Adding research entry', {
      artifactId,
      sourceType: source_type,
    });

    // Validate required fields
    if (!source_type || !source_name || !excerpt) {
      return res.status(400).json({
        error: 'Missing required fields: source_type, source_name, excerpt',
      });
    }

    // Insert research entry
    const { data: newResearch, error } = await supabaseAdmin
      .from('artifact_research')
      .insert({
        artifact_id: artifactId,
        source_type,
        source_name,
        source_url: source_url || null,
        excerpt,
        relevance_score: relevance_score || 1.0, // Default to max relevance for manual entries
      })
      .select()
      .single();

    if (error) {
      logger.error('[AddArtifactResearch] Failed to add research entry', {
        artifactId,
        error: error.message
      });
      return res.status(500).json({ error: 'Failed to add research entry' });
    }

    logger.info('[AddArtifactResearch] Research entry added', {
      artifactId,
      researchId: newResearch.id,
    });

    return res.status(201).json(newResearch);
  } catch (error) {
    logger.error('[AddArtifactResearch] Internal server error', {
      artifactId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================================================
// Delete Research Entry
// =============================================================================

export async function deleteArtifactResearch(req: Request, res: Response) {
  try {
    const { id: artifactId, researchId } = req.params;

    logger.debug('[DeleteArtifactResearch] Deleting research entry', {
      artifactId,
      researchId,
    });

    // Delete research entry
    const { error } = await supabaseAdmin
      .from('artifact_research')
      .delete()
      .eq('id', researchId)
      .eq('artifact_id', artifactId); // Ensure it belongs to this artifact

    if (error) {
      logger.error('[DeleteArtifactResearch] Failed to delete research entry', {
        artifactId,
        researchId,
        error: error.message
      });
      return res.status(500).json({ error: 'Failed to delete research entry' });
    }

    logger.info('[DeleteArtifactResearch] Research entry deleted', {
      artifactId,
      researchId,
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('[DeleteArtifactResearch] Internal server error', {
      artifactId: req.params.id,
      researchId: req.params.researchId,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
