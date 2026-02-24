/**
 * WritingReferencesManager — Full writing references UI with tabs, cards, and upload.
 *
 * Embeddable component used in SettingsPage.
 * Includes: "All" tab (default) + per-type tabs (Blog | Social Post | Showcase).
 * Each card has a type-change pill dropdown.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Plus,
  FileText,
  MessageSquare,
  Trophy,
  Loader2,
  PenLine,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  useWritingExamples,
  useCreateWritingExample,
  useDeleteWritingExample,
  useUpdateWritingExample,
  useUploadWritingExample,
  useExtractFromUrl,
  useRetryExtraction,
  useExtractPublication,
} from '../../hooks/useWritingExamples'
import { ReferenceCard } from './ReferenceCard'
import { ReferenceDetailSheet } from './ReferenceDetailSheet'
import { ReferenceUploadDialog } from './ReferenceUploadDialog'
import type { ArtifactType, UserWritingExample } from '../../types/portfolio'

// =============================================================================
// Tab types
// =============================================================================

type TabValue = 'all' | ArtifactType

const TABS: {
  value: TabValue
  label: string
  icon: React.ElementType
  emptyTitle: string
  emptyDescription: string
}[] = [
  {
    value: 'all',
    label: 'All',
    icon: Layers,
    emptyTitle: 'No writing references yet',
    emptyDescription:
      'Add examples of your writing to teach the AI your voice for each content type.',
  },
  {
    value: 'blog',
    label: 'Blog',
    icon: FileText,
    emptyTitle: 'No blog references yet',
    emptyDescription:
      'Add examples of your blog writing to teach the AI your long-form voice.',
  },
  {
    value: 'social_post',
    label: 'Social Post',
    icon: MessageSquare,
    emptyTitle: 'No social post references yet',
    emptyDescription:
      'Add examples of your social media posts to teach the AI your short-form voice.',
  },
  {
    value: 'showcase',
    label: 'Showcase',
    icon: Trophy,
    emptyTitle: 'No showcase references yet',
    emptyDescription:
      'Add examples of your case studies to teach the AI your storytelling voice.',
  },
]

// =============================================================================
// Component
// =============================================================================

export function WritingReferencesManager() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detailRef, setDetailRef] = useState<UserWritingExample | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Data hooks
  const { data: allExamples = [], isLoading } = useWritingExamples()
  const createExample = useCreateWritingExample()
  const deleteExample = useDeleteWritingExample()
  const updateExample = useUpdateWritingExample()
  const uploadExample = useUploadWritingExample()
  const extractFromUrl = useExtractFromUrl()
  const retryExtraction = useRetryExtraction()
  const extractPublication = useExtractPublication()

  // Group references by artifact type + "all"
  const grouped = useMemo(() => {
    const map: Record<TabValue, UserWritingExample[]> = {
      all: allExamples,
      blog: [],
      social_post: [],
      showcase: [],
    }
    for (const ex of allExamples) {
      if (ex.artifact_type && map[ex.artifact_type]) {
        map[ex.artifact_type].push(ex)
      }
    }
    return map
  }, [allExamples])

  // Delete: two-step with confirmation dialog
  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteTarget(id)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget)
    setDeleteTarget(null)
    try {
      await deleteExample.mutateAsync(deleteTarget)
      if (detailRef?.id === deleteTarget) setDetailRef(null)
    } catch {
      // Error logged in hook
    } finally {
      setDeletingId(null)
    }
  }, [deleteExample, detailRef, deleteTarget])

  // Type change handler for the pill dropdown on each card
  const handleTypeChange = useCallback(
    async (id: string, newType: ArtifactType) => {
      try {
        await updateExample.mutateAsync({ id, data: { artifact_type: newType } })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: error instanceof Error ? error.message : 'Could not update the reference type.',
        })
      }
    },
    [updateExample, toast]
  )

  // Submit handlers for each upload method
  const handlePasteSubmit = useCallback(
    async (data: { name: string; content: string; artifactType: ArtifactType }) => {
      try {
        await createExample.mutateAsync({
          name: data.name,
          content: data.content,
          source_type: 'pasted',
          artifact_type: data.artifactType,
        })
      } catch (error) {
        toast({ variant: 'destructive', title: 'Upload failed', description: error instanceof Error ? error.message : 'Could not save the reference.' })
        throw error
      }
    },
    [createExample, toast]
  )

  const handleFileSubmit = useCallback(
    async (data: { file: File; name: string; artifactType: ArtifactType }) => {
      try {
        await uploadExample.mutateAsync({
          file: data.file,
          name: data.name,
          artifact_type: data.artifactType,
        })
      } catch (error) {
        toast({ variant: 'destructive', title: 'Upload failed', description: error instanceof Error ? error.message : 'Could not upload the file.' })
        throw error
      }
    },
    [uploadExample, toast]
  )

  const handleFileUrlSubmit = useCallback(
    async (data: { url: string; name: string; artifactType: ArtifactType }) => {
      try {
        await extractFromUrl.mutateAsync({
          url: data.url,
          name: data.name,
          artifact_type: data.artifactType,
        })
      } catch (error) {
        toast({ variant: 'destructive', title: 'Extraction failed', description: error instanceof Error ? error.message : 'Could not extract from that URL.' })
        throw error
      }
    },
    [extractFromUrl, toast]
  )

  const handlePublicationUrlSubmit = useCallback(
    async (data: { url: string; name: string; artifactType: ArtifactType }) => {
      try {
        await extractPublication.mutateAsync({
          url: data.url,
          name: data.name,
          artifact_type: data.artifactType,
        })
      } catch (error) {
        toast({ variant: 'destructive', title: 'Extraction failed', description: error instanceof Error ? error.message : 'Could not extract from that URL.' })
        throw error
      }
    },
    [extractPublication, toast]
  )

  const handleRetry = useCallback(
    async (id: string) => {
      await retryExtraction.mutateAsync(id)
    },
    [retryExtraction]
  )

  // Resolve the artifactType to pass to the upload dialog
  // "all" tab → undefined (dialog shows type selector); specific tab → that type
  const uploadArtifactType = activeTab === 'all' ? undefined : activeTab

  return (
    <>
      {/* Tabbed Layout */}
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as TabValue)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-4 h-10">
          {TABS.map(({ value, label, icon: Icon }) => {
            const count = grouped[value].length
            return (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 text-sm data-[state=active]:text-brand-300"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] font-medium',
                      'data-[state=active]:bg-brand-300/20 data-[state=active]:text-brand-300'
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {TABS.map((tab) => {
          const refs = grouped[tab.value]

          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-4">
              {/* Tab header row */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {refs.length === 0
                    ? 'No references'
                    : `${refs.length} reference${refs.length !== 1 ? 's' : ''}`}
                </p>
                <Button
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Reference
                </Button>
              </div>

              {/* Loading */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : refs.length === 0 ? (
                /* Empty state */
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <PenLine className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">
                    {tab.emptyTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-5">
                    {tab.emptyDescription}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Your First Reference
                  </Button>
                </div>
              ) : (
                /* Reference list */
                <div className="space-y-3">
                  {refs.map((ref) => (
                    <ReferenceCard
                      key={ref.id}
                      reference={ref}
                      onDelete={handleDeleteRequest}
                      onRetry={handleRetry}
                      onTypeChange={handleTypeChange}
                      onClick={setDetailRef}
                      isDeleting={deletingId === ref.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Upload Dialog */}
      <ReferenceUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        artifactType={uploadArtifactType}
        onSubmitPaste={handlePasteSubmit}
        onSubmitFile={handleFileSubmit}
        onSubmitFileUrl={handleFileUrlSubmit}
        onSubmitPublicationUrl={handlePublicationUrlSubmit}
        isSubmitting={createExample.isPending || uploadExample.isPending || extractFromUrl.isPending || extractPublication.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent data-portal-ignore-click-outside>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reference</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this writing reference. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Sheet */}
      <ReferenceDetailSheet
        reference={detailRef}
        open={!!detailRef}
        onClose={() => setDetailRef(null)}
      />
    </>
  )
}
