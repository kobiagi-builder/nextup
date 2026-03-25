/**
 * Documents Tab
 *
 * Flat view of all documents grouped under collapsible initiative sections
 * and folder sections. Includes client-side filter bar.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, FileText, FilterX } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { useFilterStore } from '@/stores/filterStore'
import {
  useInitiatives,
  useDeleteInitiative,
  useCustomerDocuments,
  useDeleteDocument,
  useDocumentFolders,
  useDeleteFolder,
} from '../../hooks'
import type {
  InitiativeStatus,
  InitiativeWithCounts,
  CustomerDocument,
} from '../../types'
import { InitiativeSection } from './InitiativeSection'
import { FolderSection } from './FolderSection'
import { DocumentsFilterBar } from './DocumentsFilterBar'
import { FolderManager } from './FolderManager'
import { InitiativeForm } from './InitiativeForm'
import { DocumentForm } from './DocumentForm'
import { DocumentEditor } from './DocumentEditor'

interface DocumentsTabProps {
  customerId: string
  openDocumentId?: string | null
  onOpenDocumentHandled?: () => void
}

const STATUS_ORDER: Record<InitiativeStatus, number> = {
  active: 0,
  planning: 1,
  on_hold: 2,
  completed: 3,
  archived: 4,
}

export function DocumentsTab({ customerId, openDocumentId, onOpenDocumentHandled }: DocumentsTabProps) {
  const { data: initiatives = [], isLoading: initiativesLoading } = useInitiatives(customerId)
  const { data: documents = [], isLoading: documentsLoading } = useCustomerDocuments(customerId)
  const { data: folders = [], isLoading: foldersLoading } = useDocumentFolders(customerId)
  const deleteInitiative = useDeleteInitiative(customerId)
  const deleteDocument = useDeleteDocument(customerId)
  const deleteFolder = useDeleteFolder(customerId)

  // Form/editor state
  const [initiativeFormOpen, setInitiativeFormOpen] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState<InitiativeWithCounts | null>(null)
  const [documentFormOpen, setDocumentFormOpen] = useState(false)
  const [documentFormInitiativeId, setDocumentFormInitiativeId] = useState<string | undefined>()
  const [editingDocument, setEditingDocument] = useState<CustomerDocument | null>(null)

  // Auto-open document from navigation state (e.g., clicking doc link on action item)
  useEffect(() => {
    if (openDocumentId && documents.length > 0) {
      const doc = documents.find((d) => d.id === openDocumentId)
      if (doc) {
        setEditingDocument(doc)
        onOpenDocumentHandled?.()
      }
    }
  }, [openDocumentId, documents, onOpenDocumentHandled])

  // Collapse state (session only)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Filter state (sticky via Zustand store)
  const docFiltersState = useFilterStore((s) => s.customerDocuments[customerId])
  const initiativeStatusFilter = docFiltersState?.initiativeStatus ?? []
  const documentStatusFilter = docFiltersState?.documentStatus ?? []
  const nameSearch = docFiltersState?.nameSearch ?? ''
  const setDocFilters = (filters: Partial<{ initiativeStatus: string[]; documentStatus: string[]; nameSearch: string }>) =>
    useFilterStore.getState().setCustomerDocumentsFilters(customerId, filters)
  const setInitiativeStatusFilter = (v: string[]) => setDocFilters({ initiativeStatus: v })
  const setDocumentStatusFilter = (v: string[]) => setDocFilters({ documentStatus: v })
  const setNameSearch = (v: string) => setDocFilters({ nameSearch: v })

  const hasActiveFilters = !!(initiativeStatusFilter.length > 0 || nameSearch || documentStatusFilter.length > 0)

  const clearFilters = () => {
    setDocFilters({ initiativeStatus: [], documentStatus: [], nameSearch: '' })
  }

  // Group documents by initiative_id and folder_id
  const { byInitiative, byFolder } = useMemo(() => {
    const initGroups: Record<string, CustomerDocument[]> = {}
    const folderGroups: Record<string, CustomerDocument[]> = {}

    documents.forEach(doc => {
      if (doc.folder_id) {
        if (!folderGroups[doc.folder_id]) folderGroups[doc.folder_id] = []
        folderGroups[doc.folder_id].push(doc)
      } else {
        if (!initGroups[doc.initiative_id]) initGroups[doc.initiative_id] = []
        initGroups[doc.initiative_id].push(doc)
      }
    })

    return { byInitiative: initGroups, byFolder: folderGroups }
  }, [documents])

  // Sort initiatives: active first, then planning, on_hold, completed, archived
  const sortedInitiatives = useMemo(() => {
    return [...initiatives].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  }, [initiatives])

  // Sort folders: non-system first by sort_order, system (General) last
  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      if (a.is_system !== b.is_system) return a.is_system ? 1 : -1
      return a.sort_order - b.sort_order
    })
  }, [folders])

  // Filter documents within a section by document status
  const filterDocuments = useCallback((docs: CustomerDocument[]) => {
    if (documentStatusFilter.length === 0) return docs
    return docs.filter(d => documentStatusFilter.includes(d.status))
  }, [documentStatusFilter])

  // Filter initiatives by status and name
  const filteredInitiatives = useMemo(() => {
    let filtered = sortedInitiatives

    if (initiativeStatusFilter.length > 0) {
      filtered = filtered.filter(i => initiativeStatusFilter.includes(i.status))
    }

    if (nameSearch) {
      const search = nameSearch.toLowerCase()
      filtered = filtered.filter(i => i.name.toLowerCase().includes(search))
    }

    // Hide initiatives with 0 matching docs when doc filter is active
    if (documentStatusFilter.length > 0) {
      filtered = filtered.filter(i => {
        const docs = filterDocuments(byInitiative[i.id] || [])
        return docs.length > 0
      })
    }

    return filtered
  }, [sortedInitiatives, initiativeStatusFilter, nameSearch, documentStatusFilter, filterDocuments, byInitiative])

  // Filter folders by name
  const filteredFolders = useMemo(() => {
    let filtered = sortedFolders

    if (nameSearch) {
      const search = nameSearch.toLowerCase()
      filtered = filtered.filter(f => f.name.toLowerCase().includes(search))
    }

    // Hide folders with 0 matching docs when doc filter is active
    if (documentStatusFilter.length > 0) {
      filtered = filtered.filter(f => {
        const docs = filterDocuments(byFolder[f.id] || [])
        return docs.length > 0
      })
    }

    return filtered
  }, [sortedFolders, nameSearch, documentStatusFilter, filterDocuments, byFolder])

  const isLoading = initiativesLoading || documentsLoading || foldersLoading

  // Handlers
  const handleEditInitiative = (initiative: InitiativeWithCounts) => {
    setEditingInitiative(initiative)
    setInitiativeFormOpen(true)
  }

  const handleDeleteInitiative = async (id: string) => {
    try {
      await deleteInitiative.mutateAsync(id)
      toast({ title: 'Initiative deleted' })
    } catch {
      toast({ title: 'Failed to delete initiative', variant: 'destructive' })
    }
  }

  const handleInitiativeFormClose = (open: boolean) => {
    setInitiativeFormOpen(open)
    if (!open) setEditingInitiative(null)
  }

  const handleDocumentClick = (doc: CustomerDocument) => {
    setEditingDocument(doc)
  }

  const handleNewDocument = (initiativeId?: string) => {
    setDocumentFormInitiativeId(initiativeId)
    setDocumentFormOpen(true)
  }

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder.mutateAsync(id)
      toast({ title: 'Folder deleted' })
    } catch {
      toast({ title: 'Failed to delete folder', variant: 'destructive' })
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div data-testid="documents-tab" className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border/30 bg-card p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  const totalDocs = documents.length
  const totalInitiatives = initiatives.length
  const isEmpty = totalDocs === 0 && totalInitiatives === 0 && folders.length === 0
  const noFilterResults = hasActiveFilters && filteredInitiatives.length === 0 && filteredFolders.length === 0

  return (
    <div data-testid="documents-tab">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {totalDocs} {totalDocs === 1 ? 'Document' : 'Documents'}
          {totalInitiatives > 0 && ` across ${totalInitiatives} ${totalInitiatives === 1 ? 'initiative' : 'initiatives'}`}
        </h3>
        {!isEmpty && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setInitiativeFormOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Initiative
            </Button>
            <Button size="sm" onClick={() => handleNewDocument()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Document
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No documents yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Organize your work into initiatives with strategy docs, research, roadmaps, and more.
          </p>
          <Button onClick={() => setInitiativeFormOpen(true)} className="mt-4">
            Create First Initiative
          </Button>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <DocumentsFilterBar
            initiativeStatusFilter={initiativeStatusFilter}
            onInitiativeStatusChange={setInitiativeStatusFilter}
            nameSearch={nameSearch}
            onNameSearchChange={setNameSearch}
            documentStatusFilter={documentStatusFilter}
            onDocumentStatusChange={setDocumentStatusFilter}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          {/* No filter results */}
          {noFilterResults ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="no-filter-results">
              <FilterX className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No documents match your filters</p>
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Initiative sections */}
              {filteredInitiatives.map((initiative) => (
                <InitiativeSection
                  key={initiative.id}
                  initiative={initiative}
                  documents={filterDocuments(byInitiative[initiative.id] ?? [])}
                  isCollapsed={collapsedSections.has(initiative.id)}
                  onToggle={() => toggleSection(initiative.id)}
                  onEdit={handleEditInitiative}
                  onDelete={handleDeleteInitiative}
                  onDocumentClick={handleDocumentClick}
                />
              ))}

              {/* Folders separator */}
              {filteredFolders.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-1" data-testid="folders-separator">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Folders
                    </span>
                    <FolderManager customerId={customerId} folders={folders} />
                  </div>

                  {/* Folder sections */}
                  {filteredFolders.map((folder) => (
                    <FolderSection
                      key={folder.id}
                      folder={folder}
                      documents={filterDocuments(byFolder[folder.id] ?? [])}
                      isCollapsed={collapsedSections.has(`folder-${folder.id}`)}
                      onToggle={() => toggleSection(`folder-${folder.id}`)}
                      onDocumentClick={handleDocumentClick}
                      onDelete={handleDeleteFolder}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Initiative create/edit form */}
      <InitiativeForm
        customerId={customerId}
        initiative={editingInitiative}
        open={initiativeFormOpen}
        onOpenChange={handleInitiativeFormClose}
      />

      {/* Document create form */}
      <DocumentForm
        customerId={customerId}
        initiatives={initiatives}
        folders={folders}
        open={documentFormOpen}
        onOpenChange={setDocumentFormOpen}
        defaultInitiativeId={documentFormInitiativeId}
        onDocumentCreated={(doc) => setEditingDocument(doc)}
      />

      {/* Document editor sheet */}
      <DocumentEditor
        customerId={customerId}
        document={editingDocument}
        initiatives={initiatives}
        folders={folders}
        onClose={() => setEditingDocument(null)}
        onDelete={async (docId, initiativeId) => {
          try {
            await deleteDocument.mutateAsync({ id: docId, initiativeId })
            setEditingDocument(null)
            toast({ title: 'Document deleted' })
          } catch {
            toast({ title: 'Failed to delete document', variant: 'destructive' })
          }
        }}
      />
    </div>
  )
}
