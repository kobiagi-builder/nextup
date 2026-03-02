/**
 * Customer Service
 *
 * Business logic for customer CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  Customer,
  CustomerWithCounts,
  CustomerWithSummary,
  CustomerStatus,
  IcpScore,
  EnrichmentSource,
  DashboardStats,
  CustomerArtifactSearchResult,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerEvent,
  CreateEventInput,
} from '../types/customer.js'
import type { CompanyEnrichmentData } from './EnrichmentService.js'

export class CustomerService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List customers for the authenticated user.
   * Supports filtering by status, search by name, and sorting.
   */
  async list(params: {
    status?: CustomerStatus
    search?: string
    sort?: string
  }): Promise<Customer[]> {
    let query = this.supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.search) {
      query = query.ilike('name', `%${params.search}%`)
    }

    // Sort handling
    const sortField = params.sort || 'updated_at'
    const validSorts = ['name', 'status', 'created_at', 'updated_at']
    const field = validSorts.includes(sortField) ? sortField : 'updated_at'
    const ascending = field === 'name'
    query = query.order(field, { ascending })

    const { data, error } = await query

    if (error) {
      logger.error('[CustomerService] Error listing customers', {
        sourceCode: 'CustomerService.list',
        error,
      })
      throw error
    }

    return data as Customer[]
  }

  /**
   * Get a single customer by ID with tab counts.
   * RLS ensures only the owner can access.
   */
  async getById(id: string): Promise<CustomerWithCounts | null> {
    // Fetch customer and tab counts in parallel
    const [customerResult, agreementsCount, receivablesCount, projectsCount, actionItemsCount] = await Promise.all([
      this.supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single(),
      this.supabase
        .from('customer_agreements')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id),
      this.supabase
        .from('customer_receivables')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id),
      this.supabase
        .from('customer_projects')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id),
      this.supabase
        .from('customer_action_items')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id)
        .neq('status', 'cancelled'),
    ])

    if (customerResult.error || !customerResult.data) {
      return null
    }

    return {
      ...customerResult.data,
      agreements_count: agreementsCount.count ?? 0,
      receivables_count: receivablesCount.count ?? 0,
      projects_count: projectsCount.count ?? 0,
      action_items_count: actionItemsCount.count ?? 0,
    } as CustomerWithCounts
  }

  /**
   * Create a new customer with default status 'lead'.
   */
  async create(userId: string, input: CreateCustomerInput): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert({
        user_id: userId,
        name: input.name,
        status: input.status || 'lead',
        info: input.info || {},
      })
      .select()
      .single()

    if (error) {
      logger.error('[CustomerService] Error creating customer', {
        sourceCode: 'CustomerService.create',
        error,
      })
      throw error
    }

    return data as Customer
  }

  /**
   * Update customer fields (partial update).
   */
  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.status !== undefined) updates.status = input.status
    if (input.info !== undefined) updates.info = input.info

    const { data, error } = await this.supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      logger.error('[CustomerService] Error updating customer', {
        sourceCode: 'CustomerService.update',
        error,
      })
      throw error
    }

    return data as Customer
  }

  /**
   * Quick status update.
   */
  async updateStatus(id: string, status: CustomerStatus): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .update({ status })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      logger.error('[CustomerService] Error updating customer status', {
        sourceCode: 'CustomerService.updateStatus',
        error,
      })
      throw error
    }

    return data as Customer
  }

  /**
   * Soft delete a customer (sets deleted_at timestamp).
   * RLS and CASCADE handle child records visibility.
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) {
      logger.error('[CustomerService] Error deleting customer', {
        sourceCode: 'CustomerService.delete',
        error,
      })
      throw error
    }
  }

  // ===========================================================================
  // Customer Events
  // ===========================================================================

  /**
   * List events for a customer, ordered by event_date descending.
   */
  async listEvents(customerId: string): Promise<CustomerEvent[]> {
    const { data, error } = await this.supabase
      .from('customer_events')
      .select('*')
      .eq('customer_id', customerId)
      .order('event_date', { ascending: false })

    if (error) {
      logger.error('[CustomerService] Error listing events', {
        sourceCode: 'CustomerService.listEvents',
        error,
      })
      throw error
    }

    return data as CustomerEvent[]
  }

  /**
   * Create a new customer event.
   */
  async createEvent(customerId: string, input: CreateEventInput): Promise<CustomerEvent> {
    const { data, error } = await this.supabase
      .from('customer_events')
      .insert({
        customer_id: customerId,
        event_type: input.event_type || 'update',
        title: input.title,
        description: input.description || null,
        participants: input.participants || null,
        event_date: input.event_date || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      logger.error('[CustomerService] Error creating event', {
        sourceCode: 'CustomerService.createEvent',
        error,
      })
      throw error
    }

    return data as CustomerEvent
  }

  // ===========================================================================
  // Summary, Search, and Stats (Phase 5)
  // ===========================================================================

  /**
   * List customers with aggregated summary data via RPC function.
   * Returns active_agreements_count, outstanding_balance, active_projects_count, last_activity.
   */
  async listWithSummary(params: {
    status?: CustomerStatus
    search?: string
    sort?: string
    icp?: string
  }): Promise<CustomerWithSummary[]> {
    const { data, error } = await this.supabase.rpc('get_customer_list_summary', {
      p_status: params.status || null,
      p_search: params.search || null,
      p_sort: params.sort || 'updated_at',
      p_icp: params.icp || null,
    })

    if (error) {
      logger.error('[CustomerService] Error in listWithSummary', {
        sourceCode: 'CustomerService.listWithSummary',
        hasError: true,
      })
      throw error
    }

    return (data ?? []) as CustomerWithSummary[]
  }

  /**
   * Full-text search using PostgreSQL search_vector.
   */
  async search(query: string): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)
      .textSearch('search_vector', query, { type: 'websearch' })
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('[CustomerService] Error in search', {
        sourceCode: 'CustomerService.search',
        hasError: true,
      })
      throw error
    }

    return (data ?? []) as Customer[]
  }

  /**
   * Dashboard stats via RPC function.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const { data, error } = await this.supabase.rpc('get_customer_dashboard_stats')

    if (error) {
      logger.error('[CustomerService] Error in getDashboardStats', {
        sourceCode: 'CustomerService.getDashboardStats',
        hasError: true,
      })
      throw error
    }

    const row = Array.isArray(data) ? data[0] : data
    return (row ?? {
      total_customers: 0,
      active_customers: 0,
      total_outstanding: 0,
      expiring_agreements: 0,
    }) as DashboardStats
  }

  /**
   * Search customer artifacts by title for cross-module linking.
   */
  async searchArtifacts(query: string): Promise<CustomerArtifactSearchResult[]> {
    const { data, error } = await this.supabase
      .from('customer_artifacts')
      .select(`
        id, title, type, status, customer_id,
        customers!inner(name)
      `)
      .ilike('title', `%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      logger.error('[CustomerService] Error in searchArtifacts', {
        sourceCode: 'CustomerService.searchArtifacts',
        hasError: true,
      })
      throw error
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      customer_id: row.customer_id,
      customer_name: row.customers?.name ?? 'Unknown',
    })) as CustomerArtifactSearchResult[]
  }

  // ===========================================================================
  // Enrichment & ICP Score Updates (Phase 2 - LinkedIn Import)
  // ===========================================================================

  /**
   * Merge enrichment data into customer info via atomic JSONB merge.
   */
  async updateEnrichment(
    customerId: string,
    enrichmentData: CompanyEnrichmentData,
    source: EnrichmentSource = 'llm_enrichment',
  ): Promise<void> {
    const { error } = await this.supabase.rpc('merge_customer_info', {
      cid: customerId,
      new_info: {
        // Store full enrichment payload for reference
        enrichment: {
          ...enrichmentData,
          source,
          updated_at: new Date().toISOString(),
        },
        // Sync to top-level fields the UI reads from (only if non-empty)
        ...(enrichmentData.about ? { about: enrichmentData.about } : {}),
        ...(enrichmentData.industry ? { vertical: enrichmentData.industry } : {}),
      },
    })

    if (error) {
      logger.error('[CustomerService] Error updating enrichment', {
        sourceCode: 'CustomerService.updateEnrichment',
        hasError: true,
      })
      throw error
    }
  }

  /**
   * Merge ICP score into customer info via atomic JSONB merge.
   */
  async updateIcpScore(customerId: string, icpScore: IcpScore): Promise<void> {
    const { error } = await this.supabase.rpc('merge_customer_info', {
      cid: customerId,
      new_info: { icp_score: icpScore },
    })

    if (error) {
      logger.error('[CustomerService] Error updating ICP score', {
        sourceCode: 'CustomerService.updateIcpScore',
        hasError: true,
      })
      throw error
    }
  }
}
