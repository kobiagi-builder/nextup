# Backend Observability Architecture

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Complete

## Overview

The Content Agent backend implements a comprehensive observability stack designed for production monitoring, debugging, and performance optimization. The system provides distributed tracing for request correlation, percentile-based metrics for performance tracking, and resilient error handling through circuit breakers and exponential backoff.

**Key Components:**
- **Distributed Tracing** - Correlation across backend → n8n → database → frontend
- **Metrics Collection** - Percentile-based performance tracking (p50, p95, p99)
- **Circuit Breaker** - Fail-fast pattern for external service protection
- **Exponential Backoff** - Intelligent retry with jitter
- **Error Tracking** - 13 categorized error types with recovery strategies

---

## Distributed Tracing

### TraceID Format

All operations generate a unique TraceID for correlation across systems:

```
Format: ca-{timestamp}-{random6}
Example: ca-1706284800-a1b2c3
```

**Components:**
- `ca` - Content Agent prefix
- `{timestamp}` - Unix timestamp (seconds)
- `{random6}` - 6-character random alphanumeric string

### TraceID Generation

```typescript
/**
 * Generate unique trace ID for distributed tracing
 * Format: ca-{timestamp}-{random6}
 */
function generateTraceId(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).substring(2, 8);
  return `ca-${timestamp}-${random}`;
}
```

### Span Tracking

Each tool execution creates a span with start/end times:

```typescript
interface Span {
  traceId: string;
  spanId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata: Record<string, unknown>;
}

class TracingService {
  private spans = new Map<string, Span>();

  startSpan(traceId: string, operation: string, metadata: Record<string, unknown> = {}): string {
    const spanId = `${traceId}-${Date.now()}`;

    this.spans.set(spanId, {
      traceId,
      spanId,
      operation,
      startTime: Date.now(),
      metadata
    });

    return spanId;
  }

  endSpan(spanId: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;

    logger.debug({
      type: LogType.TRACE,
      flow: LogFlow.SYSTEM,
      object: LogObject.API_ENDPOINT,
      action: LogAction.COMPLETE,
      message: `Span completed: ${span.operation}`,
      context: { traceId: span.traceId, spanId },
      metadata: { duration: span.duration, ...span.metadata }
    });

    this.spans.delete(spanId);
  }
}
```

### Cross-System Correlation

TraceID propagates through all systems:

```
1. Frontend Request
   └─> traceId: ca-1706284800-a1b2c3

2. Backend API (ContentAgent.processRequest)
   └─> Receives traceId from frontend
   └─> Logs with context: { traceId: 'ca-1706284800-a1b2c3' }

3. Tool Execution (conductDeepResearch)
   └─> Receives traceId from ContentAgent
   └─> Returns ToolOutput with traceId field
   └─> Logs with context: { traceId: 'ca-1706284800-a1b2c3' }

4. External Service (Tavily API)
   └─> Request includes custom header: X-Trace-Id: ca-1706284800-a1b2c3
   └─> Logs response with traceId

5. Database Operations
   └─> Supabase queries include metadata: { traceId: 'ca-1706284800-a1b2c3' }

6. WebSocket Notification
   └─> Emits to frontend with traceId
   └─> Frontend logs event with matching traceId
```

### Logging with TraceID

All logs include traceId in context for correlation:

```typescript
import { logger } from '@/lib/logger';
import { LogType, LogFlow, LogObject, LogAction } from '@/lib/loggerTypes';

// Tool execution start
logger.debug({
  type: LogType.TRACE,
  flow: LogFlow.EXECUTION,
  object: LogObject.ACTION_ITEM,
  action: LogAction.START,
  message: 'Starting deep research',
  context: { traceId: 'ca-1706284800-a1b2c3' },
  metadata: { artifactId: 'abc-123', minRequired: 5 }
});

// Tool execution complete
logger.debug({
  type: LogType.TRACE,
  flow: LogFlow.EXECUTION,
  object: LogObject.ACTION_ITEM,
  action: LogAction.COMPLETE,
  message: 'Deep research completed',
  context: { traceId: 'ca-1706284800-a1b2c3' },
  metadata: { sourceCount: 7, duration: 32000 }
});
```

### Query by TraceID

**Console Logs (Development):**
```bash
# Find all logs for a specific trace
grep "ca-1706284800-a1b2c3" backend/logs/console-output.log

# Find all logs for a specific trace across all services
grep "ca-1706284800-a1b2c3" backend/logs/*.log frontend/logs/*.log
```

**New Relic (Production):**
```sql
-- Trace complete request flow
SELECT * FROM Log
WHERE context.traceId = 'ca-1706284800-a1b2c3'
ORDER BY timestamp ASC

-- Analyze request duration by operation
SELECT
  labels.action,
  average(metadata.duration) as avg_duration,
  percentile(metadata.duration, 95) as p95_duration
FROM Log
WHERE context.traceId = 'ca-1706284800-a1b2c3'
  AND labels.action IN ('START', 'COMPLETE')
FACET labels.action
```

---

## Metrics Collection

### Percentile-Based Performance Tracking

The system tracks tool execution times using percentile-based metrics:

**Metric Types:**
- **p50 (Median)** - Typical performance baseline
- **p95 (95th Percentile)** - Slow but acceptable performance
- **p99 (99th Percentile)** - Outliers requiring investigation

### Metrics Collection Implementation

```typescript
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  traceId: string;
  metadata: Record<string, unknown>;
}

class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 10000;

  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Prevent memory leak
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log metric
    logger.debug({
      type: LogType.TRACE,
      flow: LogFlow.SYSTEM,
      object: LogObject.API_ENDPOINT,
      action: LogAction.METRIC,
      message: `Performance metric: ${metric.operation}`,
      context: { traceId: metric.traceId },
      metadata: { duration: metric.duration, ...metric.metadata }
    });
  }

  calculatePercentiles(operation: string, timeWindowMs: number = 3600000): PercentileStats {
    const now = Date.now();
    const cutoff = now - timeWindowMs;

    // Filter metrics for operation within time window
    const durations = this.metrics
      .filter(m => m.operation === operation && m.timestamp >= cutoff)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }

    const p50Index = Math.floor(durations.length * 0.50);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      p50: durations[p50Index],
      p95: durations[p95Index],
      p99: durations[p99Index],
      count: durations.length
    };
  }

  getSummary(): Record<string, PercentileStats> {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const summary: Record<string, PercentileStats> = {};

    for (const operation of operations) {
      summary[operation] = this.calculatePercentiles(operation);
    }

    return summary;
  }
}

interface PercentileStats {
  p50: number;  // Median
  p95: number;  // 95th percentile
  p99: number;  // 99th percentile
  count: number; // Sample size
}
```

### Tracked Operations

```typescript
enum TrackedOperation {
  // Tool Execution
  CONDUCT_DEEP_RESEARCH = 'conductDeepResearch',
  GENERATE_CONTENT_SKELETON = 'generateContentSkeleton',
  WRITE_FULL_CONTENT = 'writeFullContent',
  GENERATE_CONTENT_VISUALS = 'generateContentVisuals',
  APPLY_HUMANITY_CHECK = 'applyHumanityCheck',
  CHECK_CONTENT_HUMANITY = 'checkContentHumanity',

  // AI Provider Calls
  ANTHROPIC_CLAUDE_SONNET = 'anthropic.claude-sonnet',
  ANTHROPIC_CLAUDE_HAIKU = 'anthropic.claude-haiku',
  GOOGLE_GEMINI_FLASH = 'google.gemini-flash',
  TAVILY_SEARCH = 'tavily.search',

  // Database Operations
  SUPABASE_QUERY = 'supabase.query',
  SUPABASE_INSERT = 'supabase.insert',
  SUPABASE_UPDATE = 'supabase.update',

  // Full Pipeline
  CONTENT_PIPELINE = 'pipeline.fullContent',
}
```

### Example Metrics Usage

```typescript
// Record tool execution metric
async function executeToolWithMetrics<T>(
  operation: TrackedOperation,
  traceId: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    metricsCollector.recordMetric({
      operation,
      duration,
      timestamp: Date.now(),
      traceId,
      metadata: { success: true }
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    metricsCollector.recordMetric({
      operation,
      duration,
      timestamp: Date.now(),
      traceId,
      metadata: { success: false, error: error.message }
    });

    throw error;
  }
}

// Example: Measure tool execution
const result = await executeToolWithMetrics(
  TrackedOperation.CONDUCT_DEEP_RESEARCH,
  traceId,
  () => conductDeepResearch.execute({ artifactId, minRequired: 5 })
);
```

### Performance Analysis

```typescript
// Get performance summary
const summary = metricsCollector.getSummary();

console.log('Performance Summary (Last Hour):');
console.log('conductDeepResearch:');
console.log(`  p50: ${summary.conductDeepResearch.p50}ms (median)`);
console.log(`  p95: ${summary.conductDeepResearch.p95}ms (95th percentile)`);
console.log(`  p99: ${summary.conductDeepResearch.p99}ms (99th percentile)`);
console.log(`  count: ${summary.conductDeepResearch.count} samples`);
```

**Interpretation:**
- **p50 < 5000ms** - Good baseline performance
- **p95 < 15000ms** - Acceptable slow requests
- **p99 > 30000ms** - Investigate outliers (timeouts, retries, external service issues)

---

## Circuit Breaker

### Fail-Fast Pattern

Circuit breaker prevents cascading failures by failing fast when external services are unhealthy.

**States:**
- **CLOSED** - Normal operation, requests pass through
- **OPEN** - Service unhealthy, requests fail immediately
- **HALF_OPEN** - Testing recovery, limited requests allowed

### State Transitions

```
CLOSED → OPEN
  Trigger: 5 consecutive failures
  Action: Block all requests, return error immediately

OPEN → HALF_OPEN
  Trigger: 60 seconds elapsed since opening
  Action: Allow 1 test request

HALF_OPEN → CLOSED
  Trigger: Test request succeeds
  Action: Resume normal operation

HALF_OPEN → OPEN
  Trigger: Test request fails
  Action: Reset timer, block requests for another 60 seconds
```

### Circuit Breaker Implementation

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerConfig {
  failureThreshold: number;  // Consecutive failures to open circuit
  recoveryTimeMs: number;     // Time before attempting recovery
  successThreshold: number;   // Successes needed to close circuit
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime?: number;

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeMs: 60000,  // 60 seconds
      successThreshold: 1
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if recovery time elapsed
      const timeSinceFailure = Date.now() - (this.lastFailureTime || 0);

      if (timeSinceFailure >= this.config.recoveryTimeMs) {
        logger.info({
          type: LogType.TRACE,
          flow: LogFlow.SYSTEM,
          object: LogObject.API_ENDPOINT,
          action: LogAction.STATE_TRANSITION,
          message: `Circuit breaker entering HALF_OPEN: ${this.serviceName}`,
          metadata: { previousState: CircuitState.OPEN }
        });
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw createContentAgentError(
          ErrorCategory.AI_PROVIDER_ERROR,
          `Circuit breaker open for ${this.serviceName}. Try again later.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses += 1;

      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        logger.info({
          type: LogType.TRACE,
          flow: LogFlow.SYSTEM,
          object: LogObject.API_ENDPOINT,
          action: LogAction.STATE_TRANSITION,
          message: `Circuit breaker CLOSED: ${this.serviceName}`,
          metadata: { previousState: CircuitState.HALF_OPEN }
        });
        this.state = CircuitState.CLOSED;
        this.consecutiveSuccesses = 0;
      }
    }
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn({
        type: LogType.TRACE,
        flow: LogFlow.SYSTEM,
        object: LogObject.API_ENDPOINT,
        action: LogAction.STATE_TRANSITION,
        message: `Circuit breaker reopening: ${this.serviceName}`,
        metadata: { previousState: CircuitState.HALF_OPEN }
      });
      this.state = CircuitState.OPEN;
      this.consecutiveSuccesses = 0;
    } else if (this.consecutiveFailures >= this.config.failureThreshold) {
      logger.error({
        type: LogType.TRACE,
        flow: LogFlow.SYSTEM,
        object: LogObject.API_ENDPOINT,
        action: LogAction.STATE_TRANSITION,
        message: `Circuit breaker OPEN: ${this.serviceName}`,
        metadata: {
          previousState: CircuitState.CLOSED,
          consecutiveFailures: this.consecutiveFailures
        }
      });
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### Circuit Breaker Usage

```typescript
// Create circuit breaker for external service
const tavilyCircuitBreaker = new CircuitBreaker('Tavily API', {
  failureThreshold: 5,
  recoveryTimeMs: 60000,
  successThreshold: 1
});

// Execute request through circuit breaker
async function searchWithTavily(query: string): Promise<SearchResults> {
  return tavilyCircuitBreaker.execute(async () => {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.statusText}`);
    }

    return response.json();
  });
}
```

---

## Exponential Backoff

### Retry Strategy with Jitter

Exponential backoff prevents thundering herd by adding randomized delay between retries.

**Formula:**
```
delay = min(baseDelay * 2^attempt + random(0, baseDelay), maxDelay)
```

**Parameters:**
- `baseDelay` - Initial delay (1000ms)
- `maxDelay` - Maximum delay cap (10000ms)
- `attempt` - Retry attempt number (0-indexed)
- `random(0, baseDelay)` - Jitter to prevent synchronized retries

### Backoff Implementation

```typescript
interface BackoffConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number, config: BackoffConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.baseDelayMs;
  const delay = exponentialDelay + jitter;

  return Math.min(delay, config.maxDelayMs);
}

/**
 * Execute function with exponential backoff retry
 */
async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG,
  retryableErrors: ErrorCategory[] = [
    ErrorCategory.TOOL_EXECUTION_FAILED,
    ErrorCategory.TOOL_TIMEOUT,
    ErrorCategory.AI_PROVIDER_ERROR,
  ]
): Promise<T> {
  let lastError: ContentAgentError | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as ContentAgentError;

      // Check if error is retryable
      if (!retryableErrors.includes(lastError.category)) {
        logger.warn({
          type: LogType.TRACE,
          flow: LogFlow.SYSTEM,
          object: LogObject.API_ENDPOINT,
          action: LogAction.ERROR,
          message: 'Non-retryable error encountered',
          metadata: { category: lastError.category, attempt }
        });
        throw lastError;
      }

      // Check if max retries reached
      if (attempt >= config.maxRetries) {
        logger.error({
          type: LogType.TRACE,
          flow: LogFlow.SYSTEM,
          object: LogObject.API_ENDPOINT,
          action: LogAction.RETRY,
          message: 'Max retries reached',
          metadata: {
            maxRetries: config.maxRetries,
            category: lastError.category
          }
        });
        throw lastError;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, config);

      logger.info({
        type: LogType.TRACE,
        flow: LogFlow.SYSTEM,
        object: LogObject.API_ENDPOINT,
        action: LogAction.RETRY,
        message: `Retrying after ${delay}ms`,
        metadata: { attempt: attempt + 1, maxRetries: config.maxRetries, delay }
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### Backoff Usage Example

```typescript
// Retry tool execution with exponential backoff
async function executeTool<T>(
  toolFn: () => Promise<T>,
  traceId: string
): Promise<T> {
  return withExponentialBackoff(
    toolFn,
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000
    },
    [
      ErrorCategory.TOOL_EXECUTION_FAILED,
      ErrorCategory.TOOL_TIMEOUT,
      ErrorCategory.AI_PROVIDER_ERROR
    ]
  );
}

// Example: Conduct research with retry
const result = await executeTool(
  () => conductDeepResearch.execute({ artifactId, minRequired: 5 }),
  traceId
);
```

### Backoff Delay Examples

| Attempt | Base Delay | Exponential | Jitter Range | Min Delay | Max Delay | Capped |
|---------|-----------|-------------|--------------|-----------|-----------|--------|
| 0 | 1000ms | 1000ms | 0-1000ms | 1000ms | 2000ms | 2000ms |
| 1 | 1000ms | 2000ms | 0-1000ms | 2000ms | 3000ms | 3000ms |
| 2 | 1000ms | 4000ms | 0-1000ms | 4000ms | 5000ms | 5000ms |
| 3 | 1000ms | 8000ms | 0-1000ms | 8000ms | 9000ms | 9000ms |
| 4+ | 1000ms | 16000ms+ | 0-1000ms | 16000ms+ | 17000ms+ | 10000ms |

**Why Jitter?**
- Prevents synchronized retries (thundering herd)
- Distributes load across time window
- Reduces probability of simultaneous requests

---

## Error Tracking

### Error Categories

The system tracks 13 error categories with recovery strategies:

```typescript
enum ErrorCategory {
  // Tool Errors
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',    // Retry (recoverable)
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',                      // Retry (recoverable)

  // AI Provider Errors
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',            // Retry (recoverable)
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',                    // Backoff + Retry
  AI_CONTENT_FILTER = 'AI_CONTENT_FILTER',            // Not recoverable

  // Validation Errors
  ARTIFACT_NOT_FOUND = 'ARTIFACT_NOT_FOUND',          // Not recoverable
  INVALID_ARTIFACT_ID = 'INVALID_ARTIFACT_ID',        // Not recoverable
  INVALID_STATUS = 'INVALID_STATUS',                  // Not recoverable
  UNCLEAR_INTENT = 'UNCLEAR_INTENT',                  // Clarification needed
  MISSING_CONTEXT = 'MISSING_CONTEXT',                // Additional input needed
  RESEARCH_NOT_FOUND = 'RESEARCH_NOT_FOUND',          // Not recoverable
  INVALID_TONE = 'INVALID_TONE',                      // Not recoverable
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',      // Not recoverable
}
```

### Error Tracking Implementation

```typescript
interface ErrorEvent {
  category: ErrorCategory;
  message: string;
  timestamp: number;
  traceId: string;
  recoverable: boolean;
  retried: boolean;
  metadata: Record<string, unknown>;
}

class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private readonly MAX_ERRORS = 1000;

  trackError(event: ErrorEvent): void {
    this.errors.push(event);

    // Prevent memory leak
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }

    logger.error({
      type: LogType.TRACE,
      flow: LogFlow.SYSTEM,
      object: LogObject.API_ENDPOINT,
      action: LogAction.ERROR,
      message: event.message,
      context: { traceId: event.traceId },
      metadata: {
        category: event.category,
        recoverable: event.recoverable,
        retried: event.retried,
        ...event.metadata
      }
    });
  }

  getErrorRate(category: ErrorCategory, timeWindowMs: number = 3600000): number {
    const now = Date.now();
    const cutoff = now - timeWindowMs;

    const errorsInWindow = this.errors.filter(
      e => e.category === category && e.timestamp >= cutoff
    );

    return errorsInWindow.length;
  }

  getSuccessRate(operation: string, timeWindowMs: number = 3600000): number {
    // Calculate success rate based on metrics vs errors
    const totalRequests = metricsCollector.calculatePercentiles(operation, timeWindowMs).count;
    const errorCount = this.errors.filter(e =>
      e.metadata.operation === operation &&
      e.timestamp >= Date.now() - timeWindowMs
    ).length;

    if (totalRequests === 0) return 1.0;
    return (totalRequests - errorCount) / totalRequests;
  }
}
```

---

## Complete Example: Tool Execution with Full Observability

```typescript
/**
 * Execute tool with full observability:
 * - Distributed tracing
 * - Metrics collection
 * - Circuit breaker protection
 * - Exponential backoff retry
 * - Error tracking
 */
async function executeToolWithObservability<T>(
  toolName: string,
  toolFn: () => Promise<ToolOutput<T>>,
  traceId: string
): Promise<ToolOutput<T>> {
  // Start span for tracing
  const spanId = tracingService.startSpan(traceId, toolName);

  // Record start time for metrics
  const startTime = Date.now();

  try {
    // Execute with circuit breaker and exponential backoff
    const result = await circuitBreaker.execute(async () => {
      return withExponentialBackoff(
        toolFn,
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000
        },
        [
          ErrorCategory.TOOL_EXECUTION_FAILED,
          ErrorCategory.TOOL_TIMEOUT,
          ErrorCategory.AI_PROVIDER_ERROR
        ]
      );
    });

    // Record success metric
    const duration = Date.now() - startTime;
    metricsCollector.recordMetric({
      operation: toolName,
      duration,
      timestamp: Date.now(),
      traceId,
      metadata: { success: true }
    });

    // End span
    tracingService.endSpan(spanId);

    return result;

  } catch (error) {
    // Record failure metric
    const duration = Date.now() - startTime;
    metricsCollector.recordMetric({
      operation: toolName,
      duration,
      timestamp: Date.now(),
      traceId,
      metadata: { success: false, error: error.message }
    });

    // Track error
    errorTracker.trackError({
      category: error.category,
      message: error.message,
      timestamp: Date.now(),
      traceId,
      recoverable: error.recoverable,
      retried: true,
      metadata: { operation: toolName }
    });

    // End span with error
    tracingService.endSpan(spanId);

    throw error;
  }
}

// Usage example
const result = await executeToolWithObservability(
  'conductDeepResearch',
  () => conductDeepResearch.execute({ artifactId, minRequired: 5 }),
  traceId
);
```

---

## Production Monitoring Dashboards

### Recommended Metrics to Track

**Latency Metrics:**
- Tool execution times (p50, p95, p99)
- Pipeline duration (full content creation)
- AI provider response times
- Database query times

**Error Metrics:**
- Error rate by category
- Success rate by operation
- Circuit breaker state transitions
- Retry attempts per request

**System Health:**
- Active circuit breakers
- Rate limit approaching (warning at 80%)
- Session timeout rate
- Token budget exhaustion rate

### New Relic Queries

```sql
-- Tool execution latency
SELECT
  labels.object as tool,
  percentile(metadata.duration, 50) as p50,
  percentile(metadata.duration, 95) as p95,
  percentile(metadata.duration, 99) as p99
FROM Log
WHERE labels.action IN ('START', 'COMPLETE')
  AND labels.flow = 'EXECUTION'
SINCE 1 hour ago
FACET tool

-- Error rate by category
SELECT count(*) as errors
FROM Log
WHERE labels.action = 'ERROR'
SINCE 1 hour ago
FACET metadata.category

-- Circuit breaker state changes
SELECT count(*) as transitions
FROM Log
WHERE labels.action = 'STATE_TRANSITION'
  AND message LIKE '%Circuit breaker%'
SINCE 1 day ago
FACET message

-- Success rate by operation
SELECT
  (100 - (errors / total * 100)) as success_rate
FROM (
  SELECT
    count(*) as total,
    filter(count(*), WHERE labels.action = 'ERROR') as errors
  FROM Log
  WHERE labels.flow = 'EXECUTION'
  SINCE 1 hour ago
  FACET labels.object
)
```

---

## Related Documentation

- [error-handling-reference.md](../../api/error-handling-reference.md) - 13 error categories with retry policies
- [pipeline-execution-flow.md](../../ai-agents-and-prompts/pipeline-execution-flow.md) - Checkpoint/rollback mechanism
- [content-agent-architecture.md](./content-agent-architecture.md) - ContentAgent orchestrator
- [security-architecture.md](./security-architecture.md) - Multi-layered security approach

---

**Version History:**
- **1.0.0** (2026-01-26) - Initial observability architecture documentation
