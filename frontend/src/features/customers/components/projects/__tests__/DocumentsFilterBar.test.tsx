/**
 * DocumentsFilterBar Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentsFilterBar } from '../DocumentsFilterBar'

const defaultProps = {
  initiativeStatusFilter: [] as string[],
  onInitiativeStatusChange: vi.fn(),
  nameSearch: '',
  onNameSearchChange: vi.fn(),
  documentStatusFilter: [] as string[],
  onDocumentStatusChange: vi.fn(),
  hasActiveFilters: false,
  onClearFilters: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DocumentsFilterBar', () => {
  it('renders filter bar with controls', () => {
    render(<DocumentsFilterBar {...defaultProps} />)

    expect(screen.getByTestId('documents-filter-bar')).toBeTruthy()
    expect(screen.getByTestId('filter-name-search')).toBeTruthy()
  })

  it('name search input calls onChange callback', () => {
    const onNameSearchChange = vi.fn()
    render(<DocumentsFilterBar {...defaultProps} onNameSearchChange={onNameSearchChange} />)

    const input = screen.getByTestId('filter-name-search')
    fireEvent.change(input, { target: { value: 'Strategy' } })

    expect(onNameSearchChange).toHaveBeenCalledWith('Strategy')
  })

  it('shows clear button when name search has value', () => {
    render(<DocumentsFilterBar {...defaultProps} nameSearch="test" />)

    expect(screen.getByTestId('filter-name-clear')).toBeTruthy()
  })

  it('hides clear button when name search is empty', () => {
    render(<DocumentsFilterBar {...defaultProps} nameSearch="" />)

    expect(screen.queryByTestId('filter-name-clear')).toBeNull()
  })

  it('clear name search button calls onNameSearchChange with empty string', () => {
    const onNameSearchChange = vi.fn()
    render(
      <DocumentsFilterBar
        {...defaultProps}
        nameSearch="test"
        onNameSearchChange={onNameSearchChange}
      />
    )

    fireEvent.click(screen.getByTestId('filter-name-clear'))

    expect(onNameSearchChange).toHaveBeenCalledWith('')
  })

  it('shows "Clear filters" link when hasActiveFilters is true', () => {
    render(<DocumentsFilterBar {...defaultProps} hasActiveFilters={true} />)

    expect(screen.getByTestId('filter-clear')).toBeTruthy()
    expect(screen.getByText('Clear filters')).toBeTruthy()
  })

  it('hides "Clear filters" link when hasActiveFilters is false', () => {
    render(<DocumentsFilterBar {...defaultProps} hasActiveFilters={false} />)

    expect(screen.queryByTestId('filter-clear')).toBeNull()
  })

  it('clicking "Clear filters" calls onClearFilters', () => {
    const onClearFilters = vi.fn()
    render(
      <DocumentsFilterBar
        {...defaultProps}
        hasActiveFilters={true}
        onClearFilters={onClearFilters}
      />
    )

    fireEvent.click(screen.getByTestId('filter-clear'))

    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it('renders multi-select filter buttons for initiative and doc status', () => {
    render(<DocumentsFilterBar {...defaultProps} />)

    expect(screen.getByText('Initiative Status')).toBeTruthy()
    expect(screen.getByText('Doc Status')).toBeTruthy()
  })
})
