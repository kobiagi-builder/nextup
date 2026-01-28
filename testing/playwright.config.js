import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Content Agent E2E Tests
 */
export default defineConfig({
  testDir: './playwright',

  // Run tests in files matching these patterns
  testMatch: '**/*.spec.js',

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html'],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'echo "Assuming servers are already running..."',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 5000,
  },
});
