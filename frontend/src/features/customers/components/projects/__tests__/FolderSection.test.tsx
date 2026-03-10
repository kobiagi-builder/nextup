/**
 * FolderSection Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FolderSection } from '../FolderSection'
import type { DocumentFolder, CustomerDocument } from '../../../types'

const makeFolder = (overrides: Partial<DocumentFolder> = {}): DocumentFolder => ({
  id: 'folder-1',
  name: 'Research',
  slug: 'research',
  is_system: false,
  is_default: false,
  customer_id: 'cust-1',
  user_id: null,
  sort_order: 1,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
})

const makeDoc = (overrides: Partial<CustomerDocument> = {}): CustomerDocument => ({
  id: 'doc-1',
  initiative_id: 'init-1',
  customer_id: 'cust-1',
  folder_id: 'folder-1',
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

describe('FolderSection', () => {
  it('renders folder name and doc count', () => {
    const docs = [makeDoc(), makeDoc({ id: 'doc-2', title: 'Doc 2' })]
    render(
      <FolderSection
        folder={makeFolder({ name: 'Research' })}
        documents={docs}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByText('Research')).toBeTruthy()
    expect(screen.getByText('2 docs')).toBeTruthy()
  })

  it('shows singular "doc" for 1 document', () => {
    render(
      <FolderSection
        folder={makeFolder()}
        documents={[makeDoc()]}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByText('1 doc')).toBeTruthy()
  })

  it('shows lock icon for system folders, no action menu', () => {
    render(
      <FolderSection
        folder={makeFolder({ is_system: true, name: 'General' })}
        documents={[]}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('folder-lock-icon')).toBeTruthy()
    expect(screen.getByText('General')).toBeTruthy()
  })

  it('shows empty text when no documents', () => {
    render(
      <FolderSection
        folder={makeFolder()}
        documents={[]}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByText('No documents in this folder.')).toBeTruthy()
  })

  it('renders document cards when expanded', () => {
    const docs = [
      makeDoc({ id: 'doc-1', title: 'First Doc' }),
      makeDoc({ id: 'doc-2', title: 'Second Doc' }),
    ]
    render(
      <FolderSection
        folder={makeFolder()}
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

  it('has correct data-testid with folder id', () => {
    render(
      <FolderSection
        folder={makeFolder({ id: 'my-folder' })}
        documents={[]}
        isCollapsed={false}
        onToggle={vi.fn()}
        onDocumentClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('folder-section-my-folder')).toBeTruthy()
  })
})
