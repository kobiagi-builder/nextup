/**
 * Receivable Service
 *
 * Business logic for customer receivable CRUD + financial summary.
 * Uses injected Supabase client (user-scoped via requestContext).
 * Financial calculations use PostgreSQL NUMERIC arithmetic via DB function.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  Receivable,
  CreateReceivableInput,
  UpdateReceivableInput,
  FinancialSummary,
} from '../types/customer.js'

export class ReceivableService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List receivables for a customer, ordered by date descending.
   */
  async list(customerId: string): Promise<Receivable[]> {
    const { data, error } = await this.supabase
      .from('customer_receivables')
      .select('*')
      .eq('customer_id', customerId)
      .order('date', { ascending: false })

    if (error) {
      logger.error('[ReceivableService] Error listing receivables', {
        sourceCode: 'ReceivableService.list',
        error,
      })
      throw error
    }

    return data as Receivable[]
  }

  /**
   * Get financial summary for a customer.
   * Uses PostgreSQL NUMERIC arithmetic via DB function to avoid JS floating-point issues.
   * Returns amounts as strings to preserve precision.
   */
  async getSummary(customerId: string): Promise<FinancialSummary> {
    const { data, error } = await this.supabase
      .rpc('get_receivables_summary', { cid: customerId })
      .single()

    if (error) {
      logger.error('[ReceivableService] Error getting financial summary', {
        sourceCode: 'ReceivableService.getSummary',
        error,
      })
      throw error
    }

    return data as FinancialSummary
  }

  /**
   * Create a new receivable (invoice or payment).
   */
  async create(customerId: string, input: CreateReceivableInput): Promise<Receivable> {
    const defaultStatus = input.type === 'invoice' ? (input.status || 'sent') : 'completed'

    const { data, error } = await this.supabase
      .from('customer_receivables')
      .insert({
        customer_id: customerId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        status: defaultStatus,
        description: input.description || null,
        reference: input.reference || null,
        linked_invoice_id: input.linked_invoice_id || null,
        linked_agreement_id: input.linked_agreement_id || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('[ReceivableService] Error creating receivable', {
        sourceCode: 'ReceivableService.create',
        error,
      })
      throw error
    }

    return data as Receivable
  }

  /**
   * Update a receivable (partial update).
   */
  async update(id: string, input: UpdateReceivableInput): Promise<Receivable> {
    const updates: Record<string, unknown> = {}

    if (input.amount !== undefined) updates.amount = input.amount
    if (input.date !== undefined) updates.date = input.date
    if (input.status !== undefined) updates.status = input.status
    if (input.description !== undefined) updates.description = input.description
    if (input.reference !== undefined) updates.reference = input.reference
    if (input.linked_invoice_id !== undefined) updates.linked_invoice_id = input.linked_invoice_id
    if (input.linked_agreement_id !== undefined) updates.linked_agreement_id = input.linked_agreement_id

    const { data, error } = await this.supabase
      .from('customer_receivables')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[ReceivableService] Error updating receivable', {
        sourceCode: 'ReceivableService.update',
        error,
      })
      throw error
    }

    return data as Receivable
  }

  /**
   * Delete a receivable (hard delete).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customer_receivables')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[ReceivableService] Error deleting receivable', {
        sourceCode: 'ReceivableService.delete',
        error,
      })
      throw error
    }
  }
}
