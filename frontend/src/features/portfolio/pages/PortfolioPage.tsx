/**
 * Portfolio Page (Combined Content + AI Research)
 *
 * Combines the Content view with AI Research Assistant.
 * Lists all artifacts with filters, and provides AI-powered topic research.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FileText, MessageSquare, Trophy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useArtifacts, useCreateArtifact, useDeleteArtifact } from '../hooks/useArtifacts'
import { ArtifactCard, EmptyArtifacts, GridSkeleton, ChatPanel } from '../components'
import { ArtifactForm } from '../components/forms'
import type { ArtifactType, ArtifactStatus, CreateArtifactInput } from '../types/portfolio'
import { cn } from '@/lib/utils'

/** Type filter options */
const TYPE_FILTERS: { value: ArtifactType | 'all'; label: string; icon?: React.ElementType }[] = [
  { value: 'all', label: 'All' },
  { value: 'social_post', label: 'Posts', icon: MessageSquare },
  { value: 'blog', label: 'Blogs', icon: FileText },
  { value: 'showcase', label: 'Showcases', icon: Trophy },
]

/** Status filter options */
const STATUS_FILTERS: { value: ArtifactStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export function PortfolioPage() {
  const navigate = useNavigate()

  // State for filters
  const [typeFilter, setTypeFilter] = useState<ArtifactType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ArtifactStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAIResearchOpen, setIsAIResearchOpen] = useState(false)

  // Data hooks
  const { data: artifacts = [], isLoading } = useArtifacts()
  const createArtifact = useCreateArtifact()
  const deleteArtifact = useDeleteArtifact()

  // Filter artifacts
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((artifact) => {
      // Type filter
      if (typeFilter !== 'all' && artifact.type !== typeFilter) return false

      // Status filter
      if (statusFilter !== 'all' && artifact.status !== statusFilter) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = artifact.title?.toLowerCase().includes(query)
        const matchesTags = artifact.tags.some((tag) => tag.toLowerCase().includes(query))
        if (!matchesTitle && !matchesTags) return false
      }

      return true
    })
  }, [artifacts, typeFilter, statusFilter, searchQuery])

  // Handle create artifact
  const handleCreate = async (data: CreateArtifactInput) => {
    try {
      const created = await createArtifact.mutateAsync(data)
      setIsCreateOpen(false)
      // Navigate to the new artifact
      if (created) {
        navigate(`/portfolio/artifacts/${created.id}`)
      }
    } catch (error) {
      console.error('Failed to create artifact:', error)
    }
  }

  // Handle delete artifact
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this artifact?')) {
      try {
        await deleteArtifact.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete artifact:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-display-md font-semibold text-foreground">
          Portfolio
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => setIsAIResearchOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            AI Research
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2" data-testid="portfolio-new-button">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Type tabs */}
        <div className="flex rounded-lg bg-secondary p-1">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTypeFilter(filter.value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                typeFilter === filter.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ArtifactStatus | 'all')}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <GridSkeleton count={6} columns={3} />
      ) : filteredArtifacts.length === 0 ? (
        artifacts.length === 0 ? (
          <EmptyArtifacts onCreate={() => setIsCreateOpen(true)} />
        ) : (
          <div className="rounded-xl bg-card p-12 border border-border text-center">
            <h3 className="text-heading-md font-semibold text-foreground mb-2">
              No matching content
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArtifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onEdit={() => navigate(`/portfolio/artifacts/${artifact.id}`)}
              onDelete={() => handleDelete(artifact.id)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl" data-portal-ignore-click-outside data-testid="create-artifact-dialog">
          <DialogHeader>
            <DialogTitle>Create New Content</DialogTitle>
          </DialogHeader>
          <ArtifactForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createArtifact.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* AI Research Sheet */}
      <Sheet open={isAIResearchOpen} onOpenChange={setIsAIResearchOpen}>
        <SheetContent side="right" className="w-[450px] sm:w-[650px] p-0" data-portal-ignore-click-outside>
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Research Assistant
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)]">
            <ChatPanel
              contextKey="portfolio:research"
              title="Content Research"
              showHeader={false}
              height="100%"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default PortfolioPage
