/**
 * InlineAddReferenceDialog — Modal for adding a new writing reference
 * inline during content creation, without leaving the ArtifactForm flow.
 *
 * Uses Dialog (not Sheet) since it opens inside ArtifactForm's parent Dialog.
 * Same 4-tab structure as ReferenceUploadDialog: Paste | File | File URL | Publication.
 * Wires up mutation hooks directly and calls onSuccess with the created reference.
 */

import { useState, useCallback } from 'react'
import {
  Type,
  Upload,
  Link2,
  Globe,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FileDropZone } from './FileDropZone'
import { PublicationUrlInput } from './PublicationUrlInput'
import {
  useCreateWritingExample,
  useUploadWritingExample,
  useExtractFromUrl,
  useExtractPublication,
} from '../../hooks/useWritingExamples'
import type { ArtifactType, UserWritingExample } from '../../types/portfolio'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InlineAddReferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultArtifactType: ArtifactType
  onSuccess: (reference: UserWritingExample) => void
}

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const METHODS = [
  { value: 'paste', label: 'Paste', icon: Type },
  { value: 'file', label: 'File', icon: Upload },
  { value: 'file-url', label: 'File URL', icon: Link2 },
  { value: 'publication', label: 'Publication', icon: Globe },
] as const

type MethodTab = (typeof METHODS)[number]['value']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineAddReferenceDialog({
  open,
  onOpenChange,
  defaultArtifactType,
  onSuccess,
}: InlineAddReferenceDialogProps) {
  const [method, setMethod] = useState<MethodTab>('paste')

  // Paste state
  const [pasteName, setPasteName] = useState('')
  const [pasteContent, setPasteContent] = useState('')

  // File state
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')

  // File URL state
  const [fileUrl, setFileUrl] = useState('')
  const [fileUrlName, setFileUrlName] = useState('')

  // Publication URL state
  const [pubUrl, setPubUrl] = useState('')
  const [pubName, setPubName] = useState('')

  // Mutations
  const createMutation = useCreateWritingExample()
  const uploadMutation = useUploadWritingExample()
  const extractUrlMutation = useExtractFromUrl()
  const extractPubMutation = useExtractPublication()

  const isSubmitting =
    createMutation.isPending ||
    uploadMutation.isPending ||
    extractUrlMutation.isPending ||
    extractPubMutation.isPending

  const resetForm = useCallback(() => {
    setPasteName('')
    setPasteContent('')
    setFile(null)
    setFileName('')
    setFileUrl('')
    setFileUrlName('')
    setPubUrl('')
    setPubName('')
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onOpenChange(false)
  }, [resetForm, onOpenChange])

  // ------ Submit handlers ------

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) return
    try {
      const result = await createMutation.mutateAsync({
        name: pasteName.trim() || 'Pasted reference',
        content: pasteContent.trim(),
        source_type: 'pasted',
        artifact_type: defaultArtifactType,
      })
      onSuccess(result)
      handleClose()
    } catch {
      // Error handled by React Query onError
    }
  }

  const handleFileSubmit = async () => {
    if (!file) return
    try {
      const result = await uploadMutation.mutateAsync({
        file,
        name: fileName.trim() || file.name.replace(/\.[^/.]+$/, ''),
        artifact_type: defaultArtifactType,
      })
      onSuccess(result)
      handleClose()
    } catch {
      // Error handled by React Query onError
    }
  }

  const handleFileUrlSubmit = async () => {
    if (!fileUrl.trim()) return
    try {
      const result = await extractUrlMutation.mutateAsync({
        url: fileUrl.trim(),
        name: fileUrlName.trim() || '',
        artifact_type: defaultArtifactType,
      })
      onSuccess(result)
      handleClose()
    } catch {
      // Error handled by React Query onError
    }
  }

  const handlePubSubmit = async () => {
    if (!pubUrl.trim()) return
    try {
      const result = await extractPubMutation.mutateAsync({
        url: pubUrl.trim(),
        name: pubName.trim() || '',
        artifact_type: defaultArtifactType,
      })
      onSuccess(result)
      handleClose()
    } catch {
      // Error handled by React Query onError
    }
  }

  // Validity checks
  const isPasteValid = pasteContent.trim().length > 0
  const isFileValid = !!file
  const isFileUrlValid = fileUrl.trim().startsWith('https://')
  const isPubValid = pubUrl.trim().startsWith('https://')

  const canSubmit =
    !isSubmitting &&
    ((method === 'paste' && isPasteValid) ||
      (method === 'file' && isFileValid) ||
      (method === 'file-url' && isFileUrlValid) ||
      (method === 'publication' && isPubValid))

  const handleSubmit = () => {
    switch (method) {
      case 'paste':
        return handlePasteSubmit()
      case 'file':
        return handleFileSubmit()
      case 'file-url':
        return handleFileUrlSubmit()
      case 'publication':
        return handlePubSubmit()
    }
  }

  const wordCount =
    method === 'paste'
      ? pasteContent
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-portal-ignore-click-outside
        className="sm:max-w-lg max-h-[85vh] flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="text-base">Add Writing Reference</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add an example of your writing to help the AI match your voice.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-1" />

        {/* Method tabs */}
        <Tabs
          value={method}
          onValueChange={(v) => setMethod(v as MethodTab)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="w-full grid grid-cols-4 h-9">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 text-xs data-[state=active]:text-brand-300"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ---- Paste Text ---- */}
          <TabsContent
            value="paste"
            className="mt-3 space-y-3 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reference name
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <Input
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
                placeholder="e.g., My LinkedIn article on AI strategy"
              />
            </div>

            <div className="space-y-1.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Content</label>
                {wordCount > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {wordCount.toLocaleString()} words
                  </span>
                )}
              </div>
              <Textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Paste your writing sample here..."
                className="flex-1 min-h-[160px] text-sm font-mono resize-none"
              />
            </div>
          </TabsContent>

          {/* ---- Upload File ---- */}
          <TabsContent value="file" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reference name
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Auto-detected from filename"
              />
            </div>

            <FileDropZone
              onFile={(f) => {
                setFile(f)
                if (!fileName) {
                  setFileName(f.name.replace(/\.[^/.]+$/, ''))
                }
              }}
            />
          </TabsContent>

          {/* ---- File URL ---- */}
          <TabsContent value="file-url" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">File URL</label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://example.com/my-document.pdf"
              />
              <p className="text-[11px] text-muted-foreground">
                Direct link to a .md, .txt, .docx, or .pdf file
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reference name
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <Input
                value={fileUrlName}
                onChange={(e) => setFileUrlName(e.target.value)}
                placeholder="Auto-detected from URL"
              />
            </div>
          </TabsContent>

          {/* ---- Publication URL ---- */}
          <TabsContent value="publication" className="mt-3 space-y-3">
            <PublicationUrlInput url={pubUrl} onUrlChange={setPubUrl} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reference name
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <Input
                value={pubName}
                onChange={(e) => setPubName(e.target.value)}
                placeholder="Auto-detected from article title"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Submit footer */}
        <Separator className="my-1" />
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add Reference
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
