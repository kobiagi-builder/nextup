/**
 * Portfolio Domain Types (Backend)
 *
 * TypeScript types for the portfolio feature.
 */

// =============================================================================
// Artifact Types
// =============================================================================

export type ArtifactType = 'social_post' | 'blog' | 'showcase'

// Phase 1: Added new statuses for content creation workflow
export type ArtifactStatus =
  | 'draft'
  | 'researching'           // NEW: AI is conducting research
  | 'skeleton_ready'        // NEW: Skeleton generated, awaiting approval
  | 'skeleton_approved'     // NEW: Skeleton approved by user
  | 'in_progress'
  | 'ready'
  | 'published'
  | 'archived'

// Phase 1: 8 tone options for content generation
export type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous'

export interface Artifact {
  id: string
  user_id: string
  type: ArtifactType
  title: string | null
  content: string | null
  status: ArtifactStatus
  tone?: ToneOption         // NEW: User's selected tone for content
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Phase 1: Research results stored for each artifact
export type SourceType = 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack' | 'user_provided'

export interface ArtifactResearch {
  id: string
  artifact_id: string
  source_type: SourceType
  source_name: string
  source_url?: string
  excerpt: string
  relevance_score: number
  created_at: string
}

// =============================================================================
// Skill Types
// =============================================================================

export type SkillCategory = 'product' | 'technical' | 'leadership' | 'industry'
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5

export interface Skill {
  id: string
  user_id: string
  name: string
  category: SkillCategory
  proficiency: ProficiencyLevel
  years_experience: number | null
  created_at: string
  updated_at: string
}

// =============================================================================
// User Context Types
// =============================================================================

export interface AboutMe {
  bio?: string
  background?: string
  years_experience?: number
  value_proposition?: string
}

export interface Profession {
  expertise_areas?: string
  industries?: string
  methodologies?: string
  certifications?: string
}

export interface Customers {
  target_audience?: string
  ideal_client?: string
  industries_served?: string[]
}

export interface Goals {
  content_goals?: string
  business_goals?: string
  priorities?: string[]
}

export interface UserContext {
  id: string
  user_id: string
  about_me: AboutMe
  profession: Profession
  customers: Customers
  goals: Goals
  created_at: string
  updated_at: string
}

// =============================================================================
// AI Chat Types
// =============================================================================

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: Date
  toolInvocations?: ToolInvocation[]
}

export interface ToolInvocation {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result?: unknown
}
