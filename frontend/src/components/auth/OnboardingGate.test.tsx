/**
 * OnboardingGate Unit Tests
 *
 * Tests the route guard that redirects incomplete users to /onboarding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingGate } from './OnboardingGate'

// Mock the useOnboardingProgress hook
const mockUseOnboardingProgress = vi.fn()
vi.mock('@/features/onboarding/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: () => mockUseOnboardingProgress(),
}))

// Track Navigate calls
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: (props: { to: string; replace?: boolean }) => {
      mockNavigate(props)
      return <div data-testid="navigate" data-to={props.to} />
    },
  }
})

function renderGate(initialPath = '/portfolio') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <OnboardingGate>
        <div data-testid="app-content">App Content</div>
      </OnboardingGate>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OnboardingGate', () => {
  it('shows spinner while loading', () => {
    mockUseOnboardingProgress.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    renderGate()

    // Spinner is rendered (Loader2 produces an SVG with animate-spin)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
    expect(screen.queryByTestId('app-content')).toBeNull()
  })

  it('renders children (fails open) when query errors', () => {
    mockUseOnboardingProgress.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    renderGate()

    expect(screen.getByTestId('app-content')).toBeTruthy()
  })

  it('redirects to /onboarding when progress is null (new user)', () => {
    mockUseOnboardingProgress.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    })

    renderGate()

    expect(screen.getByTestId('navigate')).toBeTruthy()
    expect(screen.getByTestId('navigate').getAttribute('data-to')).toBe('/onboarding')
    expect(screen.queryByTestId('app-content')).toBeNull()
  })

  it('redirects to /onboarding when completed_at is null (incomplete)', () => {
    mockUseOnboardingProgress.mockReturnValue({
      data: { id: '1', user_id: '1', current_step: 2, completed_at: null },
      isLoading: false,
      isError: false,
    })

    renderGate()

    expect(screen.getByTestId('navigate')).toBeTruthy()
    expect(screen.getByTestId('navigate').getAttribute('data-to')).toBe('/onboarding')
  })

  it('renders children when completed_at is set', () => {
    mockUseOnboardingProgress.mockReturnValue({
      data: {
        id: '1',
        user_id: '1',
        current_step: 5,
        completed_at: '2026-03-02T00:00:00Z',
      },
      isLoading: false,
      isError: false,
    })

    renderGate()

    expect(screen.getByTestId('app-content')).toBeTruthy()
    expect(screen.queryByTestId('navigate')).toBeNull()
  })

  it('renders children when already on /onboarding (prevents loop)', () => {
    mockUseOnboardingProgress.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    })

    renderGate('/onboarding')

    // Should NOT redirect since we're already on /onboarding
    expect(screen.getByTestId('app-content')).toBeTruthy()
    expect(screen.queryByTestId('navigate')).toBeNull()
  })
})
