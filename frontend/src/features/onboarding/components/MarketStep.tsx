/**
 * MarketStep (Step 3 of 4)
 *
 * Customers + Goals fields. Same pattern as ProfileStep.
 */

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Target, Megaphone, Users, Mic, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { TagsInput } from '@/features/portfolio/components/artifact/TagsInput'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'
import { customersSchema, goalsSchema, COMPANY_STAGE_OPTIONS } from '../schemas/userContext'
import { ChipToggle } from './shared/ChipToggle'

const PRIORITY_OPTIONS = [
  { value: 'thought_leadership', label: 'Thought Leadership', icon: BookOpen },
  { value: 'lead_generation', label: 'Lead Generation', icon: Target },
  { value: 'brand_awareness', label: 'Brand Awareness', icon: Megaphone },
  { value: 'client_retention', label: 'Client Retention', icon: Users },
  { value: 'speaking', label: 'Speaking Opportunities', icon: Mic },
  { value: 'community', label: 'Community Building', icon: MessageCircle },
] as const

const marketSchema = customersSchema.merge(goalsSchema)
type MarketFormData = z.infer<typeof marketSchema>

export function MarketStep() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const editParam = searchParams.get('edit') === 'true' ? '&edit=true' : ''

  const formData = useOnboardingWizardStore((s) => s.formData)
  const updateField = useOnboardingWizardStore((s) => s.updateField)
  const setStep = useOnboardingWizardStore((s) => s.setStep)
  const setNavigationDirection = useOnboardingWizardStore((s) => s.setNavigationDirection)

  const saveProgress = useSaveOnboardingProgress()

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<MarketFormData>({
    resolver: zodResolver(marketSchema),
    defaultValues: {
      ideal_client: formData.customers.ideal_client,
      company_stage: formData.customers.company_stage,
      target_employee_min: formData.customers.target_employee_min,
      target_employee_max: formData.customers.target_employee_max,
      industry_verticals: formData.customers.industry_verticals,
      content_goals: formData.goals.content_goals,
      business_goals: formData.goals.business_goals,
      priorities: formData.goals.priorities,
    },
  })

  // Reset form when store formData changes
  const prevFormDataRef = useRef(formData)
  useEffect(() => {
    if (prevFormDataRef.current !== formData) {
      prevFormDataRef.current = formData
      reset({
        ideal_client: formData.customers.ideal_client,
        company_stage: formData.customers.company_stage,
        target_employee_min: formData.customers.target_employee_min,
        target_employee_max: formData.customers.target_employee_max,
        industry_verticals: formData.customers.industry_verticals,
        content_goals: formData.goals.content_goals,
        business_goals: formData.goals.business_goals,
        priorities: formData.goals.priorities,
      })
    }
  }, [formData, reset])

  const handleFieldChange = (section: 'customers' | 'goals', field: string, value: unknown) => {
    updateField(section, field, value)
  }

  const handleNext = async (data: MarketFormData) => {
    updateField('customers', 'ideal_client', data.ideal_client)
    updateField('customers', 'company_stage', data.company_stage)
    updateField('customers', 'target_employee_min', data.target_employee_min)
    updateField('customers', 'target_employee_max', data.target_employee_max)
    updateField('customers', 'industry_verticals', data.industry_verticals)
    updateField('goals', 'content_goals', data.content_goals)
    updateField('goals', 'business_goals', data.business_goals)
    updateField('goals', 'priorities', data.priorities)

    try {
      await saveProgress.mutateAsync({
        current_step: 4,
        step_data: {
          ...formData,
          customers: {
            ideal_client: data.ideal_client ?? '',
            company_stage: data.company_stage ?? [],
            target_employee_min: data.target_employee_min ?? null,
            target_employee_max: data.target_employee_max ?? null,
            industry_verticals: data.industry_verticals ?? [],
          },
          goals: {
            content_goals: data.content_goals ?? '',
            business_goals: data.business_goals ?? '',
            priorities: data.priorities ?? [],
          },
        } as unknown as Record<string, unknown>,
      })
    } catch {
      toast({
        title: 'Could not save progress',
        description: 'Your data is preserved locally. You can continue.',
        variant: 'destructive',
      })
    }

    setNavigationDirection('forward')
    setStep(4)
    navigate(`/onboarding?step=4${editParam}`)
  }

  const handleBack = () => {
    setNavigationDirection('backward')
    setStep(2)
    navigate(`/onboarding?step=2${editParam}`, { replace: true })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Your Market</h1>
        <p className="text-muted-foreground mt-2">
          Tell us about your target audience and content goals so AI can tailor content to your market.
        </p>
      </div>

      <form onSubmit={handleSubmit(handleNext)} className="space-y-8">
        {/* Customers Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Target Audience</h2>

          <div className="space-y-2">
            <Label htmlFor="ideal_client">Ideal Customer Description</Label>
            <Textarea
              id="ideal_client"
              rows={3}
              placeholder="Describe your ideal client. e.g., Series A-C B2B SaaS companies with 50-200 employees looking to establish product-led growth."
              {...register('ideal_client')}
              onChange={(e) => {
                register('ideal_client').onChange(e)
                handleFieldChange('customers', 'ideal_client', e.target.value)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label id="company-stage-label">Company Stage</Label>
            <p className="text-xs text-muted-foreground -mt-1">Select all that apply</p>
            <div
              role="group"
              aria-labelledby="company-stage-label"
              className="flex flex-wrap gap-2"
            >
              {COMPANY_STAGE_OPTIONS.map((option) => {
                const selected = (formData.customers.company_stage ?? []).includes(option)
                return (
                  <ChipToggle
                    key={option}
                    label={option}
                    selected={selected}
                    onToggle={() => {
                      const current = formData.customers.company_stage ?? []
                      const next = selected
                        ? current.filter((v) => v !== option)
                        : [...current, option]
                      handleFieldChange('customers', 'company_stage', next)
                    }}
                  />
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Number of Employees</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={formData.customers.target_employee_min ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                    handleFieldChange('customers', 'target_employee_min', isNaN(val as number) ? null : val)
                  }}
                />
              </div>
              <span className="text-muted-foreground text-sm">to</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={formData.customers.target_employee_max ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                    handleFieldChange('customers', 'target_employee_max', isNaN(val as number) ? null : val)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Industry Verticals</Label>
            <TagsInput
              tags={formData.customers.industry_verticals ?? []}
              onChange={(tags) => handleFieldChange('customers', 'industry_verticals', tags)}
              placeholder="Type an industry and press Enter (e.g., Fintech, Cyber, SaaS)"
            />
          </div>
        </div>

        {/* Goals Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Content Goals</h2>

          <div className="space-y-2">
            <Label htmlFor="content_goals">What do you want to achieve with your content?</Label>
            <Textarea
              id="content_goals"
              rows={3}
              placeholder="e.g., Establish thought leadership in product strategy, attract inbound consulting leads, build a newsletter audience."
              {...register('content_goals')}
              onChange={(e) => {
                register('content_goals').onChange(e)
                handleFieldChange('goals', 'content_goals', e.target.value)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_goals">Business Goals</Label>
            <Textarea
              id="business_goals"
              rows={3}
              placeholder="e.g., Land 3 new retainer clients per quarter, grow LinkedIn to 10K followers, launch a paid course."
              {...register('business_goals')}
              onChange={(e) => {
                register('business_goals').onChange(e)
                handleFieldChange('goals', 'business_goals', e.target.value)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label id="priorities-label">Content Priorities</Label>
            <p className="text-xs text-muted-foreground -mt-1">Select all that apply</p>
            <div
              role="group"
              aria-labelledby="priorities-label"
              className="flex flex-wrap gap-2"
            >
              {PRIORITY_OPTIONS.map((option) => {
                const selected = (formData.goals.priorities ?? []).includes(option.value)
                return (
                  <ChipToggle
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    selected={selected}
                    onToggle={() => {
                      const current = formData.goals.priorities ?? []
                      const next = selected
                        ? current.filter((v) => v !== option.value)
                        : [...current, option.value]
                      handleFieldChange('goals', 'priorities', next)
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>

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
