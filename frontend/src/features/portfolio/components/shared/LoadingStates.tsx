/**
 * Loading States Components
 *
 * Skeleton loaders for various UI patterns.
 */

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// =============================================================================
// Card Skeleton
// =============================================================================

interface CardSkeletonProps {
  className?: string
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-3', className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

// =============================================================================
// Grid Skeleton
// =============================================================================

interface GridSkeletonProps {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}

export function GridSkeleton({ count = 6, columns = 3, className }: GridSkeletonProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid grid-cols-1 gap-4', gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// =============================================================================
// Kanban Column Skeleton
// =============================================================================

export function KanbanColumnSkeleton() {
  return (
    <div className="rounded-xl bg-card border border-border min-h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
      </div>
      {/* Cards */}
      <div className="flex-1 p-4 space-y-3">
        <TopicCardSkeleton />
        <TopicCardSkeleton />
        <TopicCardSkeleton />
      </div>
    </div>
  )
}

export function TopicCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-4 mt-0.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <Skeleton className="h-5 w-20 rounded" />
    </div>
  )
}

export function KanbanBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
    </div>
  )
}

// =============================================================================
// Profile Section Skeleton
// =============================================================================

export function ProfileSectionSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-16 rounded" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

// =============================================================================
// Stats Card Skeleton
// =============================================================================

export function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  )
}

// =============================================================================
// List Item Skeleton
// =============================================================================

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded" />
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-xl border bg-card divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  )
}

// =============================================================================
// Page Header Skeleton
// =============================================================================

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  )
}

// =============================================================================
// Editor Skeleton
// =============================================================================

export function EditorSkeleton() {
  return (
    <div className="flex h-full">
      {/* Editor panel */}
      <div className="w-[60%] border-r flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
      {/* Chat panel */}
      <div className="w-[40%] flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default {
  CardSkeleton,
  GridSkeleton,
  KanbanColumnSkeleton,
  KanbanBoardSkeleton,
  TopicCardSkeleton,
  ProfileSectionSkeleton,
  StatsCardSkeleton,
  StatsGridSkeleton,
  ListItemSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  EditorSkeleton,
}
