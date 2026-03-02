/**
 * LinkedIn Import Dialog
 *
 * Multi-step dialog: Upload CSV → Importing (with progress bar) → Results.
 * Not closable during import to prevent accidental dismissal.
 */

import { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLinkedInImport } from '../../hooks/useLinkedInImport'
import { CsvUploadStep } from './CsvUploadStep'
import { ImportProgressStep } from './ImportProgressStep'
import { ImportResultsStep } from './ImportResultsStep'
import type { ImportResult, ImportProgressEvent } from '../../types'

type ImportStep = 'upload' | 'importing' | 'results'

interface LinkedInImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LinkedInImportDialog({ open, onOpenChange }: LinkedInImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null)
  const importMutation = useLinkedInImport()

  // Use ref to avoid stale closure in mutateAsync callback
  const progressRef = useRef(setProgress)
  progressRef.current = setProgress

  const handleImport = useCallback(async () => {
    if (!file) return

    setStep('importing')
    setProgress(null)
    try {
      const importResult = await importMutation.mutateAsync({
        file,
        onProgress: (event) => progressRef.current(event),
      })
      setResult(importResult)
      setStep('results')
    } catch {
      setStep('upload')
    }
  }, [file, importMutation])

  const handleDone = useCallback(() => {
    setStep('upload')
    setFile(null)
    setResult(null)
    setProgress(null)
    onOpenChange(false)
  }, [onOpenChange])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (step === 'importing') return
      if (!open) {
        setStep('upload')
        setFile(null)
        setResult(null)
        setProgress(null)
      }
      onOpenChange(open)
    },
    [step, onOpenChange]
  )

  const titles: Record<ImportStep, string> = {
    upload: 'Import LinkedIn Connections',
    importing: 'Importing...',
    results: 'Import Complete',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-portal-ignore-click-outside
        className="sm:max-w-lg"
        onInteractOutside={(e) => {
          if (step === 'importing') e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{titles[step]}</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <CsvUploadStep
            file={file}
            onFileSelect={setFile}
            onImport={handleImport}
            isPending={importMutation.isPending}
          />
        )}

        {step === 'importing' && <ImportProgressStep progress={progress} />}

        {step === 'results' && result && (
          <ImportResultsStep result={result} onDone={handleDone} />
        )}
      </DialogContent>
    </Dialog>
  )
}
