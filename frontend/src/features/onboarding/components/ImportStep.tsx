/**
 * ImportStep (Step 1 of 4)
 *
 * URL input for website + LinkedIn. "Paste" tab as fallback.
 * Extract fires the mutation and immediately navigates to Step 2.
 * Skip navigates to Step 2 with extractionStatus: 'skipped'.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Linkedin, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useExtractProfile } from '../hooks/useExtractProfile'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'

export function ImportStep() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const websiteUrl = useOnboardingWizardStore((s) => s.websiteUrl)
  const linkedInUrl = useOnboardingWizardStore((s) => s.linkedInUrl)
  const setWebsiteUrl = useOnboardingWizardStore((s) => s.setWebsiteUrl)
  const setLinkedInUrl = useOnboardingWizardStore((s) => s.setLinkedInUrl)
  const setExtractionStatus = useOnboardingWizardStore((s) => s.setExtractionStatus)
  const setStep = useOnboardingWizardStore((s) => s.setStep)
  const setNavigationDirection = useOnboardingWizardStore((s) => s.setNavigationDirection)

  const extractProfile = useExtractProfile()
  const saveProgress = useSaveOnboardingProgress()

  const [pasteText, setPasteText] = useState('')
  const [activeTab, setActiveTab] = useState('urls')

  const hasAnyInput = websiteUrl.trim() || linkedInUrl.trim()

  const isDuplicateUrl =
    linkedInUrl.trim() !== '' &&
    websiteUrl.trim() !== '' &&
    linkedInUrl.trim() === websiteUrl.trim()

  const handleExtract = async () => {
    if (!hasAnyInput) {
      toast({
        title: 'Enter a URL',
        description: 'Please enter at least one URL to extract your profile from.',
        variant: 'destructive',
      })
      return
    }

    try {
      await extractProfile.mutateAsync({
        websiteUrl: websiteUrl.trim() || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
      })

      // Save step progress
      await saveProgress.mutateAsync({ current_step: 2 })

      // Navigate immediately — Step 2 shows skeletons while extraction runs
      setNavigationDirection('forward')
      setStep(2)
      navigate('/onboarding?step=2')
    } catch {
      toast({
        title: 'Extraction failed',
        description: 'Could not start extraction. You can still fill in your profile manually.',
        variant: 'destructive',
      })
      // Navigate to Step 2 anyway so user can fill manually
      setNavigationDirection('forward')
      setStep(2)
      navigate('/onboarding?step=2')
    }
  }

  const handlePasteExtract = async () => {
    if (!pasteText.trim()) return

    try {
      await extractProfile.mutateAsync({
        pastedText: pasteText.trim(),
      })

      await saveProgress.mutateAsync({ current_step: 2 })

      setNavigationDirection('forward')
      setStep(2)
      navigate('/onboarding?step=2')
    } catch {
      setNavigationDirection('forward')
      setStep(2)
      navigate('/onboarding?step=2')
    }
  }

  const handleSkipImport = async () => {
    setExtractionStatus('skipped')

    try {
      await saveProgress.mutateAsync({ current_step: 2 })
    } catch {
      // Non-blocking
    }

    setNavigationDirection('forward')
    setStep(2)
    navigate('/onboarding?step=2')
  }

  const handleBack = () => {
    setNavigationDirection('backward')
    setStep(0)
    navigate('/onboarding?step=0', { replace: true })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Import Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          Share your website or LinkedIn so we can pre-fill your profile fields. This saves you from typing everything manually.
        </p>
      </div>

      <Tabs defaultValue="urls" className="w-full" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="urls">Website & LinkedIn</TabsTrigger>
          <TabsTrigger value="paste">Paste Text</TabsTrigger>
        </TabsList>

        <TabsContent value="urls" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="website-url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website URL
            </Label>
            <Input
              id="website-url"
              type="url"
              placeholder="https://yoursite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin-url" className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn Profile URL
            </Label>
            <Input
              id="linkedin-url"
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
            />
          </div>

          {isDuplicateUrl && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1.5 onboarding-animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              Both URLs are the same — we'll use it once for extraction.
            </p>
          )}

        </TabsContent>

        <TabsContent value="paste" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="paste-text">Paste your LinkedIn bio or about section</Label>
            <Textarea
              id="paste-text"
              rows={8}
              placeholder="Paste the text from your LinkedIn About section, bio, or any professional description..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Unified bottom navigation — matches Back/Continue pattern on Steps 2-4 */}
      <div className="flex items-center justify-between pt-6">
        <Button type="button" variant="outline" onClick={handleBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSkipImport}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip this step
          </button>
          <Button
            onClick={activeTab === 'paste' ? handlePasteExtract : handleExtract}
            disabled={
              (activeTab === 'paste' ? !pasteText.trim() : !hasAnyInput) ||
              extractProfile.isPending
            }
          >
            {extractProfile.isPending ? 'Starting...' : 'Extract Profile'}
          </Button>
        </div>
      </div>
    </div>
  )
}
