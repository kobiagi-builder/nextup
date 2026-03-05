/**
 * ContentGenerationLoader Component
 *
 * Phase-specific loading skeleton shown during the content generation pipeline.
 * Displays different visuals and messages based on the current generation status.
 */

import { Search, PenTool, Sparkles, ImageIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import type { ArtifactStatus } from '../../types/portfolio'

interface ContentGenerationLoaderProps {
  artifactType: string
  status?: ArtifactStatus
}

/** Phase-specific configuration */
const PHASE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  research: { icon: Search, label: 'Researching your topic...' },
  foundations: { icon: PenTool, label: 'Analyzing writing patterns...' },
  skeleton: { icon: PenTool, label: 'Building content structure...' },
  writing: { icon: Sparkles, label: 'Writing your content...' },
  humanity_checking: { icon: Sparkles, label: 'Polishing your content...' },
  creating_visuals: { icon: ImageIcon, label: 'Generating images...' },
}

export function ContentGenerationLoader({ artifactType, status }: ContentGenerationLoaderProps) {
  const phase = status && PHASE_CONFIG[status]
  const PhaseIcon = phase?.icon || Sparkles
  const label = phase?.label || (artifactType === 'social_post' ? 'Writing your social post...' : 'Writing your content...')

  return (
    <div className="h-full flex flex-col p-6 space-y-6" data-testid="content-generation-loader">
      {/* Status chip */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <div className="relative flex items-center justify-center">
            <PhaseIcon className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
          <span className="font-medium text-primary">{label}</span>
        </div>
      </div>

      {/* Phase-specific skeletons */}
      {status === 'research' && (
        <>
          {/* Source cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </>
      )}

      {(status === 'foundations' || status === 'skeleton') && (
        <>
          {/* Characteristic cards */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {(status === 'writing' || status === 'humanity_checking' || !status) && (
        <>
          {/* Article shimmer */}
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-6 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </>
      )}

      {status === 'creating_visuals' && (
        <>
          {/* Image placeholders */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 space-y-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          {/* Content preview below images */}
          <Skeleton className="h-6 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </>
      )}

      {/* Bottom spinner */}
      <div className="flex justify-center pt-4">
        <Spinner size="sm" className="opacity-40" />
      </div>
    </div>
  )
}

export default ContentGenerationLoader
