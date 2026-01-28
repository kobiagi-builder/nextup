/**
 * Screen Context Hook
 *
 * Provides context about the current page and artifact state for Content Agent.
 * Used to inject screen context into AI chat requests for better intent detection.
 */

import { useLocation, useParams } from 'react-router-dom'
import { useArtifacts } from '@/features/portfolio/hooks/useArtifacts'
import type { ArtifactType, ArtifactStatus } from '@/features/portfolio/types/portfolio'

// =============================================================================
// Types
// =============================================================================

/** Current page identifier */
export type CurrentPage = 'dashboard' | 'portfolio' | 'artifact' | 'profile' | 'settings'

/** Screen context payload for Content Agent */
export interface ScreenContextPayload {
  currentPage: CurrentPage
  artifactId?: string
  artifactType?: ArtifactType
  artifactTitle?: string
  artifactStatus?: ArtifactStatus
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Get current screen context for Content Agent
 *
 * Automatically detects:
 * - Current page from route
 * - Artifact details from URL params and query
 *
 * @returns Screen context payload
 *
 * @example
 * ```tsx
 * const screenContext = useScreenContext()
 * // On artifact page: { currentPage: 'artifact', artifactId: '123', artifactType: 'blog', ... }
 * // On portfolio page: { currentPage: 'portfolio' }
 * ```
 */
export function useScreenContext(): ScreenContextPayload {
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const { data: artifacts } = useArtifacts()

  // Determine current page from pathname
  const currentPage = getCurrentPage(location.pathname)

  // If on artifact page, get artifact details
  // Use params.id directly for artifactId (source of truth from URL)
  // Lookup artifact in cache for metadata fields (type, title, status)
  const artifactId = params.id
  const artifact = artifactId && artifacts
    ? artifacts.find(a => a.id === artifactId)
    : undefined

  return {
    currentPage,
    artifactId: artifactId, // Use URL param directly, not artifact?.id
    artifactType: artifact?.type,
    artifactTitle: artifact?.title || undefined,
    artifactStatus: artifact?.status,
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine current page from pathname
 */
function getCurrentPage(pathname: string): CurrentPage {
  if (pathname === '/') return 'dashboard'
  if (pathname === '/portfolio') return 'portfolio'
  if (pathname.startsWith('/portfolio/artifacts/')) return 'artifact'
  if (pathname === '/profile') return 'profile'
  if (pathname === '/settings') return 'settings'

  // Default fallback
  return 'dashboard'
}
