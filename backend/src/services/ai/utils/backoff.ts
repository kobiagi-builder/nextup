/**
 * Exponential Backoff Utility
 *
 * Implements exponential backoff with jitter for retrying failed operations.
 * Useful for handling transient failures in AI providers and external services.
 */

import { logger } from '../../../lib/logger.js';
import { ErrorCategory, isRetryable, DEFAULT_RETRY_POLICY } from '../types/errors.js';

// =============================================================================
// Backoff Configuration
// =============================================================================

export interface BackoffOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: ErrorCategory[];
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

export const DEFAULT_BACKOFF_OPTIONS: BackoffOptions = {
  maxRetries: DEFAULT_RETRY_POLICY.maxRetries,
  baseDelayMs: DEFAULT_RETRY_POLICY.baseDelayMs,
  maxDelayMs: DEFAULT_RETRY_POLICY.maxDelayMs,
  retryableErrors: DEFAULT_RETRY_POLICY.retryableCategories,
};

// =============================================================================
// Delay Calculation
// =============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 *
 * Formula: min(baseDelay * 2^attempt + random(0, baseDelay), maxDelay)
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential component: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Add jitter: random amount up to baseDelay
  const jitter = Math.random() * baseDelayMs;

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

// =============================================================================
// Retry with Backoff
// =============================================================================

/**
 * Execute function with exponential backoff retry
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<BackoffOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_BACKOFF_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // First attempt has no delay
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, config.baseDelayMs, config.maxDelayMs);

        logger.info(`[Backoff] Retrying after ${delay}ms`, {
          attempt,
          maxRetries: config.maxRetries,
        });

        // Call retry callback if provided
        if (config.onRetry && lastError!) {
          config.onRetry(attempt, delay, lastError!);
        }

        // Wait before retry
        await sleep(delay);
      }

      // Execute function
      const result = await fn();

      // Success - log if retried
      if (attempt > 0) {
        logger.info('[Backoff] Operation succeeded after retry', {
          attempt,
          maxRetries: config.maxRetries,
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const errorCategory = (error as any).category as ErrorCategory;
      const isRetryableError = errorCategory && config.retryableErrors.includes(errorCategory);

      // Log attempt
      logger.warn(`[Backoff] Attempt ${attempt + 1}/${config.maxRetries + 1} failed`, {
        error: lastError.message,
        retryable: isRetryableError,
        category: errorCategory,
      });

      // If not retryable or last attempt, throw
      if (!isRetryableError || attempt >= config.maxRetries) {
        logger.error(`[Backoff] ${lastError instanceof Error ? lastError.message : String(lastError)}`, {
          finalAttempt: attempt + 1,
          maxRetries: config.maxRetries,
        });
        throw lastError;
      }
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError!;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Retry Predicate
// =============================================================================

/**
 * Check if error should be retried
 */
export function shouldRetry(error: unknown, options: Partial<BackoffOptions> = {}): boolean {
  const config = { ...DEFAULT_BACKOFF_OPTIONS, ...options };

  if (!(error instanceof Error)) {
    return false;
  }

  const errorCategory = (error as any).category as ErrorCategory;
  if (!errorCategory) {
    return false;
  }

  return config.retryableErrors.includes(errorCategory);
}

// =============================================================================
// Advanced: Circuit Breaker Pattern
// =============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed',
  };

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000 // 1 minute
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.state.lastFailureTime;

      if (timeSinceLastFailure >= this.resetTimeoutMs) {
        // Try half-open state
        this.state.state = 'half-open';
        logger.info('[CircuitBreaker] Entering half-open state');
      } else {
        // Circuit still open
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    try {
      const result = await fn();

      // Success - reset circuit
      if (this.state.state === 'half-open') {
        this.state.state = 'closed';
        this.state.failures = 0;
        logger.info('[CircuitBreaker] Circuit closed after successful half-open attempt');
      }

      return result;
    } catch (error) {
      // Failure - increment counter
      this.state.failures += 1;
      this.state.lastFailureTime = Date.now();

      if (this.state.failures >= this.failureThreshold) {
        this.state.state = 'open';
        logger.error('[CircuitBreaker] Circuit breaker opened due to repeated failures', {
          failures: this.state.failures,
          threshold: this.failureThreshold,
        });
      }

      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Manually reset circuit
   */
  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    };
    logger.info('[CircuitBreaker] Circuit manually reset');
  }
}
