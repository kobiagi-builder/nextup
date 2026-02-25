# Testing Infrastructure

**Created:** 2026-02-25
**Last Updated:** 2026-02-25
**Version:** 1.0.0
**Status:** Complete

## Overview

NextUp uses a three-tier testing strategy across two framework types: **Vitest** for unit and integration tests, and **Playwright** for end-to-end (E2E) browser tests. Tests are distributed across three locations with independent configurations.

---

## Test Locations

| Location | Framework | Scope | Config |
|----------|-----------|-------|--------|
| `backend/src/__tests__/` | Vitest | Backend unit + integration | `backend/vitest.config.ts` |
| `frontend/tests/` | Vitest | Frontend unit (React components, hooks, stores) | `frontend/vitest.config.ts` |
| `testing/` | Vitest + Playwright | Cross-stack unit, integration, E2E | `testing/vitest.config.ts` + `testing/playwright.config.js` |
| `frontend/tests/e2e/` | Playwright | Frontend E2E (default Playwright location) | `frontend/playwright.config.ts` |

---

## Framework Configuration

### Backend Vitest (`backend/vitest.config.ts`)

```typescript
{
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,   // 30s for integration tests
    hookTimeout: 10000,
  },
}
```

**Coverage thresholds enforced:** 80% lines, 80% functions, 75% branches, 80% statements.

### Frontend Vitest (`frontend/vitest.config.ts`)

```typescript
{
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/unit/**/*.{test,spec}.{ts,tsx}', './src/**/*.{test,spec}.{ts,tsx}'],
    coverage: { reporter: ['text', 'json', 'html'] },
  },
}
```

**Environment:** jsdom (simulates browser DOM for React component tests).

### Cross-Stack Vitest (`testing/vitest.config.ts`)

```typescript
{
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./setup.ts'],
    include: [
      './unit/**/*.{test,spec}.{ts,tsx}',
      './integration/**/*.{test,spec}.{ts,tsx}',
    ],
    environmentMatchGlobs: [
      ['unit/frontend/**', 'jsdom'],
      ['unit/backend/**', 'node'],
      ['integration/**', 'node'],
    ],
    coverage: { reporter: ['text', 'json', 'html'] },
  },
  resolve: {
    alias: {
      '@backend': '../backend/src',
      '@': '../frontend/src',
      '@frontend': '../frontend/src',
    },
  },
}
```

**Environment matching:** Automatically selects jsdom for frontend tests, node for backend/integration.

### Playwright Configs

**Frontend E2E** (`frontend/playwright.config.ts`):
- Test dir: `./tests/e2e`
- Browsers: Chromium, Firefox, WebKit
- Base URL: `http://localhost:5173`
- Web server: Starts `npm run dev` automatically
- Retries: 2 on CI, 0 locally

**Testing E2E** (`testing/playwright.config.js`):
- Test dir: `./playwright`
- Browser: Chromium only
- Base URL: `http://localhost:5173`
- Assumes servers already running (no auto-start)
- Screenshots on failure, video on failure, trace on retry

---

## Test Inventory

### Backend Unit Tests (`backend/src/__tests__/unit/`)

| File | Scope |
|------|-------|
| `services/ai/tools/contentTools.test.ts` | Content management tool logic |
| `services/ai/tools/contentWritingTools.test.ts` | writeFullContent, writeContentSection |
| `services/ai/tools/humanityCheckTools.test.ts` | applyHumanityCheck |
| `services/ai/tools/researchTools.test.ts` | conductDeepResearch |
| `services/ai/tools/skeletonTools.test.ts` | generateContentSkeleton |
| `services/ai/tools/storytellingTools.test.ts` | analyzeStorytellingStructure |
| `services/ai/tools/visualsCreatorTool.test.ts` | generateContentVisuals |

### Backend Integration Tests (`backend/src/__tests__/integration/`)

| File | Scope |
|------|-------|
| `toolPipeline.integration.test.ts` | Full tool pipeline execution flow |

### Frontend Unit Tests (`frontend/tests/unit/`)

| File | Scope |
|------|-------|
| `appStore.test.ts` | Zustand app store logic |
| `components/ImageApprovalPanel.test.tsx` | Image approval panel rendering |
| `components/ImageRegenerationModal.test.tsx` | Image regeneration modal |
| `components/ProtectedRoute.test.tsx` | Auth route guard behavior |
| `hooks/useImageGeneration.test.tsx` | Image generation hook |
| `hooks/usePasswordValidation.test.ts` | Password validation rules |

### Cross-Stack Unit Tests (`testing/unit/`)

| File | Scope |
|------|-------|
| `backend/researchTools.test.ts` | Research tools (cross-stack context) |
| `backend/skeletonTools.test.ts` | Skeleton tools (cross-stack context) |
| `frontend/ArtifactSuggestionCard.test.tsx` | Artifact suggestion card component |
| `frontend/ResearchArea.test.tsx` | Research area display component |
| `frontend/ToneSelector.test.tsx` | Tone selector component |

### Cross-Stack Integration Tests (`testing/integration/`)

| File | Scope |
|------|-------|
| `researchWorkflow.test.ts` | End-to-end research workflow |

### Playwright E2E Tests (`testing/playwright/`)

| File | Scope |
|------|-------|
| `create-content.test.js` | Content creation from new artifact |
| `create-content-from-topics.test.js` | Content creation from topic suggestions |
| `tier1-full-pipeline.spec.js` | Tier 1: Full AI pipeline (research to ready) |
| `tier1-ui-interactions.spec.js` | Tier 1: UI interactions and navigation |
| `test-scenarios-template.js` | Reusable test scenario template |
| `utils/test-helpers.js` | Shared test utilities and helpers |

---

## Test Setup Files

### Backend Setup (`backend/src/__tests__/setup.ts`)

Configures node environment for backend tests. Sets up path aliases and test utilities.

### Frontend Setup (`frontend/tests/setup.ts`)

Mocks browser APIs not available in jsdom:
- `window.matchMedia` (for media query components)
- `ResizeObserver` (for resize-aware components)
- Imports `@testing-library/jest-dom` for DOM matchers

### Cross-Stack Setup (`testing/setup.ts`)

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => { vi.clearAllMocks() })
afterEach(() => { vi.restoreAllMocks() })

// Conditional frontend setup
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom')
}
```

Resets mocks between tests. Conditionally loads DOM matchers when running in jsdom environment.

---

## Running Tests

### Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Run frontend Vitest tests |
| `npm run test:watch` | Frontend tests in watch mode |
| `npm run test:coverage` | Frontend tests with coverage report |
| `cd backend && npx vitest` | Run backend unit tests |
| `cd backend && npx vitest --coverage` | Backend tests with coverage |
| `cd testing && npx vitest` | Run cross-stack unit + integration tests |
| `cd frontend && npx playwright test` | Run frontend E2E tests |
| `cd testing && npx playwright test` | Run cross-stack E2E tests |
| `npx playwright test --ui` | Interactive Playwright UI mode |
| `npx playwright test --headed` | Run with visible browser |

### Prerequisites

1. **Backend server running** (`npm run dev:backend`) on port 3001
2. **Frontend dev server running** (`npm run dev:frontend`) on port 5173
3. **Playwright browsers installed** (`npx playwright install`)

### Test Credentials

For E2E tests requiring authentication:
- **Email:** `kobiagi+nextuptest@gmail.com`
- **Password:** `Qwerty12345`

See `.claude/rules/testing/playwright-credentials.md` for login flow patterns.

---

## Test Data IDs

Components include `data-testid` attributes for reliable Playwright selectors:

| Test ID | Component | Description |
|---------|-----------|-------------|
| `portfolio-new-button` | PortfolioPage | Create artifact button |
| `create-artifact-dialog` | CreateArtifactDialog | New artifact form dialog |
| `artifact-form-title` | CreateArtifactDialog | Title input |
| `artifact-form-type` | CreateArtifactDialog | Type select |
| `artifact-type-{type}` | CreateArtifactDialog | Type dropdown options |
| `artifact-form-content` | CreateArtifactDialog | Description textarea |
| `artifact-form-submit` | CreateArtifactDialog | Create button |
| `artifact-form-cancel` | CreateArtifactDialog | Cancel button |
| `artifact-create-content-button` | ArtifactPage | AI content creation trigger |
| `artifact-editor` | ArtifactPage | Main content editor |
| `ai-assistant-panel` | ArtifactPage | AI chat panel |
| `ai-chat-panel` | ChatPanel | Chat message area |

---

## Coverage Status

### Backend

- **Target:** 80% lines, 80% functions, 75% branches, 80% statements (enforced)
- **Coverage tool:** V8 provider with lcov reporter
- **Covered areas:** AI tool logic (7 tool test files), pipeline integration

### Frontend

- **Target:** Not enforced (coverage reporting only)
- **Covered areas:** Auth components, image generation, Zustand stores

### E2E

- **Critical paths covered:** Content creation (blog, showcase, social post), topic-based creation, full pipeline flow, UI interactions

---

## Related Documentation

- [Playwright README](./playwright/README.md) — detailed Playwright test guide with patterns and examples
- [Sanity Test Analysis](./sanity-test-analysis-2026-01-26.md) — initial test run report (historical, issues since fixed)
- [Testing Methodology](../../.claude/rules/backend/testing/testing-methodology.md) — testing standards and methodology rules
