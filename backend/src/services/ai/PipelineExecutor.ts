/**
 * Pipeline Executor
 *
 * Executes full artifact pipeline with checkpoint/rollback support.
 * Provides transaction-like behavior for multi-tool workflows.
 */

import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { conductDeepResearch } from './tools/researchTools.js';
import { generateContentSkeleton } from './tools/skeletonTools.js';
import { writeFullContent } from './tools/contentWritingTools.js';
import { generateContentVisuals } from './tools/visualsCreatorTool.js';
import { applyHumanityCheck } from './tools/humanityCheckTools.js';
import { identifyImageNeeds } from './tools/imageNeedsTools.js';
import { generateTraceId, withTracing } from './observability/tracing.js';
import { metricsCollector } from './observability/metrics.js';
import { withExponentialBackoff, BackoffOptions } from './utils/backoff.js';
import { ErrorCategory, createToolError } from './types/errors.js';
import type { ArtifactStatus } from '../../types/artifact.js';

// =============================================================================
// Types
// =============================================================================

export interface PipelineStep {
  toolName: string;
  execute: (artifactId: string) => Promise<any>;
  expectedStatusBefore: ArtifactStatus;
  expectedStatusAfter: ArtifactStatus;
  required: boolean;
}

export interface PipelineCheckpoint {
  stepIndex: number;
  artifactId: string;
  status: ArtifactStatus;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineProgress {
  currentStep: number;
  totalSteps: number;
  completedTools: string[];
  currentTool?: string;
  traceId: string;
}

export interface PipelineResult {
  success: boolean;
  artifactId: string;
  traceId: string;
  duration: number;
  stepsCompleted: number;
  totalSteps: number;
  toolResults: Record<string, any>;
  error?: {
    category: ErrorCategory;
    message: string;
    failedStep: number;
    failedTool: string;
    recoverable: boolean;
  };
}

export interface PipelineOptions {
  skipHumanityCheck?: boolean;
  retryOptions?: Partial<BackoffOptions>;
  onProgress?: (progress: PipelineProgress) => void;
}

// =============================================================================
// Pipeline Definition
// =============================================================================

const PIPELINE_STEPS: PipelineStep[] = [
  {
    toolName: 'conductDeepResearch',
    execute: (artifactId: string) => conductDeepResearch.execute({
      artifactId,
      minRequired: 5,
    }),
    expectedStatusBefore: 'draft',
    expectedStatusAfter: 'research',
    required: true,
  },
  {
    toolName: 'generateContentSkeleton',
    execute: (artifactId: string) => generateContentSkeleton.execute({
      artifactId,
    }),
    expectedStatusBefore: 'research',
    expectedStatusAfter: 'skeleton',
    required: true,
  },
  {
    toolName: 'writeFullContent',
    execute: (artifactId: string) => writeFullContent.execute({
      artifactId,
      tone: 'professional',
    }),
    expectedStatusBefore: 'skeleton',
    expectedStatusAfter: 'writing',
    required: true,
  },
  // Phase 3: Image needs identification (automatic after writing)
  {
    toolName: 'identifyImageNeeds',
    execute: async (artifactId: string) => {
      // Fetch artifact to get type and content
      const { data: artifact } = await supabaseAdmin
        .from('artifacts')
        .select('type, content')
        .eq('id', artifactId)
        .single();

      if (!artifact) {
        return {
          success: false,
          error: { message: 'Artifact not found' },
        };
      }

      return identifyImageNeeds.execute({
        artifactId,
        artifactType: artifact.type as 'blog' | 'social_post' | 'showcase',
        content: artifact.content,
      });
    },
    expectedStatusBefore: 'writing',
    expectedStatusAfter: 'creating_visuals',
    required: false, // Optional - user can skip images
  },
  // Phase 2 MVP: Placeholder visuals (deprecated in Phase 3)
  // Kept for backward compatibility, but not used in Phase 3 workflow
  {
    toolName: 'generateContentVisuals',
    execute: (artifactId: string) => generateContentVisuals.execute({
      artifactId,
    }),
    expectedStatusBefore: 'creating_visuals',
    expectedStatusAfter: 'ready',
    required: false,
  },
  {
    toolName: 'applyHumanityCheck',
    execute: (artifactId: string) => applyHumanityCheck.execute({
      artifactId,
    }),
    expectedStatusBefore: 'creating_visuals',
    expectedStatusAfter: 'ready',
    required: false, // Optional step
  },
];

// =============================================================================
// Checkpoint Management
// =============================================================================

class CheckpointManager {
  private checkpoints = new Map<string, PipelineCheckpoint[]>();

  /**
   * Create checkpoint before tool execution
   */
  async createCheckpoint(
    artifactId: string,
    stepIndex: number,
    metadata?: Record<string, unknown>
  ): Promise<PipelineCheckpoint> {
    // Fetch current artifact state
    const { data: artifact, error } = await supabaseAdmin
      .from('artifacts')
      .select('id, status')
      .eq('id', artifactId)
      .single();

    if (error || !artifact) {
      throw createToolError(
        ErrorCategory.ARTIFACT_NOT_FOUND,
        `Failed to create checkpoint: artifact not found`,
        false
      );
    }

    const checkpoint: PipelineCheckpoint = {
      stepIndex,
      artifactId,
      status: artifact.status as ArtifactStatus,
      timestamp: Date.now(),
      metadata,
    };

    // Store checkpoint
    if (!this.checkpoints.has(artifactId)) {
      this.checkpoints.set(artifactId, []);
    }
    this.checkpoints.get(artifactId)!.push(checkpoint);

    logger.debug('PipelineExecutor', 'Checkpoint created', {
      artifactId,
      stepIndex,
      status: checkpoint.status,
    });

    return checkpoint;
  }

  /**
   * Get last checkpoint for artifact
   */
  getLastCheckpoint(artifactId: string): PipelineCheckpoint | undefined {
    const checkpoints = this.checkpoints.get(artifactId);
    return checkpoints?.[checkpoints.length - 1];
  }

  /**
   * Rollback to last checkpoint
   */
  async rollback(artifactId: string): Promise<void> {
    const checkpoint = this.getLastCheckpoint(artifactId);
    if (!checkpoint) {
      logger.warn('PipelineExecutor', 'No checkpoint to rollback to', { artifactId });
      return;
    }

    logger.info('PipelineExecutor', 'Rolling back to checkpoint', {
      artifactId,
      targetStatus: checkpoint.status,
      stepIndex: checkpoint.stepIndex,
    });

    // Restore artifact status
    const { error } = await supabaseAdmin
      .from('artifacts')
      .update({ status: checkpoint.status })
      .eq('id', artifactId);

    if (error) {
      logger.error('PipelineExecutor', new Error('Rollback failed'), {
        artifactId,
        error: error.message,
      });
      throw createToolError(
        ErrorCategory.TOOL_EXECUTION_FAILED,
        `Failed to rollback artifact status: ${error.message}`,
        false
      );
    }

    logger.info('PipelineExecutor', 'Rollback completed', {
      artifactId,
      restoredStatus: checkpoint.status,
    });
  }

  /**
   * Clear checkpoints for artifact
   */
  clearCheckpoints(artifactId: string): void {
    this.checkpoints.delete(artifactId);
  }
}

const checkpointManager = new CheckpointManager();

// =============================================================================
// Pipeline Executor
// =============================================================================

export class PipelineExecutor {
  /**
   * Execute full pipeline for artifact
   */
  async execute(
    artifactId: string,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const traceId = generateTraceId('pipeline');
    const toolResults: Record<string, any> = {};

    logger.info('PipelineExecutor', 'Starting pipeline execution', {
      artifactId,
      traceId,
      skipHumanityCheck: options.skipHumanityCheck,
    });

    // Clear any previous checkpoints
    checkpointManager.clearCheckpoints(artifactId);

    let currentStep = 0;
    const steps = options.skipHumanityCheck
      ? PIPELINE_STEPS.filter(step => step.toolName !== 'applyHumanityCheck')
      : PIPELINE_STEPS;

    try {
      return await withTracing(
        traceId,
        'executePipeline',
        async () => {
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            currentStep = i;

            // Notify progress
            if (options.onProgress) {
              options.onProgress({
                currentStep: i,
                totalSteps: steps.length,
                completedTools: Object.keys(toolResults),
                currentTool: step.toolName,
                traceId,
              });
            }

            // Create checkpoint before execution
            await checkpointManager.createCheckpoint(artifactId, i, {
              toolName: step.toolName,
            });

            logger.info('PipelineExecutor', `Executing step ${i + 1}/${steps.length}`, {
              artifactId,
              traceId,
              toolName: step.toolName,
            });

            // Execute tool with backoff
            const toolResult = await withExponentialBackoff(
              async () => {
                const result = await step.execute(artifactId);

                // Verify expected status transition
                if (result.statusTransition) {
                  if (result.statusTransition.to !== step.expectedStatusAfter) {
                    logger.warn('PipelineExecutor', 'Unexpected status transition', {
                      expected: step.expectedStatusAfter,
                      actual: result.statusTransition.to,
                      toolName: step.toolName,
                    });
                  }
                }

                return result;
              },
              options.retryOptions
            );

            // Record tool result
            toolResults[step.toolName] = toolResult;

            // Record metrics
            metricsCollector.recordToolExecution(
              step.toolName,
              toolResult.duration || 0,
              toolResult.success
            );

            if (!toolResult.success) {
              throw createToolError(
                toolResult.error?.category || ErrorCategory.TOOL_EXECUTION_FAILED,
                `Tool ${step.toolName} failed: ${toolResult.error?.message}`,
                toolResult.error?.recoverable ?? true
              );
            }

            logger.info('PipelineExecutor', `Step ${i + 1}/${steps.length} completed`, {
              artifactId,
              traceId,
              toolName: step.toolName,
              duration: toolResult.duration,
            });
          }

          // All steps completed successfully
          const duration = Date.now() - startTime;

          // Record pipeline metrics
          metricsCollector.recordPipelineExecution(duration, true);

          // Clear checkpoints after success
          checkpointManager.clearCheckpoints(artifactId);

          logger.info('PipelineExecutor', 'Pipeline execution completed', {
            artifactId,
            traceId,
            duration,
            stepsCompleted: steps.length,
          });

          return {
            success: true,
            artifactId,
            traceId,
            duration,
            stepsCompleted: steps.length,
            totalSteps: steps.length,
            toolResults,
          };
        },
        { artifactId }
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record pipeline failure
      metricsCollector.recordPipelineExecution(duration, false);

      const toolError = error as any;
      const failedStep = steps[currentStep];

      logger.error('PipelineExecutor', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        traceId,
        failedStep: currentStep,
        failedTool: failedStep?.toolName,
        duration,
      });

      // Attempt rollback
      try {
        await checkpointManager.rollback(artifactId);
      } catch (rollbackError) {
        logger.error('PipelineExecutor', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)), {
          artifactId,
          traceId,
          context: 'rollback_failed',
        });
      }

      return {
        success: false,
        artifactId,
        traceId,
        duration,
        stepsCompleted: currentStep,
        totalSteps: steps.length,
        toolResults,
        error: {
          category: toolError.category || ErrorCategory.TOOL_EXECUTION_FAILED,
          message: toolError.message || 'Unknown error',
          failedStep: currentStep,
          failedTool: failedStep?.toolName || 'unknown',
          recoverable: toolError.recoverable ?? true,
        },
      };
    }
  }

  /**
   * Execute single tool in pipeline
   */
  async executeSingleTool(
    toolName: string,
    artifactId: string,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const step = PIPELINE_STEPS.find(s => s.toolName === toolName);
    if (!step) {
      throw createToolError(
        ErrorCategory.TOOL_EXECUTION_FAILED,
        `Unknown tool: ${toolName}`,
        false
      );
    }

    const startTime = Date.now();
    const traceId = generateTraceId('single-tool');

    logger.info('PipelineExecutor', 'Executing single tool', {
      artifactId,
      traceId,
      toolName,
    });

    try {
      // Create checkpoint
      await checkpointManager.createCheckpoint(artifactId, 0, { toolName });

      // Execute with backoff
      const result = await withExponentialBackoff(
        () => step.execute(artifactId),
        options.retryOptions
      );

      const duration = Date.now() - startTime;

      // Record metrics
      metricsCollector.recordToolExecution(toolName, result.duration || 0, result.success);

      if (!result.success) {
        throw createToolError(
          result.error?.category || ErrorCategory.TOOL_EXECUTION_FAILED,
          `Tool ${toolName} failed: ${result.error?.message}`,
          result.error?.recoverable ?? true
        );
      }

      // Clear checkpoint on success
      checkpointManager.clearCheckpoints(artifactId);

      return {
        success: true,
        artifactId,
        traceId,
        duration,
        stepsCompleted: 1,
        totalSteps: 1,
        toolResults: { [toolName]: result },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const toolError = error as any;

      logger.error('PipelineExecutor', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        traceId,
        toolName,
        duration,
      });

      // Attempt rollback
      try {
        await checkpointManager.rollback(artifactId);
      } catch (rollbackError) {
        logger.error('PipelineExecutor', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)), {
          artifactId,
          traceId,
          toolName,
          context: 'rollback_failed',
        });
      }

      return {
        success: false,
        artifactId,
        traceId,
        duration,
        stepsCompleted: 0,
        totalSteps: 1,
        toolResults: {},
        error: {
          category: toolError.category || ErrorCategory.TOOL_EXECUTION_FAILED,
          message: toolError.message || 'Unknown error',
          failedStep: 0,
          failedTool: toolName,
          recoverable: toolError.recoverable ?? true,
        },
      };
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export const pipelineExecutor = new PipelineExecutor();
