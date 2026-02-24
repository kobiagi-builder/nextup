/**
 * Pipeline Executor
 *
 * Executes full artifact pipeline with checkpoint/rollback support.
 * Provides transaction-like behavior for multi-tool workflows.
 */

import { logger } from '../../lib/logger.js';
import { getSupabase } from '../../lib/requestContext.js';
import { conductDeepResearch } from './tools/researchTools.js';
import { analyzeWritingCharacteristics } from './tools/writingCharacteristicsTools.js';
import { analyzeStorytellingStructure } from './tools/storytellingTools.js';
import { generateContentSkeleton } from './tools/skeletonTools.js';
import { writeFullContent } from './tools/contentWritingTools.js';
// applyHumanityCheck is now integrated per-section inside writeFullContent
import { identifyImageNeeds } from './tools/imageNeedsTools.js';
import { generateTraceId, withTracing } from './observability/tracing.js';
import { metricsCollector } from './observability/metrics.js';
import { withExponentialBackoff, BackoffOptions } from './utils/backoff.js';
import { ErrorCategory, createToolError } from './types/errors.js';
import type { ArtifactStatus } from '../../types/portfolio.js';

// =============================================================================
// Types
// =============================================================================

export interface PipelineStep {
  toolName: string;
  execute: (artifactId: string) => Promise<any>;
  expectedStatusBefore: ArtifactStatus;
  expectedStatusAfter: ArtifactStatus;
  required: boolean;
  pauseForApproval?: boolean; // Phase 4: Pipeline pauses here for user approval
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
  // Phase 4: Pipeline pause for user approval
  pausedForApproval?: boolean;
  pausedAtStep?: string;
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
    execute: async (artifactId: string) => {
      // Fetch artifact to get required fields
      const { data: artifact } = await getSupabase()
        .from('artifacts')
        .select('type, title')
        .eq('id', artifactId)
        .single();

      if (!artifact) {
        return {
          success: false,
          error: { message: 'Artifact not found' },
        };
      }

      return conductDeepResearch.execute!({
        artifactId,
        topic: artifact.title || 'Content',
        artifactType: artifact.type as 'blog' | 'social_post' | 'showcase',
      }, {} as any);
    },
    expectedStatusBefore: 'draft',
    expectedStatusAfter: 'research',
    required: true,
  },
  // Phase 4: Writing characteristics analysis after research
  {
    toolName: 'analyzeWritingCharacteristics',
    execute: async (artifactId: string) => {
      // Fetch artifact to get type
      const { data: artifact } = await getSupabase()
        .from('artifacts')
        .select('type')
        .eq('id', artifactId)
        .single();

      if (!artifact) {
        return {
          success: false,
          error: { message: 'Artifact not found' },
        };
      }

      return analyzeWritingCharacteristics.execute!({
        artifactId,
        artifactType: artifact.type as 'blog' | 'social_post' | 'showcase',
      }, {} as any);
    },
    expectedStatusBefore: 'research',
    expectedStatusAfter: 'foundations',
    required: true,
  },
  // Storytelling analysis: runs within 'foundations' status (no status change)
  {
    toolName: 'analyzeStorytellingStructure',
    execute: async (artifactId: string) => {
      const { data: artifact } = await getSupabase()
        .from('artifacts')
        .select('type')
        .eq('id', artifactId)
        .single();

      if (!artifact) {
        return {
          success: false,
          error: { message: 'Artifact not found' },
        };
      }

      return analyzeStorytellingStructure.execute!({
        artifactId,
        artifactType: artifact.type as 'blog' | 'social_post' | 'showcase',
      }, {} as any);
    },
    expectedStatusBefore: 'foundations',
    expectedStatusAfter: 'foundations',
    required: true,
  },
  {
    toolName: 'generateContentSkeleton',
    execute: async (artifactId: string) => {
      // Fetch artifact to get required fields
      const { data: artifact } = await getSupabase()
        .from('artifacts')
        .select('type, title, tone')
        .eq('id', artifactId)
        .single();

      if (!artifact) {
        return {
          success: false,
          error: { message: 'Artifact not found' },
        };
      }

      return generateContentSkeleton.execute!({
        artifactId,
        topic: artifact.title || 'Content',
        artifactType: artifact.type as 'blog' | 'social_post' | 'showcase',
        tone: (artifact.tone as any) || 'professional',
        useWritingCharacteristics: true,
      }, {} as any);
    },
    expectedStatusBefore: 'foundations',
    expectedStatusAfter: 'foundations_approval',
    required: true,
    pauseForApproval: true, // Phase 4: Pipeline pauses here for user approval
  },
  {
    toolName: 'writeFullContent',
    execute: async (artifactId: string) => {
      // Fetch artifact to get required fields
      const { data: artifact } = await getSupabase()
        .from('artifacts')
        .select('type, tone')
        .eq('id', artifactId)
        .single();

      if (!artifact) {
        return {
          success: false,
          error: { message: 'Artifact not found' },
        };
      }

      return writeFullContent.execute!({
        artifactId,
        tone: (artifact.tone as any) || 'professional',
        artifactType: artifact.type as 'blog' | 'social_post' | 'showcase',
        useWritingCharacteristics: true,
      }, {} as any);
    },
    // Phase 4: writeFullContent expects 'foundations_approval' status
    // This is set when user clicks "Foundations Approved" button
    // Humanization is applied per-section inside writeFullContent (inline Claude calls)
    expectedStatusBefore: 'foundations_approval',
    expectedStatusAfter: 'humanity_checking',
    required: true,
  },
  // Image generation: identify image needs and generate images from humanized content
  {
    toolName: 'identifyImageNeeds',
    execute: async (artifactId: string) => {
      // Fetch artifact to get type and content
      const { data: artifact } = await getSupabase()
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

      return identifyImageNeeds.execute!({
        artifactId,
        artifactType: artifact.type as 'blog' | 'social_post' | 'showcase',
        content: artifact.content,
      }, {} as any);
    },
    expectedStatusBefore: 'humanity_checking',
    expectedStatusAfter: 'ready',
    required: false, // Optional - pipeline completes even if image generation fails
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
    const { data: artifact, error } = await getSupabase()
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

    logger.debug('[PipelineExecutor] Checkpoint created', {
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
      logger.warn('[PipelineExecutor] No checkpoint to rollback to', { artifactId });
      return;
    }

    logger.info('[PipelineExecutor] Rolling back to checkpoint', {
      artifactId,
      targetStatus: checkpoint.status,
      stepIndex: checkpoint.stepIndex,
    });

    // Restore artifact status
    const { error } = await getSupabase()
      .from('artifacts')
      .update({ status: checkpoint.status })
      .eq('id', artifactId);

    if (error) {
      logger.error('[PipelineExecutor] Rollback failed', {
        artifactId,
        error: error.message,
      });
      throw createToolError(
        ErrorCategory.TOOL_EXECUTION_FAILED,
        `Failed to rollback artifact status: ${error.message}`,
        false
      );
    }

    logger.info('[PipelineExecutor] Rollback completed', {
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

    logger.info('[PipelineExecutor] Starting pipeline execution', {
      artifactId,
      traceId,
      skipHumanityCheck: options.skipHumanityCheck,
    });

    // Clear any previous checkpoints
    checkpointManager.clearCheckpoints(artifactId);

    let currentStep = 0;
    const steps = PIPELINE_STEPS;

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

            logger.info(`[PipelineExecutor] Executing step ${i + 1}/${steps.length}`, {
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
                    logger.warn('[PipelineExecutor] Unexpected status transition', {
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
              if (!step.required) {
                // Optional step failed - log warning and continue pipeline
                logger.warn(`[PipelineExecutor] Optional step ${step.toolName} failed, skipping`, {
                  artifactId,
                  traceId,
                  error: toolResult.error?.message,
                });
                toolResults[step.toolName] = toolResult;
                continue;
              }
              throw createToolError(
                toolResult.error?.category || ErrorCategory.TOOL_EXECUTION_FAILED,
                `Tool ${step.toolName} failed: ${toolResult.error?.message}`,
                toolResult.error?.recoverable ?? true
              );
            }

            logger.info(`[PipelineExecutor] Step ${i + 1}/${steps.length} completed`, {
              artifactId,
              traceId,
              toolName: step.toolName,
              duration: toolResult.duration,
            });

            // [Artifact status] - status changed (after tool execution)
            if (toolResult.statusTransition) {
              // Fetch artifact title for structured log
              const { data: artifactData } = await getSupabase()
                .from('artifacts')
                .select('title')
                .eq('id', artifactId)
                .single();

              logger.info('[Artifact status] status changed', {
                artifactId,
                title: artifactData?.title || 'Untitled',
                previousStatus: toolResult.statusTransition.from || step.expectedStatusBefore,
                newStatus: toolResult.statusTransition.to || step.expectedStatusAfter,
              });
            }

            // Phase 4: Check if pipeline should pause for user approval
            if (step.pauseForApproval) {
              logger.info('[PipelineExecutor] Pipeline pausing for user approval', {
                artifactId,
                traceId,
                pausedAtTool: step.toolName,
                pausedAtStep: i + 1,
              });

              // Get artifact title for logging
              const { data: artifactForLog } = await getSupabase()
                .from('artifacts')
                .select('title, status')
                .eq('id', artifactId)
                .single();

              const previousStatus = artifactForLog?.status || step.expectedStatusAfter;

              // Update status to foundations_approval
              await getSupabase()
                .from('artifacts')
                .update({
                  status: 'foundations_approval',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', artifactId);

              // [Artifact status] - status changed
              logger.info('[Artifact status] status changed', {
                artifactId,
                title: artifactForLog?.title || 'Untitled',
                previousStatus,
                newStatus: 'foundations_approval',
              });

              const duration = Date.now() - startTime;

              // Return partial success - pipeline paused, not failed
              return {
                success: true,
                artifactId,
                traceId,
                duration,
                stepsCompleted: i + 1,
                totalSteps: steps.length,
                toolResults,
                pausedForApproval: true,
                pausedAtStep: step.toolName,
              } as PipelineResult;
            }
          }

          // All steps completed successfully
          const duration = Date.now() - startTime;

          // Record pipeline metrics
          metricsCollector.recordPipelineExecution(duration, true);

          // Clear checkpoints after success
          checkpointManager.clearCheckpoints(artifactId);

          logger.info('[PipelineExecutor] Pipeline execution completed', {
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

      logger.error(`[PipelineExecutor] ${error instanceof Error ? error.message : String(error)}`, {
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
        logger.error(`[PipelineExecutor] ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, {
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

    logger.info('[PipelineExecutor] Executing single tool', {
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

      logger.error(`[PipelineExecutor] ${error instanceof Error ? error.message : String(error)}`, {
        artifactId,
        traceId,
        toolName,
        duration,
      });

      // Attempt rollback
      try {
        await checkpointManager.rollback(artifactId);
      } catch (rollbackError) {
        logger.error(`[PipelineExecutor] ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, {
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

  /**
   * Resume pipeline from user approval point (Phase 4)
   *
   * Called after user clicks "Foundations Approved" button.
   * Starts from writeFullContent step and continues to completion.
   */
  async resumeFromApproval(
    artifactId: string,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const traceId = generateTraceId('pipeline-resume');
    const toolResults: Record<string, any> = {};

    logger.info('[PipelineExecutor] Resuming pipeline from approval', {
      artifactId,
      traceId,
    });

    // Verify artifact is in foundations_approval status
    const { data: artifact, error: fetchError } = await getSupabase()
      .from('artifacts')
      .select('status')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      return {
        success: false,
        artifactId,
        traceId,
        duration: Date.now() - startTime,
        stepsCompleted: 0,
        totalSteps: 0,
        toolResults: {},
        error: {
          category: ErrorCategory.ARTIFACT_NOT_FOUND,
          message: 'Artifact not found',
          failedStep: 0,
          failedTool: 'resumeFromApproval',
          recoverable: false,
        },
      };
    }

    // Accept both 'skeleton' (legacy) and 'foundations_approval' (current flow)
    const approvalEligibleStatuses = ['skeleton', 'foundations_approval'];
    if (!approvalEligibleStatuses.includes(artifact.status)) {
      logger.warn('[PipelineExecutor] Cannot resume: artifact not in approval-eligible status', {
        artifactId,
        currentStatus: artifact.status,
        expectedStatuses: approvalEligibleStatuses,
      });

      return {
        success: false,
        artifactId,
        traceId,
        duration: Date.now() - startTime,
        stepsCompleted: 0,
        totalSteps: 0,
        toolResults: {},
        error: {
          category: ErrorCategory.INVALID_STATUS,
          message: `Cannot resume: artifact status is '${artifact.status}', expected one of: ${approvalEligibleStatuses.join(', ')}`,
          failedStep: 0,
          failedTool: 'resumeFromApproval',
          recoverable: false,
        },
      };
    }

    // Get remaining steps (starting from writeFullContent)
    const writeFullContentIndex = PIPELINE_STEPS.findIndex(s => s.toolName === 'writeFullContent');
    if (writeFullContentIndex === -1) {
      return {
        success: false,
        artifactId,
        traceId,
        duration: Date.now() - startTime,
        stepsCompleted: 0,
        totalSteps: 0,
        toolResults: {},
        error: {
          category: ErrorCategory.TOOL_EXECUTION_FAILED,
          message: 'writeFullContent step not found in pipeline',
          failedStep: 0,
          failedTool: 'resumeFromApproval',
          recoverable: false,
        },
      };
    }

    const remainingSteps = PIPELINE_STEPS.slice(writeFullContentIndex);

    let currentStep = 0;

    try {
      return await withTracing(
        traceId,
        'resumePipeline',
        async () => {
          for (let i = 0; i < remainingSteps.length; i++) {
            const step = remainingSteps[i];
            currentStep = i;

            // Notify progress
            if (options.onProgress) {
              options.onProgress({
                currentStep: writeFullContentIndex + i,
                totalSteps: PIPELINE_STEPS.length,
                completedTools: Object.keys(toolResults),
                currentTool: step.toolName,
                traceId,
              });
            }

            // Create checkpoint before execution
            await checkpointManager.createCheckpoint(artifactId, writeFullContentIndex + i, {
              toolName: step.toolName,
            });

            logger.info(`[PipelineExecutor] Executing resumed step ${i + 1}/${remainingSteps.length}`, {
              artifactId,
              traceId,
              toolName: step.toolName,
            });

            // Execute tool with backoff
            const toolResult = await withExponentialBackoff(
              async () => {
                const result = await step.execute(artifactId);
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
              if (!step.required) {
                // Optional step failed - log warning and continue pipeline
                logger.warn(`[PipelineExecutor] Optional step ${step.toolName} failed, skipping`, {
                  artifactId,
                  traceId,
                  error: toolResult.error?.message,
                });
                toolResults[step.toolName] = toolResult;
                continue;
              }
              throw createToolError(
                toolResult.error?.category || ErrorCategory.TOOL_EXECUTION_FAILED,
                `Tool ${step.toolName} failed: ${toolResult.error?.message}`,
                toolResult.error?.recoverable ?? true
              );
            }

            logger.info(`[PipelineExecutor] Resumed step ${i + 1}/${remainingSteps.length} completed`, {
              artifactId,
              traceId,
              toolName: step.toolName,
              duration: toolResult.duration,
            });

            // [Artifact status] - status changed (after resumed tool execution)
            if (toolResult.statusTransition) {
              // Fetch artifact title for structured log
              const { data: artifactData } = await getSupabase()
                .from('artifacts')
                .select('title')
                .eq('id', artifactId)
                .single();

              logger.info('[Artifact status] status changed', {
                artifactId,
                title: artifactData?.title || 'Untitled',
                previousStatus: toolResult.statusTransition.from || step.expectedStatusBefore,
                newStatus: toolResult.statusTransition.to || step.expectedStatusAfter,
              });
            }
          }

          // All remaining steps completed successfully
          const duration = Date.now() - startTime;

          // Record pipeline metrics
          metricsCollector.recordPipelineExecution(duration, true);

          // Clear checkpoints after success
          checkpointManager.clearCheckpoints(artifactId);

          logger.info('[PipelineExecutor] Resumed pipeline execution completed', {
            artifactId,
            traceId,
            duration,
            stepsCompleted: remainingSteps.length,
          });

          return {
            success: true,
            artifactId,
            traceId,
            duration,
            stepsCompleted: remainingSteps.length,
            totalSteps: remainingSteps.length,
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
      const failedStep = remainingSteps[currentStep];

      logger.error(`[PipelineExecutor] ${error instanceof Error ? error.message : String(error)}`, {
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
        logger.error(`[PipelineExecutor] ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, {
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
        totalSteps: remainingSteps.length,
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
}

// =============================================================================
// Exports
// =============================================================================

export const pipelineExecutor = new PipelineExecutor();
