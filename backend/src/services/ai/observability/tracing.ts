/**
 * Tracing Module
 *
 * Distributed tracing for Content Agent operations.
 * Enables correlation of logs across services (BE, n8n, FE).
 */

import { logger } from '../../../lib/logger.js';

// =============================================================================
// Trace ID Format
// =============================================================================

/**
 * Generate trace ID with format: {prefix}-{timestamp}-{random6}
 *
 * Example: ca-1706281234567-abc123
 */
export function generateTraceId(prefix: string = 'ca'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// =============================================================================
// Span Tracking
// =============================================================================

export interface Span {
  spanId: string;
  traceId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
  error?: Error;
}

class SpanTracker {
  private spans = new Map<string, Span>();

  /**
   * Start a new span
   */
  startSpan(traceId: string, operation: string, metadata?: Record<string, unknown>): Span {
    const spanId = `${traceId}-${Math.random().toString(36).substring(2, 6)}`;
    const span: Span = {
      spanId,
      traceId,
      operation,
      startTime: Date.now(),
      status: 'started',
      metadata,
    };

    this.spans.set(spanId, span);

    logger.debug('[Tracing] Span started', {
      spanId,
      traceId,
      operation,
    });

    return span;
  }

  /**
   * Complete a span successfully
   */
  completeSpan(spanId: string, metadata?: Record<string, unknown>): Span | undefined {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn('[Tracing] Span not found for completion', { spanId });
      return undefined;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = 'completed';

    if (metadata) {
      span.metadata = { ...span.metadata, ...metadata };
    }

    logger.debug('[Tracing] Span completed', {
      spanId,
      traceId: span.traceId,
      operation: span.operation,
      duration: span.duration,
    });

    return span;
  }

  /**
   * Fail a span with error
   */
  failSpan(spanId: string, error: Error, metadata?: Record<string, unknown>): Span | undefined {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn('[Tracing] Span not found for failure', { spanId });
      return undefined;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = 'failed';
    span.error = error;

    if (metadata) {
      span.metadata = { ...span.metadata, ...metadata };
    }

    logger.error('[Tracing] ' + error.message, {
      spanId,
      traceId: span.traceId,
      operation: span.operation,
      duration: span.duration,
    });

    return span;
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): Span[] {
    return Array.from(this.spans.values()).filter(span => span.traceId === traceId);
  }

  /**
   * Clean up old spans (run periodically)
   */
  cleanup(maxAgeMs: number = 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [spanId, span] of this.spans.entries()) {
      const age = now - span.startTime;
      if (age > maxAgeMs) {
        this.spans.delete(spanId);
      }
    }
  }
}

const spanTracker = new SpanTracker();

// Cleanup old spans every 15 minutes
setInterval(() => spanTracker.cleanup(), 15 * 60 * 1000);

// =============================================================================
// Trace Context
// =============================================================================

export interface TraceContext {
  traceId: string;
  parentSpanId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create trace context for propagation
 */
export function createTraceContext(traceId: string, parentSpanId?: string): TraceContext {
  return {
    traceId,
    parentSpanId,
  };
}

/**
 * Parse trace context from headers (for incoming requests)
 */
export function parseTraceContext(headers: Record<string, string | undefined>): TraceContext | null {
  const traceId = headers['x-trace-id'];
  const parentSpanId = headers['x-parent-span-id'];

  if (!traceId) {
    return null;
  }

  return {
    traceId,
    parentSpanId,
  };
}

/**
 * Inject trace context into headers (for outgoing requests)
 */
export function injectTraceContext(context: TraceContext): Record<string, string> {
  const headers: Record<string, string> = {
    'x-trace-id': context.traceId,
  };

  if (context.parentSpanId) {
    headers['x-parent-span-id'] = context.parentSpanId;
  }

  return headers;
}

// =============================================================================
// High-Level API
// =============================================================================

/**
 * Execute operation with automatic span tracking
 */
export async function withTracing<T>(
  traceId: string,
  operation: string,
  fn: (span: Span) => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const span = spanTracker.startSpan(traceId, operation, metadata);

  try {
    const result = await fn(span);
    spanTracker.completeSpan(span.spanId, { success: true });
    return result;
  } catch (error) {
    spanTracker.failSpan(span.spanId, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Log correlation info for trace
 */
export function logTrace(traceId: string, message: string, metadata?: Record<string, unknown>): void {
  logger.info('[Trace] ' + message, {
    traceId,
    ...metadata,
  });
}

// =============================================================================
// Exports
// =============================================================================

export { spanTracker };
