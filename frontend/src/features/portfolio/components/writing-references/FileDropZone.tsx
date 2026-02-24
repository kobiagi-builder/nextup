/**
 * FileDropZone — Drag-and-drop file upload area with format validation.
 *
 * Shows accepted formats and size limit. Visual feedback on drag-over.
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FileDropZoneProps {
  onFile: (file: File) => void
  accept?: string
  maxSizeMB?: number
}

const ACCEPTED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ACCEPTED_EXTENSIONS = ['.md', '.txt', '.docx', '.pdf']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileDropZone({
  onFile,
  accept = ACCEPTED_EXTENSIONS.join(','),
  maxSizeMB = 10,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(file.type)) {
        return `Unsupported format. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File too large. Maximum: ${maxSizeMB}MB`
      }
      return null
    },
    [maxSizeMB]
  )

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      onFile(file)
    },
    [validateFile, onFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'rounded-xl border-2 border-dashed p-8 text-center',
          'cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-brand-300 bg-brand-300/5 scale-[1.01]'
            : 'border-border hover:border-muted-foreground/30 hover:bg-secondary/30',
          error && 'border-destructive/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        {selectedFile ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
              <FileText className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-2 text-xs text-brand-300"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(null)
                setError(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
            >
              Choose different file
            </Button>
          </>
        ) : (
          <>
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full mb-3 transition-colors',
                isDragging ? 'bg-brand-300/10' : 'bg-secondary'
              )}
            >
              <Upload
                className={cn(
                  'h-5 w-5 transition-colors',
                  isDragging ? 'text-brand-300' : 'text-muted-foreground'
                )}
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {ACCEPTED_EXTENSIONS.join(', ')} &middot; max {maxSizeMB}MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
