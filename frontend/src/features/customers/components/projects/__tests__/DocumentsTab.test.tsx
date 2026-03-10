/**
 * DocumentsTab Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentsTab } from '../DocumentsTab'
import type { InitiativeWithCounts, CustomerDocument } from '../../../types'

// Mock the hooks module
vi.mock('../../../hooks', () => ({
  useInitiatives: vi.fn(),
  useDeleteInitiative: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCustomerDocuments: vi.fn(),
  useDeleteDocument: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDocumentFolders: vi.fn(),
  useDeleteFolder: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

// Mock child form/editor components that are not under test
vi.mock('../InitiativeForm', () => ({
  InitiativeForm: () => null,
}))
vi.mock('../DocumentForm', () => ({
  DocumentForm: () => null,
}))
vi.mock('../DocumentEditor', () => ({
  DocumentEditor: () => null,
}))
vi.mock('../FolderSection', () => ({
  FolderSection: ({ folder }: { folder: { id: string; name: string } }) => (
    <div data-testid={`folder-section-${folder.id}`}>{folder.name}</div>
  ),
}))
vi.mock('../DocumentsFilterBar', () => ({
  DocumentsFilterBar: () => <div data-testid="filter-bar" />,
}))
vi.mock('../FolderManager', () => ({
  FolderManager: () => null,
}))

import {
  useInitiatives,
  useCustomerDocuments,
  useDocumentFolders,
} from '../../../hooks'

const mockUseInitiatives = vi.mocked(useInitiatives)
const mockUseCustomerDocuments = vi.mocked(useCustomerDocuments)
const mockUseDocumentFolders = vi.mocked(useDocumentFolders)

const makeInitiative = (
  overrides: Partial<InitiativeWithCounts> = {}
): InitiativeWithCounts => ({
  id: 'init-1',
  customer_id: 'cust-1',
  name: 'Mobile App Launch',
  description: null,
  status: 'active',
  agreement_id: null,
  metadata: {},
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  documents_count: 0,
  ...overrides,
})

const makeDoc = (
  overrides: Partial<CustomerDocument> = {}
): CustomerDocument => ({
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

function setupMocks({
  initiatives = [] as InitiativeWithCounts[],
  documents = [] as CustomerDocument[],
  folders = [] as Array<{ id: string; name: string; is_system: boolean; is_default: boolean; customer_id: string | null; user_id: string | null; slug: string; sort_order: number; created_at: string; updated_at: string }>,
  loading = false,
} = {}) {
  mockUseInitiatives.mockReturnValue({
    data: initiatives,
    isLoading: loading,
  } as ReturnType<typeof useInitiatives>)
  mockUseCustomerDocuments.mockReturnValue({
    data: documents,
    isLoading: loading,
  } as ReturnType<typeof useCustomerDocuments>)
  mockUseDocumentFolders.mockReturnValue({
    data: folders,
    isLoading: loading,
  } as ReturnType<typeof useDocumentFolders>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DocumentsTab', () => {
  it('renders loading skeleton when data is loading', () => {
    setupMocks({ loading: true })

    const { container } = render(<DocumentsTab customerId="cust-1" />)

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('groups documents by initiative_id and shows initiative sections', () => {
    const initiatives = [
      makeInitiative({ id: 'init-1', name: 'Initiative A', status: 'active' }),
      makeInitiative({ id: 'init-2', name: 'Initiative B', status: 'planning' }),
    ]
    const documents = [
      makeDoc({ id: 'doc-1', initiative_id: 'init-1', title: 'Doc A1' }),
      makeDoc({ id: 'doc-2', initiative_id: 'init-1', title: 'Doc A2' }),
      makeDoc({ id: 'doc-3', initiative_id: 'init-2', title: 'Doc B1' }),
    ]

    setupMocks({ initiatives, documents })

    render(<DocumentsTab customerId="cust-1" />)

    expect(screen.getByTestId('initiative-section-init-1')).toBeTruthy()
    expect(screen.getByTestId('initiative-section-init-2')).toBeTruthy()
    expect(screen.getByText('Doc A1')).toBeTruthy()
    expect(screen.getByText('Doc A2')).toBeTruthy()
    expect(screen.getByText('Doc B1')).toBeTruthy()
    expect(screen.queryByTestId('initiative-section-general')).toBeNull()
  })

  it('shows global empty state when no initiatives and no documents', () => {
    setupMocks()

    render(<DocumentsTab customerId="cust-1" />)

    expect(screen.getByText('No documents yet')).toBeTruthy()
    expect(
      screen.getByText(
        'Organize your work into initiatives with strategy docs, research, roadmaps, and more.'
      )
    ).toBeTruthy()
    expect(screen.getByText('Create First Initiative')).toBeTruthy()
  })

  it('header shows correct counts', () => {
    const initiatives = [
      makeInitiative({ id: 'init-1', name: 'Init A' }),
      makeInitiative({ id: 'init-2', name: 'Init B' }),
    ]
    const documents = [
      makeDoc({ id: 'doc-1', initiative_id: 'init-1' }),
      makeDoc({ id: 'doc-2', initiative_id: 'init-2' }),
      makeDoc({ id: 'doc-3', initiative_id: 'init-1' }),
    ]

    setupMocks({ initiatives, documents })

    render(<DocumentsTab customerId="cust-1" />)

    expect(screen.getByText('3 Documents across 2 initiatives')).toBeTruthy()
  })

  it('header shows singular forms for 1 document and 1 initiative', () => {
    const initiatives = [makeInitiative({ id: 'init-1' })]
    const documents = [makeDoc({ id: 'doc-1', initiative_id: 'init-1' })]

    setupMocks({ initiatives, documents })

    render(<DocumentsTab customerId="cust-1" />)

    expect(screen.getByText('1 Document across 1 initiative')).toBeTruthy()
  })

  it('renders folders separator and folder sections when folders exist', () => {
    const initiatives = [makeInitiative({ id: 'init-1', name: 'Init A' })]
    const documents = [
      makeDoc({ id: 'doc-1', initiative_id: 'init-1', title: 'Init Doc' }),
      makeDoc({ id: 'doc-2', initiative_id: 'init-1', folder_id: 'folder-1', title: 'Folder Doc' }),
    ]
    const folders = [
      {
        id: 'folder-1',
        name: 'General',
        slug: 'general',
        is_system: true,
        is_default: true,
        customer_id: 'cust-1',
        user_id: null,
        sort_order: 0,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ]

    setupMocks({ initiatives, documents, folders })

    render(<DocumentsTab customerId="cust-1" />)

    expect(screen.getByTestId('folders-separator')).toBeTruthy()
    expect(screen.getByTestId('folder-section-folder-1')).toBeTruthy()
  })

  it('documents with folder_id go to folder groups, not initiative groups', () => {
    const initiatives = [makeInitiative({ id: 'init-1', name: 'Init A' })]
    const documents = [
      makeDoc({ id: 'doc-1', initiative_id: 'init-1', folder_id: null, title: 'Initiative Doc' }),
      makeDoc({ id: 'doc-2', initiative_id: 'init-1', folder_id: 'folder-1', title: 'Folder Doc' }),
    ]
    const folders = [
      {
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
      },
    ]

    setupMocks({ initiatives, documents, folders })

    render(<DocumentsTab customerId="cust-1" />)

    // Initiative section shows only the doc without folder_id
    expect(screen.getByText('Initiative Doc')).toBeTruthy()
    // Folder section renders (mocked to show folder name)
    expect(screen.getByTestId('folder-section-folder-1')).toBeTruthy()
  })
})
