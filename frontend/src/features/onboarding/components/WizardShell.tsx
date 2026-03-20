/**
 * WizardShell
 *
 * Step router + progress bar for the onboarding wizard.
 * Renders the correct step component based on currentStep from the store.
 * Step numbering: 0=Welcome, 1=Import, 2=Profile, 3=Market, 4=Voice, 5=Completion
 *
 * In edit mode (?edit=true from Profile page), skips Welcome/Import steps
 * and navigates back to /profile on skip/completion.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'
import { ProgressBar, STEP_LABELS } from './ProgressBar'
import { WizardLayout } from './WizardLayout'
import { SkipConfirmationDialog } from './shared/SkipConfirmationDialog'
import { WelcomeStep } from './steps/WelcomeStep'
import { ImportStep } from './ImportStep'
import { ProfileStep } from './ProfileStep'
import { MarketStep } from './MarketStep'
import { VoiceStep } from './VoiceStep'
import { CompletionStep } from './CompletionStep'

interface WizardShellProps {
  isEditMode?: boolean
}

export function WizardShell({ isEditMode = false }: WizardShellProps) {
  const currentStep = useOnboardingWizardStore((s) => s.currentStep)
  const navigate = useNavigate()
  const saveProgress = useSaveOnboardingProgress()

  const [skipDialogOpen, setSkipDialogOpen] = useState(false)

  const stepLabel = STEP_LABELS[currentStep] ?? null

  const handleSkipConfirm = async () => {
    setSkipDialogOpen(false)
    if (!isEditMode) {
      try {
        await saveProgress.mutateAsync({
          current_step: currentStep,
          completed_at: new Date().toISOString(),
        })
      } catch {
        // Non-blocking — navigate even if save fails
      }
    }
    navigate(isEditMode ? '/profile' : '/portfolio')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header with progress bar */}
        <div className="space-y-3 mb-10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {stepLabel && <span>{stepLabel}</span>}
            </div>
            {currentStep > 0 && currentStep < 5 && (
              <button
                type="button"
                onClick={() => setSkipDialogOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isEditMode ? 'Cancel' : 'Skip for now'}
              </button>
            )}
          </div>

          <ProgressBar stepIndex={currentStep} />
        </div>

        {/* Step content with transitions */}
        <WizardLayout
          currentStep={currentStep}
          skipDialogOpen={skipDialogOpen}
          onRequestSkip={() => setSkipDialogOpen(true)}
        >
          {currentStep === 0 && <WelcomeStep />}
          {currentStep === 1 && <ImportStep />}
          {currentStep === 2 && <ProfileStep />}
          {currentStep === 3 && <MarketStep />}
          {currentStep === 4 && <VoiceStep />}
          {currentStep === 5 && <CompletionStep isEditMode={isEditMode} />}
        </WizardLayout>

        {/* Skip confirmation dialog (shared between header link + Escape key) */}
        <SkipConfirmationDialog
          open={skipDialogOpen}
          onConfirm={handleSkipConfirm}
          onCancel={() => setSkipDialogOpen(false)}
        />
      </div>
    </div>
  )
}
