/**
 * Portfolio Feature Types
 *
 * Type definitions for the Consulting Toolkit Portfolio MVP.
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

/** Artifact status workflow - simplified linear flow (7 statuses) */
export type ArtifactStatus =
  | 'draft'             // Initial state, editable
  | 'research'          // AI researching, editor locked
  | 'skeleton'          // AI creating structure, editor locked
  | 'writing'           // AI writing content, editor locked
  | 'creating_visuals'  // AI generating images, editor locked
  | 'ready'             // Content ready, editable, can publish
  | 'published'         // Published, editable (editing → ready)

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

/** Valid artifact status transitions - linear flow (no approval gates) */
export const ARTIFACT_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['research'],
  research: ['skeleton'],
  skeleton: ['writing'],
  writing: ['creating_visuals'],
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

/** Status display info */
export interface StatusInfo {
  id: ArtifactStatus
  label: string
  color: string // Tailwind color class
}

/** Artifact status configurations - simplified 7 statuses */
export const ARTIFACT_STATUS_INFO: Record<ArtifactStatus, StatusInfo> = {
  draft: { id: 'draft', label: 'Draft', color: 'status-draft' },
  research: { id: 'research', label: 'Creating Content', color: 'status-processing' },
  skeleton: { id: 'skeleton', label: 'Creating Content', color: 'status-processing' },
  writing: { id: 'writing', label: 'Creating Content', color: 'status-processing' },
  creating_visuals: { id: 'creating_visuals', label: 'Creating Content', color: 'status-processing' },
  ready: { id: 'ready', label: 'Content Ready', color: 'status-ready' },
  published: { id: 'published', label: 'Published', color: 'status-published' },
}

/** Skill category configurations */
export const SKILL_CATEGORY_INFO: Record<SkillCategory, { label: string; icon: string }> = {
  product: { label: 'Product', icon: 'Package' },
  technical: { label: 'Technical', icon: 'Code' },
  leadership: { label: 'Leadership', icon: 'Users' },
  industry: { label: 'Industry', icon: 'Building' },
}
