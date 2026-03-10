/**
 * FolderManager Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FolderManager } from '../FolderManager'
import type { DocumentFolder } from '../../../types'

// Mock hooks
const mockCreateMutateAsync = vi.fn()
const mockUpdateMutateAsync = vi.fn()
const mockDeleteMutateAsync = vi.fn()

vi.mock('../../../hooks', () => ({
  useCreateFolder: () => ({ mutateAsync: mockCreateMutateAsync }),
  useUpdateFolder: () => ({ mutateAsync: mockUpdateMutateAsync }),
  useDeleteFolder: () => ({ mutateAsync: mockDeleteMutateAsync }),
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

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

const generalFolder = makeFolder({
  id: 'folder-gen',
  name: 'General',
  slug: 'general',
  is_system: true,
  is_default: true,
  sort_order: 100,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FolderManager', () => {
  it('renders trigger button', () => {
    render(<FolderManager customerId="cust-1" folders={[]} />)

    expect(screen.getByTestId('folder-manager-trigger')).toBeTruthy()
  })

  it('shows folder list when popover is opened', async () => {
    const folders = [makeFolder({ id: 'f-1', name: 'Research' }), generalFolder]

    render(<FolderManager customerId="cust-1" folders={folders} />)

    fireEvent.click(screen.getByTestId('folder-manager-trigger'))

    await waitFor(() => {
      expect(screen.getByText('Manage Folders')).toBeTruthy()
      expect(screen.getByText('Research')).toBeTruthy()
      expect(screen.getByText('General')).toBeTruthy()
    })
  })

  it('shows lock icon for system folders', async () => {
    render(<FolderManager customerId="cust-1" folders={[generalFolder]} />)

    fireEvent.click(screen.getByTestId('folder-manager-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('folder-lock-icon')).toBeTruthy()
    })
  })

  it('shows "Add folder" button', async () => {
    render(<FolderManager customerId="cust-1" folders={[]} />)

    fireEvent.click(screen.getByTestId('folder-manager-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('folder-add-button')).toBeTruthy()
      expect(screen.getByText('Add folder')).toBeTruthy()
    })
  })

  it('shows add input when "Add folder" is clicked', async () => {
    render(<FolderManager customerId="cust-1" folders={[]} />)

    fireEvent.click(screen.getByTestId('folder-manager-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('folder-add-button')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('folder-add-button'))

    expect(screen.getByTestId('folder-add-input')).toBeTruthy()
  })

  it('creates folder when add is confirmed', async () => {
    mockCreateMutateAsync.mockResolvedValue({ id: 'f-new', name: 'New' })

    render(<FolderManager customerId="cust-1" folders={[]} />)

    fireEvent.click(screen.getByTestId('folder-manager-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('folder-add-button')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('folder-add-button'))

    const input = screen.getByTestId('folder-add-input')
    fireEvent.change(input, { target: { value: 'New Folder' } })
    fireEvent.click(screen.getByTestId('folder-add-confirm'))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        name: 'New Folder',
        customerId: 'cust-1',
      })
    })
  })

  it('shows delete confirmation when delete is clicked', async () => {
    const folder = makeFolder({ id: 'f-1', name: 'Research' })
    render(<FolderManager customerId="cust-1" folders={[folder]} />)

    fireEvent.click(screen.getByTestId('folder-manager-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('folder-delete-f-1')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('folder-delete-f-1'))

    expect(screen.getByText('Move docs to General?')).toBeTruthy()
    expect(screen.getByTestId('folder-delete-confirm')).toBeTruthy()
    expect(screen.getByTestId('folder-delete-cancel')).toBeTruthy()
  })

  it('deletes folder when confirmation is confirmed', async () => {
    mockDeleteMutateAsync.mockResolvedValue({})

    const folder = makeFolder({ id: 'f-1', name: 'Research' })
    render(<FolderManager customerId="cust-1" folders={[folder]} />)

    fireEvent.click(screen.getByTestId('folder-manager-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('folder-delete-f-1')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('folder-delete-f-1'))
    fireEvent.click(screen.getByTestId('folder-delete-confirm'))

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('f-1')
    })
  })
})
