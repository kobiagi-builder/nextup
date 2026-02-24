/**
 * Writing Examples Controller (Phase 4)
 *
 * Handles CRUD operations for user writing examples.
 * Writing examples are used to analyze and personalize content generation.
 */

import { Request, Response } from 'express';
import { getSupabase } from '../lib/requestContext.js';
import { logger } from '../lib/logger.js';
import type { WritingExampleSourceType, ArtifactType } from '../types/portfolio.js';

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * List user's writing examples
 *
 * GET /api/user/writing-examples
 *
 * Query params:
 * - active_only: boolean (default: false) - only return active examples
 */
export const listWritingExamples = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const activeOnly = req.query.active_only === 'true';
    const artifactType = req.query.artifact_type as string | undefined;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    const VALID_ARTIFACT_TYPES = ['blog', 'social_post', 'showcase'];
    if (artifactType && !VALID_ARTIFACT_TYPES.includes(artifactType)) {
      res.status(400).json({
        error: 'Validation error',
        message: `artifact_type must be one of: ${VALID_ARTIFACT_TYPES.join(', ')}`,
      });
      return;
    }

    logger.debug('[WritingExamplesController] Listing writing examples', {
      hasUserId: true,
      activeOnly,
      hasArtifactType: !!artifactType,
    });

    let query = getSupabase()
      .from('user_writing_examples')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (artifactType) {
      query = query.eq('artifact_type', artifactType);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[WritingExamplesController] Database error in listWritingExamples', {
        sourceCode: 'listWritingExamples',
        error: error,
      });
      res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch writing examples',
      });
      return;
    }

    res.status(200).json({
      examples: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    logger.error(
      '[WritingExamplesController] Error in listWritingExamples',
      {
        sourceCode: 'listWritingExamples',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    );

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * Get a single writing example
 *
 * GET /api/user/writing-examples/:id
 */
export const getWritingExample = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        error: 'Missing ID',
        message: 'Writing example ID is required',
      });
      return;
    }

    const { data, error } = await getSupabase()
      .from('user_writing_examples')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({
        error: 'Not found',
        message: 'Writing example not found',
      });
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    logger.error(
      '[WritingExamplesController] Error in getWritingExample',
      {
        sourceCode: 'getWritingExample',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    );

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * Create a new writing example
 *
 * POST /api/user/writing-examples
 *
 * Body:
 * {
 *   name: string;              // Display name for the example
 *   content: string;           // The writing example text (min 500 words)
 *   source_type?: string;      // 'pasted' | 'file_upload' | 'artifact' | 'url'
 *   source_reference?: string; // Optional reference (artifact ID, URL, etc.)
 * }
 */
export const createWritingExample = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, content, source_type = 'pasted', source_reference, artifact_type } = req.body;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    // Validation
    if (!content || typeof content !== 'string') {
      res.status(400).json({
        error: 'Validation error',
        message: 'Content is required',
      });
      return;
    }

    const wordCount = countWords(content);

    // Validate source_type
    const validSourceTypes: WritingExampleSourceType[] = ['pasted', 'file_upload', 'artifact', 'url'];
    if (!validSourceTypes.includes(source_type as WritingExampleSourceType)) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid source_type. Must be one of: ${validSourceTypes.join(', ')}`,
      });
      return;
    }

    // Validate artifact_type
    const validArtifactTypes: ArtifactType[] = ['blog', 'social_post', 'showcase'];
    if (artifact_type && !validArtifactTypes.includes(artifact_type as ArtifactType)) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid artifact_type. Must be one of: ${validArtifactTypes.join(', ')}`,
      });
      return;
    }

    // Auto-generate name if not provided
    let displayName = (name && typeof name === 'string' && name.trim()) ? name.trim() : '';
    if (!displayName) {
      const typeLabels: Record<string, string> = { blog: 'Blog', social_post: 'Social post', showcase: 'Showcase' };
      const typeLabel = (artifact_type && typeLabels[artifact_type]) || 'Writing';
      const { count } = await getSupabase()
        .from('user_writing_examples')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('artifact_type', artifact_type || '');
      displayName = `${typeLabel} reference ${(count ?? 0) + 1}`;
    }

    logger.info('[WritingExamplesController] Creating writing example', {
      hasUserId: true,
      nameLength: displayName.length,
      wordCount,
      sourceType: source_type,
      hasArtifactType: !!artifact_type,
    });

    const { data, error } = await getSupabase()
      .from('user_writing_examples')
      .insert({
        user_id: userId,
        name: displayName,
        content,
        word_count: wordCount,
        source_type,
        source_reference,
        artifact_type: artifact_type || null,
        extraction_status: 'success',
        analyzed_characteristics: {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('[WritingExamplesController] Database error in createWritingExample', {
        sourceCode: 'createWritingExample',
        error: error,
      });
      res.status(500).json({
        error: 'Database error',
        message: 'Failed to create writing example',
      });
      return;
    }

    logger.info('[WritingExamplesController] Writing example created', {
      hasExampleId: !!data.id,
    });

    res.status(201).json(data);
  } catch (error) {
    logger.error(
      '[WritingExamplesController] Error in createWritingExample',
      {
        sourceCode: 'createWritingExample',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    );

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * Update a writing example
 *
 * PUT /api/user/writing-examples/:id
 *
 * Body:
 * {
 *   name?: string;
 *   content?: string;
 *   is_active?: boolean;
 *   artifact_type?: 'blog' | 'social_post' | 'showcase';
 * }
 */
export const updateWritingExample = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, content, is_active, artifact_type } = req.body;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        error: 'Missing ID',
        message: 'Writing example ID is required',
      });
      return;
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await getSupabase()
      .from('user_writing_examples')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({
        error: 'Not found',
        message: 'Writing example not found',
      });
      return;
    }

    if (existing.user_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this writing example',
      });
      return;
    }

    // Build update object
    const updates: Record<string, any> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Name cannot be empty',
        });
        return;
      }
      updates.name = name.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string') {
        res.status(400).json({
          error: 'Validation error',
          message: 'Content must be a string',
        });
        return;
      }

      const wordCount = countWords(content);

      updates.content = content;
      updates.word_count = wordCount;
      // Clear analyzed characteristics when content changes
      updates.analyzed_characteristics = {};
    }

    if (is_active !== undefined) {
      updates.is_active = !!is_active;
    }

    if (artifact_type !== undefined) {
      const validTypes = ['blog', 'social_post', 'showcase'];
      if (!validTypes.includes(artifact_type)) {
        res.status(400).json({
          error: 'Validation error',
          message: `Invalid artifact_type. Must be one of: ${validTypes.join(', ')}`,
        });
        return;
      }
      updates.artifact_type = artifact_type;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: 'Validation error',
        message: 'No updates provided',
      });
      return;
    }

    logger.info('[WritingExamplesController] Updating writing example', {
      hasExampleId: !!id,
      updateFields: Object.keys(updates),
    });

    const { data, error } = await getSupabase()
      .from('user_writing_examples')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('[WritingExamplesController] Database error in updateWritingExample', {
        sourceCode: 'updateWritingExample',
        error: error,
      });
      res.status(500).json({
        error: 'Database error',
        message: 'Failed to update writing example',
      });
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    logger.error(
      '[WritingExamplesController] Error in updateWritingExample',
      {
        sourceCode: 'updateWritingExample',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    );

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * Delete a writing example
 *
 * DELETE /api/user/writing-examples/:id
 */
export const deleteWritingExample = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        error: 'Missing ID',
        message: 'Writing example ID is required',
      });
      return;
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await getSupabase()
      .from('user_writing_examples')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({
        error: 'Not found',
        message: 'Writing example not found',
      });
      return;
    }

    if (existing.user_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this writing example',
      });
      return;
    }

    logger.info('[WritingExamplesController] Deleting writing example', {
      hasExampleId: !!id,
    });

    const { error } = await getSupabase()
      .from('user_writing_examples')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('[WritingExamplesController] Database error in deleteWritingExample', {
        sourceCode: 'deleteWritingExample',
        error: error,
      });
      res.status(500).json({
        error: 'Database error',
        message: 'Failed to delete writing example',
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error(
      '[WritingExamplesController] Error in deleteWritingExample',
      {
        sourceCode: 'deleteWritingExample',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    );

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
