/**
 * Unit Tests for ImageApprovalPanel Component (Phase 3)
 *
 * Tests the image description approval UI:
 * - Display image needs
 * - Approve/reject individual images
 * - Approve all images
 * - Generate final images
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ImageApprovalPanel } from '../../../src/features/portfolio/components/artifact/ImageApprovalPanel'
import type { ImageNeed } from '../../../src/features/portfolio/types/portfolio'

// =============================================================================
// Mocks
// =============================================================================

const mockImageNeeds: ImageNeed[] = [
  {
    id: 'need-1',
    placement_after: 'Introduction',
    description: 'A professional hero image showing a modern workspace',
    purpose: 'photo',
    style: 'professional',
    approved: false,
  },
  {
    id: 'need-2',
    placement_after: 'Benefits Section',
    description: 'A diagram showing the workflow process',
    purpose: 'diagram',
    style: 'modern',
    approved: false,
  },
  {
    id: 'need-3',
    placement_after: 'Results',
    description: 'A chart showing growth metrics',
    purpose: 'chart',
    style: 'professional',
    approved: false,
  },
]

// =============================================================================
// Tests
// =============================================================================

describe('ImageApprovalPanel Component', () => {
  const mockArtifactId = 'test-artifact-123'
  const mockOnApprove = vi.fn()
  const mockOnReject = vi.fn()
  const mockOnGenerateFinals = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render panel header with title', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText('Review Image Descriptions')).toBeInTheDocument()
    })

    it('should render description text', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(
        screen.getByText(
          /Approve or reject image descriptions. Final images will be generated for approved descriptions only./
        )
      ).toBeInTheDocument()
    })

    it('should render all image needs', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(
        screen.getByText('A professional hero image showing a modern workspace')
      ).toBeInTheDocument()
      expect(screen.getByText('A diagram showing the workflow process')).toBeInTheDocument()
      expect(screen.getByText('A chart showing growth metrics')).toBeInTheDocument()
    })

    it('should display image purpose and style badges', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText('photo')).toBeInTheDocument()
      // "professional" appears twice (2 images have this style)
      expect(screen.getAllByText('professional')).toHaveLength(2)
      expect(screen.getByText('diagram')).toBeInTheDocument()
      expect(screen.getByText('modern')).toBeInTheDocument()
      expect(screen.getByText('chart')).toBeInTheDocument()
    })

    it('should display placement information', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText(/Placement: Introduction/)).toBeInTheDocument()
      expect(screen.getByText(/Placement: Benefits Section/)).toBeInTheDocument()
      expect(screen.getByText(/Placement: Results/)).toBeInTheDocument()
    })
  })

  describe('Approval Counter', () => {
    it('should show 0 approved initially', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText('0 approved')).toBeInTheDocument()
    })

    it('should show initial approved count for pre-approved images', () => {
      const approvedNeeds = [
        { ...mockImageNeeds[0], approved: true },
        { ...mockImageNeeds[1], approved: false },
        { ...mockImageNeeds[2], approved: true },
      ]

      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={approvedNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText('2 approved')).toBeInTheDocument()
    })

    it('should show 0 rejected initially', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText('0 rejected')).toBeInTheDocument()
    })
  })

  describe('Approve All Button', () => {
    it('should render approve all button', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText('Approve All')).toBeInTheDocument()
    })

    it('should call onApprove with all image IDs when clicked', async () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      const approveAllButton = screen.getByText('Approve All')
      fireEvent.click(approveAllButton)

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith(['need-1', 'need-2', 'need-3'])
      })
    })

    it('should be disabled during loading', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
          isLoading={true}
        />
      )

      const approveAllButton = screen.getByText('Approve All')
      expect(approveAllButton).toBeDisabled()
    })
  })

  describe('Individual Approve/Reject', () => {
    it('should show approve and reject buttons for unapproved images', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      const approveButtons = screen.getAllByRole('button', { name: /Approve/i })
      const rejectButtons = screen.getAllByRole('button', { name: /Reject/i })

      // 3 image needs + 1 "Approve All" button = 4 approve buttons
      // 3 reject buttons
      expect(approveButtons.length).toBeGreaterThanOrEqual(3)
      expect(rejectButtons).toHaveLength(3)
    })

    it('should call onApprove with single image ID when approve clicked', async () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      const approveButtons = screen.getAllByRole('button', { name: /^Approve$/i })
      fireEvent.click(approveButtons[0])

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith(['need-1'])
      })
    })

    it('should call onReject with single image ID when reject clicked', async () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      const rejectButtons = screen.getAllByRole('button', { name: /Reject/i })
      fireEvent.click(rejectButtons[0])

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledWith(['need-1'])
      })
    })
  })

  describe('Generate Finals Button', () => {
    it('should render generate finals button', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText(/Generate \d+ Final Images/)).toBeInTheDocument()
    })

    it('should be disabled when no images approved', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      const generateButton = screen.getByText(/Generate 0 Final Images/)
      expect(generateButton).toBeDisabled()
    })

    it('should be enabled when images are approved', async () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      // Approve one image
      const approveButtons = screen.getAllByRole('button', { name: /^Approve$/i })
      fireEvent.click(approveButtons[0])

      await waitFor(() => {
        const generateButton = screen.getByText(/Generate 1 Final Images/)
        expect(generateButton).not.toBeDisabled()
      })
    })

    it('should call onGenerateFinals when clicked', async () => {
      const approvedNeeds = [{ ...mockImageNeeds[0], approved: true }, mockImageNeeds[1]]

      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={approvedNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      const generateButton = screen.getByText(/Generate 1 Final Images/)
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(mockOnGenerateFinals).toHaveBeenCalled()
      })
    })

    it('should show generating state during loading', async () => {
      const approvedNeeds = [{ ...mockImageNeeds[0], approved: true }]
      mockOnGenerateFinals.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={approvedNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      const generateButton = screen.getByText(/Generate 1 Final Images/)
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should disable all buttons during loading', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={mockImageNeeds}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
          isLoading={true}
        />
      )

      const approveAllButton = screen.getByText('Approve All')
      expect(approveAllButton).toBeDisabled()

      const approveButtons = screen.getAllByRole('button', { name: /Approve/i })
      approveButtons.forEach((button) => {
        if (!button.textContent?.includes('All')) {
          expect(button).toBeDisabled()
        }
      })
    })
  })

  describe('Empty State', () => {
    it('should handle empty image needs array', () => {
      render(
        <ImageApprovalPanel
          artifactId={mockArtifactId}
          imageNeeds={[]}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onGenerateFinals={mockOnGenerateFinals}
        />
      )

      expect(screen.getByText('0 approved')).toBeInTheDocument()
      expect(screen.getByText('0 rejected')).toBeInTheDocument()
    })
  })
})
