/**
 * Mock System Types
 *
 * Type definitions for the AI tool mocking system.
 * Supports environment-based toggle between real API calls and mock responses.
 */

// =============================================================================
// Configuration Types
// =============================================================================

export type MockMode = 'API' | 'MOCK';
export type MasterToggleMode = 'API' | 'MOCK' | 'PER_TOGGLE';

export type MockCategory =
  | 'aiService'
  | 'researchTools'
  | 'skeletonTools'
  | 'contentWritingTools'
  | 'humanityCheckTools'
  | 'topicsResearchTools'
  | 'visualsCreatorTools'
  | 'imageGenerationTools'
  | 'writingCharacteristicsTools'
  | 'storytellingTools';

export interface MockConfig {
  masterToggle: MasterToggleMode;
  aiService: MockMode;
  researchTools: MockMode;
  skeletonTools: MockMode;
  contentWritingTools: MockMode;
  humanityCheckTools: MockMode;
  topicsResearchTools: MockMode;
  visualsCreatorTools: MockMode;
  imageGenerationTools: MockMode;
  writingCharacteristicsTools: MockMode;
  storytellingTools: MockMode;
  delayMinMs: number;
  delayMaxMs: number;
  captureResponses: boolean;
  captureDir: string;
}

// =============================================================================
// Dynamic Context Types
// =============================================================================

export interface DynamicContext {
  artifactId?: string;
  topic?: string;
  artifactType?: string;
  tone?: string;
  sectionHeading?: string;
  sectionPlaceholder?: string;
  content?: string;
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// Tool Response Types
// =============================================================================

/**
 * Response type for generateContentSkeleton tool
 */
export interface SkeletonToolResponse {
  success: boolean;
  skeleton?: string;
  warning?: string;
  error?: string;
}

/**
 * Response type for writeContentSection tool
 */
export interface ContentSectionResponse {
  success: boolean;
  sectionHeading?: string;
  content?: string;
  researchSourcesUsed?: number;
  tone?: string;
  traceId: string;
  error?: string;
}

/**
 * Response type for writeFullContent tool
 */
export interface FullContentResponse {
  success: boolean;
  sectionsWritten?: number;
  totalLength?: number;
  errors?: string[];
  status?: string;
  traceId: string;
  duration?: number;
  error?: string;
}

/**
 * Response type for applyHumanityCheck tool
 */
export interface HumanityCheckResponse {
  success: boolean;
  originalLength?: number;
  humanizedLength?: number;
  lengthChange?: number;
  patternsChecked?: number;
  status?: string;
  message?: string;
  traceId: string;
  duration?: number;
  error?: string;
}

/**
 * Response type for checkContentHumanity tool
 */
export interface ContentAnalysisResponse {
  success: boolean;
  detectedPatterns?: Array<{
    category: string;
    example: string;
    fix: string;
  }>;
  patternCount?: number;
  humanityScore?: number;
  topIssues?: string[];
  suggestions?: string[];
  contentLength?: number;
  verdict?: string;
  traceId: string;
  duration?: number;
  error?: string;
}

/**
 * Response type for conductDeepResearch tool
 */
export interface ResearchToolResponse {
  success: boolean;
  sourceCount?: number;
  error?: string;
  minRequired?: number;
  found?: number;
}

/**
 * Response type for topicsResearch tool
 */
export interface TopicsResearchResponse {
  success: boolean;
  topics?: Array<{
    title: string;
    description: string;
    rationale: string;
    trendingScore: number;
    competitionLevel: 'low' | 'medium' | 'high';
    suggestedAngle: string;
  }>;
  sourcesQueried?: string[];
  traceId: string;
  error?: string;
}

/**
 * Response type for AIService chat (streamChat/generateResponse)
 */
export interface AIServiceResponse {
  text: string;
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    toolName: string;
    result: unknown;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

/**
 * Response type for identifyImageNeeds tool (Phase 3)
 */
export interface ImageNeedsResponse {
  success: boolean;
  imageNeeds?: Array<{
    id: string;
    placement_after: string;
    description: string;
    purpose: 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart';
    style: 'professional' | 'modern' | 'abstract' | 'realistic';
    approved: boolean;
  }>;
  count?: number;
  message?: string;
  error?: string;
}

/**
 * Response type for generateFinalImages tool (Phase 3)
 */
export interface FinalImagesResponse {
  success: boolean;
  finals_generated?: number;
  failures?: number;
  message?: string;
  error?: string;
}

/**
 * Response type for regenerateImage tool (Phase 3)
 */
export interface RegenerateImageResponse {
  success: boolean;
  url?: string;
  attempts?: number;
  error?: string;
}

/**
 * Response type for updateImageApproval tool (Phase 3)
 */
export interface ImageApprovalResponse {
  success: boolean;
  approved?: number;
  rejected?: number;
  remaining?: number;
  error?: string;
}

// =============================================================================
// Mock Data Types
// =============================================================================

export interface MockDataMetadata {
  capturedAt: string;
  model?: string;
  inputHash?: string;
  dynamicFields: string[];
}

export interface CapturedResponse<T> {
  capturedAt: string;
  toolName: string;
  variant: string;
  input: Record<string, unknown>;
  response: T;
  metadata: MockDataMetadata;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isSkeletonToolResponse(obj: unknown): obj is SkeletonToolResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as SkeletonToolResponse).success === 'boolean'
  );
}

export function isContentSectionResponse(obj: unknown): obj is ContentSectionResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'traceId' in obj
  );
}

export function isHumanityCheckResponse(obj: unknown): obj is HumanityCheckResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'traceId' in obj
  );
}
