/**
 * Writing Examples Routes (Phase 4)
 *
 * API routes for user writing examples management.
 * Writing examples are used to analyze and personalize content generation.
 */

import { Router } from 'express';
import * as writingExamplesController from '../controllers/writingExamples.controller.js';

const router = Router();

/**
 * GET /api/user/writing-examples
 *
 * List all writing examples for the authenticated user.
 *
 * Query params:
 * - active_only: boolean (default: false) - only return active examples
 *
 * Response:
 * {
 *   examples: UserWritingExample[];
 *   count: number;
 * }
 */
router.get('/', writingExamplesController.listWritingExamples);

/**
 * GET /api/user/writing-examples/:id
 *
 * Get a single writing example by ID.
 *
 * Response: UserWritingExample
 */
router.get('/:id', writingExamplesController.getWritingExample);

/**
 * POST /api/user/writing-examples
 *
 * Create a new writing example.
 *
 * Body:
 * {
 *   name: string;              // Display name for the example
 *   content: string;           // The writing example text (min 500 words)
 *   source_type?: string;      // 'pasted' | 'file_upload' | 'artifact' | 'url'
 *   source_reference?: string; // Optional reference (artifact ID, URL, etc.)
 * }
 *
 * Response: UserWritingExample (201)
 */
router.post('/', writingExamplesController.createWritingExample);

/**
 * PUT /api/user/writing-examples/:id
 *
 * Update an existing writing example.
 *
 * Body:
 * {
 *   name?: string;
 *   content?: string;
 *   is_active?: boolean;
 * }
 *
 * Response: UserWritingExample
 */
router.put('/:id', writingExamplesController.updateWritingExample);

/**
 * DELETE /api/user/writing-examples/:id
 *
 * Delete a writing example.
 *
 * Response: 204 No Content
 */
router.delete('/:id', writingExamplesController.deleteWritingExample);

export default router;
