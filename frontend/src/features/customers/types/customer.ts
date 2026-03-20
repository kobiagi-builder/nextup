/**
 * Customer Domain Types (Frontend)
 *
 * Mirrors backend types with UI additions (colors, labels, filters).
 */

// =============================================================================
// Customer Status
// =============================================================================

export type CustomerStatus = 'lead' | 'prospect' | 'negotiation' | 'live' | 'on_hold' | 'archive' | 'not_relevant' | 'closed_lost'

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  'lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive', 'not_relevant', 'closed_lost',
]

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  negotiation: 'Negotiation',
  live: 'Live',
  on_hold: 'On Hold',
  archive: 'Archive',
  not_relevant: 'Not Relevant',
  closed_lost: 'Closed Lost',
}

export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  lead: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  prospect: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  negotiation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  live: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  on_hold: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  archive: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  not_relevant: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  closed_lost: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

/** Solid dot colors for dropdown indicators (Tailwind JIT needs literal classes) */
export const CUSTOMER_STATUS_DOT_COLORS: Record<CustomerStatus, string> = {
  lead: 'bg-sky-400',
  prospect: 'bg-violet-400',
  negotiation: 'bg-amber-400',
  live: 'bg-emerald-400',
  on_hold: 'bg-orange-400',
  archive: 'bg-slate-400',
  not_relevant: 'bg-rose-400',
  closed_lost: 'bg-red-400',
}

// =============================================================================
// ICP Score
// =============================================================================

export type IcpScore = 'low' | 'medium' | 'high' | 'very_high'

export const ICP_SCORES: IcpScore[] = ['low', 'medium', 'high', 'very_high']

export const ICP_SCORE_LABELS: Record<IcpScore, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
}

export const ICP_SCORE_COLORS: Record<IcpScore, string> = {
  low: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  high: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  very_high: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
}

/** Solid dot colors for ICP dropdown indicators (Tailwind JIT needs literal classes) */
export const ICP_SCORE_DOT_COLORS: Record<IcpScore, string> = {
  low: 'bg-rose-400',
  medium: 'bg-amber-400',
  high: 'bg-emerald-400',
  very_high: 'bg-blue-400',
}

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
    source?: 'linkedin_scrape' | 'llm_enrichment' | 'tavily_grounded'
    updated_at?: string
  }
  linkedin_company_url?: string
  website_url?: string
  enrichment_errors?: {
    linkedin?: string
    website?: string
  }
  [key: string]: unknown
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

export interface CustomerWithCounts extends Customer {
  agreements_count: number
  receivables_count: number
  initiatives_count: number
  action_items_count: number
}

export interface CustomerWithSummary extends Customer {
  active_agreements_count: number
  outstanding_balance: number
  active_initiatives_count: number
  action_items_count: number
  last_activity: string | null
  next_action_description: string | null
  next_action_due_date: string | null
}

export interface DashboardStats {
  total_customers: number
  active_customers: number
  total_outstanding: number
  expiring_agreements: number
}

// =============================================================================
// Tab Counts
// =============================================================================

export interface TabCounts {
  agreements: number
  receivables: number
  initiatives: number
  action_items: number
}

// =============================================================================
// Input Types
// =============================================================================

export interface CreateCustomerInput {
  name: string
  status?: CustomerStatus
  info?: Partial<CustomerInfo>
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
// Team Sync
// =============================================================================

export interface TeamSyncResult {
  added: number
  removed: number
  total: number
  members: TeamMember[]
}

// =============================================================================
// LinkedIn Import
// =============================================================================

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

export type ImportProgressEvent =
  | { phase: 'classifying'; current: number; total: number }
  | { phase: 'importing'; current: number; total: number }
  | { phase: 'enriching'; current: number; total: number; company: string }

// =============================================================================
// Filters
// =============================================================================

export interface CustomerFilters {
  status?: CustomerStatus[] | null
  search?: string
  sort?: string
  icp?: (IcpScore | 'not_scored')[] | null
}

// =============================================================================
// Customer Tab
// =============================================================================

export type CustomerTab = 'overview' | 'agreements' | 'receivables' | 'documents' | 'action_items'

// =============================================================================
// Agreement Types
// =============================================================================

export type AgreementType = 'retainer' | 'project_based' | 'hourly' | 'fixed_price' | 'equity' | 'hybrid' | 'custom'

export const AGREEMENT_TYPES: AgreementType[] = [
  'retainer', 'project_based', 'hourly', 'fixed_price', 'equity', 'hybrid', 'custom',
]

export const AGREEMENT_TYPE_LABELS: Record<AgreementType, string> = {
  retainer: 'Retainer',
  project_based: 'Project-based',
  hourly: 'Hourly',
  fixed_price: 'Fixed Price',
  equity: 'Equity',
  hybrid: 'Hybrid',
  custom: 'Custom',
}

export type AgreementStatus = 'draft' | 'proposal' | 'agreed' | 'signed' | 'active' | 'completed' | 'on_hold' | 'archived'

export const AGREEMENT_STATUSES: AgreementStatus[] = [
  'draft', 'proposal', 'agreed', 'signed', 'active', 'completed', 'on_hold', 'archived',
]

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: 'Draft',
  proposal: 'Proposal',
  agreed: 'Agreed',
  signed: 'Signed',
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On Hold',
  archived: 'Archived',
}

export const AGREEMENT_STATUS_COLORS: Record<AgreementStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  proposal: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  agreed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  signed: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  completed: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  on_hold: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  archived: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
}

export const AGREEMENT_STATUS_DOT_COLORS: Record<AgreementStatus, string> = {
  draft: 'bg-gray-400',
  proposal: 'bg-violet-400',
  agreed: 'bg-blue-400',
  signed: 'bg-cyan-400',
  active: 'bg-green-400',
  completed: 'bg-purple-400',
  on_hold: 'bg-orange-400',
  archived: 'bg-slate-400',
}

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
  status: AgreementStatus
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

export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled'

export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'overdue', 'paid', 'cancelled']

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  paid: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  cancelled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
}

export const PAYMENT_METHODS = ['bank_transfer', 'check', 'credit_card', 'paypal', 'other'] as const
export type PaymentMethod = typeof PAYMENT_METHODS[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  credit_card: 'Credit Card',
  paypal: 'PayPal',
  other: 'Other',
}

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

export const INITIATIVE_STATUSES: InitiativeStatus[] = [
  'planning', 'active', 'on_hold', 'completed', 'archived',
]

export const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
}

export const INITIATIVE_STATUS_COLORS: Record<InitiativeStatus, string> = {
  planning: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  on_hold: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  completed: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  archived: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
}

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

export const ACTION_ITEM_TYPES: ActionItemType[] = [
  'follow_up', 'proposal', 'meeting', 'delivery', 'review', 'bug', 'new_feature', 'enhancement', 'custom',
]

export const ACTION_ITEM_TYPE_LABELS: Record<ActionItemType, string> = {
  follow_up: 'Follow-up',
  proposal: 'Proposal',
  meeting: 'Meeting',
  delivery: 'Delivery',
  review: 'Review',
  bug: 'Bug',
  new_feature: 'New Feature',
  enhancement: 'Enhancement',
  custom: 'Custom',
}

export const ACTION_ITEM_TYPE_COLORS: Record<ActionItemType, string> = {
  follow_up: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  proposal: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  meeting: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  delivery: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  bug: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  new_feature: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  enhancement: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  custom: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
}

export type ActionItemStatus = 'todo' | 'in_progress' | 'on_hold' | 'done' | 'cancelled'

export const ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  'todo', 'in_progress', 'on_hold', 'done', 'cancelled',
]

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  done: 'Done',
  cancelled: 'Cancelled',
}

export const ACTION_ITEM_STATUS_COLORS: Record<ActionItemStatus, string> = {
  todo: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  on_hold: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  done: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

export interface ActionItem {
  id: string
  customer_id: string | null
  user_id: string
  type: ActionItemType
  description: string
  due_date: string | null
  status: ActionItemStatus
  reported_by: string | null
  created_at: string
  updated_at: string
}

export interface ActionItemWithCustomer extends ActionItem {
  customer_name: string | null
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

export const DOCUMENT_TYPES: DocumentType[] = [
  'strategy', 'research', 'roadmap', 'competitive_analysis',
  'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom',
]

export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, { label: string; color: string }> = {
  strategy: { label: 'Strategy', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  research: { label: 'Research', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  roadmap: { label: 'Roadmap', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  competitive_analysis: { label: 'Competitive', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  user_research: { label: 'User Research', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  product_spec: { label: 'Product Spec', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  meeting_notes: { label: 'Notes', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' },
  presentation: { label: 'Presentation', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  ideation: { label: 'Ideation', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
  custom: { label: 'Custom', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
}

export type DocumentStatus = 'draft' | 'in_progress' | 'review' | 'final' | 'archived'

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  'draft', 'in_progress', 'review', 'final', 'archived',
]

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  review: 'Review',
  final: 'Final',
  archived: 'Archived',
}

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  final: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  archived: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
}

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
  initiative_id?: string
  folder_id?: string | null
}

export interface UpdateDocumentInput {
  title?: string
  type?: DocumentType
  content?: string
  status?: DocumentStatus
  initiative_id?: string
  folder_id?: string | null
}

// =============================================================================
// Document Folder Types
// =============================================================================

export interface DocumentFolder {
  id: string
  name: string
  slug: string
  is_system: boolean
  is_default: boolean
  customer_id: string | null
  user_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
