# Content Agent Test Plan

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Based On:** [content-agent-overview.md](../../docs/ai-agents-and-prompts/content-agent-overview.md)

## Table of Contents

- [Test Organization](#test-organization)
- [Tier 1: Critical Path Tests](#tier-1-critical-path-tests)
- [Tier 2: Important Feature Tests](#tier-2-important-feature-tests)
- [Tier 3: Edge Case Tests](#tier-3-edge-case-tests)
- [Test Data](#test-data)
- [Test Utilities](#test-utilities)

---

## Test Organization

Tests are organized into 3 tiers based on priority:

| Tier | Priority | Description | When to Run |
|------|----------|-------------|-------------|
| **Tier 1** | Critical | Core workflows that must work | Every commit, pre-deployment |
| **Tier 2** | Important | Key features and happy paths | Daily, pre-release |
| **Tier 3** | Nice-to-have | Edge cases and advanced scenarios | Weekly, pre-major release |

---

## Tier 1: Critical Path Tests

### T1.1: Full Pipeline - Blog Post (End-to-End)

**Priority:** CRITICAL
**Estimated Duration:** 5-8 minutes
**Description:** Test complete content creation pipeline for blog posts from draft to ready status.

**Steps:**
1. Navigate to Portfolio page (`data-testid="portfolio-new-button"`)
2. Click "New" button
3. Fill artifact form:
   - Title: "AI in Product Management 2026"
   - Type: "blog" (`data-testid="artifact-type-blog"`)
   - Description: "Comprehensive guide on AI tools for product managers"
4. Click "Create Content" button (`data-testid="artifact-form-create-content"`)
5. **Verify:** Redirects to artifact page with AI Assistant open
6. **Verify:** AI sends initial message "Create content for artifact..."
7. **Wait & Monitor:** Status transitions via console logs:
   - `draft → research` (research API call)
   - `research → skeleton` (skeleton generation)
   - `skeleton → creating_visuals` (content writing)
   - `creating_visuals → ready` (visuals + humanization)
8. **Verify:** Research area shows 5+ sources (`data-testid="research-state-loaded"`)
9. **Verify:** Editor content contains:
   - Title (H1)
   - Hook section
   - 3+ H2 headings
   - IMAGE placeholders
   - 1500+ characters
10. **Verify:** Status badge shows "ready" (`data-testid="status-badge-ready"`)
11. Click "Mark as Published" (`data-testid="artifact-page-mark-published-button"`)
12. **Verify:** Status changes to "published"

**Success Criteria:**
- ✅ All status transitions complete
- ✅ Research sources fetched (5+)
- ✅ Skeleton structure matches blog template
- ✅ Content contains IMAGE placeholders
- ✅ Final status is "published"

**Test IDs Used:**
- `portfolio-new-button`
- `create-artifact-dialog`
- `artifact-form-type`, `artifact-form-title`, `artifact-form-content`
- `artifact-type-blog`
- `artifact-form-create-content`
- `artifact-page-create-content-button`
- `ai-assistant-panel`
- `chat-panel-messages`
- `research-state-loaded`
- `artifact-editor`
- `status-badge-ready`
- `artifact-page-mark-published-button`

---

### T1.2: Full Pipeline - Social Post

**Priority:** CRITICAL
**Estimated Duration:** 3-5 minutes
**Description:** Test content pipeline for social media posts (shorter content).

**Steps:**
1. Create artifact with type "social_post" (`data-testid="artifact-type-social_post"`)
2. Title: "5 AI Productivity Tips for 2026"
3. Trigger "Create Content"
4. **Wait & Monitor:** Status transitions (same as T1.1)
5. **Verify:** Editor content contains:
   - Hook
   - 3-5 body paragraphs
   - Hashtags (#AI #Productivity)
   - IMAGE placeholder
   - 300-800 characters

**Success Criteria:**
- ✅ Social post structure (hook + body + hashtags)
- ✅ Appropriate length (300-800 chars)
- ✅ IMAGE placeholder present
- ✅ Status: ready → published

**Test IDs Used:**
- Same as T1.1, with `artifact-type-social_post`

---

### T1.3: Full Pipeline - Showcase

**Priority:** CRITICAL
**Estimated Duration:** 5-8 minutes
**Description:** Test portfolio showcase content generation.

**Steps:**
1. Create artifact with type "showcase" (`data-testid="artifact-type-showcase"`)
2. Title: "AI-Powered Portfolio Platform"
3. Trigger "Create Content"
4. **Wait & Monitor:** Status transitions
5. **Verify:** Editor content contains:
   - Title
   - Problem statement
   - Solution description
   - Key features (3+)
   - Technical approach
   - IMAGE placeholders (2+)

**Success Criteria:**
- ✅ Showcase structure (problem → solution → features)
- ✅ Multiple IMAGE placeholders
- ✅ Technical details present
- ✅ Status: ready → published

**Test IDs Used:**
- Same as T1.1, with `artifact-type-showcase`

---

### T1.4: AI Assistant Accessibility

**Priority:** CRITICAL
**Estimated Duration:** 2 minutes
**Description:** Verify AI Assistant can be opened and closed correctly.

**Steps:**
1. Navigate to any artifact page
2. Click "AI Assistant" button (`data-testid="artifact-page-ai-assistant-button"`)
3. **Verify:** Sheet opens (`data-testid="ai-assistant-panel"`)
4. **Verify:** Chat panel visible (`data-testid="chat-panel"`)
5. **Verify:** Empty state shows suggestions (`data-testid="chat-panel-empty-state"`)
6. Type test message in chat input (`data-testid="chat-input"`)
7. Click send (`data-testid="chat-submit-button"`)
8. **Verify:** Message appears in chat (`data-testid="chat-panel-messages"`)
9. Click close button or click outside
10. **Verify:** Sheet closes

**Success Criteria:**
- ✅ AI Assistant opens on button click
- ✅ Chat input functional
- ✅ Messages render correctly
- ✅ Sheet closes properly

**Test IDs Used:**
- `artifact-page-ai-assistant-button`
- `ai-assistant-panel`
- `chat-panel`
- `chat-panel-empty-state`
- `chat-input`
- `chat-submit-button`
- `chat-panel-messages`

---

### T1.5: Research Area Toggle

**Priority:** CRITICAL
**Estimated Duration:** 1 minute
**Description:** Test research area expand/collapse functionality.

**Steps:**
1. Navigate to artifact with status "ready" (has research)
2. **Verify:** Research area collapsed by default (`data-testid="research-area-collapsed"`)
3. **Verify:** "NEW" badge visible if research recently loaded (`data-testid="research-new-badge"`)
4. Click expand button (`data-testid="research-expand-button"`)
5. **Verify:** Research area expands, shows sources (`data-testid="research-state-loaded"`)
6. **Verify:** 5+ research sources visible
7. Click collapse button (`data-testid="research-collapse-button"`)
8. **Verify:** Research area collapses

**Success Criteria:**
- ✅ Research area starts collapsed
- ✅ Expands to show sources
- ✅ Collapses on button click

**Test IDs Used:**
- `research-area-collapsed`
- `research-new-badge`
- `research-expand-button`
- `research-state-loaded`
- `research-collapse-button`

---

### T1.6: Auto-Transition: Published → Ready on Edit

**Priority:** CRITICAL
**Estimated Duration:** 2 minutes
**Description:** Verify published artifacts revert to ready when edited.

**Steps:**
1. Navigate to artifact with status "published"
2. **Verify:** Status badge shows "published" (`data-testid="status-badge-published"`)
3. Click into editor (`data-testid="artifact-editor"`)
4. Type additional content
5. Wait for auto-save (1 second debounce)
6. **Verify:** Status badge changes to "ready" (`data-testid="status-badge-ready"`)
7. **Verify:** "Mark as Published" button reappears

**Success Criteria:**
- ✅ Status auto-transitions on edit
- ✅ Status badge updates
- ✅ Publish button appears

**Test IDs Used:**
- `artifact-editor`
- `status-badge-published`
- `status-badge-ready`
- `artifact-page-mark-published-button`

---

## Tier 2: Important Feature Tests

### T2.1: Partial Flow - Humanize Only

**Priority:** IMPORTANT
**Estimated Duration:** 3 minutes
**Description:** Test humanization tool in isolation.

**Steps:**
1. Create artifact with type "blog"
2. Use "Create Content" to generate full skeleton and content
3. Wait for status "creating_visuals"
4. Open AI Assistant
5. Type: "Make the content sound more human"
6. **Verify:** Intent detected as `HUMANIZE_CONTENT` (check console logs)
7. **Wait:** Tool execution (`applyHumanityCheck`)
8. **Verify:** Status remains "creating_visuals" or transitions to "ready"
9. **Verify:** Content updated with less AI patterns

**Success Criteria:**
- ✅ Intent correctly detected
- ✅ Humanization applied
- ✅ No full pipeline re-execution

**Test IDs Used:**
- `ai-assistant-panel`
- `chat-input`
- `chat-submit-button`
- `artifact-editor`

---

### T2.2: Partial Flow - Create Skeleton Only

**Priority:** IMPORTANT
**Estimated Duration:** 3 minutes
**Description:** Test skeleton generation after research.

**Steps:**
1. Create artifact in "research" status (manually set or wait for research to complete)
2. Open AI Assistant
3. Type: "Create an outline"
4. **Verify:** Intent detected as `CREATE_SKELETON`
5. **Wait:** Tool execution (`generateContentSkeleton`)
6. **Verify:** Status transitions from "research" to "skeleton"
7. **Verify:** Editor shows outline with H1 + H2 headings

**Success Criteria:**
- ✅ Intent correctly detected
- ✅ Skeleton generated with structure
- ✅ Status transitions correctly

**Test IDs Used:**
- `ai-assistant-panel`
- `chat-input`
- `artifact-editor`
- `status-badge-skeleton`

---

### T2.3: Partial Flow - Write Content Only

**Priority:** IMPORTANT
**Estimated Duration:** 4 minutes
**Description:** Test content writing after skeleton exists.

**Steps:**
1. Create artifact in "skeleton" status
2. Open AI Assistant
3. Type: "Write the content"
4. **Verify:** Intent detected as `WRITE_CONTENT`
5. **Wait:** Tool execution (`writeFullContent`)
6. **Verify:** Status transitions from "skeleton" to "creating_visuals"
7. **Verify:** Editor shows full content (1500+ chars for blog)

**Success Criteria:**
- ✅ Intent correctly detected
- ✅ Full content written
- ✅ Status transitions correctly

**Test IDs Used:**
- `ai-assistant-panel`
- `chat-input`
- `artifact-editor`
- `status-badge-creating_visuals`

---

### T2.4: Writing Progress Indicator

**Priority:** IMPORTANT
**Estimated Duration:** During any full pipeline test
**Description:** Verify writing progress shows during processing states.

**Steps:**
1. Trigger full pipeline for any artifact type
2. **Verify:** WritingProgress component visible during processing (`data-testid="writing-progress"`)
3. **Verify:** Progress description shows current step (`data-testid="writing-progress-description"`)
4. **Verify:** Progress percentage visible (`data-testid="progress-percent"`)
5. **Verify:** Progress bar animates (`data-testid="progress-bar"`)
6. **Verify:** Step indicators show status:
   - `data-testid="progress-step-research"` - with checkmark when complete
   - `data-testid="progress-step-skeleton"` - with checkmark when complete
   - `data-testid="progress-step-creating_visuals"` - with spinner when in progress
   - `data-testid="progress-step-ready"` - with checkmark when complete
7. **Verify:** Sections list shows writing sections (`data-testid="writing-sections"`)
8. **Verify:** Each section shows status (`data-testid="writing-section-0"`, etc.)

**Success Criteria:**
- ✅ Progress component visible during processing
- ✅ Step indicators update as status changes
- ✅ Progress percentage increases
- ✅ Sections list tracks individual section completion

**Test IDs Used:**
- `writing-progress`
- `writing-progress-description`
- `progress-percent`
- `progress-bar`
- `progress-step-research`, `progress-step-skeleton`, `progress-step-creating_visuals`, `progress-step-ready`
- `writing-sections`
- `writing-section-0`, `writing-section-1`, etc.

---

### T2.5: Session Timeout Recovery

**Priority:** IMPORTANT
**Estimated Duration:** 32 minutes (includes 30-minute wait)
**Description:** Test 30-minute session timeout with automatic reset.

**Steps:**
1. Open AI Assistant
2. Send a test message
3. **Verify:** Conversation history includes message
4. Wait 31 minutes (or mock system time)
5. Send another message
6. **Verify:** Console log shows "Session reset due to timeout"
7. **Verify:** Session ID changed (check console logs)
8. **Verify:** New message sent successfully
9. **Verify:** Previous conversation NOT visible (fresh session)

**Success Criteria:**
- ✅ Session timeout after 30 minutes
- ✅ New session created automatically
- ✅ User can continue without error
- ✅ Previous conversation cleared

**Test IDs Used:**
- `chat-panel-messages`
- `chat-input`

---

### T2.6: Intent Detection - Clarification Flow

**Priority:** IMPORTANT
**Estimated Duration:** 2 minutes
**Description:** Test ambiguous message handling with clarification request.

**Steps:**
1. Open AI Assistant
2. Type ambiguous message: "fix it"
3. **Verify:** Intent detected as `UNCLEAR` (console logs)
4. **Verify:** AI responds with clarification question
5. **Verify:** Message includes suggested clarifications
6. Type clarification: "humanize the content"
7. **Verify:** Intent now detected as `HUMANIZE_CONTENT`
8. **Verify:** Tool executes

**Success Criteria:**
- ✅ Unclear intent triggers clarification
- ✅ Clarification question helpful
- ✅ Follow-up intent detected correctly

**Test IDs Used:**
- `chat-panel-messages`
- `chat-input`
- `chat-submit-button`

---

### T2.7: Status Check Query

**Priority:** IMPORTANT
**Estimated Duration:** 1 minute
**Description:** Test STATUS_CHECK intent for status queries.

**Steps:**
1. Navigate to artifact with status "skeleton"
2. Open AI Assistant
3. Type: "What's the status?"
4. **Verify:** Intent detected as `STATUS_CHECK`
5. **Verify:** AI responds with current status
6. **Verify:** Response mentions artifact title and status

**Success Criteria:**
- ✅ Intent correctly detected
- ✅ Status information accurate
- ✅ Response includes title + status

**Test IDs Used:**
- `chat-panel-messages`
- `chat-input`

---

### T2.8: Research Loading State

**Priority:** IMPORTANT
**Estimated Duration:** During T1.1-T1.3
**Description:** Verify research area shows loading state during research phase.

**Steps:**
1. Trigger full pipeline
2. **Immediately after trigger:** Check research area
3. **Verify:** Status is "loading" (`data-testid="research-state-loading"`)
4. **Verify:** Loading spinner visible
5. **Verify:** Loading message: "AI is researching..."
6. **Wait:** Research completes
7. **Verify:** Status changes to "loaded" (`data-testid="research-state-loaded"`)

**Success Criteria:**
- ✅ Loading state shown during research
- ✅ Transitions to loaded when research completes

**Test IDs Used:**
- `research-state-loading`
- `research-state-loaded`

---

### T2.9: Research Empty State

**Priority:** IMPORTANT
**Estimated Duration:** 1 minute
**Description:** Test research area when no research exists.

**Steps:**
1. Navigate to artifact with status "draft" (no research yet)
2. **Verify:** Research area shows empty state (`data-testid="research-state-empty"`)
3. **Verify:** Empty state message: "No research data yet"
4. **Verify:** Icon visible

**Success Criteria:**
- ✅ Empty state shown when no research
- ✅ Helpful message displayed

**Test IDs Used:**
- `research-state-empty`

---

### T2.10: Error Handling - Chat Panel

**Priority:** IMPORTANT
**Estimated Duration:** 2 minutes
**Description:** Test error message display in chat panel.

**Steps:**
1. Open AI Assistant
2. Disconnect network (airplane mode)
3. Send message
4. **Verify:** Error message appears (`data-testid="chat-panel-error"`)
5. **Verify:** Error message is clear and actionable
6. Reconnect network
7. Retry message
8. **Verify:** Error clears, message sends successfully

**Success Criteria:**
- ✅ Error message displayed on failure
- ✅ User can retry after error
- ✅ Error clears on success

**Test IDs Used:**
- `chat-panel-error`
- `chat-input`
- `chat-submit-button`

---

## Tier 3: Edge Case Tests

### T3.1: Token Budget - Large Research Data

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 6 minutes
**Description:** Test token budget management with excessive research data.

**Steps:**
1. Create artifact with complex title requiring extensive research
2. Title: "Comprehensive Analysis of AI, Machine Learning, Deep Learning, Neural Networks, and AGI in 2026"
3. Trigger full pipeline
4. **Monitor console logs:** Look for token budget warnings
5. **Verify:** Research data truncated if over 50K tokens
6. **Verify:** Conversation history summarized if needed
7. **Verify:** Pipeline completes successfully despite truncation

**Success Criteria:**
- ✅ Token budget enforced (200K max)
- ✅ Graceful truncation with priority order
- ✅ Pipeline completes without errors

**Test IDs Used:**
- `chat-panel-messages`
- `artifact-editor`

---

### T3.2: Intent Detection - Regex vs AI Hybrid

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 5 minutes
**Description:** Test high-confidence regex patterns vs AI fallback.

**Steps:**
1. Open AI Assistant
2. **Test high-confidence regex patterns:**
   - "create content" → `FULL_PIPELINE` (confidence ≥ 0.9)
   - "humanize this" → `HUMANIZE_CONTENT` (confidence ≥ 0.9)
   - "generate skeleton" → `CREATE_SKELETON` (confidence ≥ 0.9)
3. **Monitor console logs:** Verify "Regex match" detected
4. **Test ambiguous phrases:**
   - "make it better" → Falls back to Claude Haiku
   - "improve this section" → AI classification
5. **Monitor console logs:** Verify "Claude Haiku classification" used
6. **Verify:** All intents detected correctly

**Success Criteria:**
- ✅ Regex patterns match high-confidence phrases
- ✅ AI fallback handles ambiguous cases
- ✅ Confidence thresholds enforced

**Test IDs Used:**
- `chat-input`
- Console log monitoring

---

### T3.3: Multiple Artifacts - Context Isolation

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 10 minutes
**Description:** Test session state isolation between artifacts.

**Steps:**
1. Create Artifact A, trigger full pipeline
2. Open AI Assistant, send message
3. Navigate to Portfolio, create Artifact B
4. Open AI Assistant for Artifact B
5. **Verify:** Chat history is empty (fresh context)
6. Send message to Artifact B
7. Navigate back to Artifact A
8. **Verify:** Artifact A's conversation history restored
9. **Verify:** No mixing of context between artifacts

**Success Criteria:**
- ✅ Each artifact has isolated context
- ✅ Conversation history preserved per artifact
- ✅ No context leakage between artifacts

**Test IDs Used:**
- `chat-panel-messages`
- Context key checks in console logs

---

### T3.4: Rapid Status Changes - Race Condition

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 5 minutes
**Description:** Test system stability with rapid status changes.

**Steps:**
1. Create artifact, trigger full pipeline
2. **While processing:** Rapidly click between artifacts
3. **While processing:** Open/close AI Assistant multiple times
4. **While processing:** Expand/collapse research area rapidly
5. **Verify:** No UI crashes or errors
6. **Verify:** Status updates correctly
7. **Verify:** Pipeline completes successfully

**Success Criteria:**
- ✅ System handles rapid UI interactions
- ✅ No race conditions or crashes
- ✅ Pipeline completes without corruption

**Test IDs Used:**
- `ai-assistant-panel`
- `research-expand-button`
- `research-collapse-button`

---

### T3.5: Editor Lock During Processing

**Priority:** NICE-TO-HAVE
**Estimated Duration:** During T1.1-T1.3
**Description:** Verify editor is locked during processing states.

**Steps:**
1. Trigger full pipeline
2. **While status is processing** (research, skeleton, creating_visuals):
   - **Verify:** Editor overlay visible (`data-testid="editor-lock-overlay"`)
   - **Verify:** Lock icon and message shown
   - Try to click into editor
   - **Verify:** Content is NOT editable
3. **When status is "ready":**
   - **Verify:** Overlay removed
   - **Verify:** Editor is editable

**Success Criteria:**
- ✅ Editor locked during processing
- ✅ Lock overlay visible
- ✅ Editor unlocked when ready

**Test IDs Used:**
- `editor-lock-overlay`
- `artifact-editor`

---

### T3.6: AI Assistant - Initial Message Auto-Send

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 2 minutes
**Description:** Test auto-send of initial message from URL parameter.

**Steps:**
1. Create artifact via "Create Content" flow (from T1.1)
2. **Verify:** URL contains `?autoResearch=true` or `?startCreation=true`
3. **Verify:** AI Assistant opens automatically
4. **Verify:** Initial message auto-sent (visible in chat)
5. **Verify:** Message format: "Create content for artifact [id]: [title]"
6. **Verify:** URL parameter cleared after auto-send

**Success Criteria:**
- ✅ Initial message auto-sent
- ✅ AI Assistant opens automatically
- ✅ URL parameter cleaned up

**Test IDs Used:**
- `ai-assistant-panel`
- `chat-panel-messages`

---

### T3.7: Research - Manual Entry (Future)

**Priority:** NICE-TO-HAVE
**Estimated Duration:** N/A (not yet implemented)
**Description:** Test manual research entry when automated research fails.

**Note:** This feature is planned but not yet implemented. Reserved for Phase 2+.

**Steps:**
1. Trigger research that fails (e.g., Tavily API error)
2. **Verify:** Research error state shown (`data-testid="research-state-error"`)
3. Click "Enter Manually" button (if available)
4. Fill manual research form
5. Submit
6. **Verify:** Research area shows manual entries

**Test IDs Used:**
- `research-state-error`
- Manual entry form test IDs (TBD)

---

### T3.8: Tone Selector - Auto-Save

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 2 minutes
**Description:** Test tone selector and auto-save functionality.

**Steps:**
1. Navigate to artifact page
2. **Verify:** Tone selector visible in editor header
3. Current tone: "professional" (default)
4. Click tone selector dropdown
5. Select "casual" tone
6. **Verify:** Tone selector updates immediately
7. Wait 1 second (debounce)
8. Refresh page
9. **Verify:** Tone persists as "casual"

**Success Criteria:**
- ✅ Tone selector functional
- ✅ Auto-save after 1 second
- ✅ Tone persists across page refreshes

**Test IDs Used:**
- `artifact-editor` (contains tone selector)

---

### T3.9: Chat Input - Multi-Line Support

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 1 minute
**Description:** Test multi-line input in chat.

**Steps:**
1. Open AI Assistant
2. Click into chat input (`data-testid="chat-input"`)
3. Type message with multiple lines (press Shift+Enter)
4. **Verify:** Textarea expands for multiple lines
5. Press Enter (without Shift)
6. **Verify:** Message sends (not new line)
7. **Verify:** Message displays with line breaks preserved

**Success Criteria:**
- ✅ Shift+Enter creates new line
- ✅ Enter sends message
- ✅ Line breaks preserved in rendering

**Test IDs Used:**
- `chat-input`
- `chat-submit-button`
- `chat-panel-messages`

---

### T3.10: Error Handling - Research Failure

**Priority:** NICE-TO-HAVE
**Estimated Duration:** 3 minutes
**Description:** Test graceful error handling when research API fails.

**Steps:**
1. Mock Tavily API failure (disconnect network or set invalid API key)
2. Create artifact, trigger full pipeline
3. **Verify:** Research fails gracefully
4. **Verify:** Research area shows error state (`data-testid="research-state-error"`)
5. **Verify:** Error message is clear
6. **Verify:** Pipeline stops, doesn't proceed to skeleton
7. **Verify:** User can retry or proceed manually (if implemented)

**Success Criteria:**
- ✅ Error handled gracefully
- ✅ Clear error message displayed
- ✅ Pipeline stops at research step
- ✅ No cascading errors

**Test IDs Used:**
- `research-state-error`
- `chat-panel-error`

---

## Test Data

### Artifact Templates for Testing

```javascript
const TEST_ARTIFACTS = {
  blog: {
    title: 'AI in Product Management 2026',
    type: 'blog',
    description: 'Comprehensive guide on AI tools for product managers including roadmapping, analytics, and automation.',
    expectedStructure: {
      sections: ['Title', 'Hook', 'Section 1', 'Section 2', 'Section 3', 'Conclusion'],
      minLength: 1500,
      imagePlaceholders: 2
    }
  },
  socialPost: {
    title: '5 AI Productivity Tips for 2026',
    type: 'social_post',
    description: 'Quick tips on using AI to boost productivity in daily work.',
    expectedStructure: {
      sections: ['Hook', 'Body', 'Hashtags'],
      minLength: 300,
      maxLength: 800,
      imagePlaceholders: 1
    }
  },
  showcase: {
    title: 'AI-Powered Portfolio Platform',
    type: 'showcase',
    description: 'SaaS platform for consultants to create portfolios with AI assistance.',
    expectedStructure: {
      sections: ['Title', 'Problem', 'Solution', 'Features', 'Technical Approach'],
      minLength: 1200,
      imagePlaceholders: 3
    }
  }
};
```

### Intent Test Messages

```javascript
const INTENT_TEST_MESSAGES = {
  FULL_PIPELINE: [
    'Create content',
    'Generate everything',
    'Run full pipeline',
    'Start from scratch'
  ],
  HUMANIZE_CONTENT: [
    'Make it sound more human',
    'Humanize this',
    'Remove AI patterns',
    'Make it more natural'
  ],
  CREATE_SKELETON: [
    'Create an outline',
    'Generate skeleton',
    'Create structure',
    'Build outline'
  ],
  WRITE_CONTENT: [
    'Write the content',
    'Fill in the content',
    'Write full article',
    'Complete the writing'
  ],
  STATUS_CHECK: [
    "What's the status?",
    'Check progress',
    'How is it going?',
    'Status update'
  ],
  UNCLEAR: [
    'fix it',
    'make it better',
    'improve',
    'help'
  ]
};
```

---

## Test Utilities

### Status Transition Monitor

```javascript
/**
 * Monitor console logs for status transitions
 */
function createStatusMonitor(page) {
  let currentStatus = 'unknown';
  let statusHistory = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[ArtifactPage]') && text.includes('currentStatus:')) {
      const match = text.match(/currentStatus:\s*(\w+)/);
      if (match && match[1] !== currentStatus) {
        currentStatus = match[1];
        statusHistory.push({
          status: currentStatus,
          timestamp: Date.now()
        });
        console.log(`[Status Monitor] Transition detected: ${currentStatus}`);
      }
    }
  });

  return {
    getCurrentStatus: () => currentStatus,
    getStatusHistory: () => statusHistory,
    waitForStatus: async (targetStatus, timeout = 300000) => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (currentStatus === targetStatus) {
          return true;
        }
        await page.waitForTimeout(1000);
      }
      throw new Error(`Timeout waiting for status: ${targetStatus}`);
    }
  };
}
```

### Content Validation Helper

```javascript
/**
 * Validate generated content against expected structure
 */
function validateArtifactContent(content, artifactType) {
  const template = TEST_ARTIFACTS[artifactType];
  const results = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Length check
  if (content.length < template.expectedStructure.minLength) {
    results.errors.push(
      `Content too short: ${content.length} < ${template.expectedStructure.minLength}`
    );
    results.valid = false;
  }

  if (template.expectedStructure.maxLength &&
      content.length > template.expectedStructure.maxLength) {
    results.warnings.push(
      `Content longer than expected: ${content.length} > ${template.expectedStructure.maxLength}`
    );
  }

  // Structure check
  const expectedSections = template.expectedStructure.sections;
  for (const section of expectedSections) {
    if (!content.includes(section) && !content.toLowerCase().includes(section.toLowerCase())) {
      results.warnings.push(`Expected section not found: ${section}`);
    }
  }

  // Image placeholder check
  const imagePlaceholderCount = (content.match(/\[IMAGE|\[image|IMAGE:/gi) || []).length;
  if (imagePlaceholderCount < template.expectedStructure.imagePlaceholders) {
    results.warnings.push(
      `Fewer image placeholders than expected: ${imagePlaceholderCount} < ${template.expectedStructure.imagePlaceholders}`
    );
  }

  return results;
}
```

### Research Validator

```javascript
/**
 * Validate research data quality
 */
async function validateResearch(page, artifactId) {
  // Expand research area
  const expandButton = page.locator('[data-testid="research-expand-button"]');
  if (await expandButton.isVisible()) {
    await expandButton.click();
    await page.waitForTimeout(500);
  }

  // Check research sources
  const researchArea = page.locator('[data-testid="research-state-loaded"]');
  const sources = await researchArea.locator('.research-source').count();

  const results = {
    valid: sources >= 5,
    sourceCount: sources,
    errors: []
  };

  if (sources < 5) {
    results.errors.push(`Insufficient research sources: ${sources} < 5`);
  }

  // Validate source quality (each should have title + URL + snippet)
  for (let i = 0; i < sources; i++) {
    const source = researchArea.locator('.research-source').nth(i);
    const hasTitle = await source.locator('.source-title').count() > 0;
    const hasUrl = await source.locator('.source-url').count() > 0;

    if (!hasTitle || !hasUrl) {
      results.errors.push(`Source ${i} missing title or URL`);
      results.valid = false;
    }
  }

  return results;
}
```

---

## Running the Tests

### Run All Tests

```bash
# Run all Tier 1 tests (critical path)
npm run test:playwright -- --grep "@tier1"

# Run all Tier 2 tests (important features)
npm run test:playwright -- --grep "@tier2"

# Run all Tier 3 tests (edge cases)
npm run test:playwright -- --grep "@tier3"

# Run specific test by name
npm run test:playwright -- --grep "T1.1"

# Run all tests (full suite)
npm run test:playwright
```

### Test Tags

Each test should be tagged in the filename or test block:

```javascript
// Example test file: content-agent-full-pipeline.spec.js
test('@tier1 T1.1: Full Pipeline - Blog Post', async ({ page }) => {
  // test implementation
});

test('@tier2 T2.4: Writing Progress Indicator', async ({ page }) => {
  // test implementation
});
```

---

## Test Maintenance

### When to Update Tests

- **New Feature Added:** Add corresponding Tier 2 or Tier 3 test
- **Bug Fixed:** Add regression test (Tier 2)
- **Status Flow Changed:** Update Tier 1 tests
- **New Test ID Added:** Update test plan with new test ID

### Test ID Conventions

All test IDs follow kebab-case naming:
- Component name prefix: `artifact-page-`, `chat-panel-`, `research-`
- Action suffix: `-button`, `-input`, `-area`, `-badge`
- State suffix: `-loading`, `-error`, `-empty`, `-loaded`

Example: `artifact-page-create-content-button`

---

**Last Updated:** 2026-01-26
**Maintained By:** QA Team
**Review Frequency:** Weekly (or after major feature releases)
