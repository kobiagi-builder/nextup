# PRD: Phase 1 - Research & Skeleton Generation

**Phase**: 1 of 4
**Status**: Ready for Implementation
**Dependencies**: None (foundational phase)
**Deliverables**: Research system, skeleton generation, UI for research display, tone selection

---

## Phase Overview

Phase 1 establishes the foundation of the Content Creation Agent by implementing the research and skeleton generation workflow. This phase enables users to trigger content creation, see AI research results with sources, and receive a dynamically-generated content skeleton based on artifact type.

**Why Phase 1 First**:
- Provides immediate value: Users can see research and get content structure
- Validates research source strategy and LLM skeleton generation
- Establishes UI patterns for later phases
- Enables user feedback on skeleton quality before writing implementation

---

## User Stories

### Epic 1: Content Creation Initiation

**US-1.1**: As a user viewing AI-suggested artifacts, I want to see "Add and Edit" and "Create Content" buttons so I can choose whether to edit the suggestion first or start content creation immediately.

**Acceptance Criteria**:
- ✅ AI suggestion cards show two buttons side-by-side
- ✅ "Add and Edit" button: Saves as draft, opens editor, NO workflow start
- ✅ "Create Content" button: Saves as draft AND auto-starts research workflow
- ✅ Button states update based on artifact status
- ✅ Loading state shown during save operation

**US-1.2**: As a user creating artifacts manually, I want to see "Save" and "Create Content" buttons so I can choose to save my draft or trigger AI content creation.

**Acceptance Criteria**:
- ✅ Manual artifact creation form shows two buttons
- ✅ "Save" button: Saves as draft, NO workflow start
- ✅ "Create Content" button: Saves AND starts research workflow
- ✅ Validation prevents "Create Content" with empty title
- ✅ Toast notification confirms which action was taken

---

### Epic 2: Research Phase

**US-2.1**: As a user who clicks "Create Content", I want the system to automatically start deep research on my artifact topic so I don't have to manually gather sources.

**Acceptance Criteria**:
- ✅ Research starts immediately after "Create Content" clicked
- ✅ Artifact status changes to `researching` (new status)
- ✅ Research queries multiple sources: Reddit, LinkedIn, Quora, Medium, Substack
- ✅ Research uses intelligent source matching based on topic characteristics
- ✅ Research results stored in database with sources and references
- ✅ Minimum 5 sources required for successful research
- ✅ Timeout after 3 minutes if research incomplete

**US-2.2**: As a user, I want to see research results displayed in the UI so I understand what information the AI used to create my content skeleton.

**Acceptance Criteria**:
- ✅ Research area visible on artifact page (right side of screen)
- ✅ Research results show: source name, URL, excerpt, relevance score
- ✅ Results grouped by source type (Reddit, LinkedIn, etc.)
- ✅ Sources are clickable links that open in new tab
- ✅ Loading state shown during research ("Researching...")
- ✅ Empty state if no research results yet

**US-2.3**: As a user, I want to be notified if research fails so I can provide manual research data or adjust the topic.

**Acceptance Criteria**:
- ✅ Toast notification shown on research failure
- ✅ Notification explains the issue (e.g., "Insufficient sources found")
- ✅ Advisory message suggests retry or manual entry
- ✅ "Retry Research" button in notification
- ✅ "Enter Research Manually" button opens text input modal
- ✅ Manual research data saved with source marked as "User-provided"

---

### Epic 3: Skeleton Generation

**US-3.1**: As a user, I want the AI to generate a content skeleton based on my artifact type so I have a clear structure to fill in.

**Acceptance Criteria**:
- ✅ Skeleton generated after research completes successfully
- ✅ Skeleton structure varies by artifact type:
  - **Blog**: Title, preface/hook, 3-5 H2 sections with bullet points, conclusion, CTA
  - **Social Post**: Hook, main points (2-3), CTA, hashtag suggestions
  - **Showcase**: Project overview, problem statement, solution approach, results/impact, key learnings
- ✅ Skeleton includes placeholder text for each section
- ✅ Skeleton references research findings (e.g., "According to [source]...")
- ✅ Skeleton pushed to artifact `content` field (Markdown format)
- ✅ Artifact status changes to `skeleton_ready` (new status)

**US-3.2**: As a user, I want to edit the skeleton in the artifact editor so I can customize the structure before content writing.

**Acceptance Criteria**:
- ✅ Skeleton appears in artifact editor immediately after generation
- ✅ Editor supports Markdown editing (existing functionality)
- ✅ User can add/remove sections
- ✅ User can reorder sections
- ✅ User can edit placeholder text
- ✅ Changes auto-saved to database
- ✅ "Approve Skeleton" button visible in editor toolbar

**US-3.3**: As a user, I want to approve the skeleton when I'm satisfied with the structure so the AI can proceed to write content.

**Acceptance Criteria**:
- ✅ "Approve Skeleton" button in artifact editor toolbar
- ✅ Button disabled if skeleton is empty
- ✅ Clicking button changes artifact status to `skeleton_approved` (new status)
- ✅ Toast notification: "Skeleton approved. Content writing will begin in Phase 2."
- ✅ Button changes to "Skeleton Approved" (disabled state) after approval
- ✅ User can "Unapprove" to make further changes (status back to `skeleton_ready`)

---

### Epic 4: Tone of Voice Selection

**US-4.1**: As a user, I want to select a tone of voice for my content so the AI writes in a style that matches my brand.

**Acceptance Criteria**:
- ✅ Tone dropdown visible in artifact editor (near top)
- ✅ Dropdown options:
  - Formal
  - Casual
  - Professional
  - Conversational
  - Technical
  - Friendly
  - Authoritative
  - Humorous
- ✅ Default: "Professional"
- ✅ Selection saved to artifact metadata (`tone` field)
- ✅ Tone selection available during skeleton editing (before approval)
- ✅ Tone can be changed after skeleton approval (applies to content writing in Phase 2)

---

### Epic 5: UI Refinement

**US-5.1**: As a user, I want the artifact page layout to show research results alongside my editor so I can reference them while editing.

**Acceptance Criteria**:
- ✅ Artifact page layout updated:
  - **Header**: Back button + "Back to portfolio" link + "AI Assistance" button
  - **Main area**: Editor (left 60%) + Research area (right 40%)
- ✅ Research area sticky scroll (remains visible while scrolling editor)
- ✅ Research area collapsible (toggle button)
- ✅ Research area empty state: "No research data yet. Click 'Create Content' to start research."

**US-5.2**: As a user, I want to access the AI assistant from the artifact page so I can ask questions about my content.

**Acceptance Criteria**:
- ✅ "AI Assistance" button in artifact page header
- ✅ Clicking button opens AI chat modal/panel (overlays screen)
- ✅ Modal shows chat interface (existing ChatPanel component)
- ✅ Chat context includes current artifact data
- ✅ User can ask questions like "What sources did you use?" or "Suggest alternative headlines"
- ✅ Modal closable via X button or Esc key

---

## Functional Requirements

### FR-1: Research Source Matching

**Requirement**: System must intelligently select research sources based on topic characteristics.

**Implementation**:
1. Analyze artifact title and description to determine topic type:
   - Technical topics → Medium, Substack (priority)
   - Professional insights → LinkedIn, Medium
   - Community sentiment → Reddit, Quora
   - Consumer experiences → Reddit, Quora
   - Industry trends → LinkedIn, Medium, Substack

2. Research agent queries multiple sources in parallel:
   - 2 sources from priority category
   - 1-2 sources from secondary categories
   - Minimum 5 total sources

3. Research tool returns:
   - Source name and URL
   - Excerpt (max 300 characters)
   - Relevance score (0-1, based on keyword match + semantic similarity)
   - Timestamp

4. Results filtered by relevance score > 0.6

### FR-2: LLM Skeleton Generation

**Requirement**: Skeleton structure must be dynamically generated by LLM, not from templates.

**Implementation**:
1. Backend tool: `generateContentSkeleton`
   - Input: Artifact type, research results, tone
   - Output: Markdown skeleton with placeholders

2. LLM prompt structure:
   ```
   You are creating a content skeleton for a [type] artifact.

   Research findings:
   [Research excerpts with sources]

   Generate a skeleton in Markdown format:
   - [Type-specific structure instructions]
   - Include placeholders like [Write hook here]
   - Reference research sources where relevant
   - Match the [tone] tone of voice
   ```

3. Type-specific instructions:
   - **Blog**: Title, hook, 3-5 H2 sections, conclusion, CTA
   - **Social Post**: Hook, 2-3 main points, CTA, hashtags
   - **Showcase**: Overview, problem, solution, results, learnings

4. Skeleton validation:
   - Must have title (H1)
   - Must have at least 2 sections
   - Must be valid Markdown
   - Max 2000 characters (skeleton only, not content)

### FR-3: Research Data Storage

**Requirement**: Research results must be stored in database for retrieval and display.

**Schema** (new table: `artifact_research`):
```sql
CREATE TABLE artifact_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'reddit', 'linkedin', 'quora', 'medium', 'substack', 'user_provided'
  source_name TEXT NOT NULL,
  source_url TEXT,
  excerpt TEXT NOT NULL,
  relevance_score DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_artifact_research_artifact_id ON artifact_research(artifact_id);
```

### FR-4: Artifact Status Transitions

**New Statuses**:
- `researching` - Research in progress
- `skeleton_ready` - Skeleton generated, awaiting user approval
- `skeleton_approved` - User approved skeleton, ready for content writing (Phase 2)

**Status Flow**:
```
draft → [User clicks "Create Content"] → researching
researching → [Research complete] → skeleton_ready
skeleton_ready → [User clicks "Approve Skeleton"] → skeleton_approved
skeleton_approved → [Phase 2] → writing
```

**Validation**:
- Cannot approve skeleton if content is empty
- Cannot start research if already researching
- Can retry research from `researching` status (resets and restarts)

---

## Non-Functional Requirements

### NFR-1: Performance

- Research phase completes in < 60 seconds (target: 30-45s)
- Skeleton generation completes in < 15 seconds
- UI updates reflect status changes within 2 seconds
- Research area loads results incrementally (stream results as they arrive)

### NFR-2: Reliability

- Research retries up to 2 times on failure (exponential backoff: 5s, 15s)
- Skeleton generation falls back to basic template if LLM fails
- Database transactions for status changes (atomic updates)
- Graceful degradation: If research fails, allow manual entry

### NFR-3: Usability

- Loading states with progress indicators (e.g., "Researching Reddit... 2/5 sources")
- Error messages are actionable (suggest next steps)
- Skeleton editor preserves cursor position during auto-save
- Tone dropdown shows tooltip explaining each tone style

### NFR-4: Security

- Research queries sanitized to prevent injection attacks
- External URLs validated before storage (must be HTTPS)
- User-provided research data sanitized (strip HTML tags)
- Rate limiting on research API calls (max 10/hour per user)

---

## Dependencies

### Backend Dependencies
- **New AI Tool**: `generateContentSkeleton` (Claude)
- **New AI Tool**: `conductDeepResearch` (Claude with web search integration)
- **Database Migration**: Add `artifact_research` table
- **Database Migration**: Add new artifact statuses (`researching`, `skeleton_ready`, `skeleton_approved`)
- **API Integration**: Web search tool (Perplexity, Tavily, or similar)

### Frontend Dependencies
- **New Component**: `ResearchArea` (research results display)
- **Modified Component**: `ArtifactPage` (layout update with research area)
- **Modified Component**: `ArtifactEditor` (add tone dropdown, approve button)
- **Modified Component**: `ArtifactSuggestionCard` (add two-button flow)
- **New Hook**: `useResearch` (fetch research results)
- **Modified Types**: Add new artifact statuses to `ArtifactStatus` enum

### External Dependencies
- **Research Sources**: APIs for Reddit, LinkedIn, Quora, Medium, Substack (or web scraping with Firecrawl/Jina)
- **LLM**: Claude for skeleton generation and research summarization

---

## Acceptance Criteria (Phase 1 Complete)

Phase 1 is complete when:

- ✅ User can click "Create Content" on AI suggestion or manual artifact
- ✅ Research phase executes and stores results with sources
- ✅ Research results visible in UI (research area on artifact page)
- ✅ Research failures show advisory with retry/manual entry options
- ✅ Skeleton generated dynamically by LLM (not template)
- ✅ Skeleton appears in artifact editor for user editing
- ✅ User can select tone of voice via dropdown
- ✅ User can approve skeleton (status → `skeleton_approved`)
- ✅ All artifact types (blog, social_post, showcase) supported
- ✅ UI follows existing UX/UI patterns (shadcn/ui, Tailwind)
- ✅ All database migrations applied successfully
- ✅ All new statuses work with existing artifact state machine

---

## Out of Scope (Phase 1)

- ❌ Content writing (Phase 2)
- ❌ Humanity check (Phase 2)
- ❌ Image generation (Phase 3)
- ❌ Notification system (Phase 3)
- ❌ Custom tone examples (Phase 4)
- ❌ Publishing automation

---

## Testing Requirements

### Unit Tests
- Skeleton generation prompt formatting
- Research source matching logic
- Status transition validation
- Tone selection saving/retrieval

### Integration Tests
- End-to-end: "Create Content" → Research → Skeleton → Approve
- Research failure handling and retry logic
- Manual research data entry workflow
- Skeleton approval state persistence

### E2E Tests (Playwright)
- User clicks "Create Content" on AI suggestion
- Research results appear in research area
- User edits skeleton and approves
- Tone dropdown saves selection
- AI assistant modal opens from artifact page

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Research sources unreliable (rate limits, downtime) | High | Implement multiple source fallbacks, cache results, allow manual entry |
| LLM generates poor skeleton quality | Medium | Prompt engineering iteration, fallback to basic template, user editing capability |
| Research takes too long (>60s) | Medium | Parallel source queries, timeout with partial results, progress indicators |
| User abandons mid-research | Low | Persist research state, allow resume from `researching` status |

---

## Success Metrics

- **Research Success Rate**: > 90% of research attempts complete successfully
- **Skeleton Approval Rate**: > 70% of users approve skeleton without major edits
- **Time to Skeleton Approval**: < 5 minutes from "Create Content" click to approval
- **User Satisfaction**: > 4/5 rating on skeleton quality (survey)
- **Research Source Quality**: Average relevance score > 0.7

---

## Next Phase Preview

**Phase 2: Content Writing & Humanity Check**
- Use approved skeleton + research data to generate full content
- Apply humanity check patterns to remove AI-sounding text
- Integrate Gemini for text writing
- Add tone application logic

Phase 1 establishes the foundation. Phase 2 transforms the skeleton into polished, human-sounding content.
