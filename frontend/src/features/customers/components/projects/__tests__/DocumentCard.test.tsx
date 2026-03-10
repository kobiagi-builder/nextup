/**
 * DocumentCard Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentCard } from '../DocumentCard'
import type { CustomerDocument } from '../../../types'

const baseDocument: CustomerDocument = {
  id: 'doc-1',
  initiative_id: 'init-1',
  customer_id: 'cust-1',
  folder_id: null,
  type: 'strategy',
  title: 'Q4 Product Strategy',
  content: 'Some content',
  status: 'draft',
  metadata: {},
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DocumentCard', () => {
  it('renders title, status badge, and type badge', () => {
    render(
      <DocumentCard document={baseDocument} isLast={false} onClick={vi.fn()} />
    )

    expect(screen.getByText('Q4 Product Strategy')).toBeTruthy()
    expect(screen.getByText('Draft')).toBeTruthy()
    expect(screen.getByText('Strategy')).toBeTruthy()
  })

  it('renders correct status and type for different document types', () => {
    const doc: CustomerDocument = {
      ...baseDocument,
      type: 'roadmap',
      status: 'in_progress',
    }
    render(<DocumentCard document={doc} isLast={false} onClick={vi.fn()} />)

    expect(screen.getByText('In Progress')).toBeTruthy()
    expect(screen.getByText('Roadmap')).toBeTruthy()
  })

  it('fires onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(
      <DocumentCard document={baseDocument} isLast={false} onClick={handleClick} />
    )

    fireEvent.click(screen.getByTestId('document-card-doc-1'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('has border-b when not last', () => {
    const { container } = render(
      <DocumentCard document={baseDocument} isLast={false} onClick={vi.fn()} />
    )

    const button = container.querySelector('button')!
    expect(button.className).toContain('border-b')
  })

  it('does not have border-b when last', () => {
    const { container } = render(
      <DocumentCard document={baseDocument} isLast={true} onClick={vi.fn()} />
    )

    const button = container.querySelector('button')!
    expect(button.className).not.toContain('border-b')
  })
})
