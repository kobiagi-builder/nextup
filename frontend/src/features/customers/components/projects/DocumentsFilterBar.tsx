/**
 * Documents Filter Bar
 *
 * Client-side filter controls: initiative status, name search, document status.
 * All filters use AND logic. Status filters are multi-select.
 */

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { MultiSelectFilter } from '../shared/MultiSelectFilter'
import {
  INITIATIVE_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  INITIATIVE_STATUSES,
  DOCUMENT_STATUSES,
} from '../../types'

interface DocumentsFilterBarProps {
  initiativeStatusFilter: string[]
  onInitiativeStatusChange: (statuses: string[]) => void
  nameSearch: string
  onNameSearchChange: (value: string) => void
  documentStatusFilter: string[]
  onDocumentStatusChange: (statuses: string[]) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function DocumentsFilterBar({
  initiativeStatusFilter,
  onInitiativeStatusChange,
  nameSearch,
  onNameSearchChange,
  documentStatusFilter,
  onDocumentStatusChange,
  hasActiveFilters,
  onClearFilters,
}: DocumentsFilterBarProps) {
  return (
    <div data-testid="documents-filter-bar" className="flex items-center gap-2 mb-4">
      {/* Initiative Status */}
      <MultiSelectFilter
        label="Initiative Status"
        selected={initiativeStatusFilter}
        onChange={onInitiativeStatusChange}
        options={INITIATIVE_STATUSES.map((s) => ({
          value: s,
          label: INITIATIVE_STATUS_LABELS[s],
        }))}
      />

      {/* Name Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={nameSearch}
          onChange={(e) => onNameSearchChange(e.target.value)}
          placeholder="Search..."
          className="w-[200px] h-8 text-xs pl-8"
          data-testid="filter-name-search"
        />
        {nameSearch && (
          <button
            onClick={() => onNameSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            data-testid="filter-name-clear"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Document Status */}
      <MultiSelectFilter
        label="Doc Status"
        selected={documentStatusFilter}
        onChange={onDocumentStatusChange}
        options={DOCUMENT_STATUSES.map((s) => ({
          value: s,
          label: DOCUMENT_STATUS_LABELS[s],
        }))}
      />

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs text-primary hover:underline ml-1"
          data-testid="filter-clear"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
