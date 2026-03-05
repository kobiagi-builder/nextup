/**
 * CompletionStep (Step 5 — Done)
 *
 * Celebration sequence: animated checkmark, confetti (lazy), staggered
 * entrance, personalized copy. On mount: saves formData to user_context
 * and marks onboarding complete.
 */

import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, PenLine, Target, PartyPopper, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useUpdateUserContext } from '@/features/portfolio/hooks/useUserContext'
import { useWritingExamples } from '@/features/portfolio/hooks/useWritingExamples'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { AnimatedCheckmark } from './shared/AnimatedCheckmark'

const ConfettiCelebration = React.lazy(
  () => import('./shared/ConfettiCelebration')
)

function useFirstName(): string {
  const { user } = useAuth()
  const formData = useOnboardingWizardStore((s) => s.formData)

  // 1. Try user_metadata.full_name (most reliable — comes from OAuth provider)
  const metaName = (user?.user_metadata?.full_name as string | undefined)?.trim().split(/\s+/)[0]
  if (metaName && metaName.length > 0) return metaName

  // 2. Try to extract first name from bio
  const bioFirstName = formData.about_me.bio
    ? formData.about_me.bio.trim().split(/\s+/)[0]
    : null
  const isLikelyName =
    bioFirstName &&
    bioFirstName.length > 1 &&
    bioFirstName.length < 20 &&
    /^[A-Z]/.test(bioFirstName)

  if (isLikelyName) return bioFirstName

  // 3. Fallback — skip email prefix (raw emails look impersonal on celebration screen)
  return 'there'
}

interface CompletionRowProps {
  icon: typeof Sparkles
  text: string
  done: boolean
  className?: string
  style?: React.CSSProperties
}

function CompletionRow({ icon: Icon, text, done, className, style }: CompletionRowProps) {
  return (
    <div className={cn('flex items-center gap-3', className)} style={style}>
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
          done ? 'bg-emerald-500/10' : 'bg-muted'
        )}
      >
        {done ? (
          <CheckCircle2
            className="h-4 w-4 text-emerald-500"
            aria-hidden="true"
          />
        ) : (
          <Icon
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>
      <span className={cn('text-sm', done ? 'text-foreground' : 'text-muted-foreground')}>
        {text}
      </span>
    </div>
  )
}

export function CompletionStep() {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const firstName = useFirstName()

  const formData = useOnboardingWizardStore((s) => s.formData)
  const reset = useOnboardingWizardStore((s) => s.reset)

  const saveProgress = useSaveOnboardingProgress()
  const updateUserContext = useUpdateUserContext()
  const { data: examples } = useWritingExamples()

  const savedRef = useRef(false)

  // Persist formData on mount
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true

    const persist = async () => {
      try {
        await updateUserContext.mutateAsync({
          about_me: {
            ...formData.about_me,
            years_experience: formData.about_me.years_experience ?? undefined,
          },
          profession: formData.profession,
          customers: formData.customers,
          goals: formData.goals,
        })
      } catch {
        // Non-blocking
      }

      try {
        await saveProgress.mutateAsync({
          completed_at: new Date().toISOString(),
          step_data: formData as unknown as Record<string, unknown>,
        })
      } catch {
        // Non-blocking
      }
    }

    persist()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoToPortfolio = () => {
    reset()
    navigate('/portfolio', { replace: true })
  }

  const referenceCount = examples?.length ?? 0
  const profileComplete = !!(formData.about_me.bio || formData.about_me.value_proposition)
  const goalsComplete = !!(formData.goals.content_goals || formData.goals.business_goals)

  const completionRows = [
    { icon: Sparkles, text: 'Profile complete', done: profileComplete },
    {
      icon: PenLine,
      text: `${referenceCount} writing sample${referenceCount !== 1 ? 's' : ''} added`,
      done: referenceCount > 0,
    },
    { icon: Target, text: 'Goals defined', done: goalsComplete },
  ]

  const d = (ms: number) => (reducedMotion ? undefined : { animationDelay: `${ms}ms` })

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-0 py-16 relative min-h-[calc(100vh-200px)]">
      {/* Confetti or reduced-motion fallback */}
      {!reducedMotion ? (
        <React.Suspense fallback={null}>
          <ConfettiCelebration active={true} />
        </React.Suspense>
      ) : (
        <PartyPopper
          className="absolute top-8 right-8 h-6 w-6 text-primary opacity-60"
          aria-hidden="true"
        />
      )}

      {/* Animated checkmark */}
      <AnimatedCheckmark
        className="h-16 w-16 text-emerald-500"
        reducedMotion={reducedMotion}
      />

      {/* Personalized subheadline */}
      <p
        className="text-base text-muted-foreground mt-6 onboarding-animate-fade-in"
        style={d(350)}
      >
        You're all set, {firstName}!
      </p>

      {/* Primary headline */}
      <h1
        className="text-[1.875rem] font-semibold tracking-tight mt-3 onboarding-animate-fade-up"
        style={d(400)}
      >
        Your profile is ready. Let's get to work.
      </h1>

      {/* Completion summary rows */}
      <div className="mt-10 space-y-3 text-left max-w-[380px] mx-auto w-full">
        {completionRows.map((row, i) => (
          <CompletionRow
            key={i}
            {...row}
            className="onboarding-animate-fade-up"
            style={d(700 + i * 100)}
          />
        ))}
      </div>

      {/* CTA */}
      <div
        className="mt-10 onboarding-animate-fade-up"
        style={d(1000)}
      >
        <Button size="lg" onClick={handleGoToPortfolio} className="gap-2">
          Go to my portfolio
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
