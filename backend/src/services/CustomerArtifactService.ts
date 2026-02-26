/**
 * Customer Artifact Service
 *
 * Business logic for customer artifact CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  CustomerArtifact,
  CreateArtifactInput,
  UpdateArtifactInput,
} from '../types/customer.js'

export class CustomerArtifactService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List artifacts for a specific project, ordered by updated_at descending.
   */
  async listByProject(projectId: string): Promise<CustomerArtifact[]> {
    const { data, error } = await this.supabase
      .from('customer_artifacts')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('[CustomerArtifactService] Error listing artifacts by project', {
        sourceCode: 'CustomerArtifactService.listByProject',
        error,
      })
      throw error
    }

    return data as CustomerArtifact[]
  }

  /**
   * List ALL artifacts for a customer across all projects (flat view).
   */
  async listByCustomer(customerId: string): Promise<CustomerArtifact[]> {
    const { data, error } = await this.supabase
      .from('customer_artifacts')
      .select('*')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('[CustomerArtifactService] Error listing artifacts by customer', {
        sourceCode: 'CustomerArtifactService.listByCustomer',
        error,
      })
      throw error
    }

    return data as CustomerArtifact[]
  }

  /**
   * Create a new artifact in a project.
   */
  async create(projectId: string, customerId: string, input: CreateArtifactInput): Promise<CustomerArtifact> {
    const { data, error } = await this.supabase
      .from('customer_artifacts')
      .insert({
        project_id: projectId,
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
      logger.error('[CustomerArtifactService] Error creating artifact', {
        sourceCode: 'CustomerArtifactService.create',
        error,
      })
      throw error
    }

    return data as CustomerArtifact
  }

  /**
   * Update an artifact (partial update).
   */
  async update(id: string, input: UpdateArtifactInput): Promise<CustomerArtifact> {
    const updates: Record<string, unknown> = {}

    if (input.title !== undefined) updates.title = input.title
    if (input.type !== undefined) updates.type = input.type
    if (input.content !== undefined) updates.content = input.content
    if (input.status !== undefined) updates.status = input.status

    const { data, error } = await this.supabase
      .from('customer_artifacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[CustomerArtifactService] Error updating artifact', {
        sourceCode: 'CustomerArtifactService.update',
        error,
      })
      throw error
    }

    return data as CustomerArtifact
  }

  /**
   * Delete an artifact (hard delete).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customer_artifacts')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[CustomerArtifactService] Error deleting artifact', {
        sourceCode: 'CustomerArtifactService.delete',
        error,
      })
      throw error
    }
  }
}
