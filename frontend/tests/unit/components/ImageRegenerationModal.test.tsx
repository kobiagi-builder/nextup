/**
 * Unit Tests for ImageRegenerationModal Component (Phase 3)
 *
 * Tests the image regeneration modal:
 * - Display current image
 * - Edit description
 * - Regeneration attempts tracking (max 3)
 * - Regeneration action
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ImageRegenerationModal } from '../../../src/features/portfolio/components/artifact/ImageRegenerationModal'
import type {
  FinalImage,
  ImageNeed,
} from '../../../src/features/portfolio/types/portfolio'

// =============================================================================
// Mocks
// =============================================================================

const mockImage: FinalImage = {
  id: 'image-1',
  image_need_id: 'need-1',
  url: 'https://example.com/image.png',
  storage_path: 'artifact-123/images/final/image-1.png',
  resolution: { width: 1200, height: 630 },
  file_size_kb: 245,
  generated_at: '2024-01-15T10:30:00Z',
  generation_attempts: 1,
}

const mockImageNeed: ImageNeed = {
  id: 'need-1',
  placement_after: 'Introduction',
  description: 'A professional hero image showing a modern workspace',
  purpose: 'photo',
  style: 'professional',
  approved: true,
}

// =============================================================================
// Tests
// =============================================================================

describe('ImageRegenerationModal Component', () => {
  const mockOnClose = vi.fn()
  const mockOnRegenerate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnRegenerate.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      // "Regenerate Image" appears in both title and button
      expect(screen.getAllByText('Regenerate Image')).toHaveLength(2)
    })

    it('should not render modal when isOpen is false', () => {
      render(
        <ImageRegenerationModal
          isOpen={false}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(screen.queryByText('Regenerate Image')).not.toBeInTheDocument()
    })

    it('should display current image', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const img = screen.getByAltText(mockImageNeed.description)
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', mockImage.url)
    })

    it('should display image metadata', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(screen.getByText(/Resolution: 1200x630/)).toBeInTheDocument()
      expect(screen.getByText(/Size: 245KB/)).toBeInTheDocument()
      expect(screen.getByText(/Attempts: 1/)).toBeInTheDocument()
    })

    it('should display image description in textarea', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const textarea = screen.getByPlaceholderText('Describe what the image should show...')
      expect(textarea).toHaveValue(mockImageNeed.description)
    })

    it('should display style and purpose badges', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(screen.getByText('professional')).toBeInTheDocument()
      expect(screen.getByText('photo')).toBeInTheDocument()
    })
  })

  describe('Attempts Remaining', () => {
    it('should show correct attempts remaining (2 remaining for 1 attempt)', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(screen.getByText('2 attempts')).toBeInTheDocument()
    })

    it('should show 1 attempt remaining for 2 attempts', () => {
      const imageWith2Attempts = { ...mockImage, generation_attempts: 2 }

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={imageWith2Attempts}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(screen.getByText('1 attempts')).toBeInTheDocument()
    })

    it('should show 0 attempts remaining for 3 attempts', () => {
      const imageWith3Attempts = { ...mockImage, generation_attempts: 3 }

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={imageWith3Attempts}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(screen.getByText('0 attempts')).toBeInTheDocument()
    })
  })

  describe('Max Attempts Warning', () => {
    it('should show warning when max attempts reached', () => {
      const imageMaxAttempts = { ...mockImage, generation_attempts: 3 }

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={imageMaxAttempts}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(
        screen.getByText(
          /Maximum regeneration attempts reached \(3\). You cannot regenerate this image further./
        )
      ).toBeInTheDocument()
    })

    it('should not show warning when attempts remain', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(
        screen.queryByText(/Maximum regeneration attempts reached/)
      ).not.toBeInTheDocument()
    })
  })

  describe('Description Editing', () => {
    it('should allow editing description', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const textarea = screen.getByPlaceholderText('Describe what the image should show...')
      fireEvent.change(textarea, { target: { value: 'Updated description' } })

      expect(textarea).toHaveValue('Updated description')
    })

    it('should disable textarea when max attempts reached', () => {
      const imageMaxAttempts = { ...mockImage, generation_attempts: 3 }

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={imageMaxAttempts}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const textarea = screen.getByPlaceholderText('Describe what the image should show...')
      expect(textarea).toBeDisabled()
    })
  })

  describe('Regenerate Button', () => {
    it('should call onRegenerate with image ID and description when clicked', async () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const textarea = screen.getByPlaceholderText('Describe what the image should show...')
      fireEvent.change(textarea, { target: { value: 'New description' } })

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      fireEvent.click(regenerateButton)

      await waitFor(() => {
        expect(mockOnRegenerate).toHaveBeenCalledWith(mockImage.id, 'New description')
      })
    })

    it('should close modal after successful regeneration', async () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      fireEvent.click(regenerateButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should be disabled when description is empty', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const textarea = screen.getByPlaceholderText('Describe what the image should show...')
      fireEvent.change(textarea, { target: { value: '   ' } })

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      expect(regenerateButton).toBeDisabled()
    })

    it('should be disabled when max attempts reached', () => {
      const imageMaxAttempts = { ...mockImage, generation_attempts: 3 }

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={imageMaxAttempts}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      expect(regenerateButton).toBeDisabled()
    })

    it('should show loading state during regeneration', async () => {
      mockOnRegenerate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      fireEvent.click(regenerateButton)

      await waitFor(() => {
        expect(screen.getByText('Regenerating...')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel Button', () => {
    it('should call onClose when cancel clicked', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should be disabled during regeneration', async () => {
      mockOnRegenerate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      fireEvent.click(regenerateButton)

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /Cancel/i })
        expect(cancelButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when regeneration fails', async () => {
      mockOnRegenerate.mockRejectedValueOnce(new Error('Regeneration failed'))

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      fireEvent.click(regenerateButton)

      await waitFor(() => {
        expect(screen.getByText('Regeneration failed')).toBeInTheDocument()
      })
    })

    it('should not close modal when regeneration fails', async () => {
      mockOnRegenerate.mockRejectedValueOnce(new Error('Regeneration failed'))

      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      const regenerateButton = screen.getByRole('button', { name: /Regenerate Image/i })
      fireEvent.click(regenerateButton)

      await waitFor(() => {
        expect(screen.getByText('Regeneration failed')).toBeInTheDocument()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Helper Text', () => {
    it('should display guidance text for description', () => {
      render(
        <ImageRegenerationModal
          isOpen={true}
          onClose={mockOnClose}
          image={mockImage}
          imageNeed={mockImageNeed}
          onRegenerate={mockOnRegenerate}
        />
      )

      expect(
        screen.getByText(/Be specific about what you want to see. Example:/)
      ).toBeInTheDocument()
    })
  })
})
