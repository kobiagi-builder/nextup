/**
 * InitiativeSection Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InitiativeSection } from '../InitiativeSection'
import type { InitiativeWithCounts, CustomerDocument } from '../../../types'

const baseInitiative: InitiativeWithCounts = {
  id: 'init-1',
  customer_id: 'cust-1',
  name: 'Mobile App Launch',
  description: 'Launch the mobile app',
  status: 'active',
  agreement_id: null,
  metadata: {},
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  documents_count: 3,
}

const makeDoc = (overrides: Partial<CustomerDocument> = {}): CustomerDocument => ({
  id: 'doc-1',
  initiative_id: 'init-1',
  customer_id: 'cust-1',
  folder_id: null,
  type: 'strategy',
  title: 'Strategy Doc',
  content: '',
  status: 'draft',
  metadata: {},
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InitiativeSection', () => {
  it('renders initiative name, status badge, and doc count', () => {
    const docs = [makeDoc(), makeDoc({ id: 'doc-2', title: 'Doc 2' })]
    render(
      <InitiativeSection
        initiative={baseInitiative}
        documents={docs}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByText('Mobile App Launch')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('2 docs')).toBeTruthy()
  })

  it('renders "General" with no status badge or action menu when isGeneral', () => {
    render(
      <InitiativeSection
        documents={[]}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
        isGeneral
      />
    )

    expect(screen.getByText('General')).toBeTruthy()
    // No status badge should be present
    expect(screen.queryByText('Active')).toBeNull()
    expect(screen.queryByText('Planning')).toBeNull()
  })

  it('shows empty text when 0 documents', () => {
    render(
      <InitiativeSection
        initiative={baseInitiative}
        documents={[]}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByText('0 docs')).toBeTruthy()
    expect(
      screen.getByText('No documents yet. Create one to get started.')
    ).toBeTruthy()
  })

  it('renders document cards for provided documents', () => {
    const docs = [
      makeDoc({ id: 'doc-1', title: 'First Doc' }),
      makeDoc({ id: 'doc-2', title: 'Second Doc' }),
    ]
    render(
      <InitiativeSection
        initiative={baseInitiative}
        documents={docs}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('document-card-doc-1')).toBeTruthy()
    expect(screen.getByTestId('document-card-doc-2')).toBeTruthy()
    expect(screen.getByText('First Doc')).toBeTruthy()
    expect(screen.getByText('Second Doc')).toBeTruthy()
  })

  it('shows singular "doc" when exactly 1 document', () => {
    render(
      <InitiativeSection
        initiative={baseInitiative}
        documents={[makeDoc()]}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByText('1 doc')).toBeTruthy()
  })
})
