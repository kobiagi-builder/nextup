/**
 * Writing Examples Controller (Phase 4)
 *
 * Handles CRUD operations for user writing examples.
 * Writing examples are used to analyze and personalize content generation.
 */

import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { WritingExampleSourceType, WritingCharacteristics } from '../types/portfolio.js';

// Minimum word count for writing examples
const MIN_WORD_COUNT = 500;

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
    const userId = (req as any).userId;
    const activeOnly = req.query.active_only === 'true';

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    logger.debug('WritingExamplesController', 'Listing writing examples', {
      hasUserId: true,
      activeOnly,
    });

    let query = supabaseAdmin
      .from('user_writing_examples')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('WritingExamplesController', error, {
        sourceCode: 'listWritingExamples',
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
      'WritingExamplesController',
      error instanceof Error ? error : new Error(String(error)),
      {
        sourceCode: 'listWritingExamples',
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
    const userId = (req as any).userId;

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

    const { data, error } = await supabaseAdmin
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
      'WritingExamplesController',
      error instanceof Error ? error : new Error(String(error)),
      {
        sourceCode: 'getWritingExample',
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
    const userId = (req as any).userId;
    const { name, content, source_type = 'pasted', source_reference } = req.body;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Name is required',
      });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({
        error: 'Validation error',
        message: 'Content is required',
      });
      return;
    }

    const wordCount = countWords(content);
    if (wordCount < MIN_WORD_COUNT) {
      res.status(400).json({
        error: 'Validation error',
        message: `Content must be at least ${MIN_WORD_COUNT} words. Current: ${wordCount} words.`,
        wordCount,
        minRequired: MIN_WORD_COUNT,
      });
      return;
    }

    // Validate source_type
    const validSourceTypes: WritingExampleSourceType[] = ['pasted', 'file_upload', 'artifact', 'url'];
    if (!validSourceTypes.includes(source_type as WritingExampleSourceType)) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid source_type. Must be one of: ${validSourceTypes.join(', ')}`,
      });
      return;
    }

    logger.info('WritingExamplesController', 'Creating writing example', {
      hasUserId: true,
      nameLength: name.length,
      wordCount,
      sourceType: source_type,
    });

    const { data, error } = await supabaseAdmin
      .from('user_writing_examples')
      .insert({
        user_id: userId,
        name: name.trim(),
        content,
        word_count: wordCount,
        source_type,
        source_reference,
        analyzed_characteristics: {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('WritingExamplesController', error, {
        sourceCode: 'createWritingExample',
      });
      res.status(500).json({
        error: 'Database error',
        message: 'Failed to create writing example',
      });
      return;
    }

    logger.info('WritingExamplesController', 'Writing example created', {
      exampleId: data.id,
    });

    res.status(201).json(data);
  } catch (error) {
    logger.error(
      'WritingExamplesController',
      error instanceof Error ? error : new Error(String(error)),
      {
        sourceCode: 'createWritingExample',
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
 * }
 */
export const updateWritingExample = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const { name, content, is_active } = req.body;

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
    const { data: existing, error: fetchError } = await supabaseAdmin
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
      if (wordCount < MIN_WORD_COUNT) {
        res.status(400).json({
          error: 'Validation error',
          message: `Content must be at least ${MIN_WORD_COUNT} words. Current: ${wordCount} words.`,
          wordCount,
          minRequired: MIN_WORD_COUNT,
        });
        return;
      }

      updates.content = content;
      updates.word_count = wordCount;
      // Clear analyzed characteristics when content changes
      updates.analyzed_characteristics = {};
    }

    if (is_active !== undefined) {
      updates.is_active = !!is_active;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: 'Validation error',
        message: 'No updates provided',
      });
      return;
    }

    logger.info('WritingExamplesController', 'Updating writing example', {
      exampleId: id,
      updateFields: Object.keys(updates),
    });

    const { data, error } = await supabaseAdmin
      .from('user_writing_examples')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('WritingExamplesController', error, {
        sourceCode: 'updateWritingExample',
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
      'WritingExamplesController',
      error instanceof Error ? error : new Error(String(error)),
      {
        sourceCode: 'updateWritingExample',
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
    const userId = (req as any).userId;

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
    const { data: existing, error: fetchError } = await supabaseAdmin
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

    logger.info('WritingExamplesController', 'Deleting writing example', {
      exampleId: id,
    });

    const { error } = await supabaseAdmin
      .from('user_writing_examples')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('WritingExamplesController', error, {
        sourceCode: 'deleteWritingExample',
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
      'WritingExamplesController',
      error instanceof Error ? error : new Error(String(error)),
      {
        sourceCode: 'deleteWritingExample',
      }
    );

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
