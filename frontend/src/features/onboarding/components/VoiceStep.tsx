/**
 * VoiceStep (Step 4 of 4)
 *
 * Writing references upload. Users add examples of their writing
 * so the AI can match their voice. Reuses hooks from the portfolio
 * writing-references feature.
 */

import { useNavigate, useSearchParams } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useWritingExamples } from '@/features/portfolio/hooks/useWritingExamples'
import { OnboardingReferenceUpload } from './OnboardingReferenceUpload'

export function VoiceStep() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const editParam = searchParams.get('edit') === 'true' ? '&edit=true' : ''

  const formData = useOnboardingWizardStore((s) => s.formData)
  const setStep = useOnboardingWizardStore((s) => s.setStep)
  const setNavigationDirection = useOnboardingWizardStore((s) => s.setNavigationDirection)
  const addedReferenceIds = useOnboardingWizardStore((s) => s.addedReferenceIds)

  const saveProgress = useSaveOnboardingProgress()
  const { data: examples } = useWritingExamples()

  const totalReferences = (examples?.length ?? 0)

  const handleNext = async () => {
    try {
      await saveProgress.mutateAsync({
        current_step: 5,
        step_data: formData as unknown as Record<string, unknown>,
      })
    } catch {
      toast({
        title: 'Could not save progress',
        description: 'Your data is preserved locally. You can continue.',
        variant: 'destructive',
      })
    }

    setNavigationDirection('forward')
    setStep(5)
    navigate(`/onboarding?step=5${editParam}`)
  }

  const handleBack = () => {
    setNavigationDirection('backward')
    setStep(3)
    navigate(`/onboarding?step=3${editParam}`, { replace: true })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Your Writing Voice</h1>
        <p className="text-muted-foreground mt-2">
          Add examples of your writing so AI can match your tone and style.
          This is optional but makes a big difference in content quality.
        </p>
      </div>

      <OnboardingReferenceUpload />

      {/* Reference count summary */}
      {totalReferences > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PenLine className="h-4 w-4" />
          <span>
            {totalReferences} writing {totalReferences === 1 ? 'reference' : 'references'} added
            {addedReferenceIds.length > 0 && ` (${addedReferenceIds.length} in this session)`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-6">
        <Button type="button" variant="outline" onClick={handleBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {totalReferences === 0 && (
            <button
              onClick={handleNext}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this step
            </button>
          )}
          <Button onClick={handleNext} disabled={saveProgress.isPending}>
            {saveProgress.isPending ? 'Saving...' : totalReferences > 0 ? 'Continue' : 'Continue without references'}
          </Button>
        </div>
      </div>
    </div>
  )
}
