/**
 * Metrics Collection
 *
 * Collects performance and usage metrics for Content Agent.
 * Provides insights for optimization and monitoring.
 */

import { logger } from '../../../lib/logger.js';

// =============================================================================
// Metric Types
// =============================================================================

interface PercentileMetrics {
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

export interface ContentAgentMetrics {
  // Tool execution times (ms)
  toolExecutionTimeMs: Record<string, PercentileMetrics>;

  // Full pipeline time (ms)
  fullPipelineTimeMs: PercentileMetrics;

  // Tool success rates (0.0 - 1.0)
  toolSuccessRate: Record<string, number>;

  // Intent detection accuracy (0.0 - 1.0)
  intentDetectionAccuracy: number;

  // Usage stats
  dailyActiveUsers: number;
  pipelinesExecutedToday: number;

  // Error tracking
  errorsByCategory: Record<string, number>;
}

// =============================================================================
// Metrics Storage
// =============================================================================

interface MetricDataPoint {
  value: number;
  timestamp: number;
}

class MetricsCollector {
  // Tool execution times
  private toolExecutionTimes = new Map<string, MetricDataPoint[]>();

  // Pipeline execution times
  private pipelineExecutionTimes: MetricDataPoint[] = [];

  // Tool success/failure counts
  private toolSuccessCounts = new Map<string, { success: number; total: number }>();

  // Intent detection accuracy
  private intentDetectionResults: Array<{ correct: boolean; timestamp: number }> = [];

  // Active users (rolling 24 hours)
  private activeUsers = new Set<string>();
  private userActivityTimestamps = new Map<string, number>();

  // Pipelines executed today
  private pipelinesExecutedToday = 0;
  private lastResetDate = new Date().toDateString();

  // Error counts
  private errorCounts = new Map<string, number>();

  /**
   * Record tool execution
   */
  recordToolExecution(toolName: string, durationMs: number, success: boolean): void {
    // Record execution time
    if (!this.toolExecutionTimes.has(toolName)) {
      this.toolExecutionTimes.set(toolName, []);
    }
    this.toolExecutionTimes.get(toolName)!.push({
      value: durationMs,
      timestamp: Date.now(),
    });

    // Record success/failure
    if (!this.toolSuccessCounts.has(toolName)) {
      this.toolSuccessCounts.set(toolName, { success: 0, total: 0 });
    }
    const counts = this.toolSuccessCounts.get(toolName)!;
    counts.total += 1;
    if (success) {
      counts.success += 1;
    }

    logger.debug('Metrics', 'Tool execution recorded', {
      toolName,
      durationMs,
      success,
    });
  }

  /**
   * Record pipeline execution
   */
  recordPipelineExecution(durationMs: number, success: boolean): void {
    this.pipelineExecutionTimes.push({
      value: durationMs,
      timestamp: Date.now(),
    });

    if (success) {
      this.incrementPipelinesExecutedToday();
    }

    logger.debug('Metrics', 'Pipeline execution recorded', {
      durationMs,
      success,
    });
  }

  /**
   * Record intent detection result
   */
  recordIntentDetection(detectedIntent: string, actualIntent: string): void {
    this.intentDetectionResults.push({
      correct: detectedIntent === actualIntent,
      timestamp: Date.now(),
    });

    logger.debug('Metrics', 'Intent detection recorded', {
      detected: detectedIntent,
      actual: actualIntent,
      correct: detectedIntent === actualIntent,
    });
  }

  /**
   * Record user activity
   */
  recordUserActivity(userId: string): void {
    const now = Date.now();
    this.activeUsers.add(userId);
    this.userActivityTimestamps.set(userId, now);

    // Cleanup old activity (older than 24 hours)
    const dayAgo = now - 24 * 60 * 60 * 1000;
    for (const [id, timestamp] of this.userActivityTimestamps.entries()) {
      if (timestamp < dayAgo) {
        this.activeUsers.delete(id);
        this.userActivityTimestamps.delete(id);
      }
    }
  }

  /**
   * Record error
   */
  recordError(category: string): void {
    const count = this.errorCounts.get(category) || 0;
    this.errorCounts.set(category, count + 1);

    logger.debug('Metrics', 'Error recorded', { category });
  }

  /**
   * Increment pipelines executed today
   */
  private incrementPipelinesExecutedToday(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      // Reset counter for new day
      this.pipelinesExecutedToday = 0;
      this.lastResetDate = today;
    }
    this.pipelinesExecutedToday += 1;
  }

  /**
   * Calculate percentiles from data points
   */
  private calculatePercentiles(dataPoints: MetricDataPoint[], windowMs: number = 60 * 60 * 1000): PercentileMetrics {
    // Filter to recent data (default: last hour)
    const cutoff = Date.now() - windowMs;
    const recentData = dataPoints.filter(dp => dp.timestamp >= cutoff);

    if (recentData.length === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }

    // Sort by value
    const sorted = recentData.map(dp => dp.value).sort((a, b) => a - b);

    const p50Index = Math.floor(sorted.length * 0.50);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
      count: sorted.length,
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): ContentAgentMetrics {
    // Tool execution times
    const toolExecutionTimeMs: Record<string, PercentileMetrics> = {};
    for (const [toolName, dataPoints] of this.toolExecutionTimes.entries()) {
      toolExecutionTimeMs[toolName] = this.calculatePercentiles(dataPoints);
    }

    // Pipeline execution times
    const fullPipelineTimeMs = this.calculatePercentiles(this.pipelineExecutionTimes);

    // Tool success rates
    const toolSuccessRate: Record<string, number> = {};
    for (const [toolName, counts] of this.toolSuccessCounts.entries()) {
      toolSuccessRate[toolName] = counts.total > 0 ? counts.success / counts.total : 0;
    }

    // Intent detection accuracy (last 100 attempts)
    const recentIntentResults = this.intentDetectionResults.slice(-100);
    const correctIntents = recentIntentResults.filter(r => r.correct).length;
    const intentDetectionAccuracy = recentIntentResults.length > 0
      ? correctIntents / recentIntentResults.length
      : 0;

    // Error counts
    const errorsByCategory: Record<string, number> = {};
    for (const [category, count] of this.errorCounts.entries()) {
      errorsByCategory[category] = count;
    }

    return {
      toolExecutionTimeMs,
      fullPipelineTimeMs,
      toolSuccessRate,
      intentDetectionAccuracy,
      dailyActiveUsers: this.activeUsers.size,
      pipelinesExecutedToday: this.pipelinesExecutedToday,
      errorsByCategory,
    };
  }

  /**
   * Cleanup old data (run periodically)
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;

    // Cleanup tool execution times
    for (const [toolName, dataPoints] of this.toolExecutionTimes.entries()) {
      const recentData = dataPoints.filter(dp => dp.timestamp >= cutoff);
      this.toolExecutionTimes.set(toolName, recentData);
    }

    // Cleanup pipeline execution times
    this.pipelineExecutionTimes = this.pipelineExecutionTimes.filter(dp => dp.timestamp >= cutoff);

    // Cleanup intent detection results
    this.intentDetectionResults = this.intentDetectionResults.filter(r => r.timestamp >= cutoff);

    logger.debug('Metrics', 'Cleanup completed', {
      cutoff: new Date(cutoff).toISOString(),
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const metricsCollector = new MetricsCollector();

// Cleanup every hour
setInterval(() => metricsCollector.cleanup(), 60 * 60 * 1000);

// =============================================================================
// Metrics API
// =============================================================================

/**
 * Get current metrics snapshot
 */
export function getMetricsSnapshot(): ContentAgentMetrics {
  return metricsCollector.getMetrics();
}

/**
 * Log metrics summary
 */
export function logMetricsSummary(): void {
  const metrics = getMetricsSnapshot();

  logger.info('MetricsSummary', 'Content Agent Metrics', {
    dailyActiveUsers: metrics.dailyActiveUsers,
    pipelinesExecutedToday: metrics.pipelinesExecutedToday,
    intentDetectionAccuracy: metrics.intentDetectionAccuracy.toFixed(2),
    toolSuccessRates: Object.entries(metrics.toolSuccessRate).map(([tool, rate]) => ({
      tool,
      rate: rate.toFixed(2),
    })),
  });
}
