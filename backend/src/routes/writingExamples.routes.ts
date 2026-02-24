/**
 * Writing Examples Routes (Phase 4)
 *
 * API routes for user writing examples management.
 * Writing examples are used to analyze and personalize content generation.
 */

import { Router } from 'express';
import * as writingExamplesController from '../controllers/writingExamples.controller.js';
import * as uploadController from '../controllers/writingExamplesUpload.controller.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const scrapeLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Too many scrape requests. Please wait a minute before trying again.',
});

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

/**
 * POST /api/user/writing-examples/upload
 *
 * Upload a file (.md, .txt, .docx, .pdf) and extract text content.
 * Multipart form-data with fields: file, name (optional), artifact_type.
 *
 * Response: UserWritingExample (201)
 */
router.post('/upload', uploadController.uploadMiddleware, uploadController.handleFileUpload);

/**
 * POST /api/user/writing-examples/extract-url
 *
 * Download a file from a URL and extract text content.
 * Returns 202 immediately; extraction happens asynchronously.
 *
 * Body: { url: string, name?: string, artifact_type: ArtifactType }
 *
 * Response: UserWritingExample (202)
 */
router.post('/extract-url', uploadController.handleFileUrlExtraction);

/**
 * POST /api/user/writing-examples/:id/retry
 *
 * Retry a failed extraction (URL-based references only).
 *
 * Response: UserWritingExample (202)
 */
router.post('/:id/retry', uploadController.handleRetry);

/**
 * POST /api/user/writing-examples/extract-publication
 *
 * Scrape content from a publication URL (LinkedIn, Medium, Substack, Reddit).
 * Returns 202 immediately; scraping happens asynchronously.
 * Rate limited to 5 requests/user/minute.
 *
 * Body: { url: string, name?: string, artifact_type: ArtifactType }
 *
 * Response: UserWritingExample (202)
 */
router.post('/extract-publication', scrapeLimit, uploadController.handlePublicationExtraction);

export default router;
