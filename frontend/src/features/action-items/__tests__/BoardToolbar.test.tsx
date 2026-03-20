/**
 * BoardToolbar Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardToolbar } from '../components/BoardToolbar'

// Mock hooks
const mockUseFeatureFlag = vi.fn()
const mockUseCustomers = vi.fn()

vi.mock('@/hooks/use-feature-flag', () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
}))

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomers: () => mockUseCustomers(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseFeatureFlag.mockReturnValue({ isEnabled: true })
  mockUseCustomers.mockReturnValue({
    data: [
      { id: 'c1', name: 'Acme Corp' },
      { id: 'c2', name: 'Beta Inc' },
    ],
  })
})

describe('BoardToolbar', () => {
  it('renders title "Action Items"', () => {
    render(
      <BoardToolbar
        onCustomerFilterChange={vi.fn()}
        selectedTypes={[]}
        onTypeFilterChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        onAddItem={vi.fn()}
      />
    )

    expect(screen.getByText('Action Items')).toBeTruthy()
  })

  it('renders Add Item button that fires onClick', () => {
    const handleAdd = vi.fn()
    render(
      <BoardToolbar
        onCustomerFilterChange={vi.fn()}
        selectedTypes={[]}
        onTypeFilterChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        onAddItem={handleAdd}
      />
    )

    const addButton = screen.getByText('Add Item')
    expect(addButton).toBeTruthy()
    fireEvent.click(addButton)
    expect(handleAdd).toHaveBeenCalledOnce()
  })

  it('hides customer filter when customer_management flag is disabled', () => {
    mockUseFeatureFlag.mockReturnValue({ isEnabled: false })

    render(
      <BoardToolbar
        onCustomerFilterChange={vi.fn()}
        selectedTypes={[]}
        onTypeFilterChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        onAddItem={vi.fn()}
      />
    )

    // The filter trigger should not be present
    expect(screen.queryByText('All Customers')).toBeNull()
  })

  it('shows customer filter when customer_management flag is enabled', () => {
    render(
      <BoardToolbar
        onCustomerFilterChange={vi.fn()}
        selectedTypes={[]}
        onTypeFilterChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        onAddItem={vi.fn()}
      />
    )

    // The select trigger shows "All Customers" by default
    expect(screen.getByText('All Customers')).toBeTruthy()
  })
})
