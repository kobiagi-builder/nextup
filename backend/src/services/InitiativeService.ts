/**
 * Initiative Service (formerly ProjectService)
 *
 * Business logic for customer initiative CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  Initiative,
  InitiativeWithCounts,
  CreateInitiativeInput,
  UpdateInitiativeInput,
} from '../types/customer.js'
import { DocumentFolderService } from './DocumentFolderService.js'

export class InitiativeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List initiatives for a customer, ordered by created_at descending.
   */
  async list(customerId: string): Promise<InitiativeWithCounts[]> {
    const { data, error } = await this.supabase
      .from('customer_initiatives')
      .select('*, customer_documents(count)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[InitiativeService] Error listing initiatives', {
        sourceCode: 'InitiativeService.list',
        error,
      })
      throw error
    }

    // Transform the nested count into a flat documents_count field
    return (data ?? []).map((row: Record<string, unknown>) => {
      const { customer_documents, ...initiative } = row
      const counts = customer_documents as Array<{ count: number }> | undefined
      return {
        ...initiative,
        documents_count: counts?.[0]?.count ?? 0,
      } as InitiativeWithCounts
    })
  }

  /**
   * Get a single initiative by ID with document count.
   */
  async getById(id: string): Promise<InitiativeWithCounts | null> {
    const { data, error } = await this.supabase
      .from('customer_initiatives')
      .select('*, customer_documents(count)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('[InitiativeService] Error fetching initiative', {
        sourceCode: 'InitiativeService.getById',
        error,
      })
      throw error
    }

    const { customer_documents, ...initiative } = data as Record<string, unknown>
    const counts = customer_documents as Array<{ count: number }> | undefined
    return {
      ...initiative,
      documents_count: counts?.[0]?.count ?? 0,
    } as InitiativeWithCounts
  }

  /**
   * Create a new initiative for a customer.
   */
  async create(customerId: string, input: CreateInitiativeInput): Promise<Initiative> {
    const { data, error } = await this.supabase
      .from('customer_initiatives')
      .insert({
        customer_id: customerId,
        name: input.name,
        description: input.description || null,
        status: input.status || 'planning',
        agreement_id: input.agreement_id || null,
        metadata: {},
      })
      .select()
      .single()

    if (error) {
      logger.error('[InitiativeService] Error creating initiative', {
        sourceCode: 'InitiativeService.create',
        error,
      })
      throw error
    }

    return data as Initiative
  }

  /**
   * Update an initiative (partial update).
   */
  async update(id: string, input: UpdateInitiativeInput): Promise<Initiative> {
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.description !== undefined) updates.description = input.description
    if (input.status !== undefined) updates.status = input.status
    if (input.agreement_id !== undefined) updates.agreement_id = input.agreement_id

    const { data, error } = await this.supabase
      .from('customer_initiatives')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[InitiativeService] Error updating initiative', {
        sourceCode: 'InitiativeService.update',
        error,
      })
      throw error
    }

    return data as Initiative
  }

  /**
   * Delete an initiative (safe delete).
   * Moves all documents to the General folder before deleting.
   * The FK is ON DELETE RESTRICT, so we must move docs first.
   */
  async delete(id: string): Promise<{ moved_documents: number }> {
    // 1. Get the General (default) folder
    const folderService = new DocumentFolderService(this.supabase)
    const generalFolder = await folderService.getDefaultFolder()

    if (!generalFolder) {
      throw new Error('General folder not found — cannot safely delete initiative')
    }

    // 2. Move all documents from this initiative to General folder
    const { data: movedDocs, error: moveError } = await this.supabase
      .from('customer_documents')
      .update({ initiative_id: null, folder_id: generalFolder.id })
      .eq('initiative_id', id)
      .select('id')

    if (moveError) {
      logger.error('[InitiativeService] Error moving documents to General', {
        sourceCode: 'InitiativeService.delete',
        error: moveError,
      })
      throw moveError
    }

    const movedCount = movedDocs?.length ?? 0

    // 3. Now safe to delete the initiative (no child docs remain)
    const { error: deleteError } = await this.supabase
      .from('customer_initiatives')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error('[InitiativeService] Error deleting initiative', {
        sourceCode: 'InitiativeService.delete',
        error: deleteError,
      })
      throw deleteError
    }

    return { moved_documents: movedCount }
  }
}
