/**
 * Projects Tab
 *
 * Tab orchestrator: shows project list or project detail based on Zustand selection.
 * Persists selected project across tab switches.
 */

import { useState } from 'react'
import { Plus, FolderKanban } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { useProjects, useDeleteProject, useAgreements } from '../../hooks'
import { useCustomerStore } from '../../stores'
import type { ProjectWithCounts } from '../../types'
import { ProjectCard } from './ProjectCard'
import { ProjectDetail } from './ProjectDetail'
import { ProjectForm } from './ProjectForm'

interface ProjectsTabProps {
  customerId: string
}

export function ProjectsTab({ customerId }: ProjectsTabProps) {
  const { data: projects = [], isLoading } = useProjects(customerId)
  const { data: agreements = [] } = useAgreements(customerId)
  const deleteProject = useDeleteProject(customerId)
  const { selectedProjectIds, setSelectedProjectId } = useCustomerStore()

  const selectedProjectId = selectedProjectIds[customerId] ?? null

  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithCounts | null>(null)

  // If a project is selected, show detail view
  if (selectedProjectId) {
    return <ProjectDetail customerId={customerId} projectId={selectedProjectId} />
  }

  const handleSelect = (id: string) => {
    setSelectedProjectId(customerId, id)
  }

  const handleEdit = (project: ProjectWithCounts) => {
    setEditingProject(project)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject.mutateAsync(id)
      toast({ title: 'Project deleted' })
    } catch {
      toast({ title: 'Failed to delete project', variant: 'destructive' })
    }
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditingProject(null)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-3" />
            <div className="h-3 bg-muted rounded w-1/4 mb-3" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
        </h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Project list or empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Organize your work into projects with strategy docs, research, roadmaps, and more.
          </p>
          <Button onClick={() => setFormOpen(true)} className="mt-4">
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => {
            const agreementLabel = project.agreement_id
              ? agreements.find((a) => a.id === project.agreement_id)?.scope || null
              : null
            return (
              <ProjectCard
                key={project.id}
                project={project}
                agreementLabel={agreementLabel ? (agreementLabel.length > 50 ? `${agreementLabel.slice(0, 50)}...` : agreementLabel) : null}
                onSelect={handleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      )}

      {/* Create/Edit form */}
      <ProjectForm
        customerId={customerId}
        project={editingProject}
        open={formOpen}
        onOpenChange={handleFormClose}
      />
    </div>
  )
}
