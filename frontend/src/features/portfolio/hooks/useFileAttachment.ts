/**
 * useFileAttachment Hook
 *
 * Manages file attachment state for chat messages.
 * Handles uploading files to the processing endpoint,
 * tracking pending attachments, and validating constraints.
 */

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import type { ProcessedAttachment } from '../types/attachment'

// =============================================================================
// Constants
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ATTACHMENTS = 5

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/csv',
  'text/plain',
  'text/markdown',
])

// =============================================================================
// Types
// =============================================================================

export interface UseFileAttachmentReturn {
  /** Currently pending attachments (not yet sent) */
  attachments: ProcessedAttachment[]
  /** Upload and process a file */
  addAttachment: (file: File) => void
  /** Remove a pending attachment by index */
  removeAttachment: (index: number) => void
  /** Clear all pending attachments */
  clearAttachments: () => void
  /** Whether a file is currently being uploaded/processed */
  isUploading: boolean
}

// =============================================================================
// Hook
// =============================================================================

export function useFileAttachment(): UseFileAttachmentReturn {
  const [attachments, setAttachments] = useState<ProcessedAttachment[]>([])

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<ProcessedAttachment> => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/api/ai/attachments/process`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(body.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      return {
        type: result.type,
        data: result.data,
        content: result.content,
        mimeType: result.mimeType,
        fileName: result.fileName,
        fileSize: result.fileSize,
      }
    },
    onSuccess: (processed) => {
      setAttachments((prev) => [...prev, processed])
    },
    onError: (error: Error) => {
      toast({
        title: 'File upload failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const addAttachment = useCallback(
    (file: File) => {
      // Client-side validation
      if (attachments.length >= MAX_ATTACHMENTS) {
        toast({
          title: 'Too many attachments',
          description: `Maximum ${MAX_ATTACHMENTS} files per message.`,
          variant: 'destructive',
        })
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          variant: 'destructive',
        })
        return
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        toast({
          title: 'Unsupported file type',
          description: 'Supported: images, PDF, Word, CSV, and text files.',
          variant: 'destructive',
        })
        return
      }

      uploadMutation.mutate(file)
    },
    [attachments.length, uploadMutation]
  )

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

  return {
    attachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    isUploading: uploadMutation.isPending,
  }
}
