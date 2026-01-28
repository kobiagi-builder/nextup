/**
 * Vitest Global Setup
 *
 * Configures test environment, mocks, and utilities.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Mock environment variables if not set
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
}
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-openai-key';
}
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
}

// Set test mode for mock service
process.env.NODE_ENV = 'test';

// Global test utilities
beforeAll(() => {
  // Setup run once before all tests
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  // Cleanup run once after all tests
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Export test utilities
export const TEST_USER_ID = 'test-user-123';
export const TEST_PRODUCT_ID = 'test-product-456';
export const TEST_ARTIFACT_ID = 'test-artifact-789';
export const TEST_TRACE_ID = 'test-trace-001';
