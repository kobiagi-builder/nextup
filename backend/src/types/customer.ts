/**
 * Customer Domain Types (Backend)
 *
 * TypeScript types for the customers management feature.
 */

// =============================================================================
// Customer Status
// =============================================================================

export type CustomerStatus = 'lead' | 'prospect' | 'negotiation' | 'live' | 'on_hold' | 'archive' | 'not_relevant'

export const VALID_CUSTOMER_STATUSES: CustomerStatus[] = [
  'lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive', 'not_relevant',
]

// =============================================================================
// ICP Score
// =============================================================================

export type IcpScore = 'low' | 'medium' | 'high' | 'very_high'

// =============================================================================
// ICP Settings (User-Level)
// =============================================================================

export interface IcpSettings {
  id: string
  user_id: string
  target_employee_min: number | null
  target_employee_max: number | null
  target_industries: string[]
  target_specialties: string[]
  description: string
  weight_quantitative: number
  created_at: string
  updated_at: string
}

export type IcpSettingsInput = Partial<Pick<IcpSettings,
  'target_employee_min' | 'target_employee_max' | 'target_industries' |
  'target_specialties' | 'description' | 'weight_quantitative'
>>

// =============================================================================
// Enrichment Source (single source of truth)
// =============================================================================

export type EnrichmentSource = 'linkedin_scrape' | 'llm_enrichment' | 'tavily_grounded'

// =============================================================================
// Customer Info (JSONB)
// =============================================================================

export interface TeamMember {
  name: string
  role?: string
  email?: string
  notes?: string
  linkedin_url?: string
}

export interface CustomerInfo {
  about?: string
  vertical?: string
  persona?: string
  icp?: string
  product?: {
    name?: string
    stage?: string
    category?: string
    description?: string
    url?: string
  }
  team?: TeamMember[]
  icp_score?: IcpScore | null
  enrichment?: {
    employee_count?: string
    about?: string
    industry?: string
    specialties?: string[]
    source?: EnrichmentSource
    updated_at?: string
  }
  linkedin_company_url?: string
  [key: string]: unknown // Extensible
}

// =============================================================================
// LinkedIn Import
// =============================================================================

export interface LinkedInConnection {
  firstName: string
  lastName: string
  url: string
  emailAddress: string
  company: string
  position: string
}

export interface ImportResult {
  total: number
  companies: { created: number; matched: number }
  teamMembers: { created: number; updated: number }
  skipped: Array<{ row: number; company: string; reason: string }>
  errors: Array<{ row: number; message: string }>
  classification?: { layer0: number; layer1: number; layer2: number; layer3: number; total: number }
  enrichment?: { enriched: number; skippedFresh: number; failed: number }
  icpScores?: { low: number; medium: number; high: number; very_high: number; not_scored: number; skipped_unchanged: number }
}

// =============================================================================
// Customer Entity
// =============================================================================

export interface Customer {
  id: string
  user_id: string
  name: string
  status: CustomerStatus
  info: CustomerInfo
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Customer with Tab Counts (for detail page)
// =============================================================================

export interface CustomerWithCounts extends Customer {
  agreements_count: number
  receivables_count: number
  projects_count: number
  action_items_count: number
}

// =============================================================================
// Customer with Summary Data (for list page with aggregated metrics)
// =============================================================================

export interface CustomerWithSummary extends Customer {
  active_agreements_count: number
  outstanding_balance: number
  active_projects_count: number
  last_activity: string | null
}

// =============================================================================
// Dashboard Stats
// =============================================================================

export interface DashboardStats {
  total_customers: number
  active_customers: number
  total_outstanding: number
  expiring_agreements: number
}

// =============================================================================
// Customer Artifact Search Result (for cross-module linking)
// =============================================================================

export interface CustomerArtifactSearchResult {
  id: string
  title: string
  type: ArtifactType
  status: ArtifactStatus
  customer_id: string
  customer_name: string
}

// =============================================================================
// Input Types
// =============================================================================

export interface CreateCustomerInput {
  name: string
  status?: CustomerStatus
  info?: CustomerInfo
}

export interface UpdateCustomerInput {
  name?: string
  status?: CustomerStatus
  info?: CustomerInfo
}

// =============================================================================
// Customer Event
// =============================================================================

export interface CustomerEvent {
  id: string
  customer_id: string
  event_type: string
  title: string
  description?: string
  participants?: string[]
  metadata?: Record<string, unknown>
  event_date: string
  created_at: string
}

export interface CreateEventInput {
  event_type?: string
  title: string
  description?: string
  participants?: string[]
  event_date?: string
}

// =============================================================================
// Agreement Types
// =============================================================================

export type AgreementType = 'retainer' | 'project_based' | 'hourly' | 'fixed_price' | 'equity' | 'hybrid' | 'custom'

export const VALID_AGREEMENT_TYPES: AgreementType[] = [
  'retainer', 'project_based', 'hourly', 'fixed_price', 'equity', 'hybrid', 'custom',
]

export interface AgreementPricing {
  amount: number
  currency: string
  frequency: string
  unit?: string
  notes?: string
}

export interface Agreement {
  id: string
  customer_id: string
  scope: string
  type: AgreementType
  start_date: string | null
  end_date: string | null
  pricing: AgreementPricing
  override_status: string | null
  created_at: string
  updated_at: string
}

export interface CreateAgreementInput {
  scope: string
  type?: AgreementType
  start_date?: string | null
  end_date?: string | null
  pricing?: AgreementPricing
  override_status?: string | null
}

export interface UpdateAgreementInput {
  scope?: string
  type?: AgreementType
  start_date?: string | null
  end_date?: string | null
  pricing?: AgreementPricing
  override_status?: string | null
}

// =============================================================================
// Receivable Types
// =============================================================================

export type ReceivableType = 'invoice' | 'payment'

export interface Receivable {
  id: string
  customer_id: string
  type: ReceivableType
  amount: number
  date: string
  status: string
  description: string | null
  reference: string | null
  linked_invoice_id: string | null
  linked_agreement_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateReceivableInput {
  type: ReceivableType
  amount: number
  date: string
  status?: string
  description?: string
  reference?: string
  linked_invoice_id?: string | null
  linked_agreement_id?: string | null
}

export interface UpdateReceivableInput {
  amount?: number
  date?: string
  status?: string
  description?: string
  reference?: string
  linked_invoice_id?: string | null
  linked_agreement_id?: string | null
}

export interface FinancialSummary {
  total_invoiced: string
  total_paid: string
  balance: string
}

// =============================================================================
// Project Types
// =============================================================================

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  'planning', 'active', 'on_hold', 'completed', 'archived',
]

export interface Project {
  id: string
  customer_id: string
  name: string
  description: string | null
  status: ProjectStatus
  agreement_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProjectWithCounts extends Project {
  artifacts_count: number
}

export interface CreateProjectInput {
  name: string
  description?: string
  status?: ProjectStatus
  agreement_id?: string | null
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  status?: ProjectStatus
  agreement_id?: string | null
}

// =============================================================================
// Action Item Types
// =============================================================================

export type ActionItemType = 'follow_up' | 'proposal' | 'meeting' | 'delivery' | 'review' | 'custom'

export const VALID_ACTION_ITEM_TYPES: ActionItemType[] = [
  'follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom',
]

export type ActionItemStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'

export const VALID_ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  'todo', 'in_progress', 'done', 'cancelled',
]

export interface ActionItem {
  id: string
  customer_id: string
  type: ActionItemType
  description: string
  due_date: string | null
  status: ActionItemStatus
  created_at: string
  updated_at: string
}

export interface CreateActionItemInput {
  type?: ActionItemType
  description: string
  due_date?: string | null
  status?: ActionItemStatus
}

export interface UpdateActionItemInput {
  type?: ActionItemType
  description?: string
  due_date?: string | null
  status?: ActionItemStatus
}

// =============================================================================
// Customer Artifact Types
// =============================================================================

export type ArtifactType =
  | 'strategy'
  | 'research'
  | 'roadmap'
  | 'competitive_analysis'
  | 'user_research'
  | 'product_spec'
  | 'meeting_notes'
  | 'presentation'
  | 'ideation'
  | 'custom'

export const VALID_ARTIFACT_TYPES: ArtifactType[] = [
  'strategy', 'research', 'roadmap', 'competitive_analysis',
  'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom',
]

export type ArtifactStatus = 'draft' | 'in_progress' | 'review' | 'final' | 'archived'

export const VALID_ARTIFACT_STATUSES: ArtifactStatus[] = [
  'draft', 'in_progress', 'review', 'final', 'archived',
]

export interface CustomerArtifact {
  id: string
  project_id: string
  customer_id: string
  type: ArtifactType
  title: string
  content: string
  status: ArtifactStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateArtifactInput {
  title: string
  type?: ArtifactType
  content?: string
  status?: ArtifactStatus
}

export interface UpdateArtifactInput {
  title?: string
  type?: ArtifactType
  content?: string
  status?: ArtifactStatus
}
