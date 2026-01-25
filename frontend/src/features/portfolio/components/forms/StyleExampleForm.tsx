/**
 * Style Example Form Component
 *
 * Form for adding writing samples.
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { StyleExample, CreateStyleExampleInput } from '../../types/portfolio'

// Form validation schema
const styleExampleSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
  content: z.string().min(50, 'Content must be at least 50 characters').max(5000, 'Content too long'),
})

type StyleExampleFormData = z.infer<typeof styleExampleSchema>

interface StyleExampleFormProps {
  example?: StyleExample
  onSubmit: (data: CreateStyleExampleInput) => void
  onCancel: () => void
  isLoading?: boolean
}

/**
 * Form for creating and editing style examples
 */
export function StyleExampleForm({
  example,
  onSubmit,
  onCancel,
  isLoading,
}: StyleExampleFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StyleExampleFormData>({
    resolver: zodResolver(styleExampleSchema),
    defaultValues: {
      label: example?.label ?? '',
      content: example?.content ?? '',
    },
  })

  const content = watch('content')
  const charCount = content?.length ?? 0

  const handleFormSubmit = (data: StyleExampleFormData) => {
    onSubmit({
      label: data.label,
      content: data.content,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          placeholder="e.g., LinkedIn Post, Blog Introduction..."
          {...register('label')}
          className={errors.label ? 'border-destructive' : ''}
        />
        {errors.label && (
          <p className="text-sm text-destructive">{errors.label.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Give this sample a descriptive name
        </p>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Writing Sample</Label>
        <Textarea
          id="content"
          placeholder="Paste a sample of your writing here..."
          rows={10}
          {...register('content')}
          className={errors.content ? 'border-destructive' : ''}
        />
        <div className="flex justify-between text-xs">
          <div>
            {errors.content ? (
              <span className="text-destructive">{errors.content.message}</span>
            ) : (
              <span className="text-muted-foreground">
                Minimum 50 characters for AI analysis
              </span>
            )}
          </div>
          <span className="text-muted-foreground">{charCount} / 5000</span>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-lg bg-muted/50 p-4 text-sm">
        <h4 className="font-medium mb-2">Tips for good writing samples</h4>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Include samples from different content types</li>
          <li>Choose pieces that represent your best work</li>
          <li>Include complete paragraphs, not just sentences</li>
          <li>Add 3-5 samples for best AI voice matching</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : example ? 'Update' : 'Add Sample'}
        </Button>
      </div>
    </form>
  )
}
