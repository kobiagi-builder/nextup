/**
 * ProfileStep (Step 2 of 4)
 *
 * About Me + Profession fields with extraction waterfall reveal,
 * collapsed fields toggle, summary badge, and timeout/retry UI.
 */

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useOnboardingProgress, useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useExtractionWaterfall } from '../hooks/useExtractionWaterfall'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useExtractProfile } from '../hooks/useExtractProfile'
import { aboutMeSchema, professionSchema } from '../schemas/userContext'
import { OnboardingField } from './shared/OnboardingField'
import { ExtractionSummaryBadge } from './shared/ExtractionSummaryBadge'
import { CollapsedFieldsToggle } from './shared/CollapsedFieldsToggle'

const profileSchema = aboutMeSchema.merge(professionSchema)
type ProfileFormData = z.infer<typeof profileSchema>

// Fields visible in the main section (always rendered)
const VISIBLE_FIELD_KEYS = [
  'about_me.bio',
  'about_me.value_proposition',
  'about_me.years_experience',
  'profession.expertise_areas',
  'profession.industries',
]

// Fields behind the collapsed toggle
const COLLAPSED_FIELD_KEYS = [
  'profession.methodologies',
  'profession.certifications',
]

export function ProfileStep() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const reducedMotion = useReducedMotion()

  const formData = useOnboardingWizardStore((s) => s.formData)
  const extractionStatus = useOnboardingWizardStore((s) => s.extractionStatus)
  const fieldProvenance = useOnboardingWizardStore((s) => s.fieldProvenance)
  const updateField = useOnboardingWizardStore((s) => s.updateField)
  const applyExtractionResults = useOnboardingWizardStore((s) => s.applyExtractionResults)
  const setStep = useOnboardingWizardStore((s) => s.setStep)
  const setNavigationDirection = useOnboardingWizardStore((s) => s.setNavigationDirection)
  const setExtractionStatus = useOnboardingWizardStore((s) => s.setExtractionStatus)

  const { data: progress } = useOnboardingProgress()
  const saveProgress = useSaveOnboardingProgress()
  const extractProfile = useExtractProfile()

  const isExtracting = extractionStatus === 'extracting' || extractionStatus === 'submitted'
  const appliedRef = useRef(false)
  const [collapsedExpanded, setCollapsedExpanded] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // Waterfall reveal for visible fields
  const { entries, allRevealed } = useExtractionWaterfall(
    VISIBLE_FIELD_KEYS,
    extractionStatus === 'complete',
    200,
    reducedMotion
  )

  // Timeout: if extraction takes longer than 30s, show form
  useEffect(() => {
    if (!isExtracting) return
    const timer = setTimeout(() => {
      setExtractionStatus('timeout')
    }, 30_000)
    return () => clearTimeout(timer)
  }, [isExtracting, setExtractionStatus])

  // When extraction results arrive via polling, apply them
  useEffect(() => {
    if (
      progress?.extraction_results &&
      !progress.extraction_results.__error &&
      !appliedRef.current &&
      (extractionStatus === 'extracting' || extractionStatus === 'submitted')
    ) {
      appliedRef.current = true
      applyExtractionResults(progress.extraction_results)
    }
  }, [progress?.extraction_results, extractionStatus, applyExtractionResults])

  // Derived: count AI-extracted visible fields
  const foundCount = VISIBLE_FIELD_KEYS.filter(
    (k) => fieldProvenance[k] === 'ai'
  ).length
  const totalCount = VISIBLE_FIELD_KEYS.length

  // Derived: count collapsed fields with AI data
  const collapsedFieldsWithData = COLLAPSED_FIELD_KEYS.filter(
    (k) => fieldProvenance[k] === 'ai'
  ).length

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: formData.about_me.bio,
      background: formData.about_me.background,
      years_experience: formData.about_me.years_experience,
      value_proposition: formData.about_me.value_proposition,
      expertise_areas: formData.profession.expertise_areas,
      industries: formData.profession.industries,
      methodologies: formData.profession.methodologies,
      certifications: formData.profession.certifications,
    },
  })

  // Reset form when store formData changes (e.g., extraction results applied)
  const prevFormDataRef = useRef(formData)
  useEffect(() => {
    if (prevFormDataRef.current !== formData) {
      prevFormDataRef.current = formData
      reset({
        bio: formData.about_me.bio,
        background: formData.about_me.background,
        years_experience: formData.about_me.years_experience,
        value_proposition: formData.about_me.value_proposition,
        expertise_areas: formData.profession.expertise_areas,
        industries: formData.profession.industries,
        methodologies: formData.profession.methodologies,
        certifications: formData.profession.certifications,
      })
    }
  }, [formData, reset])

  const handleFieldChange = (section: 'about_me' | 'profession', field: string, value: unknown) => {
    updateField(section, field, value)
  }

  const handleRetryExtraction = async () => {
    setIsRetrying(true)
    const websiteUrl = useOnboardingWizardStore.getState().websiteUrl
    const linkedInUrl = useOnboardingWizardStore.getState().linkedInUrl
    try {
      setExtractionStatus('extracting')
      appliedRef.current = false
      await extractProfile.mutateAsync({
        websiteUrl: websiteUrl.trim() || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
      })
    } catch {
      setExtractionStatus('failed')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDismissTimeout = () => {
    setExtractionStatus('failed')
  }

  const handleNext = async (data: ProfileFormData) => {
    updateField('about_me', 'bio', data.bio)
    updateField('about_me', 'background', data.background)
    updateField('about_me', 'years_experience', data.years_experience)
    updateField('about_me', 'value_proposition', data.value_proposition)
    updateField('profession', 'expertise_areas', data.expertise_areas)
    updateField('profession', 'industries', data.industries)
    updateField('profession', 'methodologies', data.methodologies)
    updateField('profession', 'certifications', data.certifications)

    try {
      await saveProgress.mutateAsync({
        current_step: 3,
        step_data: {
          about_me: {
            bio: data.bio ?? '',
            background: data.background ?? '',
            years_experience: data.years_experience ?? null,
            value_proposition: data.value_proposition ?? '',
          },
          profession: {
            expertise_areas: data.expertise_areas ?? '',
            industries: data.industries ?? '',
            methodologies: data.methodologies ?? '',
            certifications: data.certifications ?? '',
          },
        } as Record<string, unknown>,
      })
    } catch {
      toast({
        title: 'Could not save progress',
        description: 'Your data is preserved locally. You can continue.',
        variant: 'destructive',
      })
    }

    setNavigationDirection('forward')
    setStep(3)
    navigate('/onboarding?step=3')
  }

  const handleBack = () => {
    setNavigationDirection('backward')
    setStep(1)
    navigate('/onboarding?step=1', { replace: true })
  }

  // Helper to get visibility from waterfall entries
  const isFieldVisible = (key: string) => {
    const entry = entries.find((e) => e.fieldKey === key)
    return entry ? entry.visible : true
  }

  if (isExtracting) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing your profile... This usually takes 10-15 seconds.
          </p>
        </div>
        <fieldset aria-busy="true">
          <div className="space-y-4">
            {VISIBLE_FIELD_KEYS.map((key) => (
              <OnboardingField
                key={key}
                label=""
                fieldKey={key}
                provenance={undefined}
                extractionStatus={extractionStatus}
                visible={false}
                skeletonType={key.includes('years') ? 'input' : 'textarea'}
              >
                <div />
              </OnboardingField>
            ))}
          </div>
        </fieldset>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Screen reader live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {allRevealed && `Profile data loaded. ${foundCount} of ${totalCount} fields extracted.`}
        {extractionStatus === 'timeout' && 'Profile extraction timed out. You can fill in the fields manually.'}
        {extractionStatus === 'failed' && 'Profile extraction was not successful. You can fill in the fields manually.'}
      </div>

      <div>
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          {extractionStatus === 'complete'
            ? "We've pre-filled what we could. Review and adjust anything that needs updating."
            : extractionStatus === 'timeout'
              ? 'Extraction is taking longer than expected. Fill in the fields manually for now.'
              : 'Tell us about yourself and your professional expertise.'}
        </p>
      </div>

      {/* Timeout/retry UI */}
      {extractionStatus === 'timeout' && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 onboarding-animate-fade-in">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Extraction is taking longer than expected
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The fields below are empty — fill them in manually, or try again.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryExtraction}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Try again'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissTimeout}
              >
                Fill in manually
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extraction summary badge */}
      {extractionStatus === 'complete' && (
        <ExtractionSummaryBadge
          found={foundCount}
          total={totalCount}
          collapsedWithData={collapsedFieldsWithData}
          visible={allRevealed}
        />
      )}

      <form onSubmit={handleSubmit(handleNext)} className="space-y-8">
        <fieldset aria-busy={false}>
          {/* About Me Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">About You</h2>

            <OnboardingField
              label="Bio"
              fieldKey="about_me.bio"
              provenance={fieldProvenance['about_me.bio']}
              extractionStatus={extractionStatus}
              visible={isFieldVisible('about_me.bio')}
            >
              <Textarea
                id="about_me.bio"
                rows={3}
                placeholder="Who you are and what you do professionally."
                {...register('bio')}
                onChange={(e) => {
                  register('bio').onChange(e)
                  handleFieldChange('about_me', 'bio', e.target.value)
                }}
              />
              {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
            </OnboardingField>

            <OnboardingField
              label="Value Proposition"
              fieldKey="about_me.value_proposition"
              provenance={fieldProvenance['about_me.value_proposition']}
              extractionStatus={extractionStatus}
              visible={isFieldVisible('about_me.value_proposition')}
            >
              <Textarea
                id="about_me.value_proposition"
                rows={2}
                placeholder="What unique value do you bring to clients?"
                {...register('value_proposition')}
                onChange={(e) => {
                  register('value_proposition').onChange(e)
                  handleFieldChange('about_me', 'value_proposition', e.target.value)
                }}
              />
              {errors.value_proposition && (
                <p className="text-sm text-destructive">{errors.value_proposition.message}</p>
              )}
            </OnboardingField>

            <OnboardingField
              label="Years of Experience"
              fieldKey="about_me.years_experience"
              provenance={fieldProvenance['about_me.years_experience']}
              extractionStatus={extractionStatus}
              visible={isFieldVisible('about_me.years_experience')}
              skeletonType="input"
            >
              <Input
                id="about_me.years_experience"
                type="number"
                min={0}
                max={50}
                className="w-24"
                {...register('years_experience', { valueAsNumber: true })}
                onChange={(e) => {
                  register('years_experience', { valueAsNumber: true }).onChange(e)
                  const val = e.target.value ? parseInt(e.target.value, 10) : null
                  handleFieldChange('about_me', 'years_experience', val)
                }}
              />
            </OnboardingField>
          </div>

          {/* Profession Section */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold">Expertise</h2>

            <OnboardingField
              label="Expertise Areas"
              fieldKey="profession.expertise_areas"
              provenance={fieldProvenance['profession.expertise_areas']}
              extractionStatus={extractionStatus}
              visible={isFieldVisible('profession.expertise_areas')}
            >
              <Textarea
                id="profession.expertise_areas"
                rows={3}
                placeholder="e.g., Product Strategy, User Research, Agile/Scrum"
                {...register('expertise_areas')}
                onChange={(e) => {
                  register('expertise_areas').onChange(e)
                  handleFieldChange('profession', 'expertise_areas', e.target.value)
                }}
              />
            </OnboardingField>

            <OnboardingField
              label="Industries"
              fieldKey="profession.industries"
              provenance={fieldProvenance['profession.industries']}
              extractionStatus={extractionStatus}
              visible={isFieldVisible('profession.industries')}
            >
              <Textarea
                id="profession.industries"
                rows={2}
                placeholder="e.g., SaaS / B2B Software, FinTech, Healthcare"
                {...register('industries')}
                onChange={(e) => {
                  register('industries').onChange(e)
                  handleFieldChange('profession', 'industries', e.target.value)
                }}
              />
            </OnboardingField>

            {/* Collapsed fields toggle */}
            <CollapsedFieldsToggle
              isExpanded={collapsedExpanded}
              onToggle={() => setCollapsedExpanded((prev) => !prev)}
              collapsedFieldsWithData={collapsedFieldsWithData}
            />

            {collapsedExpanded && (
              <div className="space-y-4 onboarding-animate-fade-up mt-4">
                <OnboardingField
                  label="Methodologies"
                  fieldKey="profession.methodologies"
                  provenance={fieldProvenance['profession.methodologies']}
                  extractionStatus={extractionStatus}
                  visible={true}
                >
                  <Textarea
                    id="profession.methodologies"
                    rows={2}
                    placeholder="e.g., Jobs-to-be-Done, Design Thinking, Lean Startup"
                    {...register('methodologies')}
                    onChange={(e) => {
                      register('methodologies').onChange(e)
                      handleFieldChange('profession', 'methodologies', e.target.value)
                    }}
                  />
                </OnboardingField>

                <OnboardingField
                  label="Certifications"
                  fieldKey="profession.certifications"
                  provenance={fieldProvenance['profession.certifications']}
                  extractionStatus={extractionStatus}
                  visible={true}
                >
                  <Textarea
                    id="profession.certifications"
                    rows={2}
                    placeholder="e.g., PMP, CSPO, AWS Solutions Architect"
                    {...register('certifications')}
                    onChange={(e) => {
                      register('certifications').onChange(e)
                      handleFieldChange('profession', 'certifications', e.target.value)
                    }}
                  />
                </OnboardingField>
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex items-center justify-between pt-6">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button type="submit" disabled={saveProgress.isPending}>
            {saveProgress.isPending ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  )
}
