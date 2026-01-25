# PRD: Phase 2 - Content Writing & Humanity Check

**Phase**: 2 of 4
**Status**: Ready for Implementation
**Dependencies**: Phase 1 (skeleton approved, research available, tone selected)
**Deliverables**: Full content generation, humanity check, tone application

---

## Phase Overview

Phase 2 transforms the approved skeleton into polished, human-sounding content. This phase uses Gemini for text writing, applies the user-selected tone, and runs a humanity check to remove AI-sounding patterns.

**Why Phase 2 Second**:
- Builds on approved skeleton from Phase 1
- Validates Gemini integration for text generation
- Tests humanity check effectiveness before graphics phase
- Provides complete text content for user review

---

## User Stories

### Epic 1: Content Writing Trigger

**US-2.1**: As a user who approved a skeleton, I want the system to automatically start writing content so I don't have to manually fill in each section.

**Acceptance Criteria**:
- ✅ Content writing starts immediately after skeleton approval
- ✅ Artifact status changes to `writing` (new status)
- ✅ Loading indicator shows progress: "Writing content... Section 1 of 5"
- ✅ Writing progress visible in UI (e.g., 20%, 40%, 60%)
- ✅ User can cancel writing mid-process (returns to `skeleton_approved` status)

---

### Epic 2: Content Generation

**US-2.2**: As a user, I want the AI to write content for each skeleton section using my research data and selected tone so the content is relevant and on-brand.

**Acceptance Criteria**:
- ✅ Content written section-by-section (not all at once)
- ✅ Each section references relevant research findings
- ✅ Content matches selected tone (formal, casual, etc.)
- ✅ Content length appropriate for artifact type:
  - **Blog**: 800-1500 words
  - **Social Post**: 150-280 characters
  - **Showcase**: 600-1000 words
- ✅ Content inserted into skeleton placeholders
- ✅ Original skeleton structure preserved (headings, sections)
- ✅ Writing failures retry up to 2 times per section

**US-2.3**: As a user, I want to see content appear in the editor as it's being written so I can review early and cancel if needed.

**Acceptance Criteria**:
- ✅ Editor updates in real-time as sections are written (streaming)
- ✅ Completed sections highlighted with green checkmark
- ✅ Current section being written highlighted with blue border
- ✅ Pending sections shown with gray placeholder
- ✅ "Cancel Writing" button visible during writing
- ✅ Auto-scroll keeps current section in view

---

### Epic 3: Tone Application

**US-2.4**: As a user, I want the content to match my selected tone so it aligns with my brand voice.

**Acceptance Criteria**:
- ✅ Content generation uses tone from Phase 1 selection
- ✅ Tone styles implemented:
  - **Formal**: Academic language, passive voice, complex sentences
  - **Casual**: Contractions, simple language, active voice
  - **Professional**: Clear and direct, jargon-appropriate, confident
  - **Conversational**: First-person, questions, friendly
  - **Technical**: Precise terminology, detailed explanations, data-driven
  - **Friendly**: Warm language, encouraging, personal anecdotes
  - **Authoritative**: Strong statements, expert positioning, evidence-based
  - **Humorous**: Light jokes, wordplay, entertaining examples
- ✅ Tone consistent across all sections
- ✅ Tone applied during content generation (not post-processing)

---

### Epic 4: Humanity Check

**US-2.5**: As a user, I want the AI to remove AI-sounding patterns from my content so it reads naturally and doesn't feel robotic.

**Acceptance Criteria**:
- ✅ Humanity check runs after content writing completes
- ✅ Artifact status changes to `humanity_checking` (new status)
- ✅ Humanity check detects and fixes 24 AI patterns from humanizer skill:
  - Remove AI vocabulary (crucial, delve, tapestry, landscape)
  - Eliminate promotional language (nestled, vibrant, stunning)
  - Replace superficial "-ing" analyses with concrete statements
  - Add personality and voice (vary sentence structure)
  - Remove em dash overuse
  - Eliminate "serves as"/"stands as" constructions
  - Remove vague attributions ("experts believe")
  - Simplify filler phrases
- ✅ Changes tracked and shown to user (diff view optional)
- ✅ Humanity check completes in < 30 seconds
- ✅ User can skip humanity check (checkbox during skeleton approval)

**US-2.6**: As a user, I want to review humanity check changes before finalizing so I can ensure quality wasn't compromised.

**Acceptance Criteria**:
- ✅ After humanity check, artifact status changes to `review_ready` (new status)
- ✅ Toast notification: "Content ready for review. Check for quality and approve."
- ✅ Editor highlights changes made by humanity check (optional toggle)
- ✅ "Approve Content" button visible in editor toolbar
- ✅ User can edit content before approval
- ✅ User can request re-write of specific sections (right-click menu → "Rewrite Section")

---

### Epic 5: Content Approval

**US-2.7**: As a user, I want to approve the final content when I'm satisfied with quality so I can proceed to graphics generation (Phase 3).

**Acceptance Criteria**:
- ✅ "Approve Content" button in artifact editor toolbar
- ✅ Button disabled if content is empty
- ✅ Clicking button changes artifact status to `content_approved` (new status)
- ✅ Toast notification: "Content approved. Image generation will begin in Phase 3."
- ✅ Button changes to "Content Approved" (disabled state) after approval
- ✅ User can "Unapprove" to make further changes (status back to `review_ready`)

---

## Functional Requirements

### FR-1: Gemini Integration for Text Writing

**Requirement**: Use Gemini (not Claude) for content generation to optimize for writing quality and cost.

**Implementation**:
1. Backend tool: `writeContentSection`
   - Input: Skeleton section, research excerpts, tone, artifact type
   - Output: Written content (Markdown)
   - Model: Gemini 1.5 Pro or Gemini 2.0 Flash

2. Gemini prompt structure:
   ```
   You are a professional content writer creating [artifact type] content.

   Skeleton section:
   [Section heading and placeholder]

   Research context:
   [Relevant research excerpts]

   Tone: [Selected tone]

   Write compelling, well-researched content for this section.
   - Match the [tone] tone of voice
   - Reference research findings naturally
   - Use specific details, not vague claims
   - Vary sentence structure
   - [Type-specific writing guidelines]
   ```

3. Section-by-section generation:
   - Parse skeleton into sections (by H2 headings)
   - Generate content for each section sequentially
   - Insert content into skeleton placeholders
   - Stream results to frontend for real-time display

4. Retry logic:
   - Max 2 retries per section on failure
   - Exponential backoff: 3s, 9s
   - If all retries fail, mark section as "Failed - manual edit required"

### FR-2: Humanity Check Implementation

**Requirement**: Remove AI-sounding patterns using humanizer skill patterns.

**Implementation**:
1. Backend tool: `applyHumanityCheck`
   - Input: Written content (Markdown)
   - Output: Humanized content (Markdown), change summary
   - Model: Claude (better for pattern detection and refinement)

2. Claude prompt structure:
   ```
   You are an expert editor removing AI-sounding patterns from text.

   Use these 24 patterns from Wikipedia's "Signs of AI writing":
   [Include all 24 patterns from humanizer skill]

   Original content:
   [Content from Gemini]

   Rewrite to:
   - Remove AI vocabulary (crucial, delve, tapestry, landscape)
   - Eliminate promotional language
   - Add personality and voice
   - Vary sentence structure naturally
   - Use specific details over vague claims

   Return:
   1. Humanized content (Markdown)
   2. Summary of changes made
   ```

3. Change tracking (optional):
   - Store original content and humanized content separately
   - Generate diff for user review
   - Allow toggle between versions in editor

### FR-3: Tone Application Logic

**Requirement**: Apply user-selected tone during content generation.

**Tone Prompt Modifiers**:

**Formal**:
```
Use academic language, passive voice where appropriate, complex sentence structures, avoid contractions, cite sources formally.
```

**Casual**:
```
Use contractions (it's, you're), simple everyday language, active voice, short sentences, conversational flow.
```

**Professional**:
```
Be clear and direct, use industry terminology appropriately, maintain confidence, avoid fluff, get to the point.
```

**Conversational**:
```
Write in first-person, ask rhetorical questions, use "you" to address reader, friendly and approachable, share personal insights.
```

**Technical**:
```
Use precise terminology, include detailed explanations, reference data and metrics, assume reader has technical background, avoid oversimplification.
```

**Friendly**:
```
Use warm and encouraging language, include personal anecdotes, show empathy, use exclamation points sparingly, be supportive.
```

**Authoritative**:
```
Make strong declarative statements, position as expert, use evidence-based claims, demonstrate deep knowledge, inspire confidence.
```

**Humorous**:
```
Include light jokes, use wordplay, add entertaining examples, keep humor tasteful and relevant, balance entertainment with information.
```

### FR-4: Artifact Status Transitions

**New Statuses**:
- `writing` - Content generation in progress
- `humanity_checking` - Humanity check in progress
- `review_ready` - Content ready for user review
- `content_approved` - User approved content, ready for graphics (Phase 3)

**Status Flow**:
```
skeleton_approved → [User approves skeleton] → writing
writing → [Writing complete] → humanity_checking
humanity_checking → [Humanity check complete] → review_ready
review_ready → [User clicks "Approve Content"] → content_approved
content_approved → [Phase 3] → generating_graphics
```

---

## Non-Functional Requirements

### NFR-1: Performance

- Content writing completes in < 90 seconds for blog (5 sections)
- Content writing completes in < 20 seconds for social post (1-2 sections)
- Humanity check completes in < 30 seconds
- Real-time streaming shows content appearing within 2 seconds of generation

### NFR-2: Content Quality

- Content readability: Flesch-Kincaid score 60-70 (8th-10th grade level)
- Research reference rate: At least 1 research citation per section
- Tone consistency: 90%+ match with selected tone (human evaluation)
- Humanity check effectiveness: Remove 80%+ of AI patterns

### NFR-3: Usability

- Progress indicators show section-by-section completion
- User can cancel writing at any time (no data loss)
- Editor auto-saves during writing (preserve progress)
- Clear error messages if writing fails (e.g., "Section 3 failed: API timeout. Click to retry.")

### NFR-4: Cost Optimization

- Use Gemini (cheaper than Claude) for bulk content writing
- Use Claude only for humanity check (requires pattern detection)
- Cache research context to avoid redundant API calls
- Implement token usage tracking and budget alerts

---

## Dependencies

### Backend Dependencies
- **New AI Tool**: `writeContentSection` (Gemini)
- **New AI Tool**: `applyHumanityCheck` (Claude)
- **API Integration**: Gemini API (Google AI Studio or Vertex AI)
- **Database Migration**: Add new artifact statuses (`writing`, `humanity_checking`, `review_ready`, `content_approved`)

### Frontend Dependencies
- **Modified Component**: `ArtifactEditor` (add "Approve Content" button, streaming content display, progress indicators)
- **New Component**: `WritingProgress` (shows section-by-section progress)
- **Modified Hook**: `useArtifact` (handle new statuses, content streaming)
- **Modified Types**: Add new statuses to `ArtifactStatus` enum

### External Dependencies
- **Gemini API**: Google AI Studio or Vertex AI access
- **Model**: Gemini 1.5 Pro or Gemini 2.0 Flash

---

## Acceptance Criteria (Phase 2 Complete)

Phase 2 is complete when:

- ✅ Content writing starts after skeleton approval
- ✅ Content generated section-by-section using Gemini
- ✅ Content matches user-selected tone
- ✅ Content streams to editor in real-time
- ✅ Humanity check runs and removes AI patterns
- ✅ User can review humanized content
- ✅ User can approve content (status → `content_approved`)
- ✅ All artifact types (blog, social_post, showcase) supported
- ✅ Writing failures show actionable error messages
- ✅ All database migrations applied successfully

---

## Out of Scope (Phase 2)

- ❌ Image generation (Phase 3)
- ❌ Notification system (Phase 3)
- ❌ Custom tone examples (Phase 4)
- ❌ Publishing automation

---

## Testing Requirements

### Unit Tests
- Tone prompt modifier generation
- Humanity check pattern detection
- Content section parsing and insertion
- Status transition validation

### Integration Tests
- End-to-end: Skeleton approval → Writing → Humanity check → Approval
- Gemini API error handling and retries
- Content streaming to frontend
- Tone application across all 8 tones

### E2E Tests (Playwright)
- User approves skeleton
- Content appears in editor section-by-section
- Humanity check completes
- User approves content
- Cancel writing mid-process

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini generates low-quality content | High | Prompt engineering iteration, fallback to Claude, user editing capability |
| Humanity check removes too much content | Medium | Configurable aggressiveness, diff view for user review, allow revert |
| Content writing too slow (>2min) | Medium | Parallel section generation (where possible), progress indicators, optimize prompts |
| Tone application inconsistent | Low | Tone-specific prompt testing, user feedback loop, tone refinement in Phase 4 |

---

## Success Metrics

- **Content Quality Score**: > 4/5 user rating on generated content
- **Humanity Check Effectiveness**: > 80% of AI patterns removed
- **Time to Content Approval**: < 10 minutes from skeleton approval to content approval
- **Rewrite Request Rate**: < 30% of sections require manual rewrite
- **Tone Match Score**: > 85% perceived match with selected tone (user survey)

---

## Next Phase Preview

**Phase 3: Graphics & Completion**
- Identify image needs from skeleton structure
- Generate placeholder images for user approval
- Generate final images using Gemini Nano Banana
- Insert images into content
- Notify user when content is complete and ready

Phase 2 delivers complete text content. Phase 3 adds visual polish and marks content as ready for publishing.
