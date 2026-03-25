/**
 * Customer Domain Types (Backend)
 *
 * TypeScript types for the customers management feature.
 */

// =============================================================================
// Customer Status
// =============================================================================

export type CustomerStatus = 'lead' | 'prospect' | 'negotiation' | 'live' | 'on_hold' | 'archive' | 'not_relevant' | 'closed_lost'

export const VALID_CUSTOMER_STATUSES: CustomerStatus[] = [
  'lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive', 'not_relevant', 'closed_lost',
]

// =============================================================================
// ICP Score
// =============================================================================

export type IcpScore = 'low' | 'medium' | 'high' | 'very_high'

// =============================================================================
// Customer ICP Criteria (stored in user_context.customers JSONB)
// =============================================================================

export interface CustomerIcp {
  ideal_client?: string
  company_stage?: string[]
  target_employee_min?: number | null
  target_employee_max?: number | null
  industry_verticals?: string[]
}

// =============================================================================
// ICP Settings (User-Level) — @deprecated: Use CustomerIcp instead
// =============================================================================

/** @deprecated Use CustomerIcp instead. Data has been migrated to user_context.customers JSONB. */
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

/** @deprecated Use CustomerIcp instead. */
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
  source?: 'manual' | 'linkedin_scrape'
  hidden?: boolean
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
  website_url?: string
  enrichment_errors?: {
    linkedin?: string
    website?: string
  }
  [key: string]: unknown // Extensible
}

// =============================================================================
// Team Role Filters (per-account configuration)
// =============================================================================

export interface TeamRoleFilter {
  category: string
  patterns: string[]
}

export interface TeamSyncResult {
  added: number
  removed: number
  total: number
  members: TeamMember[]
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
  initiatives_count: number
  action_items_count: number
}

// =============================================================================
// Customer with Summary Data (for list page with aggregated metrics)
// =============================================================================

export interface CustomerWithSummary extends Customer {
  active_agreements_count: number
  outstanding_balance: number
  active_initiatives_count: number
  last_activity: string | null
  next_action_description: string | null
  next_action_due_date: string | null
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
// Customer Document Search Result (for cross-module linking)
// =============================================================================

export interface CustomerDocumentSearchResult {
  id: string
  title: string
  type: DocumentType
  status: DocumentStatus
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

export type AgreementStatus = 'draft' | 'proposal' | 'agreed' | 'signed' | 'active' | 'completed' | 'on_hold' | 'archived'

export const VALID_AGREEMENT_STATUSES: AgreementStatus[] = [
  'draft', 'proposal', 'agreed', 'signed', 'active', 'completed', 'on_hold', 'archived',
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
  status: AgreementStatus
  start_date: string | null
  end_date: string | null
  pricing: AgreementPricing
  created_at: string
  updated_at: string
}

export interface CreateAgreementInput {
  scope: string
  type?: AgreementType
  status?: AgreementStatus
  start_date?: string | null
  end_date?: string | null
  pricing?: AgreementPricing
}

export interface UpdateAgreementInput {
  scope?: string
  type?: AgreementType
  status?: AgreementStatus
  start_date?: string | null
  end_date?: string | null
  pricing?: AgreementPricing
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
// Initiative Types (formerly Project)
// =============================================================================

export type InitiativeStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export const VALID_INITIATIVE_STATUSES: InitiativeStatus[] = [
  'planning', 'active', 'on_hold', 'completed', 'archived',
]

export interface Initiative {
  id: string
  customer_id: string
  name: string
  description: string | null
  status: InitiativeStatus
  agreement_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface InitiativeWithCounts extends Initiative {
  documents_count: number
}

export interface CreateInitiativeInput {
  name: string
  description?: string
  status?: InitiativeStatus
  agreement_id?: string | null
}

export interface UpdateInitiativeInput {
  name?: string
  description?: string
  status?: InitiativeStatus
  agreement_id?: string | null
}

// =============================================================================
// Action Item Types
// =============================================================================

export type ActionItemType = 'follow_up' | 'proposal' | 'meeting' | 'delivery' | 'review' | 'bug' | 'new_feature' | 'enhancement' | 'custom'

export const VALID_ACTION_ITEM_TYPES: ActionItemType[] = [
  'follow_up', 'proposal', 'meeting', 'delivery', 'review', 'bug', 'new_feature', 'enhancement', 'custom',
]

export type ActionItemStatus = 'todo' | 'in_progress' | 'on_hold' | 'done' | 'cancelled'

export const VALID_ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  'todo', 'in_progress', 'on_hold', 'done', 'cancelled',
]

export interface ActionItem {
  id: string
  customer_id: string | null
  user_id: string
  type: ActionItemType
  description: string
  due_date: string | null
  status: ActionItemStatus
  reported_by: string | null
  document_id: string | null
  execution_summary: string | null
  created_at: string
  updated_at: string
}

export interface ActionItemWithCustomer extends ActionItem {
  customer_name: string | null
  document_title: string | null
}

export interface CreateActionItemInput {
  type?: ActionItemType
  description: string
  due_date?: string | null
  status?: ActionItemStatus
  reported_by?: string | null
}

export interface UpdateActionItemInput {
  type?: ActionItemType
  description?: string
  due_date?: string | null
  status?: ActionItemStatus
  reported_by?: string | null
}

export interface UpdateBoardActionItemInput {
  type?: ActionItemType
  description?: string
  due_date?: string | null
  status?: ActionItemStatus
  reported_by?: string | null
  customer_id?: string | null
}

// =============================================================================
// Customer Document Types (formerly Artifact)
// =============================================================================

export type DocumentType =
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

export const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'strategy', 'research', 'roadmap', 'competitive_analysis',
  'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom',
]

export type DocumentStatus = 'draft' | 'in_progress' | 'review' | 'final' | 'archived'

export const VALID_DOCUMENT_STATUSES: DocumentStatus[] = [
  'draft', 'in_progress', 'review', 'final', 'archived',
]

export interface CustomerDocument {
  id: string
  initiative_id: string
  customer_id: string
  folder_id: string | null
  type: DocumentType
  title: string
  content: string
  status: DocumentStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateDocumentInput {
  title: string
  type?: DocumentType
  content?: string
  status?: DocumentStatus
}

export interface UpdateDocumentInput {
  title?: string
  type?: DocumentType
  content?: string
  status?: DocumentStatus
  initiative_id?: string | null
  folder_id?: string | null
}
