/**
 * WizardLayout
 *
 * Step transition wrapper with directional animations.
 * key={animationKey} forces React remount for CSS animation replay.
 * Also provides offline banner and Escape key handler.
 */

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useConnectionStatus } from '@/hooks/use-connection-status'

interface WizardLayoutProps {
  currentStep: number
  skipDialogOpen: boolean
  onRequestSkip: () => void
  children: React.ReactNode
}

export function WizardLayout({ currentStep, skipDialogOpen, onRequestSkip, children }: WizardLayoutProps) {
  const direction = useOnboardingWizardStore((s) => s.navigationDirection)
  const [animationKey, setAnimationKey] = useState(currentStep)
  const reducedMotion = useReducedMotion()

  const connectionStatus = useConnectionStatus()
  const isOffline = connectionStatus.state === 'api_down'

  useEffect(() => {
    setAnimationKey(currentStep)
  }, [currentStep])

  // Escape key opens skip dialog on productive steps (1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !skipDialogOpen && currentStep > 0 && currentStep < 5) {
        onRequestSkip()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, skipDialogOpen, onRequestSkip])

  const animationClass = reducedMotion
    ? 'opacity-100'
    : direction === 'backward'
      ? '[animation:onboarding-step-enter-backward_250ms_cubic-bezier(0.16,1,0.3,1)_both]'
      : '[animation:onboarding-step-enter-forward_250ms_cubic-bezier(0.16,1,0.3,1)_both]'

  return (
    <>
      {/* Offline banner */}
      {isOffline && (
        <div
          className="mx-auto max-w-2xl px-4 mb-2 onboarding-animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm text-amber-600 dark:text-amber-400">
            <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              You're offline. Your progress is saved — keep filling in what you know.
            </span>
          </div>
        </div>
      )}

      {/* Animated step container */}
      <div key={animationKey} className={animationClass}>
        {children}
      </div>
    </>
  )
}
