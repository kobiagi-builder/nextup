/**
 * Unit Tests for ReferencePicker Component
 *
 * Tests reference filtering by status and type, selection toggle,
 * show-all-types toggle, empty state rendering, hidden count label,
 * and presence of the Add new reference button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ReferencePicker } from '../../../../src/features/portfolio/components/writing-references/ReferencePicker'
import type { UserWritingExample } from '../../../../src/features/portfolio/types/portfolio'

// =============================================================================
// Mocks
// =============================================================================

// Mock child dialogs and cards to keep tests focused on ReferencePicker logic
vi.mock('../../../../src/features/portfolio/components/writing-references/InlineAddReferenceDialog', () => ({
  InlineAddReferenceDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="inline-add-dialog" /> : null,
}))

// Mock useWritingExamples — will be overridden per test via mockReturnValue
const mockUseWritingExamples = vi.fn()
vi.mock('../../../../src/features/portfolio/hooks/useWritingExamples', () => ({
  useWritingExamples: () => mockUseWritingExamples(),
}))

// =============================================================================
// Fixtures
// =============================================================================

function makeRef(overrides: Partial<UserWritingExample> = {}): UserWritingExample {
  return {
    id: 'ref-001',
    user_id: 'user-123',
    name: 'Blog Reference',
    source_type: 'pasted',
    content: 'Sample content for the reference.',
    word_count: 200,
    source_reference: undefined,
    analyzed_characteristics: {},
    is_active: true,
    artifact_type: 'blog',
    extraction_status: 'success',
    source_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

const blogRef = makeRef({ id: 'blog-1', name: 'Blog Post One', artifact_type: 'blog', extraction_status: 'success' })
const socialRef = makeRef({ id: 'social-1', name: 'Social Post One', artifact_type: 'social_post', extraction_status: 'success' })
const pendingRef = makeRef({ id: 'pending-1', name: 'Pending Reference', artifact_type: 'blog', extraction_status: 'pending' })
const failedRef = makeRef({ id: 'failed-1', name: 'Failed Reference', artifact_type: 'blog', extraction_status: 'failed' })

// =============================================================================
// Tests
// =============================================================================

describe('ReferencePicker', () => {
  const mockOnSelectionChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty list
    mockUseWritingExamples.mockReturnValue({ data: [] })
  })

  describe('Empty state', () => {
    it('renders empty state when no successful references exist', () => {
      mockUseWritingExamples.mockReturnValue({ data: [] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      expect(screen.getByText('Your writing, your voice')).toBeInTheDocument()
    })

    it('renders empty state when all references have non-success extraction status', () => {
      mockUseWritingExamples.mockReturnValue({ data: [pendingRef, failedRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      expect(screen.getByText('Your writing, your voice')).toBeInTheDocument()
    })

    it('opens inline add dialog when empty state CTA is clicked', () => {
      mockUseWritingExamples.mockReturnValue({ data: [] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      const btn = screen.getByRole('button', { name: /Add your first reference/i })
      fireEvent.click(btn)
      expect(screen.getByTestId('inline-add-dialog')).toBeInTheDocument()
    })
  })

  describe('Renders references', () => {
    it('renders all successful references matching contentType', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef, socialRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      // blog type is shown, social type is filtered out
      expect(screen.getByText('Blog Post One')).toBeInTheDocument()
      expect(screen.queryByText('Social Post One')).not.toBeInTheDocument()
    })

    it('only shows references with extraction_status === "success"', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef, pendingRef, failedRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      expect(screen.getByText('Blog Post One')).toBeInTheDocument()
      expect(screen.queryByText('Pending Reference')).not.toBeInTheDocument()
      expect(screen.queryByText('Failed Reference')).not.toBeInTheDocument()
    })

    it('shows the "Add new reference" button when references exist', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      expect(screen.getByText('Add new reference')).toBeInTheDocument()
    })
  })

  describe('Show all types toggle', () => {
    it('shows hidden count button when references of other types are hidden', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef, socialRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      // socialRef is hidden, so "+1" should appear
      expect(screen.getByText(/Show all types \(\+1\)/)).toBeInTheDocument()
    })

    it('reveals hidden references after clicking "Show all types"', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef, socialRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      fireEvent.click(screen.getByText(/Show all types/))
      // Now social reference should appear
      expect(screen.getByText('Social Post One')).toBeInTheDocument()
    })

    it('hides the "Show all types" toggle after expanding (hiddenCount becomes 0)', () => {
      // When showAllTypes=true, filteredRefs === successfulRefs → hiddenCount=0
      // The component only renders the toggle when hiddenCount > 0.
      // So after expanding, neither "Show all types" nor "Show matching only" appears.
      mockUseWritingExamples.mockReturnValue({ data: [blogRef, socialRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      fireEvent.click(screen.getByText(/Show all types/))
      // Toggle button disappears because hiddenCount is now 0
      expect(screen.queryByText(/Show all types/)).not.toBeInTheDocument()
      expect(screen.queryByText('Show matching only')).not.toBeInTheDocument()
    })

    it('a fresh instance only shows matching type references by default', () => {
      // Verify that the type filter is correctly applied on initial render.
      // A fresh ReferencePicker with contentType="social_post" should only show socialRef.
      mockUseWritingExamples.mockReturnValue({ data: [blogRef, socialRef] })
      render(
        <ReferencePicker
          contentType="social_post"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      // social_post matches social post ref → visible
      expect(screen.getByText('Social Post One')).toBeInTheDocument()
      // blog does NOT match → hidden behind "Show all types"
      expect(screen.queryByText('Blog Post One')).not.toBeInTheDocument()
      // The hidden count toggle should appear with +1
      expect(screen.getByText(/Show all types \(\+1\)/)).toBeInTheDocument()
    })

    it('does not show toggle when all references match contentType', () => {
      const blogRef2 = makeRef({ id: 'blog-2', name: 'Blog Post Two', artifact_type: 'blog', extraction_status: 'success' })
      mockUseWritingExamples.mockReturnValue({ data: [blogRef, blogRef2] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      expect(screen.queryByText(/Show all types/)).not.toBeInTheDocument()
    })
  })

  describe('Selection behavior', () => {
    it('calls onSelectionChange with added ID when a card is clicked (unselected → selected)', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      // Click the card (role="button" for blog reference card)
      const cards = screen.getAllByRole('button')
      // The first card corresponds to the reference; the last is "Add new reference"
      const referenceCard = cards[0]
      fireEvent.click(referenceCard)
      expect(mockOnSelectionChange).toHaveBeenCalledWith(['blog-1'])
    })

    it('calls onSelectionChange removing ID when a selected card is clicked (selected → unselected)', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={['blog-1']}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      const cards = screen.getAllByRole('button')
      const referenceCard = cards[0]
      fireEvent.click(referenceCard)
      expect(mockOnSelectionChange).toHaveBeenCalledWith([])
    })

    it('shows selected count when selections > 0', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={['blog-1']}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    it('does not show selected count when no selections', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
    })
  })

  describe('Inline add dialog', () => {
    it('opens add dialog when "Add new reference" button is clicked', () => {
      mockUseWritingExamples.mockReturnValue({ data: [blogRef] })
      render(
        <ReferencePicker
          contentType="blog"
          selectedIds={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      )
      fireEvent.click(screen.getByText('Add new reference'))
      expect(screen.getByTestId('inline-add-dialog')).toBeInTheDocument()
    })
  })
})
