/**
 * Error Categories and Definitions
 *
 * Standardized error types for the Content Agent system.
 * All 13 categories from architecture specification.
 */

// =============================================================================
// Error Category Enum
// =============================================================================

export enum ErrorCategory {
  // Tool Errors
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',

  // AI Provider Errors
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  AI_CONTENT_FILTER = 'AI_CONTENT_FILTER',

  // Artifact Errors
  ARTIFACT_NOT_FOUND = 'ARTIFACT_NOT_FOUND',
  INVALID_ARTIFACT_ID = 'INVALID_ARTIFACT_ID',
  INVALID_STATUS = 'INVALID_STATUS',

  // Intent Errors
  UNCLEAR_INTENT = 'UNCLEAR_INTENT',
  MISSING_CONTEXT = 'MISSING_CONTEXT',

  // Research Errors
  RESEARCH_NOT_FOUND = 'RESEARCH_NOT_FOUND',

  // Validation Errors
  INVALID_TONE = 'INVALID_TONE',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
}

// =============================================================================
// Error Metadata
// =============================================================================

export interface ErrorMetadata {
  category: ErrorCategory;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  userMessage: string;
  suggestedAction?: string;
}

// =============================================================================
// Error Definitions
// =============================================================================

export const ERROR_DEFINITIONS: Record<ErrorCategory, Omit<ErrorMetadata, 'message'>> = {
  // Tool Errors
  [ErrorCategory.TOOL_EXECUTION_FAILED]: {
    category: ErrorCategory.TOOL_EXECUTION_FAILED,
    recoverable: true,
    retryable: true,
    userMessage: 'The operation failed. Please try again.',
    suggestedAction: 'Retry the operation or contact support if the issue persists.',
  },
  [ErrorCategory.TOOL_TIMEOUT]: {
    category: ErrorCategory.TOOL_TIMEOUT,
    recoverable: true,
    retryable: true,
    userMessage: 'The operation timed out. Please try again.',
    suggestedAction: 'The system took too long to respond. Try again in a moment.',
  },

  // AI Provider Errors
  [ErrorCategory.AI_PROVIDER_ERROR]: {
    category: ErrorCategory.AI_PROVIDER_ERROR,
    recoverable: true,
    retryable: true,
    userMessage: 'AI service is temporarily unavailable.',
    suggestedAction: 'Wait a moment and try again. The AI service will be back shortly.',
  },
  [ErrorCategory.AI_RATE_LIMIT]: {
    category: ErrorCategory.AI_RATE_LIMIT,
    recoverable: true,
    retryable: false,
    userMessage: 'Too many requests. Please wait a moment.',
    suggestedAction: 'You have exceeded the rate limit. Wait a few minutes before trying again.',
  },
  [ErrorCategory.AI_CONTENT_FILTER]: {
    category: ErrorCategory.AI_CONTENT_FILTER,
    recoverable: false,
    retryable: false,
    userMessage: 'Content was flagged by safety filters.',
    suggestedAction: 'Review your content and remove any inappropriate language or topics.',
  },

  // Artifact Errors
  [ErrorCategory.ARTIFACT_NOT_FOUND]: {
    category: ErrorCategory.ARTIFACT_NOT_FOUND,
    recoverable: false,
    retryable: false,
    userMessage: 'Artifact not found.',
    suggestedAction: 'The artifact may have been deleted. Please refresh and try again.',
  },
  [ErrorCategory.INVALID_ARTIFACT_ID]: {
    category: ErrorCategory.INVALID_ARTIFACT_ID,
    recoverable: false,
    retryable: false,
    userMessage: 'Invalid artifact ID.',
    suggestedAction: 'The artifact ID is malformed. Please check your request.',
  },
  [ErrorCategory.INVALID_STATUS]: {
    category: ErrorCategory.INVALID_STATUS,
    recoverable: false,
    retryable: false,
    userMessage: 'This operation cannot be performed at the current artifact status.',
    suggestedAction: 'Complete the previous step before proceeding.',
  },

  // Intent Errors
  [ErrorCategory.UNCLEAR_INTENT]: {
    category: ErrorCategory.UNCLEAR_INTENT,
    recoverable: true,
    retryable: false,
    userMessage: 'Your request was unclear.',
    suggestedAction: 'Please rephrase your request with more specific details.',
  },
  [ErrorCategory.MISSING_CONTEXT]: {
    category: ErrorCategory.MISSING_CONTEXT,
    recoverable: true,
    retryable: false,
    userMessage: 'Additional context is needed.',
    suggestedAction: 'Please provide more information about what you want to accomplish.',
  },

  // Research Errors
  [ErrorCategory.RESEARCH_NOT_FOUND]: {
    category: ErrorCategory.RESEARCH_NOT_FOUND,
    recoverable: false,
    retryable: false,
    userMessage: 'No research data found for this artifact.',
    suggestedAction: 'Run research first before proceeding with this operation.',
  },

  // Validation Errors
  [ErrorCategory.INVALID_TONE]: {
    category: ErrorCategory.INVALID_TONE,
    recoverable: false,
    retryable: false,
    userMessage: 'Invalid tone specified.',
    suggestedAction: 'Choose a valid tone: professional, casual, or enthusiastic.',
  },
  [ErrorCategory.INVALID_CONTENT_TYPE]: {
    category: ErrorCategory.INVALID_CONTENT_TYPE,
    recoverable: false,
    retryable: false,
    userMessage: 'Invalid content type specified.',
    suggestedAction: 'Choose a valid content type: blog, social_post, or showcase.',
  },
};

// =============================================================================
// Error Factory
// =============================================================================

export function createErrorResponse(
  category: ErrorCategory,
  message: string,
  context?: Record<string, unknown>
): {
  category: ErrorCategory;
  message: string;
  recoverable: boolean;
  userMessage: string;
  suggestedAction?: string;
  context?: Record<string, unknown>;
} {
  const definition = ERROR_DEFINITIONS[category];

  return {
    category,
    message,
    recoverable: definition.recoverable,
    userMessage: definition.userMessage,
    suggestedAction: definition.suggestedAction,
    ...(context && { context }),
  };
}

// =============================================================================
// Retry Policy
// =============================================================================

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableCategories: ErrorCategory[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableCategories: [
    ErrorCategory.TOOL_EXECUTION_FAILED,
    ErrorCategory.TOOL_TIMEOUT,
    ErrorCategory.AI_PROVIDER_ERROR,
  ],
};

export function isRetryable(category: ErrorCategory, policy: RetryPolicy = DEFAULT_RETRY_POLICY): boolean {
  return policy.retryableCategories.includes(category);
}

// =============================================================================
// Tool Error Factory
// =============================================================================

export interface ToolError extends Error {
  category: ErrorCategory;
  recoverable: boolean;
}

/**
 * Create a tool error for pipeline execution
 */
export function createToolError(
  category: ErrorCategory,
  message: string,
  recoverable: boolean = true
): ToolError {
  const error = new Error(message) as ToolError;
  error.category = category;
  error.recoverable = recoverable;
  return error;
}
