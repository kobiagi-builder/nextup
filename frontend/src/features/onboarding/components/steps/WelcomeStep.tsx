/**
 * WelcomeStep (Step 0)
 *
 * 3-stage entrance animation with personalized copy and value props.
 * Extracted from WizardShell for separation of concerns.
 */

import { useNavigate } from 'react-router-dom'
import { Sparkles, Shield, PenLine, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useOnboardingWizardStore } from '../../stores/onboardingWizardStore'
import { useSaveOnboardingProgress } from '../../hooks/useOnboardingProgress'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { SkipConfirmationDialog } from '../shared/SkipConfirmationDialog'
import { useState } from 'react'

function ValuePropRow({ icon: Icon, text }: { icon: typeof Sparkles; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}

export function WelcomeStep() {
  const navigate = useNavigate()
  const setStep = useOnboardingWizardStore((s) => s.setStep)
  const setNavigationDirection = useOnboardingWizardStore((s) => s.setNavigationDirection)
  const saveProgress = useSaveOnboardingProgress()
  const reducedMotion = useReducedMotion()

  const [skipDialogOpen, setSkipDialogOpen] = useState(false)

  const delay = (ms: number) =>
    reducedMotion ? {} : { animationDelay: `${ms}ms` }

  const handleGetStarted = () => {
    setNavigationDirection('forward')
    setStep(1)
    navigate('/onboarding?step=1')
  }

  const handleSkipConfirm = async () => {
    setSkipDialogOpen(false)
    try {
      await saveProgress.mutateAsync({
        current_step: 0,
        completed_at: new Date().toISOString(),
      })
    } catch {
      // Non-blocking — navigate even if save fails
    }
    navigate('/portfolio')
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center text-center space-y-0 py-16 min-h-[calc(100vh-200px)]">
        {/* Stage 1: Icon + Headline (0ms) */}
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 onboarding-animate-scale-in"
          style={delay(0)}
        >
          <Sparkles className="h-7 w-7 text-primary" />
        </div>

        <h1
          className={cn(
            'text-[1.875rem] font-semibold tracking-tight mt-8 onboarding-animate-fade-up'
          )}
          style={delay(0)}
        >
          We'll personalize NextUp to how you work
        </h1>

        {/* Stage 2: Subtitle + Time badge (150ms) */}
        <p
          className="text-base text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed onboarding-animate-fade-up"
          style={delay(150)}
        >
          AI extracts what it can from your profiles — you refine and confirm.
        </p>

        <div
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground onboarding-animate-fade-in"
          style={delay(150)}
        >
          <Clock className="h-4 w-4" />
          Under 3 minutes to set up your profile
        </div>

        {/* Stage 3: Value props + CTA (300ms) */}
        <div
          className="mt-10 space-y-3 text-left max-w-[380px] mx-auto onboarding-animate-fade-up"
          style={delay(300)}
        >
          <ValuePropRow icon={Sparkles} text="AI-powered profile extraction" />
          <ValuePropRow icon={Shield} text="Your data stays private and secure" />
          <ValuePropRow icon={PenLine} text="Content tailored to your voice" />
        </div>

        <div
          className="mt-10 onboarding-animate-fade-up"
          style={delay(300)}
        >
          <Button
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={handleGetStarted}
          >
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground mt-3 block mx-auto transition-colors duration-150"
            onClick={() => setSkipDialogOpen(true)}
          >
            Skip setup for now
          </button>
        </div>
      </div>

      <SkipConfirmationDialog
        open={skipDialogOpen}
        onConfirm={handleSkipConfirm}
        onCancel={() => setSkipDialogOpen(false)}
      />
    </>
  )
}
