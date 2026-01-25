/**
 * Artifact Form Component
 *
 * Form for creating and editing artifacts.
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, MessageSquare, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Artifact, ArtifactType, CreateArtifactInput } from '../../types/portfolio'

// Form validation schema
const artifactSchema = z.object({
  type: z.enum(['social_post', 'blog', 'showcase']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

type ArtifactFormData = z.infer<typeof artifactSchema>

interface ArtifactFormProps {
  artifact?: Artifact
  onSubmit: (data: CreateArtifactInput) => void
  onCancel: () => void
  isLoading?: boolean
}

/** Artifact type options */
const ARTIFACT_TYPES: { value: ArtifactType; label: string; icon: React.ElementType }[] = [
  { value: 'social_post', label: 'Social Post', icon: MessageSquare },
  { value: 'blog', label: 'Blog Post', icon: FileText },
  { value: 'showcase', label: 'Case Study', icon: Trophy },
]

/**
 * Form for creating and editing artifacts
 */
export function ArtifactForm({
  artifact,
  onSubmit,
  onCancel,
  isLoading,
}: ArtifactFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArtifactFormData>({
    resolver: zodResolver(artifactSchema),
    defaultValues: {
      type: artifact?.type ?? 'social_post',
      title: artifact?.title ?? '',
      content: artifact?.content ?? '',
      tags: artifact?.tags ?? [],
    },
  })

  const selectedType = watch('type')
  const tags = watch('tags') ?? []

  const handleFormSubmit = (data: ArtifactFormData) => {
    onSubmit({
      type: data.type,
      title: data.title,
      content: data.content,
      tags: data.tags,
    })
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const input = e.target as HTMLInputElement
      const tag = input.value.trim().toLowerCase()
      if (tag && !tags.includes(tag)) {
        setValue('tags', [...tags, tag])
        input.value = ''
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', tags.filter((t) => t !== tagToRemove))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          value={selectedType}
          onValueChange={(value: string) => setValue('type', value as ArtifactType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent data-portal-ignore-click-outside>
            {ARTIFACT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter a title..."
          {...register('title')}
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Content (optional)</Label>
        <Textarea
          id="content"
          placeholder="Start writing..."
          rows={6}
          {...register('content')}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Input
          placeholder="Type a tag and press Enter..."
          onKeyDown={handleAddTag}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : artifact ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
