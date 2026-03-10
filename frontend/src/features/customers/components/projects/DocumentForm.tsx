/**
 * Document Form (Dialog)
 *
 * Create a new document with initiative assignment.
 */

import { useEffect } from 'react'
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
import { useCreateDocument } from '../../hooks'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_CONFIG } from '../../types'
import type { InitiativeWithCounts, DocumentFolder, CustomerDocument } from '../../types'

const documentFormSchema = z.object({
  title: z.string().min(1, 'Document title is required'),
  type: z.string().optional(),
  folder_id: z.string().nullable().optional(),
})

type DocumentFormData = z.infer<typeof documentFormSchema>

interface DocumentFormProps {
  customerId: string
  initiatives: InitiativeWithCounts[]
  folders: DocumentFolder[]
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultInitiativeId?: string
  onDocumentCreated?: (doc: CustomerDocument) => void
}

export function DocumentForm({
  customerId,
  initiatives,
  folders,
  open,
  onOpenChange,
  defaultInitiativeId,
  onDocumentCreated,
}: DocumentFormProps) {
  const createDocument = useCreateDocument(customerId)

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: '',
      type: 'strategy',
      folder_id: null,
    },
  })

  // Build a default folder value from the defaultInitiativeId
  const defaultFolder = defaultInitiativeId ? `initiative:${defaultInitiativeId}` : (
    initiatives[0] ? `initiative:${initiatives[0].id}` : null
  )

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        type: 'strategy',
        folder_id: defaultFolder,
      })
    }
  }, [open, defaultFolder, form])

  const onSubmit = async (data: DocumentFormData) => {
    try {
      // Parse the combined folder value: "initiative:<id>" or "folder:<id>"
      const folderValue = data.folder_id || defaultFolder
      let initiativeId: string
      let folderId: string | null = null

      if (folderValue?.startsWith('folder:')) {
        folderId = folderValue.replace('folder:', '')
        // Documents in folders still need an initiative — use the first one
        initiativeId = initiatives[0]?.id || ''
      } else if (folderValue?.startsWith('initiative:')) {
        initiativeId = folderValue.replace('initiative:', '')
      } else {
        initiativeId = initiatives[0]?.id || ''
      }

      if (!initiativeId) {
        toast({ title: 'Please select a folder', variant: 'destructive' })
        return
      }

      const createdDoc = await createDocument.mutateAsync({
        initiativeId,
        title: data.title,
        type: (data.type as typeof DOCUMENT_TYPES[number]) || 'custom',
        initiative_id: initiativeId,
        folder_id: folderId,
      })
      toast({ title: 'Document created' })
      form.reset()
      onOpenChange(false)
      if (createdDoc) {
        onDocumentCreated?.(createdDoc)
      }
    } catch {
      toast({ title: 'Failed to create document', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Document</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="document-title">Title</Label>
            <Input
              id="document-title"
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
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_CONFIG[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folder (merged initiatives + folders) */}
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select
              value={form.watch('folder_id') || defaultFolder || ''}
              onValueChange={(v) => form.setValue('folder_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                {initiatives.map((init) => (
                  <SelectItem key={`initiative:${init.id}`} value={`initiative:${init.id}`}>
                    {init.name}
                  </SelectItem>
                ))}
                {folders.length > 0 && initiatives.length > 0 && (
                  <div className="border-t border-border my-1" />
                )}
                {folders.map((folder) => (
                  <SelectItem key={`folder:${folder.id}`} value={`folder:${folder.id}`}>
                    {folder.name}
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
            <Button type="submit" disabled={createDocument.isPending}>
              {createDocument.isPending ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
