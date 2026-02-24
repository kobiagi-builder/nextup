/**
 * User Context Form Component
 *
 * Multi-section form for user profile/context.
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  target_audience: z.string().max(2000).optional(),
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
      target_audience: data?.target_audience ?? '',
      ideal_client: data?.ideal_client ?? '',
      industries_served: data?.industries_served ?? [],
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="target_audience">Target Audience</Label>
        <Textarea
          id="target_audience"
          placeholder="Who do you create content for?"
          rows={3}
          {...register('target_audience')}
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
