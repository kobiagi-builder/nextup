/**
 * Unit Tests for ReferencePickerEmptyState Component
 *
 * Tests heading, contextual messaging per content type,
 * CTA button callback, and optional helper text.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ReferencePickerEmptyState } from '../../../../src/features/portfolio/components/writing-references/ReferencePickerEmptyState'
import type { ArtifactType } from '../../../../src/features/portfolio/types/portfolio'

// =============================================================================
// Tests
// =============================================================================

describe('ReferencePickerEmptyState', () => {
  const mockOnAddReference = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Static content', () => {
    it('renders the heading "Your writing, your voice"', () => {
      render(
        <ReferencePickerEmptyState
          contentType="blog"
          onAddReference={mockOnAddReference}
        />
      )
      expect(screen.getByText('Your writing, your voice')).toBeInTheDocument()
    })

    it('renders "This step is optional" helper text', () => {
      render(
        <ReferencePickerEmptyState
          contentType="blog"
          onAddReference={mockOnAddReference}
        />
      )
      expect(screen.getByText('This step is optional')).toBeInTheDocument()
    })

    it('renders the CTA button with correct label', () => {
      render(
        <ReferencePickerEmptyState
          contentType="blog"
          onAddReference={mockOnAddReference}
        />
      )
      expect(screen.getByRole('button', { name: /Add your first reference/i })).toBeInTheDocument()
    })
  })

  describe('Contextual message by content type', () => {
    const cases: Array<{ contentType: ArtifactType; expectedText: string }> = [
      {
        contentType: 'blog',
        expectedText: 'Add a writing sample so the AI can match your blog writing style',
      },
      {
        contentType: 'social_post',
        expectedText: 'Add a writing sample so the AI can match how you write social posts',
      },
      {
        contentType: 'showcase',
        expectedText: 'Add a writing sample so the AI can match your case study style',
      },
    ]

    cases.forEach(({ contentType, expectedText }) => {
      it(`shows correct message for content type "${contentType}"`, () => {
        render(
          <ReferencePickerEmptyState
            contentType={contentType}
            onAddReference={mockOnAddReference}
          />
        )
        expect(screen.getByText(new RegExp(expectedText))).toBeInTheDocument()
      })
    })
  })

  describe('CTA interaction', () => {
    it('calls onAddReference when button is clicked', () => {
      render(
        <ReferencePickerEmptyState
          contentType="blog"
          onAddReference={mockOnAddReference}
        />
      )
      const btn = screen.getByRole('button', { name: /Add your first reference/i })
      fireEvent.click(btn)
      expect(mockOnAddReference).toHaveBeenCalledTimes(1)
    })

    it('does not call onAddReference before button is clicked', () => {
      render(
        <ReferencePickerEmptyState
          contentType="social_post"
          onAddReference={mockOnAddReference}
        />
      )
      expect(mockOnAddReference).not.toHaveBeenCalled()
    })
  })
})
