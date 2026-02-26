/**
 * ProjectCreatedCard — Structured card for project creation
 *
 * Amber-bordered card showing project name.
 * Rendered when createProject tool executes successfully.
 */

import { FolderPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectCreatedCardProps {
  projectName: string
  className?: string
}

export function ProjectCreatedCard({ projectName, className }: ProjectCreatedCardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 my-2',
      className
    )}>
      <div className="flex items-center gap-2 mb-1">
        <FolderPlus className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-500">Project Created</span>
      </div>
      <p className="text-sm font-medium">{projectName}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Switch to the Projects tab to add artifacts to this project.
      </p>
    </div>
  )
}
