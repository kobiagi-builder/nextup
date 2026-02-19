/**
 * Rate Limiter Middleware
 *
 * MVP: In-memory rate limiter
 * Future: Redis-based for multi-instance deployments
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

// =============================================================================
// Rate Limit Configuration
// =============================================================================

export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  message?: string;        // Error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

export const RATE_LIMITS = {
  // Per-minute limits (prevent abuse)
  perMinute: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Too many requests. Please wait a minute.',
  },

  // Per-hour limits (prevent sustained abuse)
  perHour: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 100,
    message: 'Hourly request limit exceeded. Please try again later.',
  },

  // Daily pipeline limit (expensive operations)
  dailyPipelines: {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 20,
    message: 'Daily pipeline limit reached. Resets at midnight.',
  },
};

// =============================================================================
// In-Memory Store
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryStore {
  private store = new Map<string, RateLimitEntry>();

  /**
   * Get current count for key
   */
  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  /**
   * Increment count for key
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const existing = this.store.get(key);

    // Reset if window expired
    if (existing && now >= existing.resetTime) {
      this.store.delete(key);
      return this.increment(key, windowMs);
    }

    // Increment existing
    if (existing) {
      existing.count += 1;
      this.store.set(key, existing);
      return existing;
    }

    // Create new entry
    const entry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    this.store.set(key, entry);
    return entry;
  }

  /**
   * Reset count for key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Cleanup expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const store = new InMemoryStore();

// Cleanup every 5 minutes
setInterval(() => store.cleanup(), 5 * 60 * 1000);

// =============================================================================
// Rate Limiter Factory
// =============================================================================

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get user ID from auth token
      const userId = (req as any).user?.id;

      if (!userId) {
        // No auth = no rate limiting (handled by auth middleware)
        next();
        return;
      }

      // Create unique key for this user + endpoint
      const endpoint = req.path;
      const key = `${userId}:${endpoint}:${config.windowMs}`;

      // Increment count
      const entry = store.increment(key, config.windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      // Check if limit exceeded
      if (entry.count > config.maxRequests) {
        logger.warn('[RateLimiter] Rate limit exceeded', {
          userId,
          endpoint,
          count: entry.count,
          limit: config.maxRequests,
          windowMs: config.windowMs,
        });

        res.status(429).json({
          error: config.message || 'Too many requests',
          category: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((entry.resetTime - Date.now()) / 1000),
        });
        return;
      }

      // Within limit - proceed
      next();
    } catch (error) {
      logger.error('[RateLimiter] Error in rate limiter', {
        endpoint: req.path,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // On error, allow request (fail open)
      next();
    }
  };
}

// =============================================================================
// Preset Limiters
// =============================================================================

export const perMinuteLimit = createRateLimiter(RATE_LIMITS.perMinute);
export const perHourLimit = createRateLimiter(RATE_LIMITS.perHour);
export const dailyPipelineLimit = createRateLimiter(RATE_LIMITS.dailyPipelines);

// =============================================================================
// Manual Rate Limit Check (for use in services)
// =============================================================================

/**
 * Check rate limit without middleware
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  count: number;
  limit: number;
  resetTime: number;
} {
  const key = `${userId}:${endpoint}:${config.windowMs}`;
  const entry = store.increment(key, config.windowMs);

  return {
    allowed: entry.count <= config.maxRequests,
    count: entry.count,
    limit: config.maxRequests,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for user (admin function)
 */
export function resetRateLimit(userId: string, endpoint: string, windowMs: number): void {
  const key = `${userId}:${endpoint}:${windowMs}`;
  store.reset(key);
  logger.info('[RateLimiter] Rate limit reset', { userId, endpoint });
}
