# Playwright E2E Tests

Comprehensive E2E testing for the Product Consultant Helper platform.

---

## Overview

This directory contains end-to-end tests for:
1. **Content Agent** - AI-powered content creation pipeline
2. **Artifact Status Flow** - 7-status workflow system

---

## Content Agent Tests

### Quick Start

```bash
# Run all Tier 1 tests (critical path)
npx playwright test --grep @tier1

# Run specific test
npx playwright test --grep "T1.1"

# Run with browser visible
npx playwright test --headed --grep @tier1
```

### Test Files

**Tier 1 (Critical Path - MUST PASS):**
- `tier1-full-pipeline.spec.js` - Complete content creation pipeline
  - T1.1: Blog post (draft → ready → published)
  - T1.2: Social post (draft → ready → published)
  - T1.3: Showcase (draft → ready → published)
- `tier1-ui-interactions.spec.js` - Core UI interactions
  - T1.4: AI Assistant accessibility
  - T1.5: Research area toggle
  - T1.6: Auto-transition (published → ready on edit)

**Documentation:**
- [content-agent-test-plan.md](./content-agent-test-plan.md) - Complete test plan with all scenarios
- [utils/test-helpers.js](./utils/test-helpers.js) - Reusable test utilities

### Test Coverage

| Category | Tests | Duration |
|----------|-------|----------|
| Full Pipeline | 3 tests | 15-25 min total |
| UI Interactions | 3 tests | 5-8 min total |
| Partial Flows (Tier 2) | 10 tests | TBD |
| Edge Cases (Tier 3) | 10 tests | TBD |

---

## Artifact Status Flow Tests

This directory also contains complete testing documentation and templates for the artifact status flow system.

### The 7-Status Workflow

```
draft → research → skeleton → writing → creating_visuals → ready → published
                                                                      ↓
                                                                   (edit)
                                                                      ↓
                                                                    ready
```

---

## Documentation Files

### 📋 [artifact-status-flow-testing-plan.md](./artifact-status-flow-testing-plan.md)

**Complete testing plan with detailed test cases**

- Entry point tests (manual creation, topics flow)
- Status behavior tests (all 7 statuses)
- Transition tests (linear progression, loops)
- Edge cases (refresh, network, failures)
- **45+ detailed test scenarios**

**Use this when:**
- Planning test coverage
- Understanding what to test
- Writing new test cases
- Documenting test requirements

---

### ⚡ [quick-test-reference.md](./quick-test-reference.md)

**Quick reference guide for test execution**

- Status matrix table
- Critical test paths
- Quick verification checklist
- Common locators and wait patterns
- Expected timeouts
- Debug tips

**Use this when:**
- Running tests quickly
- Need locator selectors
- Debugging test failures
- Quick status verification

---

### 💻 [test-scenarios-template.js](./test-scenarios-template.js)

**Ready-to-use test templates**

- 5 complete test templates
- Helper functions (waitForStatus, getArtifact, etc.)
- Console assertions
- Error handling
- Screenshot capture

**Use this when:**
- Writing new test scripts
- Need code examples
- Implementing test scenarios

---

## Quick Start

### 1. Run Existing Tests

```bash
# Test complete flow: Create → AI generation → Publish
node testing/playwright/create-content.test.js

# Test create from topics flow
node testing/playwright/create-content-from-topics.test.js
```

### 2. Create New Test

Copy template from `test-scenarios-template.js`:

```javascript
// Example: Test draft status behavior
async function testDraftStatusBehavior() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to artifact in draft status
    // Verify UI elements
    // Test CTAs
    // Test editor state
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}
```

### 3. Verify Status Behavior

Use the quick reference checklist:

```javascript
// Per-Status Checklist
✅ Status badge label correct?
✅ Editor locked/unlocked?
✅ CTAs visible/hidden?
✅ WritingProgress visible?
✅ Polling active?
```

---

## Test Coverage

### Entry Points (5 scenarios)
- Manual creation → draft
- Manual creation → create content
- Topics → edit → draft
- Topics → edit → create content
- Topics → create content (direct)

### Status Behaviors (7 statuses)
- draft, research, skeleton, writing, creating_visuals, ready, published

### Transitions (10 scenarios)
- Linear progression (7 transitions)
- Published → ready loop (2 tests)
- Invalid transitions (1 test)

### Edge Cases (4 scenarios)
- Browser refresh during processing
- Network disconnect
- AI service failure
- Direct URL access

**Total: 26+ core test scenarios**

---

## Test Execution Strategy

### Option 1: UI-Driven E2E (Slow but Complete)

**Pros:** Tests complete user journey, realistic
**Cons:** Slow (10+ minutes), dependent on AI service
**Use for:** Critical path testing, release validation

```bash
node testing/playwright/create-content.test.js
```

### Option 2: Data-Driven Isolated Tests (Fast)

**Pros:** Fast (<5 min), reliable, no AI dependency
**Cons:** Doesn't test creation flow
**Use for:** Status behavior verification, regression testing

```javascript
// Use MCP to create test artifacts in specific statuses
await createTestArtifact({ status: 'research' })
// Then test UI behavior
```

### Option 3: Hybrid Approach (Recommended)

**Combine both:**
1. Use MCP for status behavior tests (fast iteration)
2. Use UI for critical E2E paths (complete validation)

---

## Key Test Patterns

### Pattern 1: Wait for Status Change

```javascript
await waitForStatus(page, 'ready', { timeout: 600000 })
```

### Pattern 2: Monitor Status Transitions

```javascript
let statusHistory = []
page.on('console', msg => {
  const match = msg.text().match(/currentStatus:\s*(\w+)/)
  if (match) statusHistory.push(match[1])
})
```

### Pattern 3: Verify UI Elements

```javascript
const statusBadge = page.locator('[data-testid="status-badge"]')
expect(await statusBadge.textContent()).toBe('Content Ready')
```

### Pattern 4: Test Auto-Transitions

```javascript
// Published → Ready on edit
await editor.click()
await page.keyboard.type(' Edit text')
await page.waitForTimeout(2000)
expect(artifact.status).toBe('ready') // Auto-transitioned
```

---

## Common Locators

```javascript
// Core elements
'[data-testid="status-badge"]'
'[data-testid="artifact-editor"]'
'[data-testid="writing-progress"]'
'[data-testid="research-area"]'
'[data-testid="ai-assistant-panel"]'

// CTAs
'[data-testid="artifact-create-content-button"]'
'[data-testid="artifact-mark-published-button"]'
'[data-testid="portfolio-new-button"]'

// Editor states
'[data-testid="editor-lock-overlay"]'
'[contenteditable="true"]'
'[contenteditable="false"]'
```

---

## Expected Timeouts

| Operation | Expected | Max Timeout |
|-----------|----------|-------------|
| Draft creation | 2-3s | 10s |
| Research phase | 30-120s | 5min |
| Skeleton phase | 20-60s | 3min |
| Writing phase | 60-180s | 5min |
| Creating visuals | 1-2s | 10s |
| Mark as published | 1-2s | 5s |

---

## Debug Tips

### Status Stuck in Processing?

1. Check console for AI tool errors
2. Check backend logs for AI service failures
3. Verify polling is active (console logs: `[useResearch] Polling active: true`)
4. Check network tab for API calls

### Editor Not Unlocking?

1. Verify status is 'ready' or 'published'
2. Check for `[data-testid="editor-lock-overlay"]` (should not be visible)
3. Check `contenteditable` attribute (should be "true")
4. Look for JavaScript errors in console

### WritingProgress Not Showing?

1. Verify status is in `['research', 'skeleton', 'writing', 'creating_visuals']`
2. Check component mount in React devtools
3. Look for rendering errors in console

### Polling Not Working?

1. Check React Query devtools
2. Verify status is in processing states
3. Look for console errors
4. Check network tab for refetch calls (should be every 2 seconds)

---

## Related Documentation

**Status Flow Reference:**
- `/docs/artifact-statuses/status-flow-reference.md`

**Frontend Implementation:**
- `/frontend/src/features/portfolio/validators/stateMachine.ts`
- `/frontend/src/features/portfolio/types/portfolio.ts`
- `/frontend/src/features/portfolio/pages/ArtifactPage.tsx`
- `/frontend/src/features/portfolio/components/artifact/WritingProgress.tsx`

**Backend Services:**
- `/backend/src/services/ai/AIService.ts`
- `/backend/src/services/ai/tools/`

---

## Contributing

When adding new test scenarios:

1. Document in `artifact-status-flow-testing-plan.md`
2. Add quick reference to `quick-test-reference.md`
3. Create template in `test-scenarios-template.js`
4. Write actual test script
5. Update this README with test count

---

## Maintenance

Update testing documentation when:
- ✅ New status added to workflow
- ✅ Status behavior changes
- ✅ New UI components added
- ✅ Polling logic changes
- ✅ AI tools change behavior

---

**Last Updated:** 2026-01-25
**Version:** 1.0.0
