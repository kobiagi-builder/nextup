/**
 * Content Agent Controller
 *
 * Handles HTTP requests for the Content Agent orchestrator.
 * Provides a single endpoint for executing content agent requests.
 */

import { Request, Response } from 'express';
import { ContentAgent } from '../services/ai/ContentAgent.js';
import { logger } from '../lib/logger.js';
import type { ScreenContext } from '../services/ai/types/contentAgent.js';

/**
 * Content Agent Controller
 */
export class ContentAgentController {
  private contentAgent: ContentAgent;

  constructor() {
    this.contentAgent = new ContentAgent();
  }

  /**
   * Execute content agent request
   *
   * POST /api/content-agent/execute
   *
   * Body:
   * {
   *   message: string;              // User message
   *   screenContext?: ScreenContext; // Current page context
   * }
   *
   * Response:
   * {
   *   text: string;                 // Agent response text
   *   toolCalls?: ToolCall[];       // Tools that were executed
   *   toolResults?: ToolResult[];   // Results from tools
   *   conversationId?: string;      // Session conversation ID
   * }
   */
  execute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, screenContext } = req.body;

      // Validation
      if (!message || typeof message !== 'string') {
        logger.warn('ContentAgentController', 'Invalid request: missing or invalid message', {
          hasMessage: !!message,
          messageType: typeof message,
        });
        res.status(400).json({
          error: 'Invalid request',
          message: 'message field is required and must be a string',
        });
        return;
      }

      if (message.length > 10000) {
        logger.warn('ContentAgentController', 'Message too long', {
          messageLength: message.length,
          maxLength: 10000,
        });
        res.status(400).json({
          error: 'Message too long',
          message: 'message must be 10,000 characters or less',
        });
        return;
      }

      // Log request (sanitized)
      logger.info('ContentAgentController', 'Processing content agent request', {
        messageLength: message.length,
        hasScreenContext: !!screenContext,
        currentPage: screenContext?.currentPage,
        artifactStatus: screenContext?.artifactStatus,
      });

      // Execute content agent
      const response = await this.contentAgent.processRequest(message, screenContext || {});

      // Log response (sanitized)
      logger.info('ContentAgentController', 'Content agent response generated', {
        textLength: response.text.length,
        toolCallsCount: response.toolCalls?.length || 0,
        toolResultsCount: response.toolResults?.length || 0,
      });

      // Return response
      res.status(200).json(response);
    } catch (error) {
      logger.error(
        'ContentAgentController',
        error instanceof Error ? error : new Error(String(error)),
        {
          sourceCode: 'execute',
        }
      );

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  /**
   * Clear content agent session
   *
   * POST /api/content-agent/clear-session
   *
   * Clears the current session state and conversation history.
   */
  clearSession = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('ContentAgentController', 'Clearing content agent session');

      this.contentAgent.clearSession();

      res.status(200).json({
        success: true,
        message: 'Session cleared successfully',
      });
    } catch (error) {
      logger.error(
        'ContentAgentController',
        error instanceof Error ? error : new Error(String(error)),
        {
          sourceCode: 'clearSession',
        }
      );

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  /**
   * Get conversation history
   *
   * GET /api/content-agent/history
   *
   * Returns the current conversation history for the session.
   */
  getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.debug('ContentAgentController', 'Fetching conversation history');

      const history = this.contentAgent.getConversationHistory();

      res.status(200).json({
        history,
        count: history.length,
      });
    } catch (error) {
      logger.error(
        'ContentAgentController',
        error instanceof Error ? error : new Error(String(error)),
        {
          sourceCode: 'getHistory',
        }
      );

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };
}

// Export singleton instance
export const contentAgentController = new ContentAgentController();
