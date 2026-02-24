/**
 * ReferenceUploadDialog — Sheet with method tabs for adding writing references.
 *
 * 4 methods: Paste Text | Upload File | File URL | Publication URL
 * Each tab has its own form. Submit creates the reference tagged to the active
 * artifact type from the parent.
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileDropZone } from './FileDropZone'
import { PublicationUrlInput } from './PublicationUrlInput'
import type { ArtifactType } from '../../types/portfolio'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferenceUploadDialogProps {
  open: boolean
  onClose: () => void
  /** When undefined (e.g. "All" tab active), shows a type selector in the dialog */
  artifactType?: ArtifactType
  onSubmitPaste: (data: {
    name: string
    content: string
    artifactType: ArtifactType
  }) => Promise<void>
  onSubmitFile?: (data: {
    file: File
    name: string
    artifactType: ArtifactType
  }) => Promise<void>
  onSubmitFileUrl?: (data: {
    url: string
    name: string
    artifactType: ArtifactType
  }) => Promise<void>
  onSubmitPublicationUrl?: (data: {
    url: string
    name: string
    artifactType: ArtifactType
  }) => Promise<void>
  isSubmitting: boolean
}

// ---------------------------------------------------------------------------
// Method tab config
// ---------------------------------------------------------------------------

const METHODS = [
  { value: 'paste', label: 'Paste', icon: Type },
  { value: 'file', label: 'File', icon: Upload },
  { value: 'file-url', label: 'File URL', icon: Link2 },
  { value: 'publication', label: 'Publication', icon: Globe },
] as const

type MethodTab = (typeof METHODS)[number]['value']

const TYPE_LABELS: Record<ArtifactType, string> = {
  blog: 'Blog',
  social_post: 'Social Post',
  showcase: 'Showcase',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferenceUploadDialog({
  open,
  onClose,
  artifactType,
  onSubmitPaste,
  onSubmitFile,
  onSubmitFileUrl,
  onSubmitPublicationUrl,
  isSubmitting,
}: ReferenceUploadDialogProps) {
  const [method, setMethod] = useState<MethodTab>('paste')
  // When no artifactType is passed (All tab), let user pick
  const [selectedType, setSelectedType] = useState<ArtifactType>('blog')
  const resolvedType = artifactType ?? selectedType

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
    onClose()
  }, [resetForm, onClose])

  // Submit handlers per method — errors are shown via toast in parent,
  // catch here to prevent unhandled rejection and keep dialog open for retry.
  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) return
    try {
      await onSubmitPaste({
        name: pasteName.trim(),
        content: pasteContent.trim(),
        artifactType: resolvedType,
      })
      handleClose()
    } catch {
      // Error toast shown by parent handler
    }
  }

  const handleFileSubmit = async () => {
    if (!file || !onSubmitFile) return
    try {
      await onSubmitFile({
        file,
        name: fileName.trim() || file.name.replace(/\.[^/.]+$/, ''),
        artifactType: resolvedType,
      })
      handleClose()
    } catch {
      // Error toast shown by parent handler
    }
  }

  const handleFileUrlSubmit = async () => {
    if (!fileUrl.trim() || !onSubmitFileUrl) return
    try {
      await onSubmitFileUrl({
        url: fileUrl.trim(),
        name: fileUrlName.trim() || '',
        artifactType: resolvedType,
      })
      handleClose()
    } catch {
      // Error toast shown by parent handler
    }
  }

  const handlePubSubmit = async () => {
    if (!pubUrl.trim() || !onSubmitPublicationUrl) return
    try {
      await onSubmitPublicationUrl({
        url: pubUrl.trim(),
        name: pubName.trim() || '',
        artifactType: resolvedType,
      })
      handleClose()
    } catch {
      // Error toast shown by parent handler
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
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        data-portal-ignore-click-outside
        className="w-full sm:max-w-lg flex flex-col"
      >
        <SheetHeader>
          <SheetTitle className="text-base">
            Add {TYPE_LABELS[resolvedType]} Reference
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Add an example of your {TYPE_LABELS[resolvedType].toLowerCase()} writing
            to help the AI match your voice.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-3" />

        {/* Type selector — shown when no specific tab is active (All tab) */}
        {!artifactType && (
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium text-foreground">Content type</label>
            <Select
              value={selectedType}
              onValueChange={(v: string) => setSelectedType(v as ArtifactType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-portal-ignore-click-outside>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="social_post">Social Post</SelectItem>
                <SelectItem value="showcase">Showcase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

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
          <TabsContent value="paste" className="mt-4 space-y-4 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reference name
                <span className="text-muted-foreground font-normal ml-1">
                  (optional)
                </span>
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
                className="flex-1 min-h-[200px] text-sm font-mono resize-none"
              />
            </div>
          </TabsContent>

          {/* ---- Upload File ---- */}
          <TabsContent value="file" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reference name
                <span className="text-muted-foreground font-normal ml-1">
                  (optional)
                </span>
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
          <TabsContent value="file-url" className="mt-4 space-y-4">
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
                <span className="text-muted-foreground font-normal ml-1">
                  (optional)
                </span>
              </label>
              <Input
                value={fileUrlName}
                onChange={(e) => setFileUrlName(e.target.value)}
                placeholder="Auto-detected from URL"
              />
            </div>
          </TabsContent>

          {/* ---- Publication URL ---- */}
          <TabsContent
            value="publication"
            className="mt-4 space-y-4"
          >
            <PublicationUrlInput url={pubUrl} onUrlChange={setPubUrl} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reference name
                <span className="text-muted-foreground font-normal ml-1">
                  (optional)
                </span>
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
        <Separator className="my-3" />
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
      </SheetContent>
    </Sheet>
  )
}
