# Playwright Testing Guide

## Overview

This project uses Playwright for end-to-end (E2E) testing, with Vitest for unit and integration tests.

## Testing Stack

| Framework | Purpose | Location |
|-----------|---------|----------|
| Playwright | E2E tests | `/testing/playwright/` |
| Vitest | Unit tests | `frontend/tests/unit/` |
| Testing Library | Component testing | `frontend/tests/` |

## Directory Structure

```
Product_Consultant_Helper/
├── testing/
│   └── playwright/
│       ├── create-content.test.js    # Content creation E2E
│       └── ... (future tests)
├── frontend/
│   ├── tests/
│   │   ├── e2e/                      # Playwright tests (default location)
│   │   ├── unit/
│   │   │   └── appStore.test.ts      # Zustand store tests
│   │   └── setup.ts                  # Test setup (mocks)
│   ├── playwright.config.ts           # Playwright configuration
│   └── vitest.config.ts               # Vitest configuration
└── docs/
    └── testing/
        └── playwright/
            └── README.md             # This file
```

## Playwright Configuration

**File:** `frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Running Tests

### Prerequisites

1. Start the backend server:
   ```bash
   npm run dev:backend
   ```

2. Start the frontend (in another terminal):
   ```bash
   npm run dev:frontend
   ```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
cd frontend && npx playwright test

# Run specific test file
npx playwright test create-content

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
```

### Unit Tests (Vitest)

```bash
# Run unit tests
npm run test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test IDs

Components include `data-testid` attributes for reliable E2E selectors:

| Component | Test ID | Description |
|-----------|---------|-------------|
| New Button | `portfolio-new-button` | Create artifact button |
| Create Dialog | `create-artifact-dialog` | New artifact form dialog |
| Form Title | `artifact-form-title` | Title input field |
| Form Type | `artifact-form-type` | Type select dropdown |
| Type Options | `artifact-type-{type}` | Type dropdown options |
| Form Content | `artifact-form-content` | Description textarea |
| Form Submit | `artifact-form-submit` | Create button |
| Form Cancel | `artifact-form-cancel` | Cancel button |
| Create Content | `artifact-create-content-button` | AI content creation trigger |
| Artifact Editor | `artifact-editor` | Main content editor |
| AI Assistant | `ai-assistant-panel` | AI chat panel |
| AI Chat | `ai-chat-panel` | Chat message area |

## E2E Test: Create Content Flow

**File:** `testing/playwright/create-content.test.js`

This comprehensive test validates the AI-powered content creation workflow:

### Test Coverage

1. **Navigation** - Portfolio page access via sidebar
2. **Artifact Creation** - Form submission with test IDs
3. **AI Interaction** - "Create Content" button triggers AI
4. **Status Tracking** - Polls for status changes via console logs
5. **Skeleton Verification** - Validates generated content structure

### Test Configuration

```javascript
const ARTIFACT_TYPES = [
  { type: 'blog', title: 'AI in Education', description: 'Blog post about AI for students' },
  { type: 'showcase', title: 'Portfolio Platform', description: 'Project showcase for my portfolio app' },
  { type: 'social_post', title: 'Quick AI Tips', description: 'Social media post about AI productivity' }
];

const POLL_INTERVAL = 5000;  // Check status every 5 seconds
const MAX_WAIT_TIME = 600000; // 10 minute timeout
```

### Status Detection

The test tracks AI completion by monitoring browser console logs:

```javascript
page.on('console', msg => {
  const text = msg.text();

  // Track status changes
  if (text.includes('[ArtifactPage]') && text.includes('currentStatus:')) {
    const statusMatch = text.match(/currentStatus:\s*(\w+)/);
    if (statusMatch) {
      currentArtifactStatus = statusMatch[1];
    }
  }

  // Track skeleton generation
  if (text.includes('generateContentSkeleton') && text.includes('"success":true')) {
    skeletonGenerated = true;
  }
});
```

### Content Verification

The test validates generated content based on artifact type:

**Blog:**
- Has title marker (Title or #)
- Has hook section
- Has IMAGE placeholders

**Social Post:**
- Has hook
- Has hashtags (#)
- Has IMAGE placeholder

**Showcase:**
- Has title
- Has Problem section
- Has Solution section
- Has IMAGE placeholders

### Screenshot Captures

Test captures screenshots at key points:
- `/tmp/skeleton-{type}.png` - Successful skeleton generation
- `/tmp/timeout-{type}.png` - Timeout failures
- `/tmp/error-state.png` - Error conditions

## Writing New Tests

### Basic Test Structure

```javascript
import { chromium } from 'playwright';

const TARGET_URL = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 300
  });

  const page = await browser.newPage();

  try {
    // Test steps here
    await page.goto(TARGET_URL);

    // Use test IDs for reliable selection
    const button = page.locator('[data-testid="my-button"]');
    await button.click();

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '/tmp/error.png' });
  } finally {
    await browser.close();
  }
})();
```

### Using Page Object Model

```javascript
class PortfolioPage {
  constructor(page) {
    this.page = page;
    this.newButton = page.locator('[data-testid="portfolio-new-button"]');
    this.createDialog = page.locator('[data-testid="create-artifact-dialog"]');
  }

  async createArtifact(title, type, description) {
    await this.newButton.click();
    await this.createDialog.waitFor({ state: 'visible' });

    await this.page.locator('[data-testid="artifact-form-title"]').fill(title);
    await this.page.locator('[data-testid="artifact-form-type"]').click();
    await this.page.locator(`[data-testid="artifact-type-${type}"]`).click();
    await this.page.locator('[data-testid="artifact-form-content"]').fill(description);
    await this.page.locator('[data-testid="artifact-form-submit"]').click();
  }
}
```

## Test Setup Mocks

**File:** `frontend/tests/setup.ts`

```typescript
import '@testing-library/jest-dom'

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start backend
        run: npm run dev:backend &

      - name: Run E2E tests
        run: cd frontend && npx playwright test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Debugging Tips

### Enable Trace

```bash
npx playwright test --trace on
```

### Run with Debug

```bash
PWDEBUG=1 npx playwright test
```

### View Report

```bash
npx playwright show-report
```

### Console Logging

Add logging to track test progress:

```javascript
page.on('console', msg => {
  console.log(`[BROWSER ${msg.type()}]`, msg.text());
});
```

### Network Interception

```javascript
await page.route('**/api/**', route => {
  console.log('API Request:', route.request().url());
  route.continue();
});
```

## Best Practices

1. **Use Test IDs** - Always use `data-testid` attributes instead of CSS selectors
2. **Wait for State** - Use `waitFor` instead of arbitrary timeouts
3. **Isolate Tests** - Each test should be independent
4. **Clean Up** - Reset state between tests
5. **Screenshot on Failure** - Capture screenshots for debugging
6. **Log Important Events** - Track status changes and API calls
