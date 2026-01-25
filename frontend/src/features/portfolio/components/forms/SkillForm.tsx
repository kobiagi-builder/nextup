/**
 * Skill Form Component
 *
 * Form for creating and editing skills.
 */

import { useForm } from 'react-hook-form'
import { Package, Code, Users, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Skill, SkillCategory, ProficiencyLevel, CreateSkillInput } from '../../types/portfolio'

// Form data type
interface SkillFormData {
  name: string
  category: SkillCategory
  proficiency: number
  years_experience?: number | null
}

interface SkillFormProps {
  skill?: Skill
  onSubmit: (data: CreateSkillInput) => void
  onCancel: () => void
  isLoading?: boolean
}

/** Category options */
const CATEGORIES: { value: SkillCategory; label: string; icon: React.ElementType }[] = [
  { value: 'product', label: 'Product', icon: Package },
  { value: 'technical', label: 'Technical', icon: Code },
  { value: 'leadership', label: 'Leadership', icon: Users },
  { value: 'industry', label: 'Industry', icon: Building },
]

/** Proficiency options */
const PROFICIENCIES: { value: ProficiencyLevel; label: string }[] = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Basic' },
  { value: 3, label: 'Intermediate' },
  { value: 4, label: 'Advanced' },
  { value: 5, label: 'Expert' },
]

/**
 * Form for creating and editing skills
 */
export function SkillForm({
  skill,
  onSubmit,
  onCancel,
  isLoading,
}: SkillFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SkillFormData>({
    defaultValues: {
      name: skill?.name ?? '',
      category: skill?.category ?? 'product',
      proficiency: skill?.proficiency ?? 3,
      years_experience: skill?.years_experience ?? null,
    },
  })

  const selectedCategory = watch('category')
  const selectedProficiency = watch('proficiency')

  const handleFormSubmit = (data: SkillFormData) => {
    onSubmit({
      name: data.name,
      category: data.category,
      proficiency: data.proficiency as ProficiencyLevel,
      years_experience: data.years_experience ?? undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Skill Name</Label>
        <Input
          id="name"
          placeholder="e.g., Product Strategy, Python, Team Building..."
          {...register('name')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={selectedCategory}
          onValueChange={(value: string) => setValue('category', value as SkillCategory)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent data-portal-ignore-click-outside>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Proficiency */}
      <div className="space-y-2">
        <Label>Proficiency Level</Label>
        <Select
          value={String(selectedProficiency)}
          onValueChange={(value: string) => setValue('proficiency', Number(value) as ProficiencyLevel)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent data-portal-ignore-click-outside>
            {PROFICIENCIES.map((prof) => (
              <SelectItem key={prof.value} value={String(prof.value)}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i <= prof.value ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  {prof.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Years of Experience */}
      <div className="space-y-2">
        <Label htmlFor="years_experience">Years of Experience (optional)</Label>
        <Input
          id="years_experience"
          type="number"
          min={0}
          max={50}
          placeholder="e.g., 5"
          {...register('years_experience', {
            setValueAs: (v) => (v === '' ? null : Number(v)),
          })}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : skill ? 'Update' : 'Add Skill'}
        </Button>
      </div>
    </form>
  )
}
