/**
 * CSV Upload Step
 *
 * Drag-and-drop zone for selecting a LinkedIn CSV file.
 * Shows file name and size after selection.
 */

import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CsvUploadStepProps {
  file: File | null
  onFileSelect: (file: File | null) => void
  onImport: () => void
  isPending: boolean
}

export function CsvUploadStep({ file, onFileSelect, onImport, isPending }: CsvUploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && droppedFile.name.toLowerCase().endsWith('.csv')) {
        onFileSelect(droppedFile)
      }
    },
    [onFileSelect]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) {
        onFileSelect(selected)
      }
    },
    [onFileSelect]
  )

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
            isDragOver
              ? 'border-[#0A66C2] bg-[#0A66C2]/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Drop your LinkedIn CSV here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected columns: First Name, Last Name, URL, Email Address, Company, Position
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <FileText className="h-8 w-8 text-[#0A66C2] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={() => onFileSelect(null)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={onImport}
          disabled={!file || isPending}
          className="bg-[#0A66C2] hover:bg-[#004182]"
        >
          {isPending ? 'Importing...' : 'Import Connections'}
        </Button>
      </div>
    </div>
  )
}
