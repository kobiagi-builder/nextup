/**
 * Artifact Form Component
 *
 * Form for creating and editing artifacts.
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, MessageSquare, Trophy, X, Sparkles, Save } from 'lucide-react'
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
import type { Artifact, ArtifactType, CreateArtifactInput, ToneOption } from '../../types/portfolio'
import { ToneSelector } from '../artifact/ToneSelector'

// Form validation schema
const artifactSchema = z.object({
  type: z.enum(['social_post', 'blog', 'showcase']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().optional(),
  tone: z.enum(['professional', 'formal', 'casual', 'conversational', 'technical', 'friendly', 'authoritative', 'humorous']).optional(),
  tags: z.array(z.string()).optional(),
})

type ArtifactFormData = z.infer<typeof artifactSchema>

interface ArtifactFormProps {
  artifact?: Artifact
  /** Called when "Save as Draft" is clicked */
  onSaveDraft: (data: CreateArtifactInput) => void
  /** Called when "Create Content" is clicked (saves then triggers AI) */
  onCreateContent?: (data: CreateArtifactInput) => void
  onCancel: () => void
  isLoading?: boolean
  /** Which action is currently loading */
  loadingAction?: 'draft' | 'create' | null
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
  onSaveDraft,
  onCreateContent,
  onCancel,
  isLoading,
  loadingAction,
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
      tone: artifact?.tone ?? 'professional',
      tags: artifact?.tags ?? [],
    },
  })

  const selectedType = watch('type')
  const selectedTone = watch('tone')
  const tags = watch('tags') ?? []

  const handleSaveDraft = handleSubmit((data: ArtifactFormData) => {
    onSaveDraft({
      type: data.type,
      title: data.title,
      content: data.content,
      tone: data.tone,
      tags: data.tags,
    })
  })

  const handleCreateContent = handleSubmit((data: ArtifactFormData) => {
    onCreateContent?.({
      type: data.type,
      title: data.title,
      content: data.content,
      tone: data.tone,
      tags: data.tags,
    })
  })

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

  const isEditing = !!artifact

  return (
    <form className="space-y-6">
      {/* Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          value={selectedType}
          onValueChange={(value: string) => setValue('type', value as ArtifactType)}
        >
          <SelectTrigger data-testid="artifact-form-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent data-portal-ignore-click-outside>
            {ARTIFACT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value} data-testid={`artifact-type-${type.value}`}>
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

      {/* Tone Selection */}
      <ToneSelector
        value={selectedTone as ToneOption}
        onChange={(tone) => setValue('tone', tone)}
      />

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter a title..."
          {...register('title')}
          className={errors.title ? 'border-destructive' : ''}
          data-testid="artifact-form-title"
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
          data-testid="artifact-form-content"
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
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="artifact-form-cancel"
        >
          Cancel
        </Button>

        {isEditing ? (
          // Edit mode: single Update button
          <Button
            type="button"
            onClick={handleSaveDraft}
            disabled={isLoading}
            data-testid="artifact-form-submit"
          >
            {loadingAction === 'draft' ? 'Saving...' : 'Update'}
          </Button>
        ) : (
          // Create mode: Save as Draft + Create Content buttons
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="gap-2"
              data-testid="artifact-form-save-draft"
            >
              <Save className="h-4 w-4" />
              {loadingAction === 'draft' ? 'Saving...' : 'Save as Draft'}
            </Button>
            {onCreateContent && (
              <Button
                type="button"
                onClick={handleCreateContent}
                disabled={isLoading}
                className="gap-2"
                data-testid="artifact-form-create-content"
              >
                <Sparkles className="h-4 w-4" />
                {loadingAction === 'create' ? 'Creating...' : 'Create Content'}
              </Button>
            )}
          </>
        )}
      </div>
    </form>
  )
}
