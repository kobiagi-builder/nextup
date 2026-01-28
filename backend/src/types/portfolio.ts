/**
 * Portfolio Domain Types (Backend)
 *
 * TypeScript types for the portfolio feature.
 */

// =============================================================================
// Artifact Types
// =============================================================================

export type ArtifactType = 'social_post' | 'blog' | 'showcase'

// Unified Content Agent Architecture: 7-status linear workflow (no approval gates)
export type ArtifactStatus =
  | 'draft'                 // Initial state, editable
  | 'research'              // AI researching, editor locked
  | 'skeleton'              // AI creating structure, editor locked
  | 'writing'               // AI writing content, editor locked
  | 'creating_visuals'      // AI generating images, editor locked
  | 'ready'                 // Content ready, editable, can publish
  | 'published'             // Published, editable (editing → ready)

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
  visuals_metadata?: VisualsMetadata  // Phase 3: Image generation metadata
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

// =============================================================================
// Phase 3: Visuals / Image Generation Types
// =============================================================================

/** Image phase tracking for creating_visuals status */
export type ImagePhase =
  | { phase: 'not_started' }
  | { phase: 'identifying_needs'; progress: number }
  | { phase: 'awaiting_approval' }
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
