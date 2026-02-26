/**
 * Artifact Form (Dialog)
 *
 * Create a new artifact. Simple form: title + type.
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateArtifact } from '../../hooks'
import { ARTIFACT_TYPES, ARTIFACT_TYPE_CONFIG } from '../../types'

const artifactFormSchema = z.object({
  title: z.string().min(1, 'Artifact title is required'),
  type: z.string().optional(),
})

type ArtifactFormData = z.infer<typeof artifactFormSchema>

interface ArtifactFormProps {
  customerId: string
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArtifactForm({ customerId, projectId, open, onOpenChange }: ArtifactFormProps) {
  const createArtifact = useCreateArtifact(customerId, projectId)

  const form = useForm<ArtifactFormData>({
    resolver: zodResolver(artifactFormSchema),
    defaultValues: {
      title: '',
      type: 'strategy',
    },
  })

  const onSubmit = async (data: ArtifactFormData) => {
    try {
      await createArtifact.mutateAsync({
        title: data.title,
        type: data.type as typeof ARTIFACT_TYPES[number] || 'custom',
      })
      toast({ title: 'Artifact created' })
      form.reset()
      onOpenChange(false)
    } catch {
      toast({ title: 'Failed to create artifact', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Artifact</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="artifact-title">Title</Label>
            <Input
              id="artifact-title"
              placeholder="e.g., Product Strategy 2026"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(v) => form.setValue('type', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                {ARTIFACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ARTIFACT_TYPE_CONFIG[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createArtifact.isPending}>
              {createArtifact.isPending ? 'Creating...' : 'Create Artifact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
