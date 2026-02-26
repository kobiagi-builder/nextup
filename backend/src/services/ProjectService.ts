/**
 * Project Service
 *
 * Business logic for customer project CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  Project,
  ProjectWithCounts,
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/customer.js'

export class ProjectService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List projects for a customer, ordered by created_at descending.
   */
  async list(customerId: string): Promise<ProjectWithCounts[]> {
    const { data, error } = await this.supabase
      .from('customer_projects')
      .select('*, customer_artifacts(count)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[ProjectService] Error listing projects', {
        sourceCode: 'ProjectService.list',
        error,
      })
      throw error
    }

    // Transform the nested count into a flat artifacts_count field
    return (data ?? []).map((row: Record<string, unknown>) => {
      const { customer_artifacts, ...project } = row
      const counts = customer_artifacts as Array<{ count: number }> | undefined
      return {
        ...project,
        artifacts_count: counts?.[0]?.count ?? 0,
      } as ProjectWithCounts
    })
  }

  /**
   * Get a single project by ID with artifact count.
   */
  async getById(id: string): Promise<ProjectWithCounts | null> {
    const { data, error } = await this.supabase
      .from('customer_projects')
      .select('*, customer_artifacts(count)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('[ProjectService] Error fetching project', {
        sourceCode: 'ProjectService.getById',
        error,
      })
      throw error
    }

    const { customer_artifacts, ...project } = data as Record<string, unknown>
    const counts = customer_artifacts as Array<{ count: number }> | undefined
    return {
      ...project,
      artifacts_count: counts?.[0]?.count ?? 0,
    } as ProjectWithCounts
  }

  /**
   * Create a new project for a customer.
   */
  async create(customerId: string, input: CreateProjectInput): Promise<Project> {
    const { data, error } = await this.supabase
      .from('customer_projects')
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
      logger.error('[ProjectService] Error creating project', {
        sourceCode: 'ProjectService.create',
        error,
      })
      throw error
    }

    return data as Project
  }

  /**
   * Update a project (partial update).
   */
  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.description !== undefined) updates.description = input.description
    if (input.status !== undefined) updates.status = input.status
    if (input.agreement_id !== undefined) updates.agreement_id = input.agreement_id

    const { data, error } = await this.supabase
      .from('customer_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[ProjectService] Error updating project', {
        sourceCode: 'ProjectService.update',
        error,
      })
      throw error
    }

    return data as Project
  }

  /**
   * Delete a project (hard delete). DB CASCADE handles child artifacts.
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customer_projects')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[ProjectService] Error deleting project', {
        sourceCode: 'ProjectService.delete',
        error,
      })
      throw error
    }
  }
}
