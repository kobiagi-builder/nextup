/**
 * Agreement Service
 *
 * Business logic for customer agreement CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  Agreement,
  CreateAgreementInput,
  UpdateAgreementInput,
} from '../types/customer.js'

export class AgreementService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List agreements for a customer, ordered by created_at descending.
   */
  async list(customerId: string): Promise<Agreement[]> {
    const { data, error } = await this.supabase
      .from('customer_agreements')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[AgreementService] Error listing agreements', {
        sourceCode: 'AgreementService.list',
        error,
      })
      throw error
    }

    return data as Agreement[]
  }

  /**
   * Create a new agreement for a customer.
   */
  async create(customerId: string, input: CreateAgreementInput): Promise<Agreement> {
    const { data, error } = await this.supabase
      .from('customer_agreements')
      .insert({
        customer_id: customerId,
        scope: input.scope,
        type: input.type || 'retainer',
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        pricing: input.pricing || {},
        override_status: input.override_status || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('[AgreementService] Error creating agreement', {
        sourceCode: 'AgreementService.create',
        error,
      })
      throw error
    }

    return data as Agreement
  }

  /**
   * Update an agreement (partial update).
   */
  async update(id: string, input: UpdateAgreementInput): Promise<Agreement> {
    const updates: Record<string, unknown> = {}

    if (input.scope !== undefined) updates.scope = input.scope
    if (input.type !== undefined) updates.type = input.type
    if (input.start_date !== undefined) updates.start_date = input.start_date
    if (input.end_date !== undefined) updates.end_date = input.end_date
    if (input.pricing !== undefined) updates.pricing = input.pricing
    if (input.override_status !== undefined) updates.override_status = input.override_status

    const { data, error } = await this.supabase
      .from('customer_agreements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[AgreementService] Error updating agreement', {
        sourceCode: 'AgreementService.update',
        error,
      })
      throw error
    }

    return data as Agreement
  }

  /**
   * Delete an agreement (hard delete).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customer_agreements')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[AgreementService] Error deleting agreement', {
        sourceCode: 'AgreementService.delete',
        error,
      })
      throw error
    }
  }
}
