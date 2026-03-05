/**
 * OnboardingGate
 *
 * Route guard that sits between ProtectedRoute and AppShell.
 * Redirects users who haven't completed onboarding to /onboarding.
 * Fails open on error — network issues never lock out existing users.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useOnboardingProgress } from '@/features/onboarding/hooks/useOnboardingProgress'
import { Spinner } from '@/components/ui/spinner'

export function OnboardingGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { data: progress, isLoading, isError } = useOnboardingProgress()
  const location = useLocation()

  // Show branded interstitial while loading
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-accent">
          <span className="text-white font-bold text-lg">NU</span>
        </div>
        <p className="text-lg font-semibold text-foreground">Setting up your workspace...</p>
        <Spinner size="md" />
      </div>
    )
  }

  // Fail open on error — never lock out existing users
  if (isError) {
    return <>{children}</>
  }

  // New user (no row) or incomplete onboarding → redirect to wizard
  if (progress === null || (progress && !progress.completed_at)) {
    // Don't redirect if already on /onboarding (prevents infinite loop)
    if (!location.pathname.startsWith('/onboarding')) {
      return <Navigate to="/onboarding" replace />
    }
  }

  // Completed onboarding or existing user → render app
  return <>{children}</>
}
