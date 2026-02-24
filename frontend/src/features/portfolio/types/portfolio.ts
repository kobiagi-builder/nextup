/**
 * Portfolio Feature Types
 *
 * Type definitions for the NextUp Portfolio MVP.
 * All types match the database schema defined in 001_portfolio_schema.sql.
 *
 * Includes:
 * - Artifact types (Social Posts, Blogs, Showcases)
 * - Topic types (Kanban backlog)
 * - Skill types (Skills matrix)
 * - User context types (Profile, Style examples)
 * - AI conversation types
 * - State machine types
 */

// =============================================================================
// Base Types
// =============================================================================

/** UUID string type */
export type UUID = string

/** ISO 8601 date string */
export type DateString = string

// =============================================================================
// Artifact Types
// =============================================================================

/** Supported artifact types */
export type ArtifactType = 'social_post' | 'blog' | 'showcase'

/** Artifact status workflow - Phase 4 workflow with foundations approval gate (9 statuses) */
export type ArtifactStatus =
  | 'draft'                 // Initial state, editable
  | 'interviewing'          // AI interviewing user about showcase case
  | 'research'              // AI researching, editor locked
  | 'foundations'           // AI analyzing writing characteristics
  | 'skeleton'              // AI creating structure, editor locked
  | 'foundations_approval'  // Skeleton ready, waiting for user approval
  | 'writing'               // AI writing content, editor locked
  | 'humanity_checking'     // AI humanizing content, editor locked
  | 'creating_visuals'      // AI generating images, editor locked
  | 'ready'                 // Content ready, editable, can publish
  | 'published'             // Published, editable (editing → ready)

/** Tone options for content generation - Phase 1 */
export type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous'

/** Base artifact interface */
export interface Artifact {
  id: UUID
  user_id: UUID
  account_id: UUID
  type: ArtifactType
  status: ArtifactStatus
  tone?: ToneOption         // NEW: User's selected tone for content
  title: string | null
  content: string | null
  metadata: ArtifactMetadata
  visuals_metadata?: VisualsMetadata | null  // Phase 3: Image generation metadata
  tags: string[]
  published_url: string | null
  published_at: DateString | null
  created_at: DateString
  updated_at: DateString
}

/** Type-specific metadata - union of all possible metadata shapes */
export type ArtifactMetadata =
  | SocialPostMetadata
  | BlogMetadata
  | ShowcaseMetadata
  | Record<string, unknown> // Fallback for unknown types

/** Social Post metadata (LinkedIn, Twitter, etc.) */
export interface SocialPostMetadata {
  platform?: 'linkedin' | 'twitter' | 'other'
  hashtags?: string[]
  target_audience?: string
  character_count?: number
  scheduled_for?: DateString
  engagement_hook?: string
}

/** Blog Post metadata */
export interface BlogMetadata {
  platform?: 'medium' | 'substack' | 'custom' | 'other'
  subtitle?: string
  target_audience?: string
  word_count?: number
  reading_time_minutes?: number
  seo_title?: string
  seo_description?: string
  featured_image_url?: string
}

/** Case Study / Showcase metadata */
export interface ShowcaseMetadata {
  company?: string
  role?: string
  timeframe?: string
  problem?: string
  approach?: string
  results?: string
  learnings?: string
  metrics?: ShowcaseMetric[]
}

/** Individual metric for showcases */
export interface ShowcaseMetric {
  label: string
  value: string
  improvement?: string // e.g., "+40%"
}

/** Create artifact input */
export interface CreateArtifactInput {
  type: ArtifactType
  title?: string
  content?: string
  tone?: ToneOption
  metadata?: Partial<ArtifactMetadata>
  tags?: string[]
}

/** Update artifact input */
export interface UpdateArtifactInput {
  title?: string
  content?: string
  status?: ArtifactStatus
  tone?: ToneOption
  metadata?: Partial<ArtifactMetadata>
  tags?: string[]
  published_url?: string
  published_at?: DateString
}

// =============================================================================
// Research Types (Phase 1)
// =============================================================================

/** Research source types */
export type SourceType = 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack' | 'user_provided'

/** Research result for an artifact */
export interface ArtifactResearch {
  id: UUID
  artifact_id: UUID
  source_type: SourceType
  source_name: string
  source_url?: string
  excerpt: string
  relevance_score: number
  created_at: DateString
}

// =============================================================================
// Writing Characteristics Types (Phase 4)
// =============================================================================

/** Flexible writing characteristic value with confidence and reasoning */
export interface WritingCharacteristicValue {
  value: string | number | boolean | string[]
  confidence: number // 0-1 scale
  source: 'artifact' | 'examples' | 'mix' | 'default'
  reasoning?: string
}

/**
 * Flexible writing characteristics - AI can add any characteristic
 * Common examples: tone, voice, sentence_structure, vocabulary_complexity,
 * pacing, use_of_evidence, cta_style, formatting_preferences, etc.
 */
export type WritingCharacteristics = Record<string, WritingCharacteristicValue>

/** Stored writing characteristics for an artifact */
export interface ArtifactWritingCharacteristics {
  id: UUID
  artifact_id: UUID
  characteristics: WritingCharacteristics
  summary?: string
  recommendations?: string
  created_at: DateString
  updated_at: DateString
}

/** Source type for user writing examples */
export type WritingExampleSourceType = 'pasted' | 'file_upload' | 'artifact' | 'url'

/** Extraction status for writing references */
export type ExtractionStatus = 'pending' | 'extracting' | 'success' | 'failed'

/** Detected publication platform */
export type PublicationPlatform = 'linkedin' | 'medium' | 'substack' | 'reddit' | 'google_docs' | 'generic'

/** User-provided writing example for style analysis */
export interface UserWritingExample {
  id: UUID
  user_id: UUID
  name: string
  source_type: WritingExampleSourceType
  content: string
  word_count: number
  source_reference?: string
  analyzed_characteristics: WritingCharacteristics
  is_active: boolean
  artifact_type?: ArtifactType | null
  extraction_status: ExtractionStatus
  source_url?: string | null
  created_at: DateString
  updated_at: DateString
}

/** Create writing example input */
export interface CreateWritingExampleInput {
  name: string
  content: string
  source_type?: WritingExampleSourceType
  source_reference?: string
  artifact_type?: ArtifactType
}

/** Update writing example input */
export interface UpdateWritingExampleInput {
  name?: string
  content?: string
  is_active?: boolean
  artifact_type?: ArtifactType
}

// =============================================================================
// Visuals / Image Generation Types (Phase 3)
// =============================================================================

/** Image phase tracking for creating_visuals status */
export type ImagePhase =
  | { phase: 'not_started' }
  | { phase: 'identifying_needs'; progress: number }
  | { phase: 'generating_images'; completed: number; total: number }
  | { phase: 'complete'; finals: FinalImage[] }

/** Image need identified by AI */
export interface ImageNeed {
  id: string
  placement_after: string // Heading text or line number
  description: string
  purpose: 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart'
  style: 'professional' | 'modern' | 'abstract' | 'realistic'
  approved: boolean // User approval flag
}

/** Final generated image */
export interface FinalImage {
  id: string
  image_need_id: string
  url: string
  storage_path: string
  resolution: { width: number; height: number }
  file_size_kb: number
  generated_at: string
  generation_attempts: number
}

/** Visuals metadata stored in artifacts.visuals_metadata JSONB field */
export interface VisualsMetadata {
  // Phase 3: Image generation fields
  phase: ImagePhase
  needs: ImageNeed[]
  finals: FinalImage[]
  generation_stats: {
    total_needed: number
    finals_generated: number
    failures: number
  }

  // Phase 2 MVP: Stub fields (backward compatibility)
  visualsDetected?: number
  visualsGenerated?: number
  placeholders?: unknown[]
  mvpStub?: boolean
}

// =============================================================================
// Skill Types
// =============================================================================

// =============================================================================
// Social Post Eligibility
// =============================================================================

/** Artifact types eligible for "Create Social Post" action */
const SOCIAL_POST_ELIGIBLE_TYPES: ArtifactType[] = ['blog', 'showcase']

/** Artifact statuses eligible for "Create Social Post" action */
const SOCIAL_POST_ELIGIBLE_STATUSES: ArtifactStatus[] = ['ready', 'published']

/** Check if an artifact can be promoted to a social post */
export function canCreateSocialPost(artifact: { type: ArtifactType; status: ArtifactStatus }): boolean {
  return SOCIAL_POST_ELIGIBLE_TYPES.includes(artifact.type)
    && SOCIAL_POST_ELIGIBLE_STATUSES.includes(artifact.status)
}

// =============================================================================
// Skill Types
// =============================================================================

/** Skill category */
export type SkillCategory = 'product' | 'technical' | 'leadership' | 'industry'

/** Proficiency level (1-5) */
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5

/** Skill interface */
export interface Skill {
  id: UUID
  user_id: UUID
  account_id: UUID
  name: string
  category: SkillCategory
  proficiency: ProficiencyLevel
  years_experience: number | null
  created_at: DateString
  updated_at: DateString
}

/** Create skill input */
export interface CreateSkillInput {
  name: string
  category: SkillCategory
  proficiency: ProficiencyLevel
  years_experience?: number
}

/** Update skill input */
export interface UpdateSkillInput {
  name?: string
  category?: SkillCategory
  proficiency?: ProficiencyLevel
  years_experience?: number
}

// =============================================================================
// User Context Types
// =============================================================================

/** About Me section */
export interface AboutMe {
  bio?: string
  background?: string
  years_experience?: number
  value_proposition?: string
}

/** Profession section */
export interface Profession {
  expertise_areas?: string
  industries?: string
  methodologies?: string
  certifications?: string
}

/** Customers section */
export interface Customers {
  target_audience?: string
  ideal_client?: string
  industries_served?: string[]
}

/** Goals section */
export interface Goals {
  content_goals?: string
  business_goals?: string
  priorities?: string[]
}

/** User context (profile) */
export interface UserContext {
  id: UUID
  user_id: UUID
  account_id: UUID
  about_me: AboutMe
  profession: Profession
  customers: Customers
  goals: Goals
  created_at: DateString
  updated_at: DateString
}

/** Update user context input */
export interface UpdateUserContextInput {
  about_me?: Partial<AboutMe>
  profession?: Partial<Profession>
  customers?: Partial<Customers>
  goals?: Partial<Goals>
}

// =============================================================================
// Style Example Types
// =============================================================================

/** AI-generated style analysis */
export interface StyleAnalysis {
  tone?: string
  structure?: string
  vocabulary?: string
  length?: string
}

/** Writing style example */
export interface StyleExample {
  id: UUID
  user_id: UUID
  account_id: UUID
  label: string
  content: string
  analysis: StyleAnalysis | null
  created_at: DateString
  updated_at: DateString
}

/** Create style example input */
export interface CreateStyleExampleInput {
  label: string
  content: string
}

/** Update style example input */
export interface UpdateStyleExampleInput {
  label?: string
  content?: string
  analysis?: StyleAnalysis
}

// =============================================================================
// AI Conversation Types
// =============================================================================

/** Chat message role */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/** Tool call in a message */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/** Tool result */
export interface ToolResult {
  tool_call_id: string
  result: unknown
}

/** Individual chat message */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  tool_calls?: ToolCall[]
  tool_results?: ToolResult[]
  created_at: DateString
  // Structured response data (for persistence)
  structuredResponse?: unknown // Will be typed as StructuredResponse in chat.ts
  artifactSuggestions?: unknown[] // Will be typed as ArtifactSuggestion[] in chat.ts
}

/** AI conversation */
export interface AIConversation {
  id: UUID
  user_id: UUID
  account_id: UUID
  artifact_id: UUID | null
  messages: ChatMessage[]
  pinned: boolean
  summary: string | null
  created_at: DateString
  updated_at: DateString
}

// =============================================================================
// User Preferences Types
// =============================================================================

/** Theme preference */
export type ThemePreference = 'light' | 'dark' | 'system'

/** AI interaction mode */
export type InteractionMode = 'chat' | 'forms'

/** User preferences */
export interface UserPreferences {
  id: UUID
  user_id: UUID
  account_id: UUID
  theme: ThemePreference
  preferred_interaction_mode: InteractionMode
  created_at: DateString
  updated_at: DateString
}

/** Update preferences input */
export interface UpdatePreferencesInput {
  theme?: ThemePreference
  preferred_interaction_mode?: InteractionMode
}

// =============================================================================
// State Machine Types
// =============================================================================

/** Valid artifact status transitions - Phase 4 flow with foundations approval gate */
export const ARTIFACT_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['research', 'interviewing'],
  interviewing: ['research'],
  research: ['foundations'],           // Phase 4: Research → Foundations
  foundations: ['skeleton', 'foundations_approval'],  // Phase 4: Foundations → Skeleton or directly to Approval
  skeleton: ['foundations_approval'],  // Phase 4: Skeleton → Awaiting approval (legacy pipeline path)
  foundations_approval: ['writing'],   // Phase 4: User approves → Writing begins
  writing: ['humanity_checking'],
  humanity_checking: ['creating_visuals'],
  creating_visuals: ['ready'],
  ready: ['published'],
  published: ['ready'],  // Edit triggers return to ready
}

/** Check if a status transition is valid */
export function canTransition<T extends string>(
  transitions: Record<T, T[]>,
  from: T,
  to: T
): boolean {
  return transitions[from]?.includes(to) ?? false
}

/** Get allowed transitions from a status */
export function getAllowedTransitions<T extends string>(
  transitions: Record<T, T[]>,
  from: T
): T[] {
  return transitions[from] ?? []
}

// =============================================================================
// UI Helper Types
// =============================================================================

/** Artifact type display info */
export interface ArtifactTypeInfo {
  id: ArtifactType
  label: string
  icon: string // Lucide icon name
  description: string
  platforms?: string[]
}

/** Artifact type configurations */
export const ARTIFACT_TYPE_INFO: Record<ArtifactType, ArtifactTypeInfo> = {
  social_post: {
    id: 'social_post',
    label: 'Social Post',
    icon: 'MessageSquare',
    description: 'LinkedIn, Twitter, and other social media posts',
    platforms: ['linkedin', 'twitter', 'other'],
  },
  blog: {
    id: 'blog',
    label: 'Blog Post',
    icon: 'FileText',
    description: 'Long-form articles for Medium, Substack, or your blog',
    platforms: ['medium', 'substack', 'custom', 'other'],
  },
  showcase: {
    id: 'showcase',
    label: 'Case Study',
    icon: 'Trophy',
    description: 'Project showcases and success stories',
  },
}

/** Skill category configurations */
export const SKILL_CATEGORY_INFO: Record<SkillCategory, { label: string; icon: string }> = {
  product: { label: 'Product', icon: 'Package' },
  technical: { label: 'Technical', icon: 'Code' },
  leadership: { label: 'Leadership', icon: 'Users' },
  industry: { label: 'Industry', icon: 'Building' },
}
