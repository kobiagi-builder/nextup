/**
 * OnboardingPage
 *
 * Root page for the onboarding wizard. Reads ?step param,
 * hydrates the Zustand store from server progress, and renders WizardShell.
 * Redirects to /portfolio if onboarding is already completed.
 */

import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { WizardShell } from '../components/WizardShell'

export function OnboardingPage() {
  const { data: progress, isLoading } = useOnboardingProgress()
  const [searchParams] = useSearchParams()
  const hydrateFromServer = useOnboardingWizardStore((s) => s.hydrateFromServer)
  const setStep = useOnboardingWizardStore((s) => s.setStep)

  // Hydrate store from server on first load
  useEffect(() => {
    if (progress) {
      hydrateFromServer(
        progress.current_step,
        progress.step_data,
        progress.extraction_results
      )
    }
  }, [progress?.id]) // Only re-hydrate when the row itself changes

  // Sync ?step param to store
  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam !== null) {
      const step = parseInt(stepParam, 10)
      if (!isNaN(step) && step >= 0 && step <= 5) {
        setStep(step)
      }
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Already completed — go to portfolio
  // But not if the user is on step 5 (completion screen with celebration)
  const stepParam = searchParams.get('step')
  if (progress?.completed_at && stepParam !== '5') {
    return <Navigate to="/portfolio" replace />
  }

  return <WizardShell />
}
