/**
 * Project Detail
 *
 * Shows project header (name, status, description, linked agreement) with artifact list.
 * Back button returns to project list. Clicking an artifact opens ArtifactEditor Sheet.
 */

import { useState } from 'react'
import { ArrowLeft, Pencil, Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useProject, useProjectArtifacts, useDeleteArtifact } from '../../hooks'
import { useAgreements } from '../../hooks'
import { useCustomerStore } from '../../stores'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../../types'
import type { ProjectWithCounts, CustomerArtifact } from '../../types'
import { ArtifactRow } from './ArtifactRow'
import { ArtifactForm } from './ArtifactForm'
import { ArtifactEditor } from './ArtifactEditor'
import { ProjectForm } from './ProjectForm'

interface ProjectDetailProps {
  customerId: string
  projectId: string
}

export function ProjectDetail({ customerId, projectId }: ProjectDetailProps) {
  const { setSelectedProjectId } = useCustomerStore()
  const { data: project, isLoading: projectLoading } = useProject(customerId, projectId)
  const { data: artifacts = [], isLoading: artifactsLoading } = useProjectArtifacts(customerId, projectId)
  const { data: agreements = [] } = useAgreements(customerId)
  const deleteArtifact = useDeleteArtifact(customerId, projectId)

  const [editFormOpen, setEditFormOpen] = useState(false)
  const [artifactFormOpen, setArtifactFormOpen] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<CustomerArtifact | null>(null)

  const handleBack = () => {
    setSelectedProjectId(customerId, null)
  }

  const handleArtifactClick = (artifact: CustomerArtifact) => {
    setSelectedArtifact(artifact)
  }

  const handleDeleteArtifact = async (id: string) => {
    try {
      await deleteArtifact.mutateAsync(id)
      toast({ title: 'Artifact deleted' })
    } catch {
      toast({ title: 'Failed to delete artifact', variant: 'destructive' })
    }
  }

  // Loading state
  if (projectLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="h-4 bg-muted rounded w-64 animate-pulse" />
        <div className="space-y-2 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" className="mt-4" onClick={handleBack}>
          Back to Projects
        </Button>
      </div>
    )
  }

  const agreementLabel = project.agreement_id
    ? agreements.find((a) => a.id === project.agreement_id)?.scope || null
    : null

  const statusLabel = PROJECT_STATUS_LABELS[project.status]
  const statusColor = PROJECT_STATUS_COLORS[project.status]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', statusColor)}>
          {statusLabel}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => setEditFormOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Description + Agreement */}
      {(project.description || agreementLabel) && (
        <div className="ml-11 mb-4 space-y-1">
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
          {agreementLabel && (
            <p className="text-xs text-muted-foreground">
              Linked: {agreementLabel.length > 60 ? `${agreementLabel.slice(0, 60)}...` : agreementLabel}
            </p>
          )}
        </div>
      )}

      {/* Artifacts section */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {artifacts.length} {artifacts.length === 1 ? 'Artifact' : 'Artifacts'}
          </h4>
          <Button size="sm" onClick={() => setArtifactFormOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Artifact
          </Button>
        </div>

        {artifactsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : artifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No artifacts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Create strategy documents, research notes, roadmaps, and more.
            </p>
            <Button onClick={() => setArtifactFormOpen(true)} className="mt-4">
              Create First Artifact
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {artifacts.map((artifact) => (
              <ArtifactRow
                key={artifact.id}
                artifact={artifact}
                onClick={handleArtifactClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit project form */}
      <ProjectForm
        customerId={customerId}
        project={project as ProjectWithCounts}
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
      />

      {/* Create artifact form */}
      <ArtifactForm
        customerId={customerId}
        projectId={projectId}
        open={artifactFormOpen}
        onOpenChange={setArtifactFormOpen}
      />

      {/* Artifact editor sheet */}
      <ArtifactEditor
        customerId={customerId}
        projectId={projectId}
        artifact={selectedArtifact}
        open={!!selectedArtifact}
        onOpenChange={(open) => { if (!open) setSelectedArtifact(null) }}
        onDelete={handleDeleteArtifact}
      />
    </div>
  )
}
