/**
 * Token Budget Manager
 *
 * Manages token allocation for Claude Sonnet 4's 200K context window.
 * Implements context priority system and truncation strategies.
 *
 * Critical: Claude Sonnet 4 has 200K tokens. Must manage explicitly to avoid truncation.
 */

import { logger } from '../../../lib/logger.js';

// =============================================================================
// Constants & Types
// =============================================================================

/**
 * Token budget allocation for Claude Sonnet 4 (200K total)
 */
export const TOKEN_BUDGET = {
  /** Total available tokens in context window */
  max: 200000,

  /** Reserved tokens that cannot be used for dynamic content */
  reserved: {
    /** System prompt defining agent behavior */
    systemPrompt: 3000,
    /** Tool definitions (6 core + 4 context tools) */
    toolDefinitions: 8000,
    /** Current user message */
    userContext: 500,
    /** Buffer for AI response */
    responseBuffer: 4000,
  },

  /** Available tokens for dynamic content (conversation, research, etc.) */
  get available(): number {
    return (
      this.max -
      this.reserved.systemPrompt -
      this.reserved.toolDefinitions -
      this.reserved.userContext -
      this.reserved.responseBuffer
    );
  },
} as const;

/**
 * Context priority determines truncation order
 * Higher priority = truncated last
 */
export enum ContextPriority {
  /** Never truncate: System prompt and tool definitions */
  CRITICAL = 1,
  /** Never truncate: Current user message */
  REQUIRED = 2,
  /** Truncate last: Screen context from UI */
  SCREEN_CONTEXT = 3,
  /** Summarize if needed: Conversation history */
  CONVERSATION_HISTORY = 4,
  /** Truncate first: Research data */
  RESEARCH_DATA = 5,
}

export interface TokenUsage {
  /** Total tokens used */
  total: number;
  /** Breakdown by category */
  breakdown: {
    systemPrompt: number;
    toolDefinitions: number;
    userMessage: number;
    screenContext: number;
    conversationHistory: number;
    researchData: number;
  };
  /** Remaining available tokens */
  remaining: number;
  /** Whether truncation is needed */
  needsTruncation: boolean;
}

// =============================================================================
// Token Budget Manager Class
// =============================================================================

export class TokenBudgetManager {
  /**
   * Calculate approximate token count for text
   * Uses rough approximation: 1 token ≈ 4 characters
   * This is conservative to avoid over-estimation
   *
   * @param text - Text to count tokens for
   * @returns Estimated token count
   */
  calculateUsage(text: string): number {
    if (!text || text.length === 0) return 0;

    // Rough approximation: 1 token ≈ 4 characters for English text
    // For code or special characters, this may vary
    const estimatedTokens = Math.ceil(text.length / 4);

    return estimatedTokens;
  }

  /**
   * Calculate total token usage across all context sources
   *
   * @param contexts - Content by category
   * @returns Token usage breakdown
   */
  calculateTotalUsage(contexts: {
    systemPrompt?: string;
    toolDefinitions?: string;
    userMessage: string;
    screenContext?: string;
    conversationHistory?: string[];
    researchData?: string;
  }): TokenUsage {
    const breakdown = {
      systemPrompt: this.calculateUsage(contexts.systemPrompt || ''),
      toolDefinitions: this.calculateUsage(contexts.toolDefinitions || ''),
      userMessage: this.calculateUsage(contexts.userMessage),
      screenContext: this.calculateUsage(contexts.screenContext || ''),
      conversationHistory:
        contexts.conversationHistory?.reduce((sum, msg) => sum + this.calculateUsage(msg), 0) || 0,
      researchData: this.calculateUsage(contexts.researchData || ''),
    };

    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const remaining = TOKEN_BUDGET.max - total;

    return {
      total,
      breakdown,
      remaining,
      needsTruncation: remaining < 0,
    };
  }

  /**
   * Truncate content based on priority if needed
   *
   * Priority order (highest to lowest):
   * 1. System prompt (never truncate)
   * 2. Tool definitions (never truncate)
   * 3. Current user message (never truncate)
   * 4. Screen context (truncate last)
   * 5. Conversation history (summarize if needed)
   * 6. Research data (truncate first)
   *
   * @param content - Content to potentially truncate
   * @param priority - Priority level
   * @param maxTokens - Maximum allowed tokens
   * @returns Truncated content
   */
  truncateIfNeeded(content: string, priority: ContextPriority, maxTokens: number): string {
    if (!content || content.length === 0) return content;

    const currentTokens = this.calculateUsage(content);

    // No truncation needed
    if (currentTokens <= maxTokens) return content;

    // Never truncate critical or required content
    if (priority === ContextPriority.CRITICAL || priority === ContextPriority.REQUIRED) {
      logger.warn('[TokenBudgetManager] Cannot truncate critical/required content', {
        priority,
        currentTokens,
        maxTokens,
      });
      return content;
    }

    // Calculate truncation point (conservative: assume 4 chars per token)
    const maxChars = maxTokens * 4;

    if (content.length <= maxChars) return content;

    // Truncate with ellipsis
    const truncated = content.substring(0, maxChars - 20) + '\n\n[...truncated...]';

    logger.info('[TokenBudgetManager] Content truncated', {
      priority,
      originalTokens: currentTokens,
      targetTokens: maxTokens,
      originalLength: content.length,
      truncatedLength: truncated.length,
    });

    return truncated;
  }

  /**
   * Summarize conversation history to fit within token budget
   * Keeps most recent messages, summarizes older ones
   *
   * @param messages - Conversation messages (oldest to newest)
   * @param maxTokens - Maximum tokens for conversation history
   * @returns Optimized messages array
   */
  optimizeConversationHistory(messages: string[], maxTokens: number): string[] {
    if (messages.length === 0) return [];

    // Calculate current usage
    const totalTokens = messages.reduce((sum, msg) => sum + this.calculateUsage(msg), 0);

    // No optimization needed
    if (totalTokens <= maxTokens) return messages;

    // Strategy: Keep most recent messages, drop oldest
    // Future: Implement intelligent summarization
    const optimized: string[] = [];
    let currentTokens = 0;

    // Iterate from newest to oldest
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = this.calculateUsage(messages[i]);

      if (currentTokens + msgTokens <= maxTokens) {
        optimized.unshift(messages[i]);
        currentTokens += msgTokens;
      } else {
        // No more room - add summary of dropped messages
        const droppedCount = i + 1;
        if (droppedCount > 0) {
          const summaryMsg = `[Earlier ${droppedCount} messages truncated to fit token budget]`;
          optimized.unshift(summaryMsg);
        }
        break;
      }
    }

    logger.info('[TokenBudgetManager] Conversation history optimized', {
      originalMessages: messages.length,
      optimizedMessages: optimized.length,
      originalTokens: totalTokens,
      optimizedTokens: currentTokens,
    });

    return optimized;
  }

  /**
   * Get current available tokens
   * @returns Number of available tokens for dynamic content
   */
  getAvailableTokens(): number {
    return TOKEN_BUDGET.available;
  }

  /**
   * Check if content will fit within budget
   *
   * @param content - Content to check
   * @param category - Category for logging
   * @returns Whether content fits
   */
  willFit(content: string, category: string): boolean {
    const tokens = this.calculateUsage(content);
    const available = this.getAvailableTokens();
    const fits = tokens <= available;

    if (!fits) {
      logger.warn('[TokenBudgetManager] Content exceeds available tokens', {
        category,
        tokens,
        available,
        overage: tokens - available,
      });
    }

    return fits;
  }

  /**
   * Allocate tokens proportionally across multiple content sources
   * Useful when multiple sources need to share limited token budget
   *
   * @param sources - Content sources with priorities
   * @param totalBudget - Total tokens available
   * @returns Allocated token amounts per source
   */
  allocateTokens(
    sources: Array<{ name: string; priority: ContextPriority; estimatedTokens: number }>,
    totalBudget: number
  ): Map<string, number> {
    // Sort by priority (higher priority = more tokens)
    const sorted = [...sources].sort((a, b) => a.priority - b.priority);

    const allocation = new Map<string, number>();
    let remaining = totalBudget;

    // Allocate tokens starting with highest priority
    for (const source of sorted) {
      if (remaining <= 0) {
        allocation.set(source.name, 0);
        continue;
      }

      const allocated = Math.min(source.estimatedTokens, remaining);
      allocation.set(source.name, allocated);
      remaining -= allocated;
    }

    return allocation;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton token budget manager instance
 * Use this for all token budget operations
 */
export const tokenBudgetManager = new TokenBudgetManager();
