import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./setup.ts'],
    include: [
      './unit/**/*.{test,spec}.{ts,tsx}',
      './integration/**/*.{test,spec}.{ts,tsx}',
    ],
    // Use jsdom for frontend tests, node for backend
    environmentMatchGlobs: [
      ['unit/frontend/**', 'jsdom'],
      ['unit/backend/**', 'node'],
      ['integration/**', 'node'],
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'setup.ts', 'playwright/'],
    },
  },
  resolve: {
    alias: {
      // Backend aliases
      '@backend': path.resolve(__dirname, '../backend/src'),
      // Frontend aliases
      '@': path.resolve(__dirname, '../frontend/src'),
      '@frontend': path.resolve(__dirname, '../frontend/src'),
    },
  },
})
