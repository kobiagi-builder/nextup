/**
 * Artifact Form Component
 *
 * Form for creating and editing artifacts.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, MessageSquare, Trophy, Sparkles, Save, PenLine, ChevronDown } from 'lucide-react'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { Artifact, ArtifactType, CreateArtifactInput, ToneOption } from '../../types/portfolio'
import { ToneSelector } from '../artifact/ToneSelector'
import { TagsInput } from '../artifact/TagsInput'
import { ReferencePicker } from '../writing-references/ReferencePicker'

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

  // Reference picker state
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([])
  const [refsOpen, setRefsOpen] = useState(false)

  const handleSaveDraft = handleSubmit((data: ArtifactFormData) => {
    onSaveDraft({
      type: data.type,
      title: data.title,
      content: data.content,
      tone: data.tone,
      tags: data.tags,
      metadata: selectedReferenceIds.length > 0
        ? { selectedReferenceIds }
        : undefined,
    })
  })

  const handleCreateContent = handleSubmit((data: ArtifactFormData) => {
    onCreateContent?.({
      type: data.type,
      title: data.title,
      content: data.content,
      tone: data.tone,
      tags: data.tags,
      metadata: selectedReferenceIds.length > 0
        ? { selectedReferenceIds }
        : undefined,
    })
  })

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

      {/* Visual separator between configuration and content sections */}
      <div className="border-t border-border" />

      {/* Writing References — collapsible picker */}
      {!isEditing && (
        <Collapsible open={refsOpen} onOpenChange={setRefsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-1 group">
            <div className="flex items-center gap-2">
              <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Writing References
              </span>
              {selectedReferenceIds.length > 0 && (
                <span className="text-[10px] font-medium text-brand-300 bg-brand-300/10 px-1.5 py-0.5 rounded-full tabular-nums">
                  {selectedReferenceIds.length} selected
                </span>
              )}
              {selectedReferenceIds.length === 0 && (
                <span className="text-[11px] text-muted-foreground/60">(optional)</span>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                refsOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ReferencePicker
              contentType={selectedType}
              selectedIds={selectedReferenceIds}
              onSelectionChange={setSelectedReferenceIds}
              previewLines={2}
              maxHeightClass="max-h-[240px]"
            />
          </CollapsibleContent>
        </Collapsible>
      )}

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
        <TagsInput
          tags={tags}
          onChange={(newTags) => setValue('tags', newTags)}
          placeholder="Type a tag and press Enter..."
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
