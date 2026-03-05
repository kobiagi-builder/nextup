/**
 * Unit Tests for ReferencePickerCard Component
 *
 * Tests selectable card behavior, selection state styling,
 * keyboard accessibility, content preview, and badge rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ReferencePickerCard } from '../../../../src/features/portfolio/components/writing-references/ReferencePickerCard'
import type { UserWritingExample } from '../../../../src/features/portfolio/types/portfolio'

// =============================================================================
// Fixtures
// =============================================================================

function makeReference(overrides: Partial<UserWritingExample> = {}): UserWritingExample {
  return {
    id: 'ref-001',
    user_id: 'user-123',
    name: 'My Blog Post',
    source_type: 'pasted',
    content: 'This is a sample writing reference with some content here.',
    word_count: 150,
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

// =============================================================================
// Tests
// =============================================================================

describe('ReferencePickerCard', () => {
  const mockOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders reference name', () => {
      const reference = makeReference({ name: 'My LinkedIn Article' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.getByText('My LinkedIn Article')).toBeInTheDocument()
    })

    it('renders word count when word_count > 0', () => {
      const reference = makeReference({ word_count: 1234 })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.getByText('1,234 words')).toBeInTheDocument()
    })

    it('does not render word count when word_count is 0', () => {
      const reference = makeReference({ word_count: 0 })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.queryByText(/words/)).not.toBeInTheDocument()
    })

    it('renders content preview when content is present', () => {
      const reference = makeReference({ content: 'This is the article content.' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.getByText(/This is the article content/)).toBeInTheDocument()
    })

    it('does not render content preview when content is empty', () => {
      const reference = makeReference({ content: '' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      // Only the name should appear in the text, no content paragraph
      const paragraphs = document.querySelectorAll('p')
      // The name paragraph is present; the content preview paragraph should not be
      const contentParagraph = Array.from(paragraphs).find(
        (p) => p.className.includes('muted-foreground/70')
      )
      expect(contentParagraph).toBeUndefined()
    })
  })

  describe('Artifact type badge', () => {
    it('shows "Blog" badge for blog artifact type', () => {
      const reference = makeReference({ artifact_type: 'blog' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.getByText('Blog')).toBeInTheDocument()
    })

    it('shows "Social" badge for social_post artifact type', () => {
      const reference = makeReference({ artifact_type: 'social_post' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.getByText('Social')).toBeInTheDocument()
    })

    it('shows "Showcase" badge for showcase artifact type', () => {
      const reference = makeReference({ artifact_type: 'showcase' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.getByText('Showcase')).toBeInTheDocument()
    })

    it('does not show badge when artifact_type is null', () => {
      const reference = makeReference({ artifact_type: null })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      expect(screen.queryByText('Blog')).not.toBeInTheDocument()
      expect(screen.queryByText('Social')).not.toBeInTheDocument()
      expect(screen.queryByText('Showcase')).not.toBeInTheDocument()
    })
  })

  describe('Selection state styling', () => {
    it('has aria-pressed="false" when not selected', () => {
      const reference = makeReference()
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-pressed', 'false')
    })

    it('has aria-pressed="true" when selected', () => {
      const reference = makeReference()
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={true}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('applies selected border class when isSelected=true', () => {
      const reference = makeReference()
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={true}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      expect(card.className).toContain('border-brand-300/40')
    })

    it('applies unselected border class when isSelected=false', () => {
      const reference = makeReference()
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      expect(card.className).toContain('border-border')
    })

    it('shows checkmark SVG when selected', () => {
      const reference = makeReference()
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={true}
          onToggle={mockOnToggle}
        />
      )
      // The SVG checkmark is only rendered when isSelected=true
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('applies brand-300 stripe class when isSelected=true', () => {
      const reference = makeReference()
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={true}
          onToggle={mockOnToggle}
        />
      )
      // The left accent stripe div should have bg-brand-300
      const stripe = document.querySelector('.bg-brand-300')
      expect(stripe).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('calls onToggle with reference.id when card is clicked', () => {
      const reference = makeReference({ id: 'ref-abc' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      fireEvent.click(card)
      expect(mockOnToggle).toHaveBeenCalledTimes(1)
      expect(mockOnToggle).toHaveBeenCalledWith('ref-abc')
    })

    it('calls onToggle with reference.id when Enter key is pressed', () => {
      const reference = makeReference({ id: 'ref-xyz' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(mockOnToggle).toHaveBeenCalledTimes(1)
      expect(mockOnToggle).toHaveBeenCalledWith('ref-xyz')
    })

    it('does NOT call onToggle when Space key is pressed (only Enter triggers it)', () => {
      const reference = makeReference({ id: 'ref-space' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: ' ' })
      expect(mockOnToggle).not.toHaveBeenCalled()
    })

    it('is focusable via tabIndex', () => {
      const reference = makeReference()
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Preview lines prop', () => {
    it('applies line-clamp-2 class when previewLines=2', () => {
      const reference = makeReference({ content: 'Some content for preview.' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
          previewLines={2}
        />
      )
      const preview = document.querySelector('.line-clamp-2')
      expect(preview).toBeInTheDocument()
    })

    it('applies line-clamp-4 class when previewLines=4 (default)', () => {
      const reference = makeReference({ content: 'Some content for preview.' })
      render(
        <ReferencePickerCard
          reference={reference}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      )
      const preview = document.querySelector('.line-clamp-4')
      expect(preview).toBeInTheDocument()
    })
  })
})
