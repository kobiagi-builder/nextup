# Phase 1: Content Creation Agent - Known Gaps

**Document Version:** 1.0.0
**Last Updated:** 2026-01-25
**Phase Status:** Implementation Complete (with known gaps)

---

## Overview

This document tracks known gaps and deferred features from Phase 1 of the Content Creation Agent implementation. These items are intentionally deferred to maintain scope and velocity, with plans to address them in subsequent phases or iterations.

---

## Deferred Features

### 1. Manual Research Entry UI

**Gap ID:** GAP-001
**Priority:** Low
**Deferred To:** Phase 2 or Backlog

**Description:**
The specification called for a UI to manually add research entries when AI research is insufficient. This feature was deferred as the core research flow works and manual entry is an edge case.

**Current Behavior:**
- No UI for manual research entry
- Error state shows "Research failed" with retry button
- `onManualEntry` callback is wired but not implemented in ArtifactPage

**Impact:**
- Users cannot manually add research sources
- Must rely entirely on AI-generated research
- If research fails consistently, no workaround

**Future Implementation:**
```tsx
// In ArtifactPage.tsx - add modal for manual entry
const [showManualEntryModal, setShowManualEntryModal] = useState(false)

// ResearchArea error state calls this
const handleManualEntry = () => setShowManualEntryModal(true)

// Modal with form fields:
// - Source Name (text)
// - Source URL (url, optional)
// - Source Type (select: reddit, linkedin, etc.)
// - Excerpt (textarea)
```

**Workaround:**
None currently. Users must retry AI research.

---

### 2. Real Web Search Integration

**Gap ID:** GAP-002
**Priority:** Medium
**Deferred To:** Phase 2

**Description:**
The `querySource()` function in `researchTools.ts` uses mock data for testing. Real web search requires integration with external APIs (Perplexity, Tavily, or Firecrawl).

**Current Behavior:**
- Returns static mock research results
- Simulates network delay (500-1500ms)
- Always returns 5 sources per query

**Impact:**
- Research content is placeholder, not real
- All users see similar research results
- Cannot provide topic-specific insights

**Future Implementation:**
Replace `querySource()` with real API call:
```typescript
async function querySource(sourceType: SourceType, topic: string, limit: number) {
  // Option A: Perplexity AI
  const response = await perplexity.search({
    query: `${topic} site:${sourceType}.com`,
    limit,
  })

  // Option B: Tavily Search
  const response = await tavily.search({
    query: topic,
    include_domains: [sourceTypeToUrl(sourceType)],
  })

  // Option C: Firecrawl
  const results = await firecrawl.crawl({
    url: `https://${sourceType}.com/search?q=${encodeURIComponent(topic)}`,
  })
}
```

**Workaround:**
Mock data provides realistic structure for testing UI flows.

---

### 3. Real-time Research Progress Updates

**Gap ID:** GAP-003
**Priority:** Low
**Deferred To:** Phase 2+

**Description:**
Research progress indicators show mock states (first 2 complete, 3rd loading, rest pending). Real progress would require streaming/websockets.

**Current Behavior:**
- Progress indicators are purely visual
- Don't reflect actual research status
- React Query polls for completion

**Impact:**
- User experience slightly diminished
- No real feedback on which sources are being queried
- Works functionally (just not visually accurate)

**Future Implementation:**
- Use Supabase Realtime to push progress updates
- Or implement Server-Sent Events (SSE)
- Update ResearchArea to subscribe to progress channel

**Workaround:**
Polling every 2 seconds catches completion quickly.

---

### 4. Skeleton Regeneration

**Gap ID:** GAP-004
**Priority:** Medium
**Deferred To:** Phase 2

**Description:**
No button to regenerate skeleton if user is unhappy with the result. Currently must manually edit or create new artifact.

**Current Behavior:**
- Skeleton is generated once
- Can be manually edited
- Can approve or leave in skeleton_ready state

**Impact:**
- User friction if skeleton quality is poor
- No quick way to get alternative skeleton
- Must edit manually

**Future Implementation:**
```tsx
// In ArtifactPage header, when status === 'skeleton_ready'
<Button onClick={handleRegenerateSkeleton}>
  <RefreshCw className="h-4 w-4" />
  Regenerate
</Button>

// Handler
const handleRegenerateSkeleton = async () => {
  // 1. Set status back to researching
  // 2. Clear existing skeleton
  // 3. Trigger skeleton generation again
  // 4. Maybe allow tone change before regeneration
}
```

**Workaround:**
User can manually edit skeleton in editor.

---

## Implementation Notes

### Status Flow (Correct)
```
draft → researching → skeleton_ready → skeleton_approved → (Phase 2)
```

### Deprecated Status Values (Do Not Use)
- `in_progress` - replaced by `researching`
- `ready` - replaced by `skeleton_ready`

### Tone Options (All 8 Working)
1. professional (default)
2. formal
3. casual
4. conversational
5. technical
6. friendly
7. authoritative
8. humorous

---

## Test Coverage

### Covered
- ✅ Status flow transitions
- ✅ Research tool source priority logic
- ✅ Skeleton tool tone modifiers
- ✅ Frontend component rendering (4 states)
- ✅ Collapse/expand functionality
- ✅ Button interactions

### Not Covered (Deferred)
- ❌ Real API integration tests (mock only)
- ❌ Manual research entry tests
- ❌ Skeleton regeneration tests
- ❌ E2E tests with real OpenAI/Anthropic

---

## Phase 2 Dependencies

The following Phase 1 gaps may need resolution before Phase 2:

1. **Real Web Search** - Phase 2 content writing benefits from real research
2. **Skeleton Regeneration** - Users may want to iterate before writing

The following can remain as-is for Phase 2:

1. **Manual Research Entry** - Edge case, can use existing research
2. **Real-time Progress** - Functional without visual accuracy

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | Initial document creation |

---

## Related Documents

- [spec-phase-1.md](./spec-phase-1.md) - Phase 1 specification
- [Phase 1 Plan](../../../.claude/plans/wondrous-petting-rabin.md) - Implementation plan
- [Testing folder](../../../../testing/) - Unit and integration tests
