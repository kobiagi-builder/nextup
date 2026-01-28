# Content Agent Sanity Test Analysis

**Test Date:** 2026-01-26
**Artifact ID:** `66a1bb73-3519-486e-b69e-2ab177fd1613`
**Title:** "Real-Time Payment Rails: How The Clearing House's RTP Network Transformed B2B Payments"
**Status:** Failed (multiple critical issues)

---

## Test Scenario

1. Portfolio screen → Click "New"
2. Enter title in "Create New Content" modal
3. Click "Create Content"
4. **Expected:** Research → Skeleton → Writing → Humanize → Visuals → Ready
5. **Expected:** Progress updates in chat after each step
6. **Expected:** Real-time content refresh in artifact screen
7. **Expected:** Research data displayed in research area

---

## Issues Found

### 🔴 CRITICAL: Database Status Constraint Violations

**Multiple tools failed due to invalid status values:**

```
ERROR: new row for relation "artifacts" violates check constraint "artifacts_status_check"
```

**Failed Status Transitions:**
- `draft` → `research` ❌ (conductDeepResearch tried to set this)
- `research` → `skeleton` ❌ (generateContentSkeleton tried to set this)
- `skeleton` → `writing` ❌ (writeFullContent tried to set this)

**Root Cause:** Tools are using status values that don't exist in the database enum constraint.

**Expected Status Flow (from spec):**
```
draft → researching → skeleton_ready → skeleton_approved → writing → creating_visuals → ready
```

**Actual Status Flow (tools trying to use):**
```
draft → research → skeleton → writing → creating_visuals → ready
```

**Mismatch:**
- Tools use: `research`, `skeleton`, `writing`
- Database expects: `researching`, `skeleton_ready`, `skeleton_approved`

**Evidence:**
```json
{
  "code": "23514",
  "message": "new row for relation \"artifacts\" violates check constraint \"artifacts_status_check\"",
  "details": "Failing row contains (..., status=research, ...)"
}
```

**Fix Required:**
Update tool implementations in:
- `backend/src/services/ai/tools/researchTools.ts` - Line ~140 (status: 'researching' not 'research')
- `backend/src/services/ai/tools/skeletonTools.ts` - Line ~120 (status: 'skeleton_ready' not 'skeleton')
- `backend/src/services/ai/tools/contentWritingTools.ts` - Line ~80 (status: 'writing' not 'writing')

---

### 🔴 CRITICAL: No Research Data Stored

**Issue:** Research query returned 0 sources, minimum 5 required.

**Error:**
```json
{
  "success": false,
  "traceId": "research-1769446418217-8t0fhag3f",
  "data": {
    "sourceCount": 0,
    "keyInsights": [],
    "uniqueSourcesCount": 0
  },
  "error": {
    "category": "RESEARCH_NOT_FOUND",
    "message": "Insufficient sources found. Need at least 5 different sources, found 0."
  }
}
```

**Root Cause:** Tavily API returned 0 results for all 5 source types (Reddit, LinkedIn, Quora, Medium, Substack).

**Evidence from logs:**
```
[2026-01-26T16:53:32.392Z] [GetArtifactResearch] Research fetched, count: 0
[2026-01-26T16:53:38.410Z] [ERROR] QuerySource (empty context, no results)
```

**Database Verification:**
```sql
SELECT COUNT(*) FROM artifact_research
WHERE artifact_id = '66a1bb73-3519-486e-b69e-2ab177fd1613';
-- Result: 0 rows
```

**Frontend polling 100+ times:**
- Frontend made ~100 GET requests to `/rest/v1/artifact_research`
- All returned `[]` (empty array)
- ResearchArea stayed in "empty" state

**Possible Causes:**
1. Tavily API quota exhausted
2. Topic too specific (no matching results)
3. Domain filters too restrictive
4. Tavily API credentials issue

**Fix Required:**
- Implement fallback to mock data when real API returns < 5 sources
- Add better error handling and user notification
- Consider relaxing the 5-source minimum for MVP

---

### 🔴 CRITICAL: Missing Google AI API Key

**Issue:** Content section writing failed due to missing Gemini API key.

**Error:**
```json
{
  "success": false,
  "error": {
    "category": "TOOL_EXECUTION_FAILED",
    "message": "Google Generative AI API key is missing. Pass it using the 'apiKey' parameter or the GOOGLE_GENERATIVE_AI_API_KEY environment variable."
  }
}
```

**Root Cause:** `GOOGLE_GENERATIVE_AI_API_KEY` not set in environment.

**Fix Required:**
Add to `backend/.env`:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

---

### 🔴 CRITICAL: Missing Database Column

**Issue:** Visual generation failed due to missing `visuals_metadata` column.

**Error:**
```json
{
  "error": {
    "code": "PGRST204",
    "message": "Could not find the 'visuals_metadata' column of 'artifacts' in the schema cache"
  }
}
```

**Root Cause:** `generateContentVisuals` tool tries to update `visuals_metadata` column that doesn't exist.

**Fix Required:**
Add migration to create column:
```sql
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS visuals_metadata JSONB DEFAULT '{}';
```

---

### 🟡 HIGH: No Progress Updates in Chat

**Issue:** Agent executed 6 tools but didn't send chat messages between steps.

**Expected UX:**
```
User: Create content for artifact...
Agent: I'll create content for you. Starting research...
[Agent executes conductDeepResearch]
Agent: Research complete! Found 12 sources. Generating skeleton...
[Agent executes generateContentSkeleton]
Agent: Skeleton generated! Writing full content...
[Agent executes writeFullContent]
Agent: Content written! Humanizing...
[Agent executes applyHumanityCheck]
Agent: Content humanized! Adding visuals...
[Agent executes generateContentVisuals]
Agent: Your content is ready!
```

**Actual UX:**
```
User: Create content for artifact...
[Long silence - 52 seconds]
Agent: Your content about Plaid and the Open Banking API revolution is now ready!
```

**Root Cause:** Agent architecture doesn't stream intermediate messages.

**Current Flow:**
1. User sends message
2. Agent calls all tools sequentially
3. Agent sends ONE final response after all tools complete

**Expected Flow (streaming):**
1. User sends message
2. Agent sends acknowledgment
3. Agent calls tool 1 → Sends progress update
4. Agent calls tool 2 → Sends progress update
5. Agent calls tool 3 → Sends progress update
6. Agent sends final summary

**Fix Required:**
- Modify `backend/src/services/ai/AIService.ts` to emit streaming text updates
- Use `streamText` instead of batch tool execution
- Add progress markers in system prompt

---

### 🟡 HIGH: Content Not Refreshed in Real-time

**Issue:** Artifact content was updated in database but UI didn't refresh until navigation.

**Database Evidence:**
```sql
-- Artifact was updated at 16:54:23
updated_at: 2026-01-26 16:54:23.426468+00
status: ready
content: [Full content present, 600+ words]
```

**Frontend Behavior:**
- User stayed on artifact page
- Content not refreshed automatically
- Only refreshed after navigating away and back

**Root Cause:** Frontend doesn't poll/subscribe to artifact updates.

**Fix Required:**
Implement one of:

1. **Option A: Polling** (simpler)
```tsx
// In ArtifactPage.tsx
useEffect(() => {
  const interval = setInterval(() => {
    if (artifact.status !== 'ready') {
      refetchArtifact();
    }
  }, 2000);
  return () => clearInterval(interval);
}, [artifact.status]);
```

2. **Option B: Supabase Realtime** (better UX)
```tsx
// Subscribe to artifact changes
useEffect(() => {
  const subscription = supabase
    .channel('artifact-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'artifacts',
      filter: `id=eq.${artifactId}`
    }, (payload) => {
      setArtifact(payload.new);
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [artifactId]);
```

---

### 🟢 MEDIUM: Artifact ID in User Message

**Issue:** Frontend sends full artifact ID in user message text.

**Current:**
```
User: "Create content for artifact 66a1bb73-3519-486e-b69e-2ab177fd1613: Real-Time Payment Rails..."
```

**Expected:**
```
User: "Create content: Real-Time Payment Rails..."
```

**Screen Context Should Handle It:**
```typescript
{
  currentPage: 'artifact',
  artifactId: '66a1bb73-3519-486e-b69e-2ab177fd1613',
  artifactType: 'social_post',
  artifactTitle: 'Real-Time Payment Rails...',
  artifactStatus: 'draft'
}
```

**Root Cause:** `ChatPanel.tsx` or `ArtifactPage.tsx` constructs message with artifact ID.

**Fix Required:**
Update message construction in frontend:
```tsx
// Before
const message = `Create content for artifact ${artifactId}: ${title}`;

// After
const message = `Create content: ${title}`;
// Let screen context provide artifactId
```

---

## Test Results Summary

| Requirement | Expected | Actual | Status |
|------------|----------|--------|--------|
| Research data stored | ✅ 5+ sources | ❌ 0 sources | FAIL |
| Progress updates in chat | ✅ After each step | ❌ One final message | FAIL |
| Content refreshed in real-time | ✅ Automatic | ❌ Manual navigation | FAIL |
| Visuals generated | ✅ Images added | ❌ Column missing | FAIL |
| Final content created | ✅ Full content | ✅ Full content | PASS |
| Humanization applied | ✅ AI patterns removed | ✅ Applied | PASS |
| Status flow correct | ✅ draft→ready | ⚠️ Draft→ready (via workaround) | PARTIAL |

**Overall:** 2/7 Pass, 5/7 Fail

---

## Priority Fixes

### P0 (Blocking - Must Fix Immediately)

1. **Fix status constraint violations**
   - Update all tool status values to match database enum
   - Files: `researchTools.ts`, `skeletonTools.ts`, `contentWritingTools.ts`

2. **Add missing database column**
   - Migration: `ALTER TABLE artifacts ADD COLUMN visuals_metadata JSONB DEFAULT '{}'`

3. **Add Gemini API key**
   - Update `.env` with `GOOGLE_GENERATIVE_AI_API_KEY`

### P1 (High - Fix This Sprint)

4. **Implement research fallback**
   - Use mock data when Tavily returns < 5 sources
   - Notify user when using fallback

5. **Add progress updates**
   - Stream intermediate messages to chat
   - Show tool execution progress

6. **Fix real-time content refresh**
   - Add polling or Supabase Realtime subscription

### P2 (Medium - Next Sprint)

7. **Clean up artifact ID in message**
   - Remove from user message text
   - Rely on screen context

---

## Recommended Next Steps

1. **Run database migration** to fix status enum and add visuals_metadata column
2. **Update tool status values** to match database constraint
3. **Add Gemini API key** to environment
4. **Test with mock research data** to verify rest of flow
5. **Implement streaming progress updates** for better UX
6. **Add real-time content refresh** via polling or Realtime

---

## Related Files

**Backend:**
- `backend/src/services/ai/tools/researchTools.ts` - Status: 'research' → 'researching'
- `backend/src/services/ai/tools/skeletonTools.ts` - Status: 'skeleton' → 'skeleton_ready'
- `backend/src/services/ai/tools/contentWritingTools.ts` - Status: 'writing' → 'writing'
- `backend/src/services/ai/tools/visualsCreatorTool.ts` - Add visuals_metadata column
- `backend/src/services/ai/AIService.ts` - Add streaming progress updates

**Frontend:**
- `frontend/src/features/portfolio/pages/ArtifactPage.tsx` - Add real-time refresh
- `frontend/src/features/portfolio/components/chat/ChatPanel.tsx` - Remove artifact ID from message

**Database:**
- Migration needed for visuals_metadata column

---

## Logs Evidence

**Backend logs:** `backend/logs/debug.log` (lines around 16:53:30 - 16:54:30)
**Error count:** 13 errors logged
**Duration:** 52 seconds (16:53:31 → 16:54:23)
**Tools executed:** 6 (conductDeepResearch, generateContentSkeleton, writeFullContent, applyHumanityCheck, generateContentVisuals, updateArtifactContent)
**Tools succeeded:** 2 (applyHumanityCheck, updateArtifactContent)
**Tools failed:** 4 (conductDeepResearch, generateContentSkeleton, writeFullContent, generateContentVisuals)
