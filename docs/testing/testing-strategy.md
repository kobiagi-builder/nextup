# Testing Strategy

**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Version:** 1.0.0
**Status:** Complete

## Overview

This document defines the testing strategy for the Product Consultant Helper, covering the testing pyramid, frameworks, directory structure, test types, commands, and conventions.

---

## Testing Pyramid

| Level | Target Coverage | Scope | Framework |
|-------|----------------|-------|-----------|
| **Unit Tests** | 70-80% | Service methods, utility functions, component logic, pure functions | Vitest |
| **Integration Tests** | 15-20% | API endpoints, tool pipeline orchestration, cross-service interactions | Vitest + Supertest |
| **E2E Tests** | 5-10% | Critical user journeys, multi-page workflows | Playwright |

---

## Frameworks & Tools

### Backend

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 2.1.x | Test runner, assertions, mocking |
| @vitest/coverage-v8 | 2.1.x | Code coverage via V8 |

### Frontend

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.0.x | Test runner, assertions, mocking |
| @testing-library/react | 16.x | React component testing |
| @testing-library/jest-dom | 6.x | DOM assertions |
| Playwright | 1.57.x | E2E browser automation |

---

## Directory Structure

### Backend Tests

```
backend/src/__tests__/
├── setup.ts                          # Global setup: env vars, mock keys, vi.clearAllMocks
├── fixtures/
│   ├── artifacts.ts                  # Mock artifact data
│   └── users.ts                      # Mock user data
├── utils/
│   └── testHelpers.ts                # Shared test utilities
├── unit/
│   └── services/
│       └── ai/
│           └── tools/
│               ├── researchTools.test.ts
│               ├── skeletonTools.test.ts
│               ├── contentWritingTools.test.ts
│               ├── humanityCheckTools.test.ts
│               └── visualsCreatorTool.test.ts
└── integration/
    └── toolPipeline.integration.test.ts
```

### Frontend Tests

```
frontend/
├── tests/
│   ├── setup.ts                      # Frontend test setup (JSDOM, mocks)
│   ├── unit/
│   │   ├── appStore.test.ts          # Zustand store tests
│   │   ├── components/
│   │   │   ├── ImageApprovalPanel.test.tsx
│   │   │   ├── ImageRegenerationModal.test.tsx
│   │   │   └── ProtectedRoute.test.tsx
│   │   └── hooks/
│   │       ├── useImageGeneration.test.tsx
│   │       └── usePasswordValidation.test.ts
│   └── e2e/                          # Playwright tests (planned)
└── src/
    └── features/portfolio/utils/
        ├── htmlFormatter.test.ts      # Co-located utility tests
        └── messageFormatter.test.ts
```

---

## Test Commands

### Root (Workspace)

```bash
npm run test                         # Run frontend tests (workspace shortcut)
```

### Backend

```bash
cd backend
npm run test                         # Run all tests once
npm run test:watch                   # Run in watch mode
npm run test:unit                    # Unit tests only
npm run test:integration             # Integration tests only
npm run test:coverage                # Run with V8 coverage report
```

### Frontend

```bash
cd frontend
npm run test                         # Run in watch mode (vitest)
npm run test:run                     # Run all tests once
npm run test:coverage                # Run with coverage
npm run test:e2e                     # Playwright E2E tests
npm run test:e2e:ui                  # Playwright with UI mode
```

---

## Test Types

### Unit Tests

**Scope**: Individual functions, service methods, hooks, stores, utilities

**Characteristics**:
- Fast (< 100ms per test)
- No external dependencies (DB, API, network mocked)
- Use `vi.mock()` for module-level mocks
- Use `vi.fn()` for function mocks

**Naming**: `*.test.ts` or `*.test.tsx`

**Current coverage**:
- Backend: 5 tool test files (research, skeleton, writing, humanity check, visuals)
- Frontend: 2 co-located utility tests + 5 unit test files (store, components, hooks)

### Integration Tests

**Scope**: Multi-service interactions, tool pipeline orchestration

**Characteristics**:
- Moderate speed (< 5s per test)
- Mock external APIs (AI providers, Supabase) but test inter-service wiring
- Validate tool chaining, status transitions, error propagation

**Naming**: `*.integration.test.ts`

**Current coverage**:
- `toolPipeline.integration.test.ts` — Tests full pipeline execution with mocked AI providers

### E2E Tests

**Scope**: Complete user journeys through the browser

**Characteristics**:
- Slow (10-60s per test)
- Require running frontend + backend
- Test real user flows end-to-end
- Use Playwright for browser automation

**Naming**: `*.e2e.test.ts`

**Current coverage**: Planned (directory exists)

---

## Test Setup

### Backend (`backend/src/__tests__/setup.ts`)

- Loads `.env.test` for test environment variables
- Provides fallback mock values for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
- Sets `NODE_ENV=test`
- Resets all mocks between tests (`vi.clearAllMocks` in `beforeEach`)
- Restores all mocks after tests (`vi.restoreAllMocks` in `afterEach`)
- Exports test constants: `TEST_USER_ID`, `TEST_PRODUCT_ID`, `TEST_ARTIFACT_ID`, `TEST_TRACE_ID`

### Frontend (`frontend/tests/setup.ts`)

- Configures JSDOM environment for React Testing Library
- Sets up global mocks for browser APIs

---

## Mock Configuration

### Backend MOCK Toggles

Several backend services support mock toggles via environment variables for development and testing:

| Toggle | Purpose |
|--------|---------|
| `MOCK_RESEARCH=true` | Skip Tavily API calls, return mock research data |
| `MOCK_AI=true` | Skip Claude/Gemini calls, return mock content |
| `MOCK_IMAGES=true` | Skip DALL-E/Imagen calls, return placeholder images |

See `docs/api/MOCK_CONFIGURATION_GUIDE.md` for full configuration reference.

### Test Mocking Strategy

- **AI providers**: Always mocked in unit/integration tests (no real API calls)
- **Supabase client**: Mocked with `vi.mock()` returning controlled responses
- **Storage**: Mocked to return URLs without actual uploads
- **External APIs**: Never called in automated tests

---

## Coverage Standards

### Targets

| Area | Minimum | Stretch Goal |
|------|---------|-------------|
| Backend business logic | 80% | 90% |
| Backend AI tools | 80% | 90% |
| Frontend hooks | 70% | 85% |
| Frontend components | 60% | 80% |
| Frontend utilities | 90% | 95% |

### Viewing Coverage

```bash
# Backend
cd backend && npm run test:coverage
# Opens coverage/index.html

# Frontend
cd frontend && npm run test:coverage
```

---

## Build-First Verification

**MANDATORY**: Always run `npm run build` before testing to catch TypeScript errors:

```bash
npm run build && npm run test
```

TypeScript compilation errors are not caught by tests. A clean build ensures tests run against correct types.

---

## Conventions

### File Naming

- Unit tests: `*.test.ts` / `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`
- Fixtures: `fixtures/*.ts`
- Helpers: `utils/testHelpers.ts`

### Test Structure

```typescript
describe('ToolName', () => {
  describe('execute', () => {
    it('should succeed with valid input', async () => {
      // Arrange
      const input = { ... };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fail with invalid artifact ID', async () => {
      // ...
    });
  });
});
```

### Assertion Patterns

- Use `expect(result).toBeDefined()` for existence checks
- Use `expect(result.success).toBe(true)` for tool outputs
- Use `expect(fn).toHaveBeenCalledWith(...)` for mock verification
- Avoid snapshot testing unless testing complex output structures

---

## Related Documentation

- [MOCK_CONFIGURATION_GUIDE.md](../api/MOCK_CONFIGURATION_GUIDE.md) — Mock toggle configuration
- [sanity-test-analysis-2026-01-26.md](./sanity-test-analysis-2026-01-26.md) — Initial test analysis
- [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md) — Tools being tested
