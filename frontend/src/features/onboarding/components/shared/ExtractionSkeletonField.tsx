/**
 * ExtractionSkeletonField
 *
 * Skeleton placeholder for a single field during extraction.
 * aria-hidden prevents screen readers from encountering shimmer content.
 */

import { Skeleton } from '@/components/ui/skeleton'

interface ExtractionSkeletonFieldProps {
  type: 'textarea' | 'input' | 'chips'
}

export function ExtractionSkeletonField({ type }: ExtractionSkeletonFieldProps) {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      <Skeleton className="h-3 w-20" />
      {type === 'textarea' && (
        <>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </>
      )}
      {type === 'input' && <Skeleton className="h-9 w-32" />}
      {type === 'chips' && (
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      )}
    </div>
  )
}
