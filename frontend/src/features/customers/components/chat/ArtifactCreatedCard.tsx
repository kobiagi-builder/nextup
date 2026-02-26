/**
 * ArtifactCreatedCard — Structured card for artifact creation
 *
 * Purple-bordered card showing type badge, title, and project info.
 * Rendered when createArtifact tool executes successfully.
 */

import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArtifactCreatedCardProps {
  title: string
  artifactType: string
  className?: string
}

const TYPE_COLORS: Record<string, string> = {
  strategy: 'bg-blue-500/10 text-blue-400',
  research: 'bg-emerald-500/10 text-emerald-400',
  roadmap: 'bg-orange-500/10 text-orange-400',
  competitive_analysis: 'bg-red-500/10 text-red-400',
  user_research: 'bg-teal-500/10 text-teal-400',
  product_spec: 'bg-indigo-500/10 text-indigo-400',
  meeting_notes: 'bg-gray-500/10 text-gray-400',
  presentation: 'bg-pink-500/10 text-pink-400',
  ideation: 'bg-yellow-500/10 text-yellow-400',
  custom: 'bg-slate-500/10 text-slate-400',
}

function formatType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function ArtifactCreatedCard({ title, artifactType, className }: ArtifactCreatedCardProps) {
  const typeColor = TYPE_COLORS[artifactType] || TYPE_COLORS.custom

  return (
    <div className={cn(
      'rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 my-2',
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium text-purple-500">Artifact Created</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeColor)}>
          {formatType(artifactType)}
        </span>
        <span className="text-sm font-medium truncate">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Open the Projects tab to view and edit this artifact.
      </p>
    </div>
  )
}
