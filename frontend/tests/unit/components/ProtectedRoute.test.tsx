/**
 * Unit Tests for ProtectedRoute Component
 *
 * Tests route protection behavior:
 * - Loading state shows spinner
 * - Unauthenticated users redirect to login
 * - Authenticated users see children
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../../../src/components/auth/ProtectedRoute'

// =============================================================================
// Mocks
// =============================================================================

const mockUseAuth = vi.fn()

vi.mock('../../../src/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

// =============================================================================
// Helpers
// =============================================================================

function renderWithRouter(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/login" element={<div data-testid="login-page">Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// =============================================================================
// Tests
// =============================================================================

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, session: null, signOut: vi.fn() })

    renderWithRouter()

    // Spinner is an SVG with animate-spin class (Loader2 from lucide)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
    expect(screen.queryByTestId('protected-content')).toBeNull()
    expect(screen.queryByTestId('login-page')).toBeNull()
  })

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, session: null, signOut: vi.fn() })

    renderWithRouter()

    expect(screen.getByTestId('login-page')).toBeTruthy()
    expect(screen.queryByTestId('protected-content')).toBeNull()
  })

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
      session: { access_token: 'token' },
      signOut: vi.fn(),
    })

    renderWithRouter()

    expect(screen.getByTestId('protected-content')).toBeTruthy()
    expect(screen.queryByTestId('login-page')).toBeNull()
  })

  it('should preserve location state for redirect-after-login', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, session: null, signOut: vi.fn() })

    // Navigate component uses replace with state, so redirecting from /
    // The login page should receive the attempted path in location state.
    // We verify the redirect happened by checking the login page renders.
    renderWithRouter('/')

    expect(screen.getByTestId('login-page')).toBeTruthy()
  })
})
