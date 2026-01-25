/**
 * Empty State Component
 *
 * Display when no content is available.
 */

import type { LucideIcon } from 'lucide-react'
import { FileX, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Empty state display with optional action button
 */
export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>

      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}

      {action && (
        <Button onClick={action.onClick} className="mt-6">
          <Plus className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  )
}

/**
 * Empty state for artifact lists
 */
export function EmptyArtifacts({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No artifacts yet"
      description="Create your first piece of content to get started with your portfolio."
      action={{
        label: 'Create Artifact',
        onClick: onCreate,
      }}
    />
  )
}

/**
 * Empty state for topic lists
 */
export function EmptyTopics({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No topics yet"
      description="Add ideas to your backlog to plan your content creation."
      action={{
        label: 'Add Topic',
        onClick: onCreate,
      }}
    />
  )
}

/**
 * Empty state for skills
 */
export function EmptySkills({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No skills added"
      description="Add your skills to help AI understand your expertise and create better content."
      action={{
        label: 'Add Skill',
        onClick: onCreate,
      }}
    />
  )
}

/**
 * Empty state for style examples
 */
export function EmptyStyleExamples({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No writing samples"
      description="Add examples of your writing to help AI match your voice and style."
      action={{
        label: 'Add Sample',
        onClick: onCreate,
      }}
    />
  )
}

/**
 * Empty state for search results
 */
export function EmptySearchResults() {
  return (
    <EmptyState
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
    />
  )
}
