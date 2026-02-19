/**
 * useWritingCharacteristics Hook (Phase 4)
 *
 * Fetches writing characteristics for an artifact.
 * Polls during 'foundations' status when characteristics are being analyzed.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase'
import type { ArtifactWritingCharacteristics, ArtifactStatus } from '../types/portfolio'

// =============================================================================
// Query Keys
// =============================================================================

export const writingCharacteristicsKeys = {
  all: ['writing-characteristics'] as const,
  detail: (artifactId: string) => ['writing-characteristics', artifactId] as const,
}

// =============================================================================
// Fetch Writing Characteristics Query
// =============================================================================

export function useWritingCharacteristics(
  artifactId: string,
  artifactStatus?: ArtifactStatus
) {
  return useQuery<ArtifactWritingCharacteristics | null>({
    queryKey: writingCharacteristicsKeys.detail(artifactId),
    queryFn: async () => {
      console.log('[useWritingCharacteristics] Fetching characteristics:', {
        artifactId,
        artifactStatus,
        timestamp: new Date().toISOString(),
      })

      try {
        const token = await getAccessToken()
        const characteristics = await api.get<ArtifactWritingCharacteristics>(
          `/api/artifacts/${artifactId}/writing-characteristics`,
          token ? { token } : undefined
        )
        console.log('[useWritingCharacteristics] Characteristics fetched:', {
          artifactId,
          hasCharacteristics: !!characteristics,
          characteristicsCount: characteristics?.characteristics
            ? Object.keys(characteristics.characteristics).length
            : 0,
          timestamp: new Date().toISOString(),
        })
        return characteristics
      } catch (error) {
        // 404 is expected when characteristics don't exist yet
        if (error instanceof Error && error.message.includes('404')) {
          console.log('[useWritingCharacteristics] No characteristics yet:', {
            artifactId,
            timestamp: new Date().toISOString(),
          })
          return null
        }
        console.error('[useWritingCharacteristics] Failed to fetch:', {
          artifactId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
        return null
      }
    },
    enabled: !!artifactId,
    // Poll during foundations status when characteristics are being analyzed
    refetchInterval: () => {
      const shouldPoll = artifactStatus === 'foundations' || artifactStatus === 'research'
      if (shouldPoll) {
        console.log('[useWritingCharacteristics] Polling enabled:', {
          artifactId,
          artifactStatus,
          reason: 'analyzing_characteristics',
        })
        return 2000 // Poll every 2 seconds
      }
      return false
    },
  })
}

export default useWritingCharacteristics
