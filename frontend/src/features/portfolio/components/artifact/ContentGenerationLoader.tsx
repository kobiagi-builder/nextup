/**
 * ContentGenerationLoader Component
 *
 * Shimmer loading skeleton shown during the 'writing' pipeline phase.
 * Mimics article content layout to give users a preview of what's coming.
 */

import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface ContentGenerationLoaderProps {
  artifactType: string
}

export function ContentGenerationLoader({ artifactType }: ContentGenerationLoaderProps) {
  const label =
    artifactType === 'social_post'
      ? 'Writing your social post...'
      : 'Writing your content...'

  return (
    <div className="h-full flex flex-col p-6 space-y-6" data-testid="content-generation-loader">
      {/* Status message */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{label}</span>
      </div>

      {/* Shimmer: Title */}
      <Skeleton className="h-8 w-3/4" />

      {/* Shimmer: Paragraph lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Shimmer: Section heading */}
      <Skeleton className="h-6 w-1/2" />

      {/* Shimmer: Paragraph lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Shimmer: Image placeholder */}
      <Skeleton className="h-48 w-full rounded-lg" />

      {/* Shimmer: Section heading */}
      <Skeleton className="h-6 w-2/5" />

      {/* Shimmer: Paragraph lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export default ContentGenerationLoader
