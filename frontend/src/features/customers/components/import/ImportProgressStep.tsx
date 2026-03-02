/**
 * Import Progress Step
 *
 * Shows a progress bar with phase-aware labels:
 * - Phase 1 (importing): "Processing row X of Y..."
 * - Phase 2 (enriching): "Enriching CompanyName (X of Y)..."
 */

import { Progress } from '@/components/ui/progress'
import type { ImportProgressEvent } from '../../types'

interface ImportProgressStepProps {
  progress: ImportProgressEvent | null
}

export function ImportProgressStep({ progress }: ImportProgressStepProps) {
  let percent = 0
  let label = 'Preparing import...'
  let sublabel = ''

  if (progress) {
    if (progress.phase === 'classifying') {
      // Phase 0 takes 0-15%
      percent = Math.round((progress.current / progress.total) * 15)
      label = `Classifying companies (${progress.current} of ${progress.total})`
      sublabel = 'Analyzing company names...'
    } else if (progress.phase === 'importing') {
      // Phase 1 takes 15-40%
      percent = 15 + Math.round((progress.current / progress.total) * 25)
      label = `Processing connections (${progress.current} of ${progress.total})`
      sublabel = 'Matching companies and creating team members...'
    } else if (progress.phase === 'enriching') {
      // Phase 2 takes 40-100%
      percent = 40 + Math.round((progress.current / progress.total) * 60)
      label = `Enriching ${progress.company} (${progress.current} of ${progress.total})`
      sublabel = 'Looking up company data and scoring ICP fit...'
    }
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <Progress value={percent} className="h-2.5 bg-muted" />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate pr-4">{label}</p>
        <span className="text-xs text-muted-foreground shrink-0">{percent}%</span>
      </div>

      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  )
}
