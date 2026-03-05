/**
 * Portfolio Page (Combined Content + AI Research)
 *
 * Combines the Content view with AI Research Assistant.
 * Lists all artifacts with filters, and provides AI-powered topic research.
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Plus, Search, FileText, MessageSquare, Trophy, PanelLeftOpen, PanelLeftClose, ArrowRight, Sparkles, LayoutGrid, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useIsMobile } from '@/hooks/use-media-query'
import { useChatLayoutStore } from '@/stores/chatLayoutStore'
import { useOnboardingProgress } from '@/features/onboarding/hooks/useOnboardingProgress'
import { useArtifacts, useCreateArtifact, useDeleteArtifact } from '../hooks/useArtifacts'
import { ArtifactCard, EmptyArtifacts, GridSkeleton, ChatPanel } from '../components'
import { ArtifactForm } from '../components/forms'
import type { Artifact, ArtifactType, ArtifactStatus, CreateArtifactInput } from '../types/portfolio'
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
  { value: 'ready', label: 'Ready' },
  { value: 'published', label: 'Published' },
]

export function PortfolioPage() {
  const navigate = useNavigate()

  // State for filters
  const [typeFilter, setTypeFilter] = useState<ArtifactType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ArtifactStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Chat layout (split view on desktop, tab-based on mobile)
  const isMobile = useIsMobile()
  const { openChat, closeChat, isOpen: isChatOpen, chatConfig, configVersion } = useChatLayoutStore()
  const [mobileTab, setMobileTab] = useState<'portfolio' | 'assistant'>('portfolio')

  // Auto-open AI assistant on mount (so it's visible after login)
  useEffect(() => {
    if (!isChatOpen) {
      openChat({ contextKey: 'portfolio:research', title: 'Content Research' })
    }
    // Only run on mount — intentionally omitting deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Onboarding resume card
  const { data: onboardingProgress } = useOnboardingProgress()
  const showResumeCard = onboardingProgress && !onboardingProgress.completed_at

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

  // Track which action is loading
  const [loadingAction, setLoadingAction] = useState<'draft' | 'create' | null>(null)

  // Handle save as draft
  const handleSaveDraft = async (data: CreateArtifactInput) => {
    try {
      setLoadingAction('draft')
      const created = await createArtifact.mutateAsync(data)
      setIsCreateOpen(false)
      // Navigate to the new artifact
      if (created) {
        navigate(`/portfolio/artifacts/${created.id}`)
      }
    } catch (error) {
      console.error('Failed to create artifact:', error)
    } finally {
      setLoadingAction(null)
    }
  }

  // Handle create content (save + trigger AI)
  const handleCreateContent = async (data: CreateArtifactInput) => {
    try {
      setLoadingAction('create')
      const created = await createArtifact.mutateAsync(data)
      setIsCreateOpen(false)
      // Navigate to the new artifact with flag to trigger AI
      if (created) {
        navigate(`/portfolio/artifacts/${created.id}?startCreation=true`)
      }
    } catch (error) {
      console.error('Failed to create artifact:', error)
    } finally {
      setLoadingAction(null)
    }
  }

  // Handle create social post from an existing artifact
  const handleCreateSocialPost = async (source: Artifact) => {
    try {
      const created = await createArtifact.mutateAsync({
        type: 'social_post',
        title: `Social Post: ${source.title || 'Untitled'}`,
        tags: source.tags,
        metadata: {
          source_artifact_id: source.id,
          source_artifact_title: source.title,
        },
      })
      if (created) {
        navigate(`/portfolio/artifacts/${created.id}?createSocialPost=true&sourceId=${source.id}`)
      }
    } catch (error) {
      console.error('Failed to create social post artifact:', error)
    }
  }

  // Handle delete artifact — opens confirmation dialog
  const handleDeleteRequest = (id: string) => {
    setDeleteTarget(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteArtifact.mutateAsync(deleteTarget)
    } catch (error) {
      console.error('Failed to delete artifact:', error)
    } finally {
      setDeleteTarget(null)
    }
  }

  // On mobile, show tab-based layout instead of Sheet overlay
  if (isMobile) {
    return (
      <div className="pb-16">
        {/* Mobile tab content */}
        {mobileTab === 'portfolio' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-foreground">Portfolio</h1>
            </div>

            {/* Onboarding resume card */}
            {showResumeCard && (
              <div className="onboarding-animate-fade-up" style={{ animationDelay: '100ms' }}>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Complete your profile</p>
                      <p className="text-xs text-muted-foreground">Help the AI create better content</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="flex-shrink-0">
                    <Link to="/onboarding">
                      Resume
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg bg-secondary p-1">
                {TYPE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setTypeFilter(filter.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      typeFilter === filter.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Content Grid — single column on mobile */}
            {isLoading ? (
              <GridSkeleton count={4} columns={1} />
            ) : filteredArtifacts.length === 0 ? (
              artifacts.length === 0 ? (
                <EmptyArtifacts onCreate={() => setIsCreateOpen(true)} />
              ) : (
                <div className="rounded-xl bg-card p-12 border border-border text-center">
                  <h3 className="text-heading-md font-semibold text-foreground mb-2">No matching content</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredArtifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    onEdit={() => navigate(`/portfolio/artifacts/${artifact.id}`)}
                    onDelete={() => handleDeleteRequest(artifact.id)}
                    onCreateSocialPost={handleCreateSocialPost}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Mobile AI Assistant tab */
          <div className="h-[calc(100vh-8rem)]">
            <ChatPanel
              key={configVersion}
              contextKey={chatConfig?.contextKey || 'portfolio:research'}
              title="AI Assistant"
              showHeader={true}
              height="100%"
            />
          </div>
        )}

        {/* Mobile FAB — New content */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform"
          aria-label="Create new content"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Mobile bottom tab bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 flex h-14 border-t border-border bg-card safe-area-inset-bottom">
          <button
            onClick={() => setMobileTab('portfolio')}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
              mobileTab === 'portfolio' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] font-medium">Portfolio</span>
          </button>
          <button
            onClick={() => {
              setMobileTab('assistant')
              if (!isChatOpen) openChat({ contextKey: 'portfolio:research', title: 'Content Research' })
            }}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
              mobileTab === 'assistant' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-medium">Assistant</span>
          </button>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl" data-portal-ignore-click-outside data-testid="create-artifact-dialog">
            <DialogHeader>
              <DialogTitle>Create New Content</DialogTitle>
            </DialogHeader>
            <ArtifactForm
              onSaveDraft={handleSaveDraft}
              onCreateContent={handleCreateContent}
              onCancel={() => setIsCreateOpen(false)}
              isLoading={createArtifact.isPending}
              loadingAction={loadingAction}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
          <AlertDialogContent data-portal-ignore-click-outside>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Artifact</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this artifact and all its research, writing characteristics, and generated images. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteArtifact.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isChatOpen ? closeChat() : openChat({ contextKey: 'portfolio:research', title: 'Content Research' })}
            data-testid="ai-research-button"
            title={isChatOpen ? 'Close panel' : 'Open AI Research'}
          >
            {isChatOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-xl font-semibold text-foreground">
            Portfolio
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2" data-testid="portfolio-new-button">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {/* Onboarding resume card */}
      {showResumeCard && (
        <div className="onboarding-animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">Complete your profile</p>
                <p className="text-xs text-muted-foreground">
                  Help the AI create better content for you
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="flex-shrink-0">
              <Link to="/onboarding">
                Resume setup
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

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
              onDelete={() => handleDeleteRequest(artifact.id)}
              onCreateSocialPost={handleCreateSocialPost}
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
            onSaveDraft={handleSaveDraft}
            onCreateContent={handleCreateContent}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createArtifact.isPending}
            loadingAction={loadingAction}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Artifact</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this artifact and all its research, writing characteristics, and generated images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteArtifact.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PortfolioPage
