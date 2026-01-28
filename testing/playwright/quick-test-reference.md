# Artifact Status Flow - Quick Test Reference

**Quick reference for running status flow tests**

---

## Test Matrix Overview

| Status | User Label | Editor | CTAs | Progress | Polling | Next Status |
|--------|-----------|--------|------|----------|---------|-------------|
| draft | Draft | Unlocked | Create Content | Hidden | Off | research |
| research | Creating Content | Locked | None | 25% (Step 1) | On | skeleton |
| skeleton | Creating Content | Locked | None | 50% (Step 2) | On | writing |
| writing | Creating Content | Locked | None | 75% (Step 3) | On | creating_visuals |
| creating_visuals | Creating Content | Locked | None | 100% (Step 4) | On | ready |
| ready | Content Ready | Unlocked | Mark as Published | Hidden | Off | published |
| published | Published | Unlocked | None | Hidden | Off | ready (on edit) |

---

## Critical Test Paths

### Path 1: Manual Creation → Full AI Generation
```
1. Portfolio → New → Fill form → Create Content
2. Verify: draft → research → skeleton → writing → creating_visuals → ready
3. Click: Mark as Published
4. Verify: published
```

### Path 2: Published → Edit Loop
```
1. Start with published artifact
2. Edit content → auto-transition to ready
3. Mark as Published → published
4. Edit again → auto-transition to ready
5. Repeat loop
```

### Path 3: Draft → Manual Save → Later Create
```
1. Portfolio → New → Fill form → Save as Draft
2. Verify: draft status, editor unlocked
3. Later: Open draft → Create Content
4. Verify: Full AI workflow
```

---

## Quick Verification Checklist

### For Each Status Test:

**UI Elements:**
- [ ] Status badge label correct?
- [ ] Status badge color correct?
- [ ] Create Content button visibility?
- [ ] Mark as Published button visibility?
- [ ] WritingProgress visibility?
- [ ] Editor locked/unlocked correctly?
- [ ] ResearchArea visibility?

**Polling:**
- [ ] Artifact polling on/off?
- [ ] Research polling on/off?

**Data:**
- [ ] Status in DB matches UI?
- [ ] Content populated correctly?

**Console:**
- [ ] No errors?
- [ ] Status change logs present?

---

## Test Data IDs

**Locators:**
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

// Form
'[data-testid="artifact-form-title"]'
'[data-testid="artifact-form-type"]'
'[data-testid="artifact-form-content"]'
'[data-testid="artifact-form-submit"]'

// Editor states
'[data-testid="editor-lock-overlay"]'
'[contenteditable="true"]'
'[contenteditable="false"]'
```

---

## Common Wait Patterns

```javascript
// Wait for status change
await waitForStatus('ready', { timeout: 600000 })

// Wait for AI completion detection
while (currentArtifactStatus !== 'ready' && Date.now() - startTime < MAX_WAIT_TIME) {
  await page.waitForTimeout(5000)
}

// Wait for element visibility
await page.locator('[data-testid="writing-progress"]').waitFor({ state: 'visible', timeout: 5000 })

// Wait for element to disappear
await page.locator('[data-testid="writing-progress"]').waitFor({ state: 'hidden', timeout: 5000 })
```

---

## Expected Timeouts

| Operation | Expected Duration | Max Timeout |
|-----------|------------------|-------------|
| Draft creation | 2-3 seconds | 10 seconds |
| Research phase | 30-120 seconds | 5 minutes |
| Skeleton phase | 20-60 seconds | 3 minutes |
| Writing phase | 60-180 seconds | 5 minutes |
| Creating visuals (MVP) | 1-2 seconds | 10 seconds |
| Mark as published | 1-2 seconds | 5 seconds |
| Edit → status change | 1-2 seconds | 5 seconds |

---

## Status Transition Validation

### Valid Transitions:
```
draft → research ✅
research → skeleton ✅
skeleton → writing ✅
writing → creating_visuals ✅
creating_visuals → ready ✅
ready → published ✅
published → ready ✅ (on edit)
```

### Invalid Transitions (should fail):
```
draft → writing ❌
research → ready ❌
skeleton → published ❌
ready → research ❌
```

---

## Debug Tips

**If status stuck in processing:**
1. Check console for AI tool errors
2. Check backend logs for AI service failures
3. Verify polling is active (console logs)
4. Check network tab for API calls

**If editor not unlocking:**
1. Verify status is 'ready' or 'published'
2. Check for `[data-testid="editor-lock-overlay"]`
3. Check contenteditable attribute
4. Look for JavaScript errors

**If polling not working:**
1. Check React Query devtools
2. Verify status is in processing states
3. Look for console errors
4. Check network tab for refetch calls

**If WritingProgress not showing:**
1. Verify status is in ['research', 'skeleton', 'writing', 'creating_visuals']
2. Check component mount in React devtools
3. Look for rendering errors in console

---

## Console Log Patterns to Watch

```
✅ Good:
[TRACE:ONBOARDING:ARTIFACT:STATUS_CHANGE] Status changed from draft to research
[useResearch] Polling active: true
[ArtifactPage] currentStatus: research
Status is ready

❌ Bad:
ERROR: AI service failed
ERROR: Failed to fetch artifact
ERROR: Polling stopped unexpectedly
Warning: Invalid status transition
```

---

## Quick Test Execution

### Run Single Status Test:
```bash
# Test specific status behavior
node testing/playwright/test-status-draft.js
node testing/playwright/test-status-research.js
node testing/playwright/test-status-ready.js
```

### Run Full E2E:
```bash
# Complete flow from creation to publish
node testing/playwright/create-content.test.js
```

### Run Edge Cases:
```bash
# Browser refresh, network issues, etc.
node testing/playwright/test-edge-cases.js
```

---

## Test Coverage Summary

**Entry Points: 5 scenarios**
- Manual → Draft
- Manual → Create Content
- Topics → Edit → Draft
- Topics → Edit → Create Content
- Topics → Create Content (direct)

**Status Behaviors: 7 statuses**
- draft, research, skeleton, writing, creating_visuals, ready, published

**Transitions: 10 scenarios**
- Linear progression (7 transitions)
- Published → Ready loop (2 tests)
- Invalid transitions (1 test)

**Edge Cases: 4 scenarios**
- Browser refresh
- Network disconnect
- AI service failure
- Direct URL access

**Total: 26 core test scenarios**

---

## Success Criteria

**Test passes if:**
- ✅ Status badge matches specification
- ✅ Editor locked/unlocked correctly
- ✅ CTAs visible/hidden correctly
- ✅ WritingProgress shows/hides correctly
- ✅ Polling active/inactive correctly
- ✅ Status transitions follow allowed paths
- ✅ Content persists across transitions
- ✅ No console errors

---

**For detailed test cases, see:** `artifact-status-flow-testing-plan.md`
