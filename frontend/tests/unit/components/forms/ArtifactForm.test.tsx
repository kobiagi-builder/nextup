/**
 * Integration Tests for ArtifactForm Component
 *
 * Tests the ReferencePicker integration in create vs edit mode,
 * collapsible expand/collapse behavior, and that selected reference
 * IDs flow into the form submission metadata.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ArtifactForm } from '../../../../src/features/portfolio/components/forms/ArtifactForm'
import type { Artifact } from '../../../../src/features/portfolio/types/portfolio'

// =============================================================================
// Mocks
// =============================================================================

// Mock ToneSelector to a simple passthrough to avoid Select portal issues
vi.mock('../../../../src/features/portfolio/components/artifact/ToneSelector', () => ({
  ToneSelector: ({ onChange }: { value?: string; onChange: (t: string) => void }) => (
    <div data-testid="tone-selector">
      <button type="button" onClick={() => onChange('casual')}>Set Casual</button>
    </div>
  ),
}))

// Mock TagsInput to keep test focused
vi.mock('../../../../src/features/portfolio/components/artifact/TagsInput', () => ({
  TagsInput: ({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) => (
    <div data-testid="tags-input">
      <span>{tags.join(',')}</span>
      <button type="button" onClick={() => onChange([...tags, 'new-tag'])}>Add Tag</button>
    </div>
  ),
}))

// Mock ReferencePicker so we can control selection without full hook setup
const mockReferencePickerOnSelectionChange = vi.fn()
vi.mock('../../../../src/features/portfolio/components/writing-references/ReferencePicker', () => ({
  ReferencePicker: ({
    selectedIds,
    onSelectionChange,
    contentType,
  }: {
    selectedIds: string[]
    onSelectionChange: (ids: string[]) => void
    contentType: string
  }) => {
    // Capture the callback for test use
    mockReferencePickerOnSelectionChange.mockImplementation(onSelectionChange)
    return (
      <div data-testid="reference-picker" data-content-type={contentType}>
        <span data-testid="selected-ids">{selectedIds.join(',')}</span>
        <button
          type="button"
          onClick={() => onSelectionChange(['ref-001', 'ref-002'])}
        >
          Select Two Refs
        </button>
      </div>
    )
  },
}))

// =============================================================================
// Fixtures
// =============================================================================

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'art-001',
    user_id: 'user-123',
    account_id: 'acc-001',
    type: 'blog',
    status: 'draft',
    tone: 'professional',
    title: 'My Existing Blog',
    content: 'Existing content.',
    metadata: {} as any,
    tags: [],
    published_url: null,
    published_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('ArtifactForm - ReferencePicker integration', () => {
  const mockOnSaveDraft = vi.fn()
  const mockOnCreateContent = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create mode (no artifact prop)', () => {
    it('shows the Writing References collapsible section', () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )
      // The collapsible trigger contains "Writing References"
      expect(screen.getByText('Writing References')).toBeInTheDocument()
    })

    it('shows the collapsible trigger with "(optional)" label when no references selected', () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText('(optional)')).toBeInTheDocument()
    })

    it('ReferencePicker is not visible before expanding the collapsible', () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )
      // The Radix Collapsible removes content from the DOM entirely when closed,
      // so the picker element is not in the document at all.
      expect(screen.queryByTestId('reference-picker')).not.toBeInTheDocument()
    })

    it('expands collapsible to show ReferencePicker when trigger is clicked', async () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )
      const trigger = screen.getByText('Writing References').closest('button') ??
        screen.getByRole('button', { name: /Writing References/i })
      fireEvent.click(trigger)
      await waitFor(() => {
        expect(screen.getByTestId('reference-picker')).toBeVisible()
      })
    })

    it('shows "Save as Draft" and "Create Content" buttons', () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByTestId('artifact-form-save-draft')).toBeInTheDocument()
      expect(screen.getByTestId('artifact-form-create-content')).toBeInTheDocument()
    })

    it('includes selected reference IDs in metadata when saving draft', async () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )

      // Expand the collapsible
      const trigger = screen.getByText('Writing References').closest('button') ??
        screen.getByRole('button', { name: /Writing References/i })
      fireEvent.click(trigger)

      // Select two references via the mock button
      await waitFor(() => screen.getByText('Select Two Refs'))
      fireEvent.click(screen.getByText('Select Two Refs'))

      // Fill in required title field
      const titleInput = screen.getByTestId('artifact-form-title')
      fireEvent.change(titleInput, { target: { value: 'Test Article' } })

      // Click Save as Draft
      fireEvent.click(screen.getByTestId('artifact-form-save-draft'))

      await waitFor(() => {
        expect(mockOnSaveDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { selectedReferenceIds: ['ref-001', 'ref-002'] },
          })
        )
      })
    })

    it('includes selected reference IDs in metadata when creating content', async () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )

      // Expand the collapsible
      const trigger = screen.getByText('Writing References').closest('button') ??
        screen.getByRole('button', { name: /Writing References/i })
      fireEvent.click(trigger)

      // Select references
      await waitFor(() => screen.getByText('Select Two Refs'))
      fireEvent.click(screen.getByText('Select Two Refs'))

      // Fill in required title
      const titleInput = screen.getByTestId('artifact-form-title')
      fireEvent.change(titleInput, { target: { value: 'Test Article' } })

      // Click Create Content
      fireEvent.click(screen.getByTestId('artifact-form-create-content'))

      await waitFor(() => {
        expect(mockOnCreateContent).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { selectedReferenceIds: ['ref-001', 'ref-002'] },
          })
        )
      })
    })

    it('sends undefined metadata when no references are selected', async () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )

      // Fill in required title without selecting any references
      const titleInput = screen.getByTestId('artifact-form-title')
      fireEvent.change(titleInput, { target: { value: 'No Refs Article' } })

      fireEvent.click(screen.getByTestId('artifact-form-save-draft'))

      await waitFor(() => {
        expect(mockOnSaveDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: undefined,
          })
        )
      })
    })

    it('shows selected count badge in trigger when references are selected', async () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCreateContent={mockOnCreateContent}
          onCancel={mockOnCancel}
        />
      )

      // Expand and select
      const trigger = screen.getByText('Writing References').closest('button') ??
        screen.getByRole('button', { name: /Writing References/i })
      fireEvent.click(trigger)
      await waitFor(() => screen.getByText('Select Two Refs'))
      fireEvent.click(screen.getByText('Select Two Refs'))

      // The badge in the trigger should show "2 selected"
      await waitFor(() => {
        expect(screen.getByText('2 selected')).toBeInTheDocument()
      })
    })
  })

  describe('Edit mode (artifact prop provided)', () => {
    it('does NOT show the Writing References collapsible section', () => {
      const artifact = makeArtifact()
      render(
        <ArtifactForm
          artifact={artifact}
          onSaveDraft={mockOnSaveDraft}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.queryByText('Writing References')).not.toBeInTheDocument()
    })

    it('does NOT render the ReferencePicker', () => {
      const artifact = makeArtifact()
      render(
        <ArtifactForm
          artifact={artifact}
          onSaveDraft={mockOnSaveDraft}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.queryByTestId('reference-picker')).not.toBeInTheDocument()
    })

    it('shows "Update" button instead of "Save as Draft" and "Create Content"', () => {
      const artifact = makeArtifact()
      render(
        <ArtifactForm
          artifact={artifact}
          onSaveDraft={mockOnSaveDraft}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByTestId('artifact-form-submit')).toBeInTheDocument()
      expect(screen.queryByTestId('artifact-form-save-draft')).not.toBeInTheDocument()
      expect(screen.queryByTestId('artifact-form-create-content')).not.toBeInTheDocument()
    })

    it('pre-fills title from artifact data', () => {
      const artifact = makeArtifact({ title: 'Pre-filled Title' })
      render(
        <ArtifactForm
          artifact={artifact}
          onSaveDraft={mockOnSaveDraft}
          onCancel={mockOnCancel}
        />
      )
      const titleInput = screen.getByTestId('artifact-form-title') as HTMLInputElement
      expect(titleInput.value).toBe('Pre-filled Title')
    })
  })

  describe('Cancel button', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      render(
        <ArtifactForm
          onSaveDraft={mockOnSaveDraft}
          onCancel={mockOnCancel}
        />
      )
      fireEvent.click(screen.getByTestId('artifact-form-cancel'))
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })
})
