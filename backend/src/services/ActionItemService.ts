/**
 * Action Item Service
 *
 * Business logic for customer action item CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  ActionItem,
  ActionItemWithCustomer,
  CreateActionItemInput,
  UpdateActionItemInput,
  UpdateBoardActionItemInput,
} from '../types/customer.js'

interface ListFilters {
  status?: string
  type?: string
  sort?: string
}

export class ActionItemService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List action items for a customer with optional filters.
   * Default sort: due_date ascending (nulls last).
   */
  async list(customerId: string, filters?: ListFilters): Promise<ActionItem[]> {
    let query = this.supabase
      .from('customer_action_items')
      .select('*')
      .eq('customer_id', customerId)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.sort === 'created_at') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('due_date', { ascending: true, nullsFirst: false })
    }

    const { data, error } = await query

    if (error) {
      logger.error('[ActionItemService] Error listing action items', {
        sourceCode: 'ActionItemService.list',
        error,
      })
      throw error
    }

    return data as ActionItem[]
  }

  /**
   * List all action items for a user across all customers (+ customerless items).
   * Used by Kanban board. Joins customer name.
   */
  async listAll(userId: string, filters?: {
    customer_id?: string
    status?: string[]
  }): Promise<ActionItemWithCustomer[]> {
    let query = this.supabase
      .from('customer_action_items')
      .select('*, customers(name)')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }
    if (filters?.status?.length) {
      query = query.in('status', filters.status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[ActionItemService] Error listing all action items', {
        sourceCode: 'ActionItemService.listAll',
        error,
      })
      throw error
    }

    return (data || []).map((item: any) => ({
      ...item,
      customer_name: item.customers?.name || null,
      customers: undefined,
    })) as ActionItemWithCustomer[]
  }

  /**
   * Create a new action item for a customer.
   */
  async create(customerId: string, input: CreateActionItemInput): Promise<ActionItem> {
    const { data, error } = await this.supabase
      .from('customer_action_items')
      .insert({
        customer_id: customerId,
        type: input.type || 'follow_up',
        description: input.description,
        due_date: input.due_date || null,
        status: input.status || 'todo',
      })
      .select()
      .single()

    if (error) {
      logger.error('[ActionItemService] Error creating action item', {
        sourceCode: 'ActionItemService.create',
        error,
      })
      throw error
    }

    return data as ActionItem
  }

  /**
   * Create action item from board (optional customer_id, user_id from auth).
   */
  async createForBoard(
    userId: string,
    input: CreateActionItemInput & { customer_id?: string | null }
  ): Promise<ActionItem> {
    const { data, error } = await this.supabase
      .from('customer_action_items')
      .insert({
        user_id: userId,
        customer_id: input.customer_id || null,
        type: input.type || 'follow_up',
        description: input.description,
        due_date: input.due_date || null,
        status: input.status || 'todo',
      })
      .select()
      .single()

    if (error) {
      logger.error('[ActionItemService] Error creating board action item', {
        sourceCode: 'ActionItemService.createForBoard',
        error,
      })
      throw error
    }

    return data as ActionItem
  }

  /**
   * Update an action item (partial update).
   */
  async update(id: string, input: UpdateActionItemInput): Promise<ActionItem> {
    const updates: Record<string, unknown> = {}

    if (input.type !== undefined) updates.type = input.type
    if (input.description !== undefined) updates.description = input.description
    if (input.due_date !== undefined) updates.due_date = input.due_date
    if (input.status !== undefined) updates.status = input.status

    const { data, error } = await this.supabase
      .from('customer_action_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[ActionItemService] Error updating action item', {
        sourceCode: 'ActionItemService.update',
        error,
      })
      throw error
    }

    return data as ActionItem
  }

  /**
   * Update action item from board (supports customer_id reassignment).
   */
  async updateForBoard(id: string, input: UpdateBoardActionItemInput): Promise<ActionItem> {
    const updates: Record<string, unknown> = {}

    if (input.type !== undefined) updates.type = input.type
    if (input.description !== undefined) updates.description = input.description
    if (input.due_date !== undefined) updates.due_date = input.due_date
    if (input.status !== undefined) updates.status = input.status
    if (input.customer_id !== undefined) updates.customer_id = input.customer_id

    const { data, error } = await this.supabase
      .from('customer_action_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[ActionItemService] Error updating board action item', {
        sourceCode: 'ActionItemService.updateForBoard',
        error,
      })
      throw error
    }

    return data as ActionItem
  }

  /**
   * Delete an action item (hard delete).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customer_action_items')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[ActionItemService] Error deleting action item', {
        sourceCode: 'ActionItemService.delete',
        error,
      })
      throw error
    }
  }
}
