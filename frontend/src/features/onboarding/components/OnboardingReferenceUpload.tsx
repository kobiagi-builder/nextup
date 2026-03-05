/**
 * OnboardingReferenceUpload
 *
 * Inline card (not Sheet/drawer) for adding writing references
 * during onboarding. Tabs: Paste / Upload / File URL / Publication.
 * Reuses FileDropZone and PublicationUrlInput from the portfolio feature.
 */

import { useState, useCallback } from 'react'
import { Type, Upload, Link2, Globe, Loader2, Plus, Check } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { FileDropZone } from '@/features/portfolio/components/writing-references/FileDropZone'
import { PublicationUrlInput } from '@/features/portfolio/components/writing-references/PublicationUrlInput'
import {
  useCreateWritingExample,
  useUploadWritingExample,
  useExtractFromUrl,
  useExtractPublication,
} from '@/features/portfolio/hooks/useWritingExamples'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'

type MethodTab = 'paste' | 'file' | 'file-url' | 'publication'

const METHODS = [
  { value: 'paste' as const, label: 'Paste', icon: Type },
  { value: 'file' as const, label: 'File', icon: Upload },
  { value: 'file-url' as const, label: 'File URL', icon: Link2 },
  { value: 'publication' as const, label: 'Publication', icon: Globe },
]

export function OnboardingReferenceUpload() {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const addReferenceId = useOnboardingWizardStore((s) => s.addReferenceId)

  const createExample = useCreateWritingExample()
  const uploadExample = useUploadWritingExample()
  const extractUrl = useExtractFromUrl()
  const extractPub = useExtractPublication()

  const [method, setMethod] = useState<MethodTab>('paste')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  // Paste state
  const [pasteName, setPasteName] = useState('')
  const [pasteContent, setPasteContent] = useState('')

  // File state
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')

  // File URL state
  const [fileUrl, setFileUrl] = useState('')
  const [fileUrlName, setFileUrlName] = useState('')

  // Publication state
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

  const showSuccess = () => {
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)
  }

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) return
    setIsSubmitting(true)
    try {
      const result = await createExample.mutateAsync({
        name: pasteName.trim() || 'Onboarding paste',
        content: pasteContent.trim(),
        source_type: 'pasted',
        artifact_type: 'blog',
      })
      addReferenceId(result.id)
      resetForm()
      showSuccess()
      toast({ title: 'Reference added' })
    } catch {
      toast({ title: 'Failed to add reference', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSubmit = async () => {
    if (!file) return
    setIsSubmitting(true)
    try {
      const result = await uploadExample.mutateAsync({
        file,
        name: fileName.trim() || file.name.replace(/\.[^/.]+$/, ''),
        artifact_type: 'blog',
      })
      addReferenceId(result.id)
      resetForm()
      showSuccess()
      toast({ title: 'Reference uploaded' })
    } catch {
      toast({ title: 'Failed to upload file', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUrlSubmit = async () => {
    if (!fileUrl.trim()) return
    setIsSubmitting(true)
    try {
      const result = await extractUrl.mutateAsync({
        url: fileUrl.trim(),
        name: fileUrlName.trim() || '',
        artifact_type: 'blog',
      })
      addReferenceId(result.id)
      resetForm()
      showSuccess()
      toast({ title: 'Reference extracted from URL' })
    } catch {
      toast({ title: 'Failed to extract from URL', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePubSubmit = async () => {
    if (!pubUrl.trim()) return
    setIsSubmitting(true)
    try {
      const result = await extractPub.mutateAsync({
        url: pubUrl.trim(),
        name: pubName.trim() || '',
        artifact_type: 'blog',
      })
      addReferenceId(result.id)
      resetForm()
      showSuccess()
      toast({ title: 'Publication extracted' })
    } catch {
      toast({ title: 'Failed to extract publication', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

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
      ? pasteContent.trim().split(/\s+/).filter(Boolean).length
      : 0

  const methodContent = (
    <div className="mt-4 space-y-3">
      {method === 'paste' && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reference name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={pasteName}
              onChange={(e) => setPasteName(e.target.value)}
              placeholder="e.g., My LinkedIn article on AI strategy"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Content</label>
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
              className="min-h-[150px] text-sm resize-none"
            />
          </div>
        </>
      )}
      {method === 'file' && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reference name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Auto-detected from filename"
            />
          </div>
          <FileDropZone
            onFile={(f) => {
              setFile(f)
              if (!fileName) setFileName(f.name.replace(/\.[^/.]+$/, ''))
            }}
          />
        </>
      )}
      {method === 'file-url' && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">File URL</label>
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
            <label className="text-sm font-medium">Reference name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={fileUrlName}
              onChange={(e) => setFileUrlName(e.target.value)}
              placeholder="Auto-detected from URL"
            />
          </div>
        </>
      )}
      {method === 'publication' && (
        <>
          <PublicationUrlInput url={pubUrl} onUrlChange={setPubUrl} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reference name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={pubName}
              onChange={(e) => setPubName(e.target.value)}
              placeholder="Auto-detected from article title"
            />
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {isMobile ? (
        <>
          {/* Mobile: vertical stacked rows */}
          <div className="space-y-1.5">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 rounded-lg min-h-[44px]',
                  'border transition-colors duration-150 text-left',
                  method === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{label}</span>
                {method === value && (
                  <Check className="h-4 w-4 ml-auto text-primary" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
          {methodContent}
        </>
      ) : (
        <Tabs value={method} onValueChange={(v) => setMethod(v as MethodTab)}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {methodContent}
        </Tabs>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
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
          ) : justAdded ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Added!
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Add Reference
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
