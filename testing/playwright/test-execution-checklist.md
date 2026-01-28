# Artifact Status Flow - Test Execution Checklist

**Date:** _______________
**Tester:** _______________
**Environment:** [ ] Local [ ] Staging [ ] Production
**Build/Commit:** _______________

---

## Pre-Test Setup

- [ ] Backend server running (`npm run dev:backend`)
- [ ] Frontend server running (`npm run dev:frontend`)
- [ ] Database accessible (Supabase)
- [ ] Test user account ready
- [ ] Test user has completed profile
- [ ] Test user has style examples
- [ ] Browser: Chrome/Chromium installed
- [ ] Playwright dependencies installed

---

## 1. Entry Point Tests (5 tests)

### 1.1 Manual Creation → Save as Draft
- [ ] Navigate to Portfolio
- [ ] Click "New" button
- [ ] Fill form (title, type, content)
- [ ] Click "Save as Draft"
- [ ] **Verify:** Status = draft
- [ ] **Verify:** Editor unlocked
- [ ] **Verify:** "Create Content" button visible
- [ ] **Verify:** WritingProgress hidden
- [ ] **Screenshot:** `/tmp/manual-draft.png`
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] **Notes:** _______________

### 1.2 Manual Creation → Create Content
- [ ] Navigate to Portfolio
- [ ] Click "New" button
- [ ] Fill form
- [ ] Click "Create Content"
- [ ] **Verify:** URL includes `?startCreation=true`
- [ ] **Verify:** AI Assistant opens
- [ ] **Verify:** Status progresses: draft → research → skeleton → writing → creating_visuals → ready
- [ ] **Verify:** Final status = ready
- [ ] **Verify:** Content populated (>1000 chars)
- [ ] **Verify:** "Mark as Published" button visible
- [ ] **Duration:** _______ minutes
- [ ] **Screenshot:** `/tmp/manual-create-content.png`
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] **Notes:** _______________

### 1.3 Topics → Edit → Save as Draft
- [ ] Navigate to Portfolio (Topics tab)
- [ ] Select existing topic
- [ ] Click "Edit"
- [ ] Modify title/content
- [ ] Click "Save as Draft"
- [ ] **Verify:** Status = draft
- [ ] **Verify:** Same behavior as manual draft
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] **Notes:** _______________

### 1.4 Topics → Edit → Create Content
- [ ] Navigate to Topics tab
- [ ] Select topic
- [ ] Click "Edit"
- [ ] Click "Create Content"
- [ ] **Verify:** AI workflow starts
- [ ] **Verify:** Status progresses to ready
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] **Notes:** _______________

### 1.5 Topics → Create Content (Direct)
- [ ] Navigate to Topics tab
- [ ] Click "Create Content" on topic card
- [ ] **Verify:** AI workflow starts immediately
- [ ] **Verify:** Status = research
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] **Notes:** _______________

---

## 2. Status Behavior Tests (7 tests)

### 2.1 Status: Draft
- [ ] Open artifact in draft status
- [ ] **Verify:** Status badge = "Draft" (gray)
- [ ] **Verify:** Editor unlocked (contenteditable="true")
- [ ] **Verify:** "Create Content" button visible
- [ ] **Verify:** "Mark as Published" button hidden
- [ ] **Verify:** WritingProgress hidden
- [ ] **Verify:** No polling active
- [ ] **Result:** [ ] PASS [ ] FAIL

### 2.2 Status: Research
- [ ] Artifact in research status
- [ ] **Verify:** Status badge = "Creating Content" (blue)
- [ ] **Verify:** Editor locked (overlay visible)
- [ ] **Verify:** WritingProgress visible (step 1/4, 25%)
- [ ] **Verify:** "Researching" label with spinner
- [ ] **Verify:** ResearchArea shows skeleton
- [ ] **Verify:** No CTAs visible
- [ ] **Verify:** Polling active (every 2s)
- [ ] **Verify:** Auto-transitions to skeleton
- [ ] **Result:** [ ] PASS [ ] FAIL

### 2.3 Status: Skeleton
- [ ] Artifact in skeleton status
- [ ] **Verify:** Status badge = "Creating Content" (blue)
- [ ] **Verify:** WritingProgress step 2/4 (50%)
- [ ] **Verify:** "Creating Structure" label with spinner
- [ ] **Verify:** Step 1 has checkmark ✓
- [ ] **Verify:** Skeleton content visible in editor
- [ ] **Verify:** ResearchArea populated
- [ ] **Verify:** Polling active
- [ ] **Verify:** Auto-transitions to writing
- [ ] **Result:** [ ] PASS [ ] FAIL

### 2.4 Status: Writing
- [ ] Artifact in writing status
- [ ] **Verify:** Status badge = "Creating Content" (blue)
- [ ] **Verify:** WritingProgress step 3/4 (75%)
- [ ] **Verify:** "Writing Content" label with spinner
- [ ] **Verify:** Steps 1-2 have checkmarks ✓
- [ ] **Verify:** Section details shown (if H2 sections exist)
- [ ] **Verify:** Content expanding in editor
- [ ] **Verify:** Polling active
- [ ] **Verify:** Auto-transitions to creating_visuals
- [ ] **Result:** [ ] PASS [ ] FAIL

### 2.5 Status: Creating Visuals
- [ ] Artifact in creating_visuals status
- [ ] **Verify:** Status badge = "Creating Content" (purple/blue)
- [ ] **Verify:** WritingProgress step 4/4 (100%)
- [ ] **Verify:** "Generating Images" label with spinner
- [ ] **Verify:** Steps 1-3 have checkmarks ✓
- [ ] **Verify:** Full content visible with placeholders
- [ ] **Verify:** Polling active
- [ ] **Verify:** Auto-transitions to ready (fast in MVP)
- [ ] **Result:** [ ] PASS [ ] FAIL

### 2.6 Status: Ready
- [ ] Artifact in ready status
- [ ] **Verify:** Status badge = "Content Ready" (green)
- [ ] **Verify:** Editor unlocked
- [ ] **Verify:** "Mark as Published" button visible
- [ ] **Verify:** WritingProgress hidden
- [ ] **Verify:** ResearchArea visible
- [ ] **Verify:** No polling active
- [ ] **Verify:** User can edit content
- [ ] **Result:** [ ] PASS [ ] FAIL

### 2.7 Status: Published
- [ ] Artifact in published status
- [ ] **Verify:** Status badge = "Published" (emerald)
- [ ] **Verify:** Editor unlocked
- [ ] **Verify:** No CTAs visible
- [ ] **Verify:** WritingProgress hidden
- [ ] **Verify:** No polling active
- [ ] **Verify:** Edit detection (published → ready on edit)
- [ ] **Result:** [ ] PASS [ ] FAIL

---

## 3. Transition Tests (3 tests)

### 3.1 Complete Linear Flow (Draft → Published)
- [ ] Create artifact (draft)
- [ ] Trigger "Create Content"
- [ ] **Monitor:** Status transitions
- [ ] **Verify:** Sequence: draft → research → skeleton → writing → creating_visuals → ready
- [ ] Mark as published
- [ ] **Verify:** Final status = published
- [ ] **Duration:** _______ minutes
- [ ] **Result:** [ ] PASS [ ] FAIL

### 3.2 Published → Ready Loop
- [ ] Start with published artifact
- [ ] Edit content
- [ ] **Verify:** Auto-transition to ready
- [ ] Click "Mark as Published"
- [ ] **Verify:** Status = published
- [ ] Edit again
- [ ] **Verify:** Auto-transition to ready again
- [ ] **Verify:** Content persists with both edits
- [ ] **Result:** [ ] PASS [ ] FAIL

### 3.3 Invalid Transitions
- [ ] Attempt: draft → writing (via API)
- [ ] **Verify:** 400 error, transition blocked
- [ ] Attempt: research → ready (via API)
- [ ] **Verify:** Transition blocked
- [ ] **Result:** [ ] PASS [ ] FAIL

---

## 4. Edge Cases (4 tests)

### 4.1 Browser Refresh During Research
- [ ] Artifact in research status
- [ ] Refresh browser (F5)
- [ ] **Verify:** Status still research
- [ ] **Verify:** WritingProgress restored (step 1)
- [ ] **Verify:** Editor locked
- [ ] **Verify:** Polling resumes
- [ ] **Verify:** Status continues to skeleton
- [ ] **Result:** [ ] PASS [ ] FAIL

### 4.2 Browser Refresh During Writing
- [ ] Artifact in writing status
- [ ] Note content length
- [ ] Refresh browser
- [ ] **Verify:** WritingProgress restored (step 3)
- [ ] **Verify:** Content preserved/expanded
- [ ] **Verify:** Status progresses to ready
- [ ] **Result:** [ ] PASS [ ] FAIL

### 4.3 Network Disconnect During Processing
- [ ] Artifact in skeleton status
- [ ] Simulate network offline (DevTools)
- [ ] Wait 30 seconds
- [ ] Restore network
- [ ] **Verify:** Polling resumes
- [ ] **Verify:** Status catches up to current state
- [ ] **Verify:** No data loss
- [ ] **Result:** [ ] PASS [ ] FAIL

### 4.4 Direct URL Access to Processing Artifact
- [ ] Create artifact in skeleton status (via MCP/API)
- [ ] Navigate directly to `/portfolio/artifacts/{id}`
- [ ] **Verify:** WritingProgress renders at step 2
- [ ] **Verify:** Editor locked
- [ ] **Verify:** Polling starts
- [ ] **Verify:** Status progresses
- [ ] **Result:** [ ] PASS [ ] FAIL

---

## Test Summary

### Results
- **Total Tests:** 26
- **Passed:** _______
- **Failed:** _______
- **Skipped:** _______
- **Success Rate:** _______%

### Failures (Detail)

**Test:** _______________
- **Expected:** _______________
- **Actual:** _______________
- **Root Cause:** _______________
- **Screenshot:** _______________
- **Action:** _______________

**Test:** _______________
- **Expected:** _______________
- **Actual:** _______________
- **Root Cause:** _______________
- **Screenshot:** _______________
- **Action:** _______________

### Performance Metrics

- **Average research phase:** _______ seconds
- **Average skeleton phase:** _______ seconds
- **Average writing phase:** _______ seconds
- **Average total AI completion:** _______ minutes
- **Any timeouts?** [ ] Yes [ ] No

### Console Errors

- [ ] No JavaScript errors
- [ ] No React errors
- [ ] No network errors
- [ ] All API calls successful

**Errors Found:**
_______________
_______________

### Browser Console Logs

**Key logs observed:**
```
[TRACE:ONBOARDING:ARTIFACT:STATUS_CHANGE] Status changed from draft to research
[useResearch] Polling active: true
[ArtifactPage] currentStatus: research
...
```

---

## Environment Issues

- [ ] Backend crashes/errors
- [ ] Frontend hot reload issues
- [ ] Database connection issues
- [ ] Supabase MCP issues
- [ ] AI service timeouts
- [ ] Network issues

**Details:**
_______________
_______________

---

## Recommendations

### Bugs to Fix (Priority)

**High Priority:**
1. _______________
2. _______________
3. _______________

**Medium Priority:**
1. _______________
2. _______________

**Low Priority:**
1. _______________

### Test Improvements Needed

1. _______________
2. _______________
3. _______________

### Documentation Updates Required

1. _______________
2. _______________

---

## Sign-off

**Tester:** _______________
**Date:** _______________
**Approved:** [ ] Yes [ ] No
**Notes:** _______________

---

**Next Steps:**
- [ ] File bug reports for failures
- [ ] Update test documentation
- [ ] Rerun failed tests after fixes
- [ ] Schedule next test run
