/**
 * OnboardingPage
 *
 * Root page for the onboarding wizard. Reads ?step param,
 * hydrates the Zustand store from server progress, and renders WizardShell.
 * Redirects to /portfolio if onboarding is already completed.
 *
 * Edit mode (?edit=true): Pre-fills the wizard with existing UserContext data
 * and starts at the Profile step (step 2), allowing users to update their
 * profile through the onboarding flow.
 */

import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useUserContext } from '@/features/portfolio/hooks/useUserContext'
import { WizardShell } from '../components/WizardShell'
import type { OnboardingFormData } from '../types/onboarding'
import type { UserContext } from '@/features/portfolio/types/portfolio'

/** Convert existing UserContext to OnboardingFormData for pre-filling the wizard. */
function userContextToFormData(ctx: UserContext): Partial<OnboardingFormData> {
  return {
    about_me: {
      bio: ctx.about_me?.bio ?? '',
      background: ctx.about_me?.background ?? '',
      years_experience: ctx.about_me?.years_experience ?? null,
      value_proposition: ctx.about_me?.value_proposition ?? '',
    },
    profession: {
      expertise_areas: ctx.profession?.expertise_areas ?? '',
      industries: ctx.profession?.industries ?? '',
      methodologies: ctx.profession?.methodologies ?? '',
      certifications: ctx.profession?.certifications ?? '',
    },
    customers: {
      ideal_client: ctx.customers?.ideal_client ?? '',
      company_stage: ctx.customers?.company_stage ?? [],
      target_employee_min: ctx.customers?.target_employee_min ?? null,
      target_employee_max: ctx.customers?.target_employee_max ?? null,
      industry_verticals: ctx.customers?.industry_verticals ?? [],
    },
    goals: {
      content_goals: ctx.goals?.content_goals ?? '',
      business_goals: ctx.goals?.business_goals ?? '',
      priorities: ctx.goals?.priorities ?? [],
    },
  }
}

export function OnboardingPage() {
  const { data: progress, isLoading: progressLoading } = useOnboardingProgress()
  const { data: userContext, isLoading: contextLoading } = useUserContext()
  const [searchParams] = useSearchParams()
  const hydrateFromServer = useOnboardingWizardStore((s) => s.hydrateFromServer)
  const setStep = useOnboardingWizardStore((s) => s.setStep)
  const setExtractionStatus = useOnboardingWizardStore((s) => s.setExtractionStatus)

  const isEditMode = searchParams.get('edit') === 'true'

  // Hydrate store from server on first load
  useEffect(() => {
    if (isEditMode) {
      // Edit mode: hydrate from UserContext, start at step 2 (Profile)
      // Mark extraction as skipped so the store doesn't flip to 'extracting'
      if (userContext) {
        setExtractionStatus('skipped')
        const formData = userContextToFormData(userContext)
        hydrateFromServer(2, formData, null)
      }
    } else if (progress) {
      hydrateFromServer(
        progress.current_step,
        progress.step_data,
        progress.extraction_results
      )
    }
  }, [isEditMode ? userContext?.id : progress?.id]) // Only re-hydrate when the data changes

  // Sync ?step param to store (skip in edit mode — step is managed by wizard)
  useEffect(() => {
    if (isEditMode) return
    const stepParam = searchParams.get('step')
    if (stepParam !== null) {
      const step = parseInt(stepParam, 10)
      if (!isNaN(step) && step >= 0 && step <= 5) {
        setStep(step)
      }
    }
  }, [searchParams, isEditMode])

  const isLoading = isEditMode ? contextLoading : progressLoading

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Already completed — go to portfolio
  // But not if the user is on step 5 (completion screen with celebration)
  // And not in edit mode (user explicitly wants to re-edit)
  if (!isEditMode) {
    const stepParam = searchParams.get('step')
    if (progress?.completed_at && stepParam !== '5') {
      return <Navigate to="/portfolio" replace />
    }
  }

  return <WizardShell isEditMode={isEditMode} />
}
