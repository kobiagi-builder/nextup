/**
 * Project Form (Dialog)
 *
 * Create or edit a project. Uses React Hook Form + Zod validation.
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useCreateProject, useUpdateProject, useAgreements } from '../../hooks'
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../types'
import type { Project } from '../../types'

const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.string().optional(),
  agreement_id: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectFormSchema>

interface ProjectFormProps {
  customerId: string
  project?: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectForm({ customerId, project, open, onOpenChange }: ProjectFormProps) {
  const createProject = useCreateProject(customerId)
  const updateProject = useUpdateProject(customerId)
  const { data: agreements = [] } = useAgreements(customerId)
  const isEditing = !!project

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'planning',
      agreement_id: '',
    },
  })

  // Reset form when opening/closing or when editing project changes
  useEffect(() => {
    if (open && project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
        agreement_id: project.agreement_id || '',
      })
    } else if (open && !project) {
      form.reset({
        name: '',
        description: '',
        status: 'planning',
        agreement_id: '',
      })
    }
  }, [open, project, form])

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        status: data.status as Project['status'] || undefined,
        agreement_id: data.agreement_id || null,
      }

      if (isEditing && project) {
        await updateProject.mutateAsync({ id: project.id, ...payload })
        toast({ title: 'Project updated' })
      } else {
        await createProject.mutateAsync(payload)
        toast({ title: 'Project created' })
      }
      onOpenChange(false)
    } catch {
      toast({
        title: isEditing ? 'Failed to update project' : 'Failed to create project',
        variant: 'destructive',
      })
    }
  }

  const isPending = createProject.isPending || updateProject.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g., Q1 Product Strategy"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the project..."
              rows={2}
              {...form.register('description')}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linked Agreement */}
          <div className="space-y-2">
            <Label>Linked Agreement (optional)</Label>
            <Select
              value={form.watch('agreement_id') || ''}
              onValueChange={(v) => form.setValue('agreement_id', v === '_none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agreement..." />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                <SelectItem value="_none">None</SelectItem>
                {agreements.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.scope.length > 50 ? `${a.scope.slice(0, 50)}...` : a.scope}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
