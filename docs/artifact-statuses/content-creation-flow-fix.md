# Content Creation Flow Fix

**Date:** 2026-01-25
**Issue:** AI showing topic approval UI instead of triggering automatic content creation workflow

---

## Problem Description

### User Test Scenario
1. User clicks "+ New"
2. Fills artifact modal
3. Clicks "Save as Draft"
4. Opens artifact
5. Clicks "Create Content"

### Expected Behavior
- AI Assistant opens
- Message "Create content for artifact {id}: {title}" sent
- AI **immediately starts** conductDeepResearch
- Artifact transitions through: research → skeleton → writing → creating_visuals → ready

### Actual Behavior (Before Fix)
- AI Assistant opens
- Message sent
- AI shows acknowledgement
- AI shows **topic component with Edit and Create Content buttons** (OLD FLOW)
- No automatic workflow triggered

---

## Root Cause

The system prompt had **two conflicting workflows**:

### Workflow 1: Topic Suggestion Flow (OLD)
```typescript
// Lines 23-98 in systemPrompts.ts
For EVERY user request:
  → Interpret request
  → If SUPPORTED:
    → Call getUserContext
    → Call getUserSkills
    → Call listRecentArtifacts
    → Call suggestArtifactIdeas
    → Show topic suggestions with Edit/Create buttons
```

### Workflow 2: Linear Content Creation (NEW)
```typescript
// Lines 100+ in systemPrompts.ts
When "Create content for artifact {id}: {title}":
  → Extract artifact ID and title
  → Call conductDeepResearch immediately
  → Automatic workflow (research → skeleton → writing → creating_visuals → ready)
```

**The Issue:** The AI was matching Workflow 1 first, showing topic suggestions instead of triggering Workflow 2.

---

## Solution

### Changes Made

#### 1. Updated System Prompt Detection Priority
**File:** `backend/src/services/ai/prompts/systemPrompts.ts`

Added **CRITICAL check at the top** of execution workflow:

```typescript
## EXECUTION WORKFLOW - ALWAYS FOLLOW THIS PATTERN

**CRITICAL: Detect Direct Content Creation Requests FIRST**

Before interpreting general requests, check if the message matches this EXACT pattern:
"Create content for artifact <uuid>: <title>"

If YES:
- **SKIP all interpretation steps**
- **SKIP topic suggestion workflow**
- **IMMEDIATELY jump to "Content Creation Flow (Linear)" section below**
- Extract artifact ID and title, then call conductDeepResearch

If NO (message doesn't match this pattern):
- Continue with the standard workflow below
```

#### 2. Enhanced Content Creation Flow Instructions
Added explicit **DO NOT** and **DO** instructions:

```typescript
**CRITICAL INSTRUCTION: When you receive "Create content for artifact <uuid>: <title>"**

This message means the user has ALREADY approved content creation. DO NOT:
- ❌ Show topic suggestions
- ❌ Show Edit/Create Content buttons
- ❌ Ask for confirmation
- ❌ Call suggestArtifactIdeas or structuredResponse

Instead, IMMEDIATELY:
- ✅ Extract artifact ID and title
- ✅ Call conductDeepResearch to start the automatic workflow
- ✅ Let the tools handle status transitions automatically
```

#### 3. Updated User Message Format
**File:** `frontend/src/features/portfolio/pages/ArtifactPage.tsx`

Changed message from:
- ❌ `"Research and create skeleton for artifact {id}: {title}"`
- ✅ `"Create content for artifact {id}: {title}"`

---

## Testing Instructions

### Test Scenario 1: Create Content from Draft
1. Navigate to Portfolio page
2. Click "+ New"
3. Fill in title: "Test Article"
4. Click "Save as Draft"
5. Artifact page opens with status "Draft"
6. Click "Create Content" button

**Expected Result:**
- AI Assistant opens
- Message "Create content for artifact {id}: {title}" sent
- AI **immediately** calls `conductDeepResearch` (check network tab)
- Status changes to "research"
- Research area shows skeleton placeholder
- Editor locked
- WritingProgress component shows "Creating Content" at 25%
- NO topic suggestions shown
- NO Edit/Create buttons shown

### Test Scenario 2: Create Content from Modal
1. Navigate to Portfolio page
2. Click "+ New"
3. Fill in title: "Direct Creation Test"
4. Click "Create Content" (not Save as Draft)

**Expected Result:**
- Artifact created
- Navigate to artifact page with `?startCreation=true`
- AI Assistant auto-opens
- Message auto-sends
- AI immediately calls `conductDeepResearch`
- Status transitions to "research"
- Automatic workflow begins

### Test Scenario 3: Verify Old Topic Flow Still Works
1. Open AI Assistant
2. Type: "Suggest blog post topics"

**Expected Result:**
- AI follows topic suggestion workflow
- Shows topic suggestions
- Provides Edit/Create buttons
- This should still work for manual topic generation

---

## Status Flow Reminder

The **7-status linear flow** remains unchanged:

```
draft → research → skeleton → writing → creating_visuals → ready → published
         ↑                                                    ↑        |
         |                                                    └────────┘
    (Click Create Content)                              (Edit triggers return)
```

**User-Facing Labels:**
- draft: "Draft"
- research: "Creating Content" (25%)
- skeleton: "Creating Content" (50%)
- writing: "Creating Content" (75%)
- creating_visuals: "Creating Content" (100%)
- ready: "Content Ready"
- published: "Published"

---

## Files Changed

| File | Changes |
|------|---------|
| `backend/src/services/ai/prompts/systemPrompts.ts` | Added pattern detection priority, enhanced instructions |
| `frontend/src/features/portfolio/pages/ArtifactPage.tsx` | Updated message format (2 instances) |

---

## Build Status

✅ Frontend build: Passing
✅ Backend build: Passing

---

## Next Steps

1. **Test the fix** using Test Scenario 1 and 2 above
2. **Verify** AI immediately calls `conductDeepResearch` (check browser console and network tab)
3. **Confirm** status transitions work automatically
4. **Report** any remaining issues

---

## Related Documentation

- [Status Flow Reference](./status-flow-reference.md) - Complete 7-status flow documentation
- [Testing Plan](../../testing/playwright/status-flow-testing-plan.md) - E2E test scenarios
