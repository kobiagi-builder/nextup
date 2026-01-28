# Artifact Status Flow - Comprehensive Testing Plan

**Version:** 1.0.0
**Date:** 2026-01-25
**Related Documentation:** `/docs/artifact-statuses/status-flow-reference.md`

---

## Overview

This testing plan covers all scenarios for the 7-status artifact workflow:
- **Entry Points:** Manual creation + Topics flow
- **Statuses:** draft → research → skeleton → writing → creating_visuals → ready → published
- **Focus Areas:** Status behavior, UI state, CTAs, transitions, AI integration

---

## Test Data Setup

### Required Test Data

**User Context:**
- User with completed profile (for AI context)
- At least 2 style examples (for AI tone matching)

**Topics (for Topics Flow tests):**
- 3 topics with different types: blog, social_post, showcase

**Artifact Types:**
- Blog post: "The Future of AI in Product Management"
- Social post: "5 Tips for Better Product Discovery"
- Showcase: "SaaS Platform Redesign Case Study"

---

## Test Suite Structure

```
1. Entry Point Tests
   ├── 1.1 Manual Creation Flow
   └── 1.2 Topics Flow

2. Status Behavior Tests (Per Status)
   ├── 2.1 Draft
   ├── 2.2 Research
   ├── 2.3 Skeleton
   ├── 2.4 Writing
   ├── 2.5 Creating Visuals
   ├── 2.6 Ready
   └── 2.7 Published

3. Status Transition Tests
   ├── 3.1 Linear Progression
   ├── 3.2 Published → Ready Loop
   └── 3.3 Invalid Transitions

4. Edge Cases & Error Scenarios
   ├── 4.1 Browser Refresh During Processing
   ├── 4.2 Network Disconnect
   ├── 4.3 AI Service Failure
   └── 4.4 Direct URL Access
```

---

## 1. Entry Point Tests

### 1.1 Manual Creation Flow

#### Test Case: Manual Creation → Save as Draft

**Scenario:** User creates artifact manually and saves as draft

**Steps:**
1. Navigate to Portfolio page
2. Click "New" button
3. Fill artifact form:
   - Title: "Test Blog Post"
   - Type: "blog"
   - Content: "Initial draft content"
4. Click "Save as Draft"

**Expected Outcome:**
- ✅ Artifact created with `status = 'draft'`
- ✅ Navigate to artifact page `/portfolio/artifacts/{id}`
- ✅ URL does NOT include `?startCreation=true`
- ✅ Editor shows content (unlocked, editable)
- ✅ Status badge shows "Draft" (gray)
- ✅ "Create Content" button visible
- ✅ "Mark as Published" button hidden
- ✅ WritingProgress component hidden
- ✅ No polling active
- ✅ AI Assistant closed

**Verification:**
```javascript
// Status check
expect(artifact.status).toBe('draft')

// UI elements
expect(statusBadge).toHaveText('Draft')
expect(createContentButton).toBeVisible()
expect(markAsPublishedButton).not.toBeVisible()
expect(writingProgress).not.toBeVisible()

// Editor state
expect(editor).toHaveAttribute('contenteditable', 'true')
expect(editorOverlay).not.toBeVisible()
```

---

#### Test Case: Manual Creation → Create Content

**Scenario:** User creates artifact manually and immediately triggers AI workflow

**Steps:**
1. Navigate to Portfolio page
2. Click "New" button
3. Fill artifact form:
   - Title: "AI Product Strategy Guide"
   - Type: "blog"
   - Content: "Guide about AI product strategy"
4. Click "Create Content"

**Expected Outcome:**
- ✅ Artifact created with `status = 'draft'`
- ✅ Navigate to artifact page with `?startCreation=true`
- ✅ AI Assistant panel opens automatically
- ✅ Research message sent to AI automatically
- ✅ URL param removed after triggering
- ✅ Status transitions: draft → research → skeleton → writing → creating_visuals → ready
- ✅ Editor locked during processing
- ✅ WritingProgress visible during processing
- ✅ Polling active during processing
- ✅ Final status: `ready` with full content

**Verification:**
```javascript
// Initial state
expect(searchParams.get('startCreation')).toBe('true')
expect(aiAssistantPanel).toBeVisible()

// After trigger
await waitForTimeout(2000)
expect(searchParams.get('startCreation')).toBeNull()
expect(artifact.status).toBe('research')

// Final state
await waitForStatus('ready', { timeout: 600000 })
expect(artifact.status).toBe('ready')
expect(artifact.content).toBeTruthy()
expect(artifact.content.length).toBeGreaterThan(500)
```

---

### 1.2 Topics Flow

#### Test Case: Topics → Edit → Save as Draft

**Scenario:** User creates artifact from topic and saves as draft

**Steps:**
1. Navigate to Portfolio page (Topics tab)
2. Select existing topic
3. Click "Edit" on topic card
4. Topic Edit modal opens with pre-filled data
5. Modify title/content if needed
6. Click "Save as Draft"

**Expected Outcome:**
- ✅ Artifact created from topic data
- ✅ Status: `draft`
- ✅ Navigate to artifact page
- ✅ Same behavior as manual creation draft
- ✅ Editor shows content (unlocked)
- ✅ "Create Content" button visible

**Verification:**
```javascript
expect(artifact.status).toBe('draft')
expect(artifact.title).toBe(topic.title)
expect(createContentButton).toBeVisible()
expect(editor).toHaveAttribute('contenteditable', 'true')
```

---

#### Test Case: Topics → Edit → Create Content

**Scenario:** User creates artifact from topic and triggers AI workflow

**Steps:**
1. Navigate to Portfolio page (Topics tab)
2. Select existing topic
3. Click "Edit" on topic card
4. Topic Edit modal opens
5. Click "Create Content"

**Expected Outcome:**
- ✅ Artifact created from topic
- ✅ Status: `draft` initially
- ✅ Navigate to artifact page with `?startCreation=true`
- ✅ AI Assistant opens automatically
- ✅ Research triggered automatically
- ✅ Status transitions through all processing states
- ✅ Final status: `ready`

**Verification:**
```javascript
expect(searchParams.get('startCreation')).toBe('true')
expect(aiAssistantPanel).toBeVisible()
await waitForStatus('ready', { timeout: 600000 })
expect(artifact.status).toBe('ready')
```

---

#### Test Case: Topics → Create Content (Direct)

**Scenario:** User clicks "Create Content" directly from topic card

**Steps:**
1. Navigate to Portfolio page (Topics tab)
2. Find topic card
3. Click "Create Content" button on topic card

**Expected Outcome:**
- ✅ Artifact created from topic
- ✅ Navigate to artifact page with `?startCreation=true`
- ✅ AI workflow starts immediately
- ✅ Status: research
- ✅ AI Assistant opens with research message

**Verification:**
```javascript
expect(artifact.status).toBe('research')
expect(aiAssistantPanel).toBeVisible()
expect(writingProgress).toBeVisible()
```

---

## 2. Status Behavior Tests

### 2.1 Status: Draft

#### Test Case: Draft Status Behavior

**Setup:** Create artifact with status `draft`

**Expected UI State:**

**Status Badge:**
- ✅ Label: "Draft"
- ✅ Color: Gray (status-draft)

**Editor:**
- ✅ State: Unlocked (contenteditable="true")
- ✅ Content: User-provided text or empty
- ✅ No overlay or lock message

**CTAs:**
- ✅ "Create Content" button: VISIBLE
- ✅ "Mark as Published" button: HIDDEN

**Components:**
- ✅ WritingProgress: HIDDEN
- ✅ ResearchArea: HIDDEN or empty
- ✅ AI Assistant: Closed

**Polling:**
- ✅ Artifact polling: INACTIVE
- ✅ Research polling: INACTIVE

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('draft')

// UI checks
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Draft')
expect(page.locator('[data-testid="status-badge"]')).toHaveClass(/status-draft/)
expect(page.locator('[data-testid="artifact-create-content-button"]')).toBeVisible()
expect(page.locator('[data-testid="artifact-mark-published-button"]')).not.toBeVisible()
expect(page.locator('[data-testid="writing-progress"]')).not.toBeVisible()

// Editor checks
const editor = page.locator('[data-testid="artifact-editor"]')
expect(editor.locator('[contenteditable="true"]')).toBeVisible()
expect(page.locator('[data-testid="editor-lock-overlay"]')).not.toBeVisible()
```

---

#### Test Case: Draft → Trigger Create Content

**Setup:** Artifact in draft status

**Steps:**
1. Open draft artifact page
2. Click "Create Content" button

**Expected Outcome:**
- ✅ AI Assistant opens
- ✅ Research message sent automatically
- ✅ Status transitions: draft → research
- ✅ "Create Content" button hidden
- ✅ Editor locks immediately
- ✅ WritingProgress appears
- ✅ Polling starts (2 second interval)

**Verification:**
```javascript
await page.click('[data-testid="artifact-create-content-button"]')
await waitForTimeout(2000)

expect(page.locator('[data-testid="ai-assistant-panel"]')).toBeVisible()
expect(artifact.status).toBe('research')
expect(page.locator('[data-testid="writing-progress"]')).toBeVisible()
expect(page.locator('[data-testid="editor-lock-overlay"]')).toBeVisible()
```

---

### 2.2 Status: Research

#### Test Case: Research Status Behavior

**Setup:** Artifact in `research` status (AI conducting deep research)

**Expected UI State:**

**Status Badge:**
- ✅ Label: "Creating Content"
- ✅ Color: Blue (status-processing)

**Editor:**
- ✅ State: LOCKED
- ✅ Overlay visible with message: "Content is being generated..."
- ✅ contenteditable="false"

**CTAs:**
- ✅ "Create Content" button: HIDDEN
- ✅ "Mark as Published" button: HIDDEN

**Components:**
- ✅ WritingProgress: VISIBLE
  - Step 1/4: "Researching" with spinner
  - Progress bar: 25%
  - Icon: Search icon with spinner animation
- ✅ ResearchArea: Skeleton/loading state
- ✅ AI Assistant: Open (showing research progress)

**Polling:**
- ✅ Artifact polling: ACTIVE (every 2 seconds)
- ✅ Research polling: ACTIVE (until research data loaded)

**Console Logs:**
```
[TRACE:ONBOARDING:ARTIFACT:STATUS_CHANGE] Status changed from draft to research
[useResearch] Polling active: true
```

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('research')

// UI checks
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Creating Content')
expect(page.locator('[data-testid="status-badge"]')).toHaveClass(/status-processing/)

// WritingProgress checks
const progressComponent = page.locator('[data-testid="writing-progress"]')
expect(progressComponent).toBeVisible()
expect(progressComponent.locator('text=Researching')).toBeVisible()
expect(progressComponent.locator('[data-progress="25"]')).toBeVisible()

// Editor lock
expect(page.locator('[data-testid="editor-lock-overlay"]')).toBeVisible()
expect(page.locator('[data-testid="editor-lock-overlay"]')).toContainText('Content is being generated')

// ResearchArea
expect(page.locator('[data-testid="research-area"]')).toBeVisible()
expect(page.locator('[data-testid="research-skeleton"]')).toBeVisible()
```

---

#### Test Case: Research → Auto-Transition to Skeleton

**Setup:** Artifact in research status, AI completes research

**Expected Behavior:**
- ✅ AI calls `conductDeepResearch` tool
- ✅ Research data stored in `research_data` table
- ✅ Status auto-updates: research → skeleton
- ✅ Frontend polling detects status change
- ✅ WritingProgress updates to step 2
- ✅ ResearchArea loads and displays research data
- ✅ No user action required

**Verification:**
```javascript
// Monitor status transition
let statusHistory = []
page.on('console', msg => {
  if (msg.text().includes('currentStatus:')) {
    const match = msg.text().match(/currentStatus:\s*(\w+)/)
    if (match) statusHistory.push(match[1])
  }
})

// Wait for transition
await waitForStatus('skeleton', { timeout: 120000 })

// Verify transition path
expect(statusHistory).toContain('research')
expect(statusHistory).toContain('skeleton')
expect(statusHistory.indexOf('skeleton')).toBeGreaterThan(statusHistory.indexOf('research'))

// Verify research data loaded
const researchArea = page.locator('[data-testid="research-area"]')
expect(researchArea.locator('[data-testid="research-content"]')).toBeVisible()
expect(researchArea.locator('[data-testid="research-skeleton"]')).not.toBeVisible()
```

---

### 2.3 Status: Skeleton

#### Test Case: Skeleton Status Behavior

**Setup:** Artifact in `skeleton` status (AI generating content structure)

**Expected UI State:**

**Status Badge:**
- ✅ Label: "Creating Content"
- ✅ Color: Blue (status-processing)

**Editor:**
- ✅ State: LOCKED
- ✅ Overlay visible
- ✅ Skeleton structure visible in editor (H2 sections, placeholders)

**CTAs:**
- ✅ "Create Content" button: HIDDEN
- ✅ "Mark as Published" button: HIDDEN

**Components:**
- ✅ WritingProgress: VISIBLE
  - Step 2/4: "Creating Structure" with spinner
  - Progress bar: 50%
  - Step 1 (Researching): Checkmark ✓
  - Step 2 (Creating Structure): Spinner ⟳
  - Steps 3-4: Circle ○
- ✅ ResearchArea: Visible with research data
- ✅ AI Assistant: Open (showing skeleton generation)

**Polling:**
- ✅ Artifact polling: ACTIVE (every 2 seconds)
- ✅ Research polling: STOPPED (data already loaded)

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('skeleton')

// WritingProgress step indicators
const progressComponent = page.locator('[data-testid="writing-progress"]')
expect(progressComponent.locator('[data-step="research"]')).toHaveAttribute('data-complete', 'true')
expect(progressComponent.locator('[data-step="skeleton"]')).toHaveAttribute('data-active', 'true')
expect(progressComponent.locator('[data-progress="50"]')).toBeVisible()

// Editor content (skeleton structure)
const editorContent = await page.locator('[data-testid="artifact-editor"] [contenteditable]').textContent()
expect(editorContent).toContain('##') // H2 sections
expect(editorContent.length).toBeGreaterThan(100)

// Research area populated
expect(page.locator('[data-testid="research-content"]')).toBeVisible()
```

---

#### Test Case: Skeleton → Auto-Transition to Writing

**Setup:** Artifact in skeleton status, AI completes skeleton generation

**Expected Behavior:**
- ✅ AI calls `generateContentSkeleton` tool
- ✅ Skeleton structure stored in `content` field (markdown with H2 sections)
- ✅ Status auto-updates: skeleton → writing
- ✅ WritingProgress updates to step 3
- ✅ If H2 sections detected, show "Writing Sections" list

**Verification:**
```javascript
await waitForStatus('writing', { timeout: 120000 })

const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('writing')
expect(artifact.content).toContain('##') // H2 sections

// WritingProgress shows section list
const progressComponent = page.locator('[data-testid="writing-progress"]')
expect(progressComponent.locator('[data-step="writing"]')).toHaveAttribute('data-active', 'true')

// If skeleton has sections, verify section tracking
const sectionsList = progressComponent.locator('[data-testid="section-details"]')
if (await sectionsList.count() > 0) {
  expect(sectionsList).toBeVisible()
  expect(sectionsList.locator('li')).not.toHaveCount(0)
}
```

---

### 2.4 Status: Writing

#### Test Case: Writing Status Behavior

**Setup:** Artifact in `writing` status (AI writing full content)

**Expected UI State:**

**Status Badge:**
- ✅ Label: "Creating Content"
- ✅ Color: Blue (status-processing)

**Editor:**
- ✅ State: LOCKED
- ✅ Content visible (skeleton being filled with text)
- ✅ Editor updates as sections complete

**CTAs:**
- ✅ "Create Content" button: HIDDEN
- ✅ "Mark as Published" button: HIDDEN

**Components:**
- ✅ WritingProgress: VISIBLE
  - Step 3/4: "Writing Content" with spinner
  - Progress bar: 75%
  - Steps 1-2: Checkmark ✓
  - Step 3: Spinner ⟳
  - Step 4: Circle ○
  - **Section Details:** List of H2 sections being written
- ✅ ResearchArea: Visible with research data
- ✅ AI Assistant: Open (showing writing progress)

**Polling:**
- ✅ Artifact polling: ACTIVE (every 2 seconds)
- ✅ Research polling: STOPPED

**Special Features:**
- ✅ If content has H2 sections, WritingProgress displays "Writing Sections" with section titles
- ✅ Humanity check integrated (no separate status)

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('writing')

// WritingProgress
const progressComponent = page.locator('[data-testid="writing-progress"]')
expect(progressComponent.locator('[data-step="research"]')).toHaveAttribute('data-complete', 'true')
expect(progressComponent.locator('[data-step="skeleton"]')).toHaveAttribute('data-complete', 'true')
expect(progressComponent.locator('[data-step="writing"]')).toHaveAttribute('data-active', 'true')
expect(progressComponent.locator('[data-progress="75"]')).toBeVisible()

// Section tracking (if skeleton has H2 sections)
const sectionDetails = progressComponent.locator('[data-testid="section-details"]')
if (await sectionDetails.count() > 0) {
  const sectionItems = sectionDetails.locator('li')
  expect(sectionItems.count()).toBeGreaterThan(0)

  // Each section should have a title
  const firstSection = sectionItems.first()
  expect(firstSection).toBeTruthy()
}

// Editor content expanding
const editorContent = await page.locator('[data-testid="artifact-editor"] [contenteditable]').textContent()
expect(editorContent.length).toBeGreaterThan(artifact.content?.length || 0)
```

---

#### Test Case: Writing → Auto-Transition to Creating Visuals

**Setup:** Artifact in writing status, AI completes content writing

**Expected Behavior:**
- ✅ AI calls `writeFullContent` tool
- ✅ Full content stored in `content` field (HTML/markdown)
- ✅ Humanity check integrated (no separate status)
- ✅ Status auto-updates: writing → creating_visuals
- ✅ WritingProgress updates to step 4

**Verification:**
```javascript
await waitForStatus('creating_visuals', { timeout: 300000 }) // 5 min timeout

const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('creating_visuals')
expect(artifact.content).toBeTruthy()
expect(artifact.content.length).toBeGreaterThan(1000) // Substantial content

// Verify all previous steps complete
const progressComponent = page.locator('[data-testid="writing-progress"]')
expect(progressComponent.locator('[data-step="research"]')).toHaveAttribute('data-complete', 'true')
expect(progressComponent.locator('[data-step="skeleton"]')).toHaveAttribute('data-complete', 'true')
expect(progressComponent.locator('[data-step="writing"]')).toHaveAttribute('data-complete', 'true')
```

---

### 2.5 Status: Creating Visuals

#### Test Case: Creating Visuals Status Behavior

**Setup:** Artifact in `creating_visuals` status (AI generating images)

**Expected UI State:**

**Status Badge:**
- ✅ Label: "Creating Content"
- ✅ Color: Purple (status-processing) OR Blue

**Editor:**
- ✅ State: LOCKED
- ✅ Full content visible
- ✅ Image placeholders visible (e.g., `![alt](placeholder)`)
- ✅ MVP: Placeholders remain (no actual images yet)

**CTAs:**
- ✅ "Create Content" button: HIDDEN
- ✅ "Mark as Published" button: HIDDEN

**Components:**
- ✅ WritingProgress: VISIBLE
  - Step 4/4: "Generating Images" with spinner
  - Progress bar: 100%
  - Steps 1-3: Checkmark ✓
  - Step 4: Spinner ⟳
- ✅ ResearchArea: Visible with research data
- ✅ AI Assistant: Open (showing image generation)

**Polling:**
- ✅ Artifact polling: ACTIVE (every 2 seconds)
- ✅ Research polling: STOPPED

**MVP Note:**
- Image generation is currently stubbed - immediately transitions to `ready`
- Future: Will actually generate images for `![alt](placeholder)` tags

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('creating_visuals')

// WritingProgress
const progressComponent = page.locator('[data-testid="writing-progress"]')
expect(progressComponent.locator('[data-step="creating_visuals"]')).toHaveAttribute('data-active', 'true')
expect(progressComponent.locator('[data-progress="100"]')).toBeVisible()

// All previous steps complete
for (const step of ['research', 'skeleton', 'writing']) {
  expect(progressComponent.locator(`[data-step="${step}"]`)).toHaveAttribute('data-complete', 'true')
}

// Editor content with placeholders
const editorContent = await page.locator('[data-testid="artifact-editor"] [contenteditable]').textContent()
expect(editorContent).toContain('![') // Image placeholder syntax
```

---

#### Test Case: Creating Visuals → Auto-Transition to Ready

**Setup:** Artifact in creating_visuals status, AI completes image generation

**Expected Behavior:**
- ✅ AI calls `generateContentImages` tool (MVP: stub that immediately completes)
- ✅ Status auto-updates: creating_visuals → ready
- ✅ Editor unlocks
- ✅ WritingProgress disappears
- ✅ "Mark as Published" button appears
- ✅ Polling stops
- ✅ MVP: Transition happens almost immediately

**Verification:**
```javascript
await waitForStatus('ready', { timeout: 30000 }) // Should be fast in MVP

const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('ready')

// UI changes
expect(page.locator('[data-testid="writing-progress"]')).not.toBeVisible()
expect(page.locator('[data-testid="artifact-mark-published-button"]')).toBeVisible()
expect(page.locator('[data-testid="editor-lock-overlay"]')).not.toBeVisible()

// Editor unlocked
const editor = page.locator('[data-testid="artifact-editor"]')
expect(editor.locator('[contenteditable="true"]')).toBeVisible()

// Status badge updated
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Content Ready')
expect(page.locator('[data-testid="status-badge"]')).toHaveClass(/status-ready/)
```

---

### 2.6 Status: Ready

#### Test Case: Ready Status Behavior

**Setup:** Artifact in `ready` status (AI content complete, ready for review)

**Expected UI State:**

**Status Badge:**
- ✅ Label: "Content Ready"
- ✅ Color: Green (status-ready)

**Editor:**
- ✅ State: UNLOCKED (contenteditable="true")
- ✅ Full content visible
- ✅ User can edit freely

**CTAs:**
- ✅ "Create Content" button: HIDDEN
- ✅ "Mark as Published" button: VISIBLE

**Components:**
- ✅ WritingProgress: HIDDEN
- ✅ ResearchArea: Visible with research data
- ✅ AI Assistant: Closed or can be opened manually

**Polling:**
- ✅ Artifact polling: INACTIVE
- ✅ Research polling: INACTIVE

**User Actions:**
- ✅ User can edit content
- ✅ User can click "Mark as Published"
- ✅ User can open AI Assistant for refinements

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('ready')

// Status badge
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Content Ready')
expect(page.locator('[data-testid="status-badge"]')).toHaveClass(/status-ready/)

// CTAs
expect(page.locator('[data-testid="artifact-mark-published-button"]')).toBeVisible()
expect(page.locator('[data-testid="artifact-create-content-button"]')).not.toBeVisible()

// WritingProgress hidden
expect(page.locator('[data-testid="writing-progress"]')).not.toBeVisible()

// Editor unlocked
const editor = page.locator('[data-testid="artifact-editor"]')
expect(editor.locator('[contenteditable="true"]')).toBeVisible()
expect(page.locator('[data-testid="editor-lock-overlay"]')).not.toBeVisible()

// Research area visible
expect(page.locator('[data-testid="research-area"]')).toBeVisible()
expect(page.locator('[data-testid="research-content"]')).toBeVisible()
```

---

#### Test Case: Ready → User Edits Content

**Setup:** Artifact in ready status

**Steps:**
1. Click into editor
2. Modify content (add/remove text)
3. Save changes

**Expected Outcome:**
- ✅ Content updates successfully
- ✅ Status remains `ready`
- ✅ `hasUnsavedChanges` flag set
- ✅ Save indicator appears
- ✅ No auto-transition

**Verification:**
```javascript
const originalContent = await getArtifactContent(artifactId)

// Edit content
await page.click('[data-testid="artifact-editor"] [contenteditable]')
await page.keyboard.type(' Additional edited content.')
await page.waitForTimeout(1000)

// Save
await page.click('[data-testid="artifact-save-button"]')
await waitForTimeout(2000)

// Verify
const updatedArtifact = await getArtifact(artifactId)
expect(updatedArtifact.status).toBe('ready') // Status unchanged
expect(updatedArtifact.content).not.toBe(originalContent)
expect(updatedArtifact.content).toContain('Additional edited content')
```

---

#### Test Case: Ready → Mark as Published

**Setup:** Artifact in ready status

**Steps:**
1. Click "Mark as Published" button

**Expected Outcome:**
- ✅ Status transitions: ready → published
- ✅ Status badge updates to "Published" (emerald)
- ✅ "Mark as Published" button disappears
- ✅ Editor remains unlocked
- ✅ `published_at` timestamp set (optional future enhancement)

**Verification:**
```javascript
await page.click('[data-testid="artifact-mark-published-button"]')
await waitForTimeout(2000)

const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('published')

// UI updates
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Published')
expect(page.locator('[data-testid="status-badge"]')).toHaveClass(/status-published/)
expect(page.locator('[data-testid="artifact-mark-published-button"]')).not.toBeVisible()

// Editor still unlocked
expect(page.locator('[data-testid="artifact-editor"] [contenteditable="true"]')).toBeVisible()
```

---

### 2.7 Status: Published

#### Test Case: Published Status Behavior

**Setup:** Artifact in `published` status

**Expected UI State:**

**Status Badge:**
- ✅ Label: "Published"
- ✅ Color: Emerald (status-published)

**Editor:**
- ✅ State: UNLOCKED (contenteditable="true")
- ✅ Full content visible
- ✅ User can edit

**CTAs:**
- ✅ "Create Content" button: HIDDEN
- ✅ "Mark as Published" button: HIDDEN

**Components:**
- ✅ WritingProgress: HIDDEN
- ✅ ResearchArea: Visible
- ✅ AI Assistant: Closed or can be opened

**Polling:**
- ✅ Artifact polling: INACTIVE
- ✅ Research polling: INACTIVE

**Special Behavior:**
- ✅ Edit detection: When user modifies content, auto-transition to `ready`

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('published')

// Status badge
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Published')
expect(page.locator('[data-testid="status-badge"]')).toHaveClass(/status-published/)

// No CTAs visible
expect(page.locator('[data-testid="artifact-create-content-button"]')).not.toBeVisible()
expect(page.locator('[data-testid="artifact-mark-published-button"]')).not.toBeVisible()

// Editor unlocked
expect(page.locator('[data-testid="artifact-editor"] [contenteditable="true"]')).toBeVisible()
```

---

#### Test Case: Published → Auto-Transition to Ready on Edit

**Setup:** Artifact in published status

**Steps:**
1. Click into editor
2. Modify content
3. Observe automatic status change

**Expected Outcome:**
- ✅ As soon as content changes, status auto-updates: published → ready
- ✅ Status badge changes to "Content Ready"
- ✅ "Mark as Published" button reappears
- ✅ User can re-publish after edits

**Verification:**
```javascript
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('published')

// Edit content
await page.click('[data-testid="artifact-editor"] [contenteditable]')
await page.keyboard.type(' Editing published content.')

// Wait for auto-transition
await waitForTimeout(2000)

const updatedArtifact = await getArtifact(artifactId)
expect(updatedArtifact.status).toBe('ready') // Auto-transitioned

// UI updates
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Content Ready')
expect(page.locator('[data-testid="artifact-mark-published-button"]')).toBeVisible()
```

---

## 3. Status Transition Tests

### 3.1 Linear Progression Tests

#### Test Case: Complete Flow (Draft → Published)

**Scenario:** Test full linear progression through all statuses

**Steps:**
1. Create artifact (status: draft)
2. Trigger "Create Content"
3. Monitor status transitions
4. Mark as published

**Expected Transition Sequence:**
```
draft
  → research (AI conducting research)
  → skeleton (AI creating structure)
  → writing (AI writing content)
  → creating_visuals (AI generating images - MVP: stub)
  → ready (User can review/edit)
  → published (User marks as final)
```

**Verification:**
```javascript
let statusHistory = []

// Monitor status changes via console logs
page.on('console', msg => {
  const match = msg.text().match(/currentStatus:\s*(\w+)/)
  if (match) statusHistory.push(match[1])
})

// Create artifact and trigger AI
await createArtifact({ title: 'Test', type: 'blog' })
await page.click('[data-testid="artifact-create-content-button"]')

// Wait for ready status
await waitForStatus('ready', { timeout: 600000 })

// Mark as published
await page.click('[data-testid="artifact-mark-published-button"]')
await waitForTimeout(2000)

// Verify sequence
const expectedSequence = ['draft', 'research', 'skeleton', 'writing', 'creating_visuals', 'ready', 'published']
expect(statusHistory).toEqual(expectedSequence)
```

---

#### Test Case: Auto-Transitions During Processing

**Scenario:** Verify all processing statuses auto-transition without user action

**Steps:**
1. Create artifact in draft status
2. Trigger "Create Content"
3. Do NOT interact with UI
4. Monitor status changes

**Expected Outcome:**
- ✅ draft → research: Triggered by user clicking "Create Content"
- ✅ research → skeleton: Auto-transition when research complete
- ✅ skeleton → writing: Auto-transition when skeleton complete
- ✅ writing → creating_visuals: Auto-transition when writing complete
- ✅ creating_visuals → ready: Auto-transition when images complete (MVP: immediate)
- ✅ No user intervention required for processing statuses

**Verification:**
```javascript
await page.click('[data-testid="artifact-create-content-button"]')

// Do NOT click anything else - all should be automatic

await waitForStatus('ready', { timeout: 600000 })

// Verify artifact reached ready without manual status changes
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('ready')
expect(artifact.content).toBeTruthy()
expect(artifact.content.length).toBeGreaterThan(1000)
```

---

### 3.2 Published → Ready Loop

#### Test Case: Edit Loop (Published ↔ Ready)

**Scenario:** Test the edit/publish loop

**Steps:**
1. Start with published artifact
2. Edit content → auto-transition to ready
3. Mark as published
4. Edit again → auto-transition to ready
5. Repeat

**Expected Outcome:**
- ✅ published → ready: Auto-transition on content edit
- ✅ ready → published: Manual transition via "Mark as Published"
- ✅ Loop can repeat indefinitely
- ✅ Content persists across transitions

**Verification:**
```javascript
// Start: published status
let artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('published')

// Edit 1: published → ready
await page.click('[data-testid="artifact-editor"] [contenteditable]')
await page.keyboard.type(' Edit 1')
await waitForTimeout(2000)
artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('ready')

// Publish 1: ready → published
await page.click('[data-testid="artifact-mark-published-button"]')
await waitForTimeout(2000)
artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('published')

// Edit 2: published → ready
await page.click('[data-testid="artifact-editor"] [contenteditable]')
await page.keyboard.type(' Edit 2')
await waitForTimeout(2000)
artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('ready')

// Verify content includes both edits
expect(artifact.content).toContain('Edit 1')
expect(artifact.content).toContain('Edit 2')
```

---

### 3.3 Invalid Transition Tests

#### Test Case: Prevent Invalid Transitions

**Scenario:** Verify state machine prevents invalid transitions

**Invalid Transitions to Test:**
- draft → writing (must go through research, skeleton)
- research → ready (must complete all processing)
- skeleton → published (must complete writing, visuals, ready)
- ready → research (can only go to published)

**Verification:**
```javascript
// Attempt invalid transition via API
const response = await api.patch(`/api/portfolio/artifacts/${artifactId}`, {
  status: 'writing' // Invalid from draft
})

expect(response.status).toBe(400)
expect(response.data.error).toContain('Invalid status transition')
```

---

## 4. Edge Cases & Error Scenarios

### 4.1 Browser Refresh During Processing

#### Test Case: Refresh During Research Status

**Scenario:** User refreshes page while artifact is in research status

**Steps:**
1. Create artifact, trigger "Create Content"
2. Wait for status = research
3. Refresh browser (F5 or page.reload())
4. Observe page state after reload

**Expected Outcome:**
- ✅ Page reloads successfully
- ✅ Artifact status still = research
- ✅ WritingProgress renders at correct step (step 1)
- ✅ Editor locked
- ✅ Polling resumes automatically
- ✅ Status continues progressing to skeleton, writing, etc.

**Verification:**
```javascript
await page.click('[data-testid="artifact-create-content-button"]')
await waitForStatus('research')

// Refresh page
await page.reload({ waitUntil: 'networkidle' })

// Verify state restored
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Creating Content')
expect(page.locator('[data-testid="writing-progress"]')).toBeVisible()
expect(page.locator('[data-testid="editor-lock-overlay"]')).toBeVisible()

// Polling should resume - verify progress continues
await waitForStatus('skeleton', { timeout: 120000 })
expect(artifact.status).not.toBe('research') // Should have progressed
```

---

#### Test Case: Refresh During Writing Status

**Scenario:** User refreshes page while artifact is in writing status

**Steps:**
1. Create artifact, trigger AI workflow
2. Wait for status = writing
3. Refresh browser

**Expected Outcome:**
- ✅ Page reloads
- ✅ WritingProgress shows step 3/4
- ✅ Section details displayed (if sections exist)
- ✅ Partial content visible in editor
- ✅ Polling resumes
- ✅ Status progresses to creating_visuals → ready

**Verification:**
```javascript
await waitForStatus('writing')

// Take note of content length before refresh
const contentBefore = await page.locator('[data-testid="artifact-editor"] [contenteditable]').textContent()

// Refresh
await page.reload({ waitUntil: 'networkidle' })

// Verify WritingProgress restored
const progressComponent = page.locator('[data-testid="writing-progress"]')
expect(progressComponent.locator('[data-step="writing"]')).toHaveAttribute('data-active', 'true')
expect(progressComponent.locator('[data-progress="75"]')).toBeVisible()

// Content should be preserved or expanded
const contentAfter = await page.locator('[data-testid="artifact-editor"] [contenteditable]').textContent()
expect(contentAfter.length).toBeGreaterThanOrEqual(contentBefore.length)

// Progress should continue
await waitForStatus('ready', { timeout: 300000 })
```

---

### 4.2 Network Disconnect

#### Test Case: Network Disconnect During Processing

**Scenario:** Network connection lost while artifact is in skeleton status

**Steps:**
1. Create artifact, trigger AI workflow
2. Wait for status = skeleton
3. Simulate network offline (browser DevTools or page.setOffline())
4. Wait 30 seconds
5. Restore network

**Expected Outcome:**
- ✅ Polling fails silently during offline period
- ✅ React Query retries with exponential backoff
- ✅ When connection restored, polling resumes
- ✅ Status catches up to current state
- ✅ No data loss

**Verification:**
```javascript
await waitForStatus('skeleton')

// Go offline
await page.context().setOffline(true)
console.log('Network offline - polling should fail gracefully')

await waitForTimeout(30000) // Wait 30s offline

// Go online
await page.context().setOffline(false)
console.log('Network restored - polling should resume')

// Verify status catches up
await waitForStatus('ready', { timeout: 600000 })
const artifact = await getArtifact(artifactId)
expect(artifact.status).toBe('ready')
expect(artifact.content).toBeTruthy()
```

---

### 4.3 AI Service Failure

#### Test Case: Research Tool Failure

**Scenario:** `conductDeepResearch` tool throws error

**Steps:**
1. Create artifact
2. Trigger "Create Content"
3. Simulate AI service error (mock/stub backend)
4. Observe behavior

**Expected Outcome:**
- ✅ Error logged in backend
- ✅ Artifact remains in research status
- ✅ Frontend continues polling (doesn't know it failed)
- ✅ WritingProgress shows persistent "Researching" state
- ✅ User may need to manually retry or cancel

**Verification:**
```javascript
// This test requires backend mock/stub support
// Alternatively, test with actual AI service timeout

await page.click('[data-testid="artifact-create-content-button"]')
await waitForStatus('research')

// Wait extended period (should timeout if AI fails)
await waitForTimeout(300000) // 5 minutes

const artifact = await getArtifact(artifactId)

// If AI failed, artifact stuck in research
if (artifact.status === 'research') {
  console.log('AI service appears to have failed - artifact stuck in research')

  // Verify UI still shows processing state
  expect(page.locator('[data-testid="writing-progress"]')).toBeVisible()
  expect(page.locator('[data-testid="writing-progress"]')).toContainText('Researching')
}
```

---

### 4.4 Direct URL Access

#### Test Case: Direct URL to Processing Artifact

**Scenario:** User navigates directly to artifact URL where status = skeleton

**Steps:**
1. Create artifact via API with status = skeleton
2. Navigate directly to `/portfolio/artifacts/{id}`
3. Observe page load behavior

**Expected Outcome:**
- ✅ Page loads successfully
- ✅ Status badge shows "Creating Content"
- ✅ WritingProgress renders at step 2 (Creating Structure)
- ✅ Editor locked
- ✅ Polling starts automatically
- ✅ Status progresses to writing → creating_visuals → ready

**Verification:**
```javascript
// Create artifact with status = skeleton via API
const artifact = await createArtifactViaAPI({
  title: 'Test Direct URL',
  type: 'blog',
  status: 'skeleton',
  content: '## Section 1\n\n## Section 2'
})

// Navigate directly to URL
await page.goto(`${TARGET_URL}/portfolio/artifacts/${artifact.id}`)

// Verify correct state rendered
expect(page.locator('[data-testid="status-badge"]')).toHaveText('Creating Content')
expect(page.locator('[data-testid="writing-progress"]')).toBeVisible()
expect(page.locator('[data-step="skeleton"]')).toHaveAttribute('data-active', 'true')
expect(page.locator('[data-testid="editor-lock-overlay"]')).toBeVisible()

// Verify polling starts and status progresses
await waitForStatus('ready', { timeout: 600000 })
```

---

## 5. Test Execution Strategy

### 5.1 Test Data Preparation

**Option 1: UI Creation (Slow, E2E)**
- Create all test data via UI interactions
- Pros: Tests complete user journey
- Cons: Slow, dependent on AI service

**Option 2: MCP Tools (Fast, Isolated)**
- Use `mcp__supabase__execute_sql` to insert test artifacts
- Create artifacts in specific statuses for targeted tests
- Pros: Fast, reliable, no AI dependency
- Cons: Doesn't test creation flow

**Option 3: API Endpoints (Balanced)**
- Create test data endpoints for E2E tests
- Seed database with artifacts in various statuses
- Pros: Balance of speed and realism
- Cons: Requires test endpoints

**Recommended Approach:**
- Use MCP tools for status behavior tests (fast iteration)
- Use UI creation for critical path E2E tests (complete journey)

---

### 5.2 Test Grouping

**Group 1: Entry Points** (UI-driven, ~10 min)
- Manual creation → draft
- Manual creation → create content
- Topics → edit → draft
- Topics → edit → create content
- Topics → create content (direct)

**Group 2: Status Behavior** (Data-driven, ~5 min)
- Create test artifacts in each status via MCP
- Verify UI state for each status
- Verify CTAs, polling, editor state

**Group 3: Transitions** (UI-driven, ~15 min)
- Complete flow: draft → published
- Auto-transitions during processing
- Published → ready loop
- Invalid transitions (API tests)

**Group 4: Edge Cases** (Scenario-driven, ~10 min)
- Browser refresh during processing
- Network disconnect
- AI service failure
- Direct URL access

**Total Estimated Time: ~40 minutes** (excluding AI wait times)

---

### 5.3 Test Execution Modes

**Mode 1: Fast Verification (MCP-driven)**
```bash
# Create artifacts in specific statuses, verify UI
npm run test:status-behavior
```

**Mode 2: Complete E2E (UI-driven)**
```bash
# Full user journeys from creation to publish
npm run test:status-flow-e2e
```

**Mode 3: AI Integration (Long-running)**
```bash
# Test actual AI content generation
npm run test:ai-integration
```

---

## 6. Verification Checklist

### Per-Status Checklist

Use this checklist for each status test:

**UI Elements:**
- [ ] Status badge shows correct label
- [ ] Status badge has correct color class
- [ ] "Create Content" button visibility matches spec
- [ ] "Mark as Published" button visibility matches spec
- [ ] WritingProgress component visibility matches spec
- [ ] WritingProgress shows correct step (if visible)
- [ ] Progress bar shows correct percentage (if visible)
- [ ] Editor lock overlay visibility matches spec
- [ ] Editor contenteditable attribute correct
- [ ] ResearchArea visibility matches spec

**Polling:**
- [ ] Artifact polling active/inactive as expected
- [ ] Research polling active/inactive as expected
- [ ] Polling interval correct (2 seconds)

**Data:**
- [ ] Artifact status in database matches UI
- [ ] Content field populated correctly
- [ ] Research data loaded when expected

**Console Logs:**
- [ ] Status change logs appear
- [ ] No errors in console
- [ ] Polling logs show correct behavior

---

## 7. Known Issues & Workarounds

### Issue 1: AI Service Slow Response

**Problem:** AI tools sometimes take 5+ minutes to complete

**Workaround:**
- Increase timeouts to 10 minutes for research/skeleton/writing
- Monitor via console logs to detect actual completion
- Use status tracking instead of content detection

### Issue 2: Polling Race Conditions

**Problem:** Rapid status transitions may cause UI flicker

**Workaround:**
- Add debouncing to status changes
- Verify final state after transitions complete
- Use `waitForTimeout` after critical actions

### Issue 3: Research Data Loading Delay

**Problem:** Research data may load after status changes

**Workaround:**
- Separate polling for research data
- Don't assume research data available when status = skeleton
- Wait for `[data-testid="research-content"]` to be visible

---

## 8. Test Reporting

### Success Criteria

**Test passes if:**
- ✅ All status behaviors match specification
- ✅ All CTAs appear/disappear correctly
- ✅ Editor locks/unlocks at correct times
- ✅ Polling starts/stops correctly
- ✅ Status transitions follow allowed paths
- ✅ No console errors
- ✅ Content persists across transitions

### Test Report Template

```markdown
## Test Execution Report

**Date:** 2026-01-25
**Tester:** [Name]
**Environment:** [Local/Staging/Production]

### Test Results Summary

- **Total Tests:** 45
- **Passed:** 42
- **Failed:** 3
- **Skipped:** 0

### Failed Tests

1. **Test:** Research → Skeleton Auto-Transition
   - **Expected:** Auto-transition within 2 minutes
   - **Actual:** Stuck in research for 5+ minutes
   - **Root Cause:** AI service timeout
   - **Action:** Increase timeout, investigate AI service

### Screenshots

- [Attach screenshots of failures]

### Console Logs

- [Attach relevant console logs]
```

---

## 9. Maintenance

### When to Update This Plan

Update this testing plan when:
- New status added to workflow
- Status behavior changes
- New UI components added
- Polling logic changes
- AI tools change behavior

### Related Documentation

- **Status Flow Reference:** `/docs/artifact-statuses/status-flow-reference.md`
- **State Machine:** `/frontend/src/features/portfolio/validators/stateMachine.ts`
- **Type Definitions:** `/frontend/src/features/portfolio/types/portfolio.ts`
- **Implementation Plan:** `/.claude/plans/wondrous-petting-rabin.md`

---

**End of Testing Plan**
