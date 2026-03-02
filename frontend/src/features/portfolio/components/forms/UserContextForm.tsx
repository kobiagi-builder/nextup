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
import { toast } from '@/hooks/use-toast'
import { TagsInput } from '@/features/portfolio/components/artifact/TagsInput'
import { useIcpSettings, useUpsertIcpSettings } from '@/features/customers/hooks/useIcpSettings'
import type { IcpSettingsInput } from '@/features/customers/types'
import type {
  UserContext,
  UpdateUserContextInput,
  AboutMe,
  Profession,
  Customers,
  Goals,
} from '../../types/portfolio'

// Section schemas
const aboutMeSchema = z.object({
  bio: z.string().max(1000).optional(),
  background: z.string().max(5000).optional(),
  years_experience: z.number().min(0).max(50).optional().nullable(),
  value_proposition: z.string().max(500).optional(),
})

const professionSchema = z.object({
  expertise_areas: z.string().max(2000).optional(),
  industries: z.string().max(2000).optional(),
  methodologies: z.string().max(2000).optional(),
  certifications: z.string().max(2000).optional(),
})

const customersSchema = z.object({
  ideal_client: z.string().max(2000).optional(),
  industries_served: z.array(z.string()).optional(),
})

const goalsSchema = z.object({
  content_goals: z.string().max(2000).optional(),
  business_goals: z.string().max(2000).optional(),
  priorities: z.array(z.string()).optional(),
})

type SectionType = 'about_me' | 'profession' | 'customers' | 'goals'

interface UserContextFormProps {
  section: SectionType
  context?: UserContext | null
  onSubmit: (data: UpdateUserContextInput) => void
  onCancel: () => void
  isLoading?: boolean
  showIcp?: boolean
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
 * When showIcp is true, includes ICP Profile fields (employee range,
 * industries, specialties, description) with a coordinated save that
 * persists both user-context and ICP settings.
 */
function CustomersForm({
  data,
  onSubmit,
  onCancel,
  isLoading,
  showIcp,
}: {
  data?: Customers
  onSubmit: (data: Customers) => void
  onCancel: () => void
  isLoading?: boolean
  showIcp?: boolean
}) {
  const {
    handleSubmit,
  } = useForm({
    resolver: zodResolver(customersSchema),
    defaultValues: {
      ideal_client: data?.ideal_client ?? '',
      industries_served: data?.industries_served ?? [],
    },
  })

  // ICP hooks — always called (React rules), data ignored when showIcp=false
  const { data: icpSettings } = useIcpSettings()
  const upsertIcp = useUpsertIcpSettings()

  // Initialize ICP state from cached settings (fixes empty-modal bug)
  const [employeeMin, setEmployeeMin] = useState(icpSettings?.target_employee_min?.toString() ?? '')
  const [employeeMax, setEmployeeMax] = useState(icpSettings?.target_employee_max?.toString() ?? '')
  const [industries, setIndustries] = useState<string[]>(icpSettings?.target_industries ?? [])
  const [specialties, setSpecialties] = useState<string[]>(icpSettings?.target_specialties ?? [])
  const [icpDescription, setIcpDescription] = useState(icpSettings?.description ?? '')

  // Sync ICP form state when settings load after mount (React-recommended render-time pattern)
  const [prevIcpSettings, setPrevIcpSettings] = useState(icpSettings)
  if (icpSettings !== prevIcpSettings) {
    setPrevIcpSettings(icpSettings)
    setEmployeeMin(icpSettings?.target_employee_min?.toString() ?? '')
    setEmployeeMax(icpSettings?.target_employee_max?.toString() ?? '')
    setIndustries(icpSettings?.target_industries ?? [])
    setSpecialties(icpSettings?.target_specialties ?? [])
    setIcpDescription(icpSettings?.description ?? '')
  }

  const handleFormSubmit = async (formData: z.infer<typeof customersSchema>) => {
    // Save ICP settings first when enabled
    if (showIcp) {
      const input: IcpSettingsInput = {
        target_employee_min: employeeMin ? parseInt(employeeMin, 10) : null,
        target_employee_max: employeeMax ? parseInt(employeeMax, 10) : null,
        target_industries: industries,
        target_specialties: specialties,
        description: icpDescription,
      }
      try {
        await upsertIcp.mutateAsync(input)
      } catch {
        toast({ title: 'Failed to save ICP settings', variant: 'destructive' })
        return
      }
    }
    // Then save user context (parent closes dialog)
    onSubmit(formData as Customers)
  }

  const isSaving = isLoading || upsertIcp.isPending

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {showIcp && (
        <>
          <div>
            <h3 className="text-sm font-medium text-foreground">ICP Profile</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Define your ideal customer profile for automated scoring.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Target Employee Count</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Min"
                value={employeeMin}
                onChange={(e) => setEmployeeMin(e.target.value)}
                min={0}
                className="w-28"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={employeeMax}
                onChange={(e) => setEmployeeMax(e.target.value)}
                min={0}
                className="w-28"
              />
              <span className="text-muted-foreground text-xs">employees</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Industries</Label>
            <TagsInput
              tags={industries}
              onChange={setIndustries}
              placeholder="Add industries (e.g., SaaS, Fintech)..."
            />
          </div>

          <div className="space-y-2">
            <Label>Target Specialties</Label>
            <TagsInput
              tags={specialties}
              onChange={setSpecialties}
              placeholder="Add specialties (e.g., AI, Enterprise, B2B)..."
            />
          </div>

          <div className="space-y-2">
            <Label>ICP Description</Label>
            <Textarea
              value={icpDescription}
              onChange={(e) => setIcpDescription(e.target.value)}
              placeholder="Describe your ideal customer in free text. This is used for qualitative AI scoring..."
              rows={3}
              className="resize-none"
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
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
  showIcp,
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
          showIcp={showIcp}
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
