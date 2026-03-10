/**
 * Customer Document Service (formerly CustomerArtifactService)
 *
 * Business logic for customer document CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  CustomerDocument,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../types/customer.js'

export class CustomerDocumentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List documents for a specific initiative, ordered by updated_at descending.
   */
  async listByInitiative(initiativeId: string): Promise<CustomerDocument[]> {
    const { data, error } = await this.supabase
      .from('customer_documents')
      .select('*')
      .eq('initiative_id', initiativeId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('[CustomerDocumentService] Error listing documents by initiative', {
        sourceCode: 'CustomerDocumentService.listByInitiative',
        error,
      })
      throw error
    }

    return data as CustomerDocument[]
  }

  /**
   * List ALL documents for a customer across all initiatives (flat view).
   */
  async listByCustomer(customerId: string): Promise<CustomerDocument[]> {
    const { data, error } = await this.supabase
      .from('customer_documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('[CustomerDocumentService] Error listing documents by customer', {
        sourceCode: 'CustomerDocumentService.listByCustomer',
        error,
      })
      throw error
    }

    return data as CustomerDocument[]
  }

  /**
   * Create a new document in an initiative.
   */
  async create(initiativeId: string, customerId: string, input: CreateDocumentInput): Promise<CustomerDocument> {
    const { data, error } = await this.supabase
      .from('customer_documents')
      .insert({
        initiative_id: initiativeId,
        customer_id: customerId,
        title: input.title,
        type: input.type || 'custom',
        content: input.content || '',
        status: input.status || 'draft',
        metadata: {},
      })
      .select()
      .single()

    if (error) {
      logger.error('[CustomerDocumentService] Error creating document', {
        sourceCode: 'CustomerDocumentService.create',
        error,
      })
      throw error
    }

    return data as CustomerDocument
  }

  /**
   * Update a document (partial update).
   */
  async update(id: string, input: UpdateDocumentInput): Promise<CustomerDocument> {
    const updates: Record<string, unknown> = {}

    if (input.title !== undefined) updates.title = input.title
    if (input.type !== undefined) updates.type = input.type
    if (input.content !== undefined) updates.content = input.content
    if (input.status !== undefined) updates.status = input.status
    if (input.initiative_id !== undefined) updates.initiative_id = input.initiative_id
    if (input.folder_id !== undefined) updates.folder_id = input.folder_id

    const { data, error } = await this.supabase
      .from('customer_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[CustomerDocumentService] Error updating document', {
        sourceCode: 'CustomerDocumentService.update',
        error,
      })
      throw error
    }

    return data as CustomerDocument
  }

  /**
   * Delete a document (hard delete).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customer_documents')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[CustomerDocumentService] Error deleting document', {
        sourceCode: 'CustomerDocumentService.delete',
        error,
      })
      throw error
    }
  }
}
