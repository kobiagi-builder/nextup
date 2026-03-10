/**
 * User Context Form Component
 *
 * Multi-section form for user profile/context.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TagsInput } from '@/features/portfolio/components/artifact/TagsInput'
import { ChipToggle } from '@/features/onboarding/components/shared/ChipToggle'
import type {
  UserContext,
  UpdateUserContextInput,
  AboutMe,
  Profession,
  Customers,
  Goals,
} from '../../types/portfolio'
import {
  aboutMeSchema,
  professionSchema,
  customersSchema,
  goalsSchema,
  COMPANY_STAGE_OPTIONS,
} from '@/features/onboarding/schemas/userContext'

type SectionType = 'about_me' | 'profession' | 'customers' | 'goals'

interface UserContextFormProps {
  section: SectionType
  context?: UserContext | null
  onSubmit: (data: UpdateUserContextInput) => void
  onCancel: () => void
  isLoading?: boolean
}

/**
 * About Me form section
 */
function AboutMeForm({
  data,
  onSubmit,
  onCancel,
  isLoading,
}: {
  data?: AboutMe
  onSubmit: (data: AboutMe) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(aboutMeSchema),
    defaultValues: {
      bio: data?.bio ?? '',
      background: data?.background ?? '',
      years_experience: data?.years_experience ?? null,
      value_proposition: data?.value_proposition ?? '',
    },
  })

  const handleFormSubmit = (formData: z.infer<typeof aboutMeSchema>) => {
    console.log('[AboutMeForm] handleFormSubmit called with:', formData)
    onSubmit({
      bio: formData.bio,
      background: formData.background,
      years_experience: formData.years_experience ?? undefined,
      value_proposition: formData.value_proposition,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Use bullet points (• or -) to organize your information.
      </p>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Who you are and what you do professionally. E.g.: Fractional CPO helping B2B SaaS startups build their first product org and go from founder-led sales to scalable growth."
          rows={3}
          {...register('bio')}
        />
        {errors.bio && (
          <p className="text-sm text-destructive">{errors.bio.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="value_proposition">Value Proposition</Label>
        <Textarea
          id="value_proposition"
          placeholder="What unique value do you bring?"
          rows={2}
          {...register('value_proposition')}
        />
        {errors.value_proposition && (
          <p className="text-sm text-destructive">{errors.value_proposition.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Profession form section
 */
function ProfessionForm({
  data,
  onSubmit,
  onCancel,
  isLoading,
}: {
  data?: Profession
  onSubmit: (data: Profession) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  console.log('[ProfessionForm] Rendering with data:', data)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(professionSchema),
    defaultValues: {
      expertise_areas: data?.expertise_areas ?? '',
      industries: data?.industries ?? '',
      methodologies: data?.methodologies ?? '',
      certifications: data?.certifications ?? '',
    },
  })

  const handleFormSubmit = (formData: z.infer<typeof professionSchema>) => {
    console.log('[ProfessionForm] handleFormSubmit called with:', formData)
    onSubmit({
      expertise_areas: formData.expertise_areas,
      industries: formData.industries,
      methodologies: formData.methodologies,
      certifications: formData.certifications,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Use bullet points (• or -) to list multiple items in each field.
      </p>

      <div className="space-y-2">
        <Label htmlFor="expertise_areas">Expertise Areas</Label>
        <Textarea
          id="expertise_areas"
          placeholder="• Product Strategy&#10;• User Research&#10;• Agile/Scrum"
          rows={3}
          {...register('expertise_areas')}
        />
        {errors.expertise_areas && (
          <p className="text-sm text-destructive">{errors.expertise_areas.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="industries">Industries</Label>
        <Textarea
          id="industries"
          placeholder="• SaaS / B2B Software&#10;• FinTech&#10;• Healthcare"
          rows={3}
          {...register('industries')}
        />
        {errors.industries && (
          <p className="text-sm text-destructive">{errors.industries.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Customers form section
 *
 * All 4 ICP fields stored in user_context.customers JSONB:
 * ideal_client, company_stage, employee range, industry_verticals.
 */
function CustomersForm({
  data,
  onSubmit,
  onCancel,
  isLoading,
}: {
  data?: Customers
  onSubmit: (data: Customers) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  const {
    register,
    handleSubmit,
  } = useForm({
    resolver: zodResolver(customersSchema),
    defaultValues: {
      ideal_client: data?.ideal_client ?? '',
      company_stage: data?.company_stage ?? [],
      target_employee_min: data?.target_employee_min ?? null,
      target_employee_max: data?.target_employee_max ?? null,
      industry_verticals: data?.industry_verticals ?? [],
    },
  })

  // Local state for fields managed outside react-hook-form
  const [companyStage, setCompanyStage] = useState<string[]>(data?.company_stage ?? [])
  const [industryVerticals, setIndustryVerticals] = useState<string[]>(data?.industry_verticals ?? [])
  const [employeeMin, setEmployeeMin] = useState(data?.target_employee_min?.toString() ?? '')
  const [employeeMax, setEmployeeMax] = useState(data?.target_employee_max?.toString() ?? '')

  const handleFormSubmit = (formData: z.infer<typeof customersSchema>) => {
    onSubmit({
      ideal_client: formData.ideal_client,
      company_stage: companyStage,
      target_employee_min: employeeMin ? parseInt(employeeMin, 10) : null,
      target_employee_max: employeeMax ? parseInt(employeeMax, 10) : null,
      industry_verticals: industryVerticals,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ideal_client">Ideal Customer Description</Label>
        <Textarea
          id="ideal_client"
          rows={3}
          placeholder="Describe your ideal client. e.g., Series A-C B2B SaaS companies with 50-200 employees looking to establish product-led growth."
          {...register('ideal_client')}
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
            const selected = companyStage.includes(option)
            return (
              <ChipToggle
                key={option}
                label={option}
                selected={selected}
                onToggle={() => {
                  setCompanyStage((prev) =>
                    selected ? prev.filter((v) => v !== option) : [...prev, option]
                  )
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
              value={employeeMin}
              onChange={(e) => setEmployeeMin(e.target.value)}
            />
          </div>
          <span className="text-muted-foreground text-sm">to</span>
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Max"
              min={0}
              value={employeeMax}
              onChange={(e) => setEmployeeMax(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Industry Verticals</Label>
        <TagsInput
          tags={industryVerticals}
          onChange={setIndustryVerticals}
          placeholder="Type an industry and press Enter (e.g., Fintech, Cyber, SaaS)"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Goals form section
 */
function GoalsForm({
  data,
  onSubmit,
  onCancel,
  isLoading,
}: {
  data?: Goals
  onSubmit: (data: Goals) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  const {
    register,
    handleSubmit,
  } = useForm({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      content_goals: data?.content_goals ?? '',
      business_goals: data?.business_goals ?? '',
      priorities: data?.priorities ?? [],
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="content_goals">Content Goals</Label>
        <Textarea
          id="content_goals"
          placeholder="What do you want to achieve with your content?"
          rows={3}
          {...register('content_goals')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Main user context form that renders the appropriate section
 */
export function UserContextForm({
  section,
  context,
  onSubmit,
  onCancel,
  isLoading,
}: UserContextFormProps) {
  const handleSectionSubmit = (data: AboutMe | Profession | Customers | Goals) => {
    console.log('[UserContextForm] handleSectionSubmit called with section:', section, 'data:', data)
    onSubmit({ [section]: data })
  }

  switch (section) {
    case 'about_me':
      return (
        <AboutMeForm
          data={context?.about_me}
          onSubmit={handleSectionSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )
    case 'profession':
      return (
        <ProfessionForm
          data={context?.profession}
          onSubmit={handleSectionSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )
    case 'customers':
      return (
        <CustomersForm
          data={context?.customers}
          onSubmit={handleSectionSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )
    case 'goals':
      return (
        <GoalsForm
          data={context?.goals}
          onSubmit={handleSectionSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )
    default:
      return null
  }
}
