/**
 * Document Folder Service
 *
 * Business logic for document folder CRUD operations.
 * Uses injected Supabase client (user-scoped via requestContext).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  DocumentFolder,
  CreateFolderInput,
  UpdateFolderInput,
} from '../types/document-folder.js'

export class DocumentFolderService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get folders for a customer.
   * Returns both global folders (customer_id IS NULL) and customer-specific folders.
   */
  async getFolders(customerId?: string): Promise<DocumentFolder[]> {
    let query = this.supabase
      .from('document_folders')
      .select('*')
      .order('sort_order', { ascending: true })

    if (customerId) {
      query = query.or(`customer_id.is.null,customer_id.eq.${customerId}`)
    } else {
      query = query.is('customer_id', null)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[DocumentFolderService] Error listing folders', {
        sourceCode: 'DocumentFolderService.getFolders',
        error,
      })
      throw error
    }

    return data as DocumentFolder[]
  }

  /**
   * Get the default (General) folder.
   * Checks for customer-specific default first, falls back to global.
   */
  async getDefaultFolder(customerId?: string): Promise<DocumentFolder | null> {
    if (customerId) {
      const { data: customerDefault } = await this.supabase
        .from('document_folders')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_default', true)
        .single()

      if (customerDefault) return customerDefault as DocumentFolder
    }

    const { data, error } = await this.supabase
      .from('document_folders')
      .select('*')
      .is('customer_id', null)
      .eq('is_default', true)
      .single()

    if (error) {
      logger.error('[DocumentFolderService] Error fetching default folder', {
        sourceCode: 'DocumentFolderService.getDefaultFolder',
        error,
      })
      return null
    }

    return data as DocumentFolder
  }

  /**
   * Create a new folder for a customer.
   */
  async createFolder(userId: string, input: CreateFolderInput): Promise<DocumentFolder> {
    const slug = input.slug || input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data, error } = await this.supabase
      .from('document_folders')
      .insert({
        name: input.name,
        slug,
        is_system: false,
        is_default: false,
        customer_id: input.customer_id,
        user_id: userId,
        sort_order: 0,
      })
      .select()
      .single()

    if (error) {
      logger.error('[DocumentFolderService] Error creating folder', {
        sourceCode: 'DocumentFolderService.createFolder',
        error,
      })
      throw error
    }

    return data as DocumentFolder
  }

  /**
   * Update a folder (name or sort_order).
   */
  async updateFolder(id: string, input: UpdateFolderInput): Promise<DocumentFolder> {
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.sort_order !== undefined) updates.sort_order = input.sort_order

    const { data, error } = await this.supabase
      .from('document_folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[DocumentFolderService] Error updating folder', {
        sourceCode: 'DocumentFolderService.updateFolder',
        error,
      })
      throw error
    }

    return data as DocumentFolder
  }

  /**
   * Delete a folder (non-system only).
   * Moves documents to General folder before deleting.
   */
  async deleteFolder(id: string): Promise<void> {
    // Check if system folder
    const { data: folder, error: fetchError } = await this.supabase
      .from('document_folders')
      .select('is_system')
      .eq('id', id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (folder?.is_system) {
      throw new Error('Cannot delete system folder')
    }

    // Get General folder
    const generalFolder = await this.getDefaultFolder()
    if (!generalFolder) {
      throw new Error('General folder not found')
    }

    // Move documents to General
    const { error: moveError } = await this.supabase
      .from('customer_documents')
      .update({ folder_id: generalFolder.id })
      .eq('folder_id', id)

    if (moveError) {
      logger.error('[DocumentFolderService] Error moving documents before folder delete', {
        sourceCode: 'DocumentFolderService.deleteFolder',
        error: moveError,
      })
      throw moveError
    }

    // Delete the folder
    const { error } = await this.supabase
      .from('document_folders')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[DocumentFolderService] Error deleting folder', {
        sourceCode: 'DocumentFolderService.deleteFolder',
        error,
      })
      throw error
    }
  }
}
