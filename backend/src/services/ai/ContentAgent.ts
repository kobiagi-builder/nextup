/**
 * Content Agent Orchestrator
 *
 * Unified agent for content creation pipeline.
 * Manages conversation state, intent detection, and tool orchestration.
 *
 * Phase 1 MVP: Core structure with intent detection and session management
 * Future: Full pipeline execution, tool orchestration, error handling
 */

import { logger } from '../../lib/logger.js';
import { detectIntent, UserIntent } from './utils/intentDetection.js';
import { TokenBudgetManager, tokenBudgetManager } from './utils/tokenBudget.js';
import type {
  SessionState,
  ConversationTurn,
  ScreenContext,
  AgentResponse,
  PipelineResult,
  ToolName,
  ToolOutput,
  ContentCreationRequest,
  PipelineExecutionRequest,
} from './types/contentAgent.js';

// =============================================================================
// Constants
// =============================================================================

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// =============================================================================
// Content Agent Class
// =============================================================================

export class ContentAgent {
  private sessionState: SessionState;
  private conversationHistory: ConversationTurn[] = [];
  private tokenBudget: TokenBudgetManager;
  private maxConversationTurns: number = 10;

  constructor(sessionId?: string) {
    this.sessionState = {
      sessionId: sessionId || this.generateSessionId(),
      lastActivityTimestamp: Date.now(),
    };
    this.tokenBudget = tokenBudgetManager;

    logger.info('[ContentAgent] Initialized', {
      sessionId: this.sessionState.sessionId,
    });
  }

  /**
   * Process user request with intent detection and response generation
   *
   * Phase 1 MVP: Intent detection and basic response
   * Future: Full tool orchestration and pipeline execution
   */
  async processRequest(message: string, screenContext: ScreenContext = {}): Promise<AgentResponse> {
    try {
      // Check session timeout
      if (this.checkSessionTimeout()) {
        this.resetSession();
        logger.info('[ContentAgent] Session reset due to timeout', {
          sessionId: this.sessionState.sessionId,
        });
      }

      // Update activity timestamp
      this.sessionState.lastActivityTimestamp = Date.now();

      // Detect intent
      const intentResult = await detectIntent(message, screenContext);

      logger.info('[ContentAgent] Intent detected', {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        method: intentResult.method,
      });

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
      });

      // Trim conversation history if needed
      this.trimConversationHistory();

      // Handle clarification needed
      if (intentResult.clarificationNeeded) {
        const response: AgentResponse = {
          text: intentResult.suggestedClarification || "I'm not sure what you'd like me to do. Could you clarify?",
          sessionState: this.sessionState,
          intentDetected: intentResult.intent,
          clarificationNeeded: true,
          suggestedClarification: intentResult.suggestedClarification,
        };

        this.conversationHistory.push({
          role: 'assistant',
          content: response.text,
          timestamp: Date.now(),
        });

        return response;
      }

      // Route to appropriate handler based on intent
      const response = await this.handleIntent(intentResult.intent, message, screenContext);

      this.conversationHistory.push({
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        toolCalls: response.toolResults?.map((r) => JSON.stringify(r)) || [],
      });

      return {
        ...response,
        sessionState: this.sessionState,
        intentDetected: intentResult.intent,
      };
    } catch (error) {
      logger.error(`[ContentAgent] ${error instanceof Error ? error.message : String(error)}`, {
        message: message.substring(0, 100),
      });

      return {
        text: "I encountered an error processing your request. Could you try rephrasing?",
        sessionState: this.sessionState,
      };
    }
  }

  /**
   * Execute full content creation pipeline
   *
   * Phase 1 MVP: Placeholder implementation
   * Future: Full pipeline with research → skeleton → write → humanize → visuals
   */
  async executeFullPipeline(request: PipelineExecutionRequest): Promise<PipelineResult> {
    logger.info('[ContentAgent] Executing full pipeline', {
      artifactId: request.artifactId,
      options: request.options,
    });

    // Phase 1 MVP: Return placeholder
    // TODO: Implement full pipeline execution in Phase 2
    return {
      success: false,
      artifactId: request.artifactId,
      steps: [],
      totalDuration: 0,
      finalStatus: 'draft',
    };
  }

  /**
   * Execute a single tool
   *
   * Phase 1 MVP: Placeholder implementation
   * Future: Tool execution with proper error handling and tracing
   */
  async executeSingleTool(toolName: ToolName, params: unknown): Promise<ToolOutput> {
    logger.info('[ContentAgent] Executing single tool', {
      toolName,
      params,
    });

    // Phase 1 MVP: Return placeholder
    // TODO: Implement tool execution in Phase 2
    return {
      success: false,
      traceId: this.generateTraceId(),
      error: {
        category: 'TOOL_EXECUTION_FAILED' as any,
        message: 'Tool execution not yet implemented',
        recoverable: false,
      },
      data: null,
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationTurn[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear session and reset state
   */
  clearSession(): void {
    logger.info('[ContentAgent] Clearing session', {
      sessionId: this.sessionState.sessionId,
    });

    this.resetSession();
    this.conversationHistory = [];
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Handle detected intent
   * Phase 1 MVP: Basic text responses
   * Future: Tool orchestration for each intent
   */
  private async handleIntent(
    intent: UserIntent,
    message: string,
    screenContext: ScreenContext
  ): Promise<Omit<AgentResponse, 'sessionState'>> {
    switch (intent) {
      case UserIntent.GENERATE_TOPICS:
        return {
          text: "I'll help you generate topic ideas. What type of content are you creating? (blog, social post, or showcase)",
        };

      case UserIntent.RESEARCH_TOPIC:
        return {
          text: screenContext.artifactTitle
            ? `I'll research "${screenContext.artifactTitle}" for you.`
            : "What topic would you like me to research?",
        };

      case UserIntent.CREATE_SKELETON:
        return {
          text: "I'll create a content skeleton for you. Do you have a topic in mind?",
        };

      case UserIntent.WRITE_CONTENT:
        return {
          text: screenContext.artifactStatus === 'skeleton'
            ? "I'll write the content based on your skeleton."
            : "I can help you write content. Do you have an outline ready?",
        };

      case UserIntent.HUMANIZE_CONTENT:
        return {
          text: "I'll humanize your content to remove AI patterns and make it sound more natural.",
        };

      case UserIntent.CREATE_VISUALS:
        return {
          text: "I'll create visuals for your content.",
        };

      case UserIntent.FULL_PIPELINE:
        return {
          text: "I'll run the full content creation pipeline: research → skeleton → write → humanize → visuals. This may take a few minutes.",
        };

      case UserIntent.STATUS_CHECK:
        if (screenContext.artifactId) {
          return {
            text: `Your content "${screenContext.artifactTitle || 'Untitled'}" is currently in status: ${screenContext.artifactStatus}`,
          };
        }
        return {
          text: "You don't have any active content selected. Would you like to create something new?",
        };

      case UserIntent.UNCLEAR:
      default:
        return {
          text: "I'm here to help you create content. I can research topics, create outlines, write content, and more. What would you like to do?",
        };
    }
  }

  /**
   * Check if session has timed out (30 minutes)
   */
  private checkSessionTimeout(): boolean {
    const elapsed = Date.now() - this.sessionState.lastActivityTimestamp;
    return elapsed > SESSION_TIMEOUT_MS;
  }

  /**
   * Reset session state
   */
  private resetSession(): void {
    this.sessionState = {
      sessionId: this.generateSessionId(),
      lastActivityTimestamp: Date.now(),
    };
  }

  /**
   * Trim conversation history to stay within token budget
   */
  private trimConversationHistory(): void {
    if (this.conversationHistory.length > this.maxConversationTurns) {
      const removed = this.conversationHistory.length - this.maxConversationTurns;
      this.conversationHistory = this.conversationHistory.slice(-this.maxConversationTurns);

      logger.debug('[ContentAgent] Trimmed conversation history', {
        removed,
        remaining: this.conversationHistory.length,
      });
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return `ca-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Create a new content agent instance
 */
export function createContentAgent(sessionId?: string): ContentAgent {
  return new ContentAgent(sessionId);
}
