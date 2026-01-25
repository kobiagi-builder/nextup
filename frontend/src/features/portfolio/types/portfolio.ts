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

/** Artifact status workflow - Phase 1: Added content creation statuses */
export type ArtifactStatus =
  | 'draft'
  | 'researching'           // NEW: AI is conducting research
  | 'skeleton_ready'        // NEW: Skeleton generated, awaiting approval
  | 'skeleton_approved'     // NEW: Skeleton approved by user
  | 'in_progress'
  | 'ready'
  | 'published'
  | 'archived'

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

/** Valid artifact status transitions - Phase 1: Updated for content creation workflow */
export const ARTIFACT_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['researching', 'in_progress', 'archived'],
  researching: ['draft', 'skeleton_ready', 'archived'],
  skeleton_ready: ['draft', 'skeleton_approved', 'researching', 'archived'],
  skeleton_approved: ['draft', 'in_progress', 'archived'],
  in_progress: ['draft', 'ready', 'archived'],
  ready: ['in_progress', 'published', 'archived'],
  published: ['archived'],
  archived: ['draft'],
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

/** Artifact status configurations - Phase 1: Added content creation statuses */
export const ARTIFACT_STATUS_INFO: Record<ArtifactStatus, StatusInfo> = {
  draft: { id: 'draft', label: 'Draft', color: 'status-draft' },
  researching: { id: 'researching', label: 'Researching...', color: 'status-in-progress' },
  skeleton_ready: { id: 'skeleton_ready', label: 'Skeleton Ready', color: 'status-ready' },
  skeleton_approved: { id: 'skeleton_approved', label: 'Skeleton Approved', color: 'status-ready' },
  in_progress: { id: 'in_progress', label: 'In Progress', color: 'status-in-progress' },
  ready: { id: 'ready', label: 'Ready', color: 'status-ready' },
  published: { id: 'published', label: 'Published', color: 'status-published' },
  archived: { id: 'archived', label: 'Archived', color: 'status-archived' },
}

/** Skill category configurations */
export const SKILL_CATEGORY_INFO: Record<SkillCategory, { label: string; icon: string }> = {
  product: { label: 'Product', icon: 'Package' },
  technical: { label: 'Technical', icon: 'Code' },
  leadership: { label: 'Leadership', icon: 'Users' },
  industry: { label: 'Industry', icon: 'Building' },
}
