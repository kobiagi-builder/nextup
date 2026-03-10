/**
 * Document Folder Types
 *
 * TypeScript types for the document folders feature.
 */

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

export interface CreateFolderInput {
  name: string
  slug?: string
  customer_id: string
}

export interface UpdateFolderInput {
  name?: string
  sort_order?: number
}
