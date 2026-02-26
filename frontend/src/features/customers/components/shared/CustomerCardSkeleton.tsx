/**
 * Customer Card Skeleton
 *
 * Loading placeholder matching the CustomerCard layout.
 */

import { Skeleton } from '@/components/ui/skeleton'

export function CustomerCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* About preview */}
      <Skeleton className="mt-2 h-4 w-full max-w-md" />
      {/* Metrics row */}
      <div className="mt-2 flex items-center gap-4">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-3.5 w-16 ml-auto" />
      </div>
    </div>
  )
}
