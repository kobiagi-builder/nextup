/**
 * Content Agent Types
 *
 * Type definitions for the Content Agent orchestrator.
 */

import type { ContextPriority } from '../utils/tokenBudget.js';

// =============================================================================
// Artifact Types
// =============================================================================

export type ArtifactType = 'blog' | 'social_post' | 'showcase';

export type ArtifactStatus =
  | 'draft'
  | 'research'
  | 'foundations'           // Phase 4: AI analyzing writing characteristics
  | 'skeleton'
  | 'foundations_approval'  // Phase 4: Waiting for user to approve foundations
  | 'writing'
  | 'humanity_checking'     // AI humanizing content, editor locked
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
  | 'analyzeWritingCharacteristics'  // Phase 4: Analyze writing style
  | 'analyzeStorytellingStructure'   // Storytelling analysis
  | 'generateContentSkeleton'
  | 'writeContentSection'
  | 'writeFullContent'
  | 'applyHumanityCheck'
  | 'generateContentImages'
  // Topic type tools
  | 'researchTrendingTopics'
  | 'analyzeFollowUpTopics'
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

  // Storage errors
  STORAGE_ERROR = 'STORAGE_ERROR',

  // Validation errors
  INVALID_TONE = 'INVALID_TONE',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
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
// Phase 4: Writing Characteristics Types
// =============================================================================

import type { WritingCharacteristics } from '../../../types/portfolio.js';

/** Input for the analyzeWritingCharacteristics tool */
export interface CharacteristicsAnalysisInput {
  artifactId: string;
  artifactType: ArtifactType;
}

/** Output from the analyzeWritingCharacteristics tool */
export interface CharacteristicsAnalysisOutput {
  characteristics: WritingCharacteristics;
  summary: string;
  recommendations: string;
  examplesUsed: number;
  artifactAnalyzed: boolean;
}
