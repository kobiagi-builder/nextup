import { Navigate } from 'react-router-dom'
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import type { ReactNode } from 'react'

interface FeatureGateProps {
  feature: string
  children: ReactNode
  fallback?: string
}

/**
 * Guards a route behind a feature flag.
 * Redirects to fallback path (default: /portfolio) if the feature is not enabled.
 * Shows nothing while loading to avoid flash of wrong content.
 */
export function FeatureGate({ feature, children, fallback = '/portfolio' }: FeatureGateProps) {
  const { isEnabled, isLoading } = useFeatureFlag(feature)

  if (isLoading) return null

  if (!isEnabled) return <Navigate to={fallback} replace />

  return <>{children}</>
}
