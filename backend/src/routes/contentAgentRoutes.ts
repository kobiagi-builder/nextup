/**
 * Content Agent Routes
 *
 * API routes for the Content Agent orchestrator.
 */

import { Router } from 'express';
import { contentAgentController } from '../controllers/contentAgentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/content-agent/execute
 *
 * Execute a content agent request with optional screen context.
 *
 * Body:
 * {
 *   message: string;              // User message (required, max 10,000 chars)
 *   screenContext?: {             // Optional screen context
 *     currentPage?: string;       // Current page ('portfolio' | 'artifact' | 'dashboard' | 'chat')
 *     artifactId?: string;        // Current artifact ID (if on artifact page)
 *     artifactType?: string;      // Artifact type ('blog' | 'social_post' | 'showcase')
 *     artifactTitle?: string;     // Artifact title
 *     artifactStatus?: string;    // Artifact status
 *   }
 * }
 *
 * Response:
 * {
 *   text: string;                 // Agent response text
 *   toolCalls?: Array<{           // Tools that were executed
 *     name: string;
 *     input: unknown;
 *   }>;
 *   toolResults?: Array<{         // Results from tools
 *     toolCallId: string;
 *     result: unknown;
 *   }>;
 *   conversationId?: string;      // Session conversation ID
 * }
 *
 * Authentication: Required
 *
 * Note: Artifact ownership validation is planned for Phase 5.
 * For now, the route is protected by requireAuth middleware only.
 */
router.post('/execute', requireAuth, contentAgentController.execute);

/**
 * POST /api/content-agent/clear-session
 *
 * Clear the current content agent session state and conversation history.
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 * }
 *
 * Authentication: Required
 */
router.post('/clear-session', requireAuth, contentAgentController.clearSession);

/**
 * GET /api/content-agent/history
 *
 * Get the current conversation history for the session.
 *
 * Response:
 * {
 *   history: Array<{
 *     role: 'user' | 'assistant';
 *     content: string;
 *     timestamp: number;
 *   }>;
 *   count: number;
 * }
 *
 * Authentication: Required
 */
router.get('/history', requireAuth, contentAgentController.getHistory);

export default router;
