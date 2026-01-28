/**
 * Test Setup File
 *
 * Configures global test utilities and mocks for both
 * backend (Node.js) and frontend (React/jsdom) tests.
 */

import { vi, beforeEach, afterEach } from 'vitest'

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Mock console to suppress noise during tests (optional)
// vi.spyOn(console, 'log').mockImplementation(() => {})
// vi.spyOn(console, 'debug').mockImplementation(() => {})

// Add custom matchers if needed (for jsdom environment)
if (typeof window !== 'undefined') {
  // Frontend-specific setup
  await import('@testing-library/jest-dom')
}
