/**
 * Content Agent Types
 *
 * Type definitions for the Content Agent orchestrator.
 */

import type { UserIntent } from '../utils/intentDetection.js';
import type { ContextPriority } from '../utils/tokenBudget.js';

// =============================================================================
// Artifact Types
// =============================================================================

export type ArtifactType = 'blog' | 'social_post' | 'showcase';

export type ArtifactStatus =
  | 'draft'
  | 'research'
  | 'skeleton'
  | 'writing'
  | 'creating_visuals'
  | 'ready'
  | 'published';

export type ToneType =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous';

// =============================================================================
// Tool Types
// =============================================================================

export type ToolName =
  // Core content creation tools
  | 'topicsResearch'
  | 'conductDeepResearch'
  | 'generateContentSkeleton'
  | 'writeContentSection'
  | 'writeFullContent'
  | 'applyHumanityCheck'
  | 'generateContentImages'
  // Context tools
  | 'fetchArtifactTopics'
  | 'fetchArtifact'
  | 'fetchResearch'
  | 'listDraftArtifacts';

export interface ToolOutput<T = unknown> {
  success: boolean;
  traceId: string;
  duration?: number;
  statusTransition?: { from: ArtifactStatus; to: ArtifactStatus };
  data: T;
  error?: {
    category: ErrorCategory;
    message: string;
    recoverable: boolean;
  };
}

// =============================================================================
// Error Types
// =============================================================================

export enum ErrorCategory {
  // Tool errors
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',

  // AI provider errors
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  AI_CONTENT_FILTER = 'AI_CONTENT_FILTER',

  // Artifact errors
  ARTIFACT_NOT_FOUND = 'ARTIFACT_NOT_FOUND',
  INVALID_ARTIFACT_ID = 'INVALID_ARTIFACT_ID',
  INVALID_STATUS = 'INVALID_STATUS',

  // Intent errors
  UNCLEAR_INTENT = 'UNCLEAR_INTENT',
  MISSING_CONTEXT = 'MISSING_CONTEXT',

  // Research errors
  RESEARCH_NOT_FOUND = 'RESEARCH_NOT_FOUND',

  // Validation errors
  INVALID_TONE = 'INVALID_TONE',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
}

// =============================================================================
// Session Types
// =============================================================================

export interface SessionState {
  sessionId: string;
  currentArtifactId?: string;
  lastToolExecuted?: string;
  pipelineProgress?: {
    currentStep: number;
    totalSteps: number;
    completedTools: ToolName[];
  };
  lastActivityTimestamp: number; // For 30-min timeout
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: string[];
}

// =============================================================================
// Screen Context Types
// =============================================================================

export interface ScreenContext {
  currentPage?: 'portfolio' | 'artifact' | 'dashboard' | 'chat';
  artifactId?: string;
  artifactType?: ArtifactType;
  artifactStatus?: ArtifactStatus;
  artifactTitle?: string;
}

// =============================================================================
// Agent Response Types
// =============================================================================

export interface AgentResponse {
  text: string;
  toolResults?: ToolOutput[];
  sessionState: SessionState;
  intentDetected?: UserIntent;
  clarificationNeeded?: boolean;
  suggestedClarification?: string;
}

export interface PipelineResult {
  success: boolean;
  artifactId: string;
  steps: Array<{
    toolName: ToolName;
    status: 'completed' | 'failed' | 'skipped';
    output?: ToolOutput;
    error?: string;
  }>;
  totalDuration: number;
  finalStatus: ArtifactStatus;
}

// =============================================================================
// Content Creation Request Types
// =============================================================================

export interface ContentCreationRequest {
  message: string;
  screenContext: ScreenContext;
  sessionId?: string;
}

export interface PipelineExecutionRequest {
  artifactId: string;
  options?: {
    skipResearch?: boolean;
    tone?: ToneType;
    includeVisuals?: boolean;
  };
}
