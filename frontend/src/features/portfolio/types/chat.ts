/**
 * Chat Types
 *
 * TypeScript types for structured AI chat responses.
 * Matches the backend structuredResponse tool output.
 */

// =============================================================================
// Request Decisions
// =============================================================================

/**
 * How the AI will handle a user's request
 */
export type RequestDecision = 'SUPPORTED' | 'PARTIAL' | 'CLARIFY' | 'UNSUPPORTED'

// =============================================================================
// Interpretation
// =============================================================================

/**
 * AI's interpretation of the user's request
 */
export interface ResponseInterpretation {
  /** Brief summary of what the user asked for */
  userRequest: string
  /** How the system will handle this request */
  requestDecision: RequestDecision
  /** Parts of the request that can be fulfilled (for partial) */
  supportedParts?: string[]
  /** Parts that cannot be fulfilled (for partial/unsupported) */
  unsupportedParts?: string[]
  /** Questions to ask for unclear/partial requests */
  clarifyingQuestions?: string[]
}

// =============================================================================
// Actionable Items
// =============================================================================

/**
 * Types of actionable items that can be displayed as cards
 */
export type ActionableItemType =
  | 'topic_suggestion'
  | 'artifact_preview'
  | 'content_draft'
  | 'profile_update'

/**
 * A single actionable item to display as an interactive card
 */
export interface ActionableItem {
  /** Type of actionable item */
  type: ActionableItemType
  /** Unique identifier */
  id: string
  /** Display title */
  title: string
  /** Description or content preview */
  description: string
  /** Additional type-specific data */
  metadata?: Record<string, unknown>
}

/**
 * Artifact suggestion specific metadata
 */
export interface ArtifactSuggestionMetadata {
  type?: 'social_post' | 'blog' | 'showcase'
  rationale?: string
  tags?: string[]
}

/**
 * Type guard for artifact suggestion
 */
export function isArtifactSuggestionItem(
  item: ActionableItem
): item is ActionableItem & { metadata?: ArtifactSuggestionMetadata } {
  return item.type === 'topic_suggestion' || item.type === 'artifact_preview'
}

// =============================================================================
// Structured Response
// =============================================================================

/**
 * Complete structured response from the AI
 */
export interface StructuredResponse {
  /** AI's interpretation of the user request */
  interpretation: ResponseInterpretation
  /** Main title for the response section */
  title: string
  /** Interactive items to display as cards */
  actionableItems: ActionableItem[]
  /** Friendly closing text with optional follow-up suggestion */
  ctaText: string
}

/**
 * Tool result from structuredResponse tool
 */
export interface StructuredResponseToolResult {
  success: boolean
  type: 'structured_response'
  response: StructuredResponse
}

/**
 * Type guard for structured response tool result
 */
export function isStructuredResponseToolResult(
  result: unknown
): result is StructuredResponseToolResult {
  if (!result || typeof result !== 'object') return false
  const obj = result as Record<string, unknown>
  return obj.type === 'structured_response' && obj.success === true
}

// =============================================================================
// Artifact Suggestions (from suggestArtifactIdeas tool)
// =============================================================================

/**
 * Artifact suggestion from suggestArtifactIdeas tool
 */
export interface ArtifactSuggestion {
  id: string
  title: string
  description: string
  type: 'social_post' | 'blog' | 'showcase'
  rationale: string
  tags?: string[]
}

/**
 * Tool result from suggestArtifactIdeas tool
 */
export interface ArtifactSuggestionsToolResult {
  success: boolean
  type: 'artifact_suggestions'
  suggestions: ArtifactSuggestion[]
  message: string
}

/**
 * Type guard for artifact suggestions tool result
 */
export function isArtifactSuggestionsToolResult(
  result: unknown
): result is ArtifactSuggestionsToolResult {
  if (!result || typeof result !== 'object') return false
  const obj = result as Record<string, unknown>
  return obj.type === 'artifact_suggestions' && obj.success === true
}

// =============================================================================
// Parsed Message
// =============================================================================

/**
 * A parsed chat message with structured response data
 */
export interface ParsedChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
  /** Structured response if this message contains one */
  structuredResponse?: StructuredResponse
  /** Artifact suggestions if this message contains them */
  artifactSuggestions?: ArtifactSuggestion[]
  /** Raw tool invocations for debugging */
  toolInvocations?: Array<{
    toolName: string
    state: string
    result?: unknown
  }>
}
