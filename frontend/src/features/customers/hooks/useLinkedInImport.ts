/**
 * LinkedIn Import Mutation Hook
 *
 * Streams NDJSON progress events from the backend, updating
 * the onProgress callback as rows are processed and companies enriched.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { customerKeys } from './useCustomers'
import type { ImportResult, ImportProgressEvent } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface ImportOptions {
  file: File
  onProgress?: (event: ImportProgressEvent) => void
}

export function useLinkedInImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, onProgress }: ImportOptions): Promise<ImportResult> => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication required')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/api/customers/import/linkedin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Import failed' }))
        throw new Error(body.message || body.error || `HTTP ${response.status}`)
      }

      // Read NDJSON stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response stream not available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult: ImportResult | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.type === 'progress' && onProgress) {
              onProgress(event as ImportProgressEvent)
            } else if (event.type === 'result') {
              finalResult = event.data as ImportResult
            } else if (event.type === 'error') {
              throw new Error(event.message || 'Import failed')
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer)
          if (event.type === 'result') {
            finalResult = event.data as ImportResult
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Import failed')
          }
        } catch {
          // Ignore parse errors in trailing buffer
        }
      }

      if (!finalResult) {
        throw new Error('No result received from import')
      }

      return finalResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customerKeys.stats() })
    },
  })
}
