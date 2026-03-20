/**
 * KanbanCard Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanCard } from '../components/KanbanCard'
import type { ActionItemWithCustomer } from '../types'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: { role: 'button' },
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}))

// Mock format utilities
vi.mock('@/features/customers/utils/format', () => ({
  getDueDateUrgency: vi.fn((dateStr: string, status?: string) => {
    if (status === 'done' || status === 'cancelled') {
      return { urgency: 'done', className: 'text-muted-foreground' }
    }
    // Simulate overdue for dates in the past
    const due = new Date(dateStr)
    const now = new Date()
    if (due < now) {
      return { urgency: 'overdue', className: 'text-destructive font-medium' }
    }
    return { urgency: 'normal', className: 'text-muted-foreground' }
  }),
  formatDueDateShort: vi.fn((dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }),
}))

const baseItem: ActionItemWithCustomer = {
  id: 'item-1',
  customer_id: 'cust-1',
  user_id: 'user-1',
  type: 'follow_up',
  description: 'Follow up with client about proposal',
  due_date: '2027-06-15',
  status: 'todo',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  customer_name: 'Acme Corp',
  reported_by: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KanbanCard', () => {
  it('renders type badge, description, and customer name', () => {
    render(<KanbanCard item={baseItem} />)

    expect(screen.getByText('Follow-up')).toBeTruthy()
    expect(screen.getByText('Follow up with client about proposal')).toBeTruthy()
    expect(screen.getByText('Acme Corp')).toBeTruthy()
  })

  it('renders due date when present', () => {
    render(<KanbanCard item={baseItem} />)

    // formatDueDateShort mock returns formatted date
    expect(screen.getByText(/Jun 15/)).toBeTruthy()
  })

  it('shows "General" when customer_name is null', () => {
    const generalItem = { ...baseItem, customer_id: null, customer_name: null }
    render(<KanbanCard item={generalItem} />)

    expect(screen.getByText('General')).toBeTruthy()
  })

  it('renders without due date', () => {
    const noDueDate = { ...baseItem, due_date: null }
    render(<KanbanCard item={noDueDate} />)

    expect(screen.getByText('Follow up with client about proposal')).toBeTruthy()
    // No calendar icon/date should be rendered
    expect(screen.queryByText(/Jun/)).toBeNull()
  })

  it('fires onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<KanbanCard item={baseItem} onClick={handleClick} />)

    fireEvent.click(screen.getByText('Follow up with client about proposal'))

    expect(handleClick).toHaveBeenCalledWith(baseItem)
  })

  it('applies drag overlay styles when isDragOverlay is true', () => {
    const { container } = render(<KanbanCard item={baseItem} isDragOverlay />)

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('shadow-lg')
    expect(card.className).toContain('rotate-[2deg]')
  })

  it('renders different type badges correctly', () => {
    const meetingItem = { ...baseItem, type: 'meeting' as const }
    render(<KanbanCard item={meetingItem} />)

    expect(screen.getByText('Meeting')).toBeTruthy()
  })
})
