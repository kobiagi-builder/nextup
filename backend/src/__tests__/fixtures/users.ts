/**
 * User Test Fixtures
 *
 * Pre-built user profiles for various test scenarios.
 */

import type { MockUser } from '../utils/testHelpers.js';

// =============================================================================
// Standard Test User
// =============================================================================

export const standardUser: MockUser = {
  id: '00000000-0000-4000-a000-000000000101',
  email: 'john.doe@example.com',
  full_name: 'John Doe',
  avatar_url: 'https://example.com/avatars/john.jpg',
  created_at: '2026-01-01T00:00:00Z',
};

// =============================================================================
// Premium User
// =============================================================================

export const premiumUser: MockUser = {
  id: '00000000-0000-4000-a000-000000000102',
  email: 'jane.smith@example.com',
  full_name: 'Jane Smith',
  avatar_url: 'https://example.com/avatars/jane.jpg',
  created_at: '2025-12-01T00:00:00Z',
};

// =============================================================================
// New User (Just Created)
// =============================================================================

export const newUser: MockUser = {
  id: '00000000-0000-4000-a000-000000000103',
  email: 'newuser@example.com',
  full_name: 'New User',
  avatar_url: undefined,
  created_at: new Date().toISOString(),
};

// =============================================================================
// User Without Avatar
// =============================================================================

export const userWithoutAvatar: MockUser = {
  id: '00000000-0000-4000-a000-000000000104',
  email: 'simple@example.com',
  full_name: 'Simple User',
  avatar_url: undefined,
  created_at: '2026-01-15T00:00:00Z',
};

// =============================================================================
// Export All Fixtures
// =============================================================================

export const userFixtures = {
  standard: standardUser,
  premium: premiumUser,
  new: newUser,
  withoutAvatar: userWithoutAvatar,
};
