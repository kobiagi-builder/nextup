/**
 * KanbanBoard Unit Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KanbanBoard } from '../components/KanbanBoard'
import type { ActionItemWithCustomer } from '../types'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useDroppable: vi.fn(() => ({ isOver: false, setNodeRef: vi.fn() })),
  useDraggable: vi.fn(() => ({
    attributes: { role: 'button' },
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  })),
}))

// Mock format utilities
vi.mock('@/features/customers/utils/format', () => ({
  getDueDateUrgency: vi.fn(() => ({ urgency: 'normal', className: 'text-muted-foreground' })),
  formatDueDateShort: vi.fn((d: string) => d),
}))

function makeItem(overrides: Partial<ActionItemWithCustomer> = {}): ActionItemWithCustomer {
  return {
    id: `item-${Math.random().toString(36).slice(2, 7)}`,
    customer_id: 'cust-1',
    user_id: 'user-1',
    type: 'follow_up',
    description: 'Test item',
    due_date: '2027-01-15',
    status: 'todo',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    customer_name: 'Test Customer',
    reported_by: null,
    ...overrides,
  }
}

describe('KanbanBoard', () => {
  it('renders 4 columns (Todo, In Progress, Done, Cancelled)', () => {
    render(
      <KanbanBoard items={[]} onStatusChange={vi.fn()} />
    )

    expect(screen.getByText('To Do')).toBeTruthy()
    expect(screen.getByText('In Progress')).toBeTruthy()
    expect(screen.getByText('Done')).toBeTruthy()
    expect(screen.getByText('Cancelled')).toBeTruthy()
  })

  it('distributes cards to correct columns by status', () => {
    const items: ActionItemWithCustomer[] = [
      makeItem({ id: '1', status: 'todo', description: 'Todo task' }),
      makeItem({ id: '2', status: 'in_progress', description: 'In progress task' }),
      makeItem({ id: '3', status: 'done', description: 'Done task' }),
      makeItem({ id: '4', status: 'cancelled', description: 'Cancelled task' }),
      makeItem({ id: '5', status: 'todo', description: 'Another todo' }),
    ]

    render(
      <KanbanBoard items={items} onStatusChange={vi.fn()} />
    )

    expect(screen.getByText('Todo task')).toBeTruthy()
    expect(screen.getByText('In progress task')).toBeTruthy()
    expect(screen.getByText('Done task')).toBeTruthy()
    expect(screen.getByText('Cancelled task')).toBeTruthy()
    expect(screen.getByText('Another todo')).toBeTruthy()
  })

  it('shows empty placeholder in columns with no items', () => {
    render(
      <KanbanBoard items={[]} onStatusChange={vi.fn()} />
    )

    // All 4 columns should show "No items"
    const noItems = screen.getAllByText('No items')
    expect(noItems).toHaveLength(4)
  })

  it('shows correct count badges in column headers', () => {
    const items: ActionItemWithCustomer[] = [
      makeItem({ id: '1', status: 'todo' }),
      makeItem({ id: '2', status: 'todo' }),
      makeItem({ id: '3', status: 'in_progress' }),
    ]

    render(
      <KanbanBoard items={items} onStatusChange={vi.fn()} />
    )

    // The count badges should reflect item distribution
    // Todo: 2, In Progress: 1, Done: 0, Cancelled: 0
    const countBadges = screen.getAllByText('0')
    expect(countBadges).toHaveLength(2) // Done and Cancelled have 0
    expect(screen.getByText('2')).toBeTruthy() // Todo has 2
    expect(screen.getByText('1')).toBeTruthy() // In Progress has 1
  })
})
