# Artifact Creation Flow

**Created:** 2026-02-19
**Last Updated:** 2026-03-05
**Version:** 1.3.0
**Status:** Complete

## Overview

The artifact creation flow is the primary user journey — from creating a new content artifact to publishing finished content. It covers two pipeline paths: **blog/showcase** content creation and **showcase interview** creation.

---

## Entry Points

| Entry | Screen | Action |
|-------|--------|--------|
| Portfolio page "+" button | PortfolioPage | Opens ArtifactForm dialog |
| Chat suggestion card | PortfolioPage/ArtifactPage | "Create Content" CTA → reference dialog (if refs exist) → create artifact |
| "Create Social Post" action | ArtifactPage (ready/published) | Creates social_post from existing blog/showcase |

---

## Flow: Blog/Showcase Content Creation

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant Portfolio as PortfolioPage
    participant Form as ArtifactForm
    participant Editor as ArtifactPage
    participant Chat as ChatPanel
    participant Backend as Content Agent
    participant DB as Supabase

    User->>Portfolio: Click "+" button
    Portfolio->>Form: Open create dialog
    User->>Form: Select type, enter title, set tone
    User->>Form: (Optional) Expand "Writing References", select references
    User->>Form: Click "Save as Draft" or "Create Content"

    alt Save as Draft
        Form->>DB: POST /artifacts (status: draft)
        DB-->>Editor: Navigate to /portfolio/artifacts/:id
        Note over Editor: Editor unlocked, status: draft
        User->>Editor: Click "Create Content" button
    else Create Content directly
        Form->>DB: POST /artifacts (status: draft)
        DB-->>Editor: Navigate to /portfolio/artifacts/:id
    end

    Editor->>Chat: Open chat with "Create content: {title}"
    Chat->>Backend: POST /api/content-agent/execute

    rect rgb(200, 220, 255)
        Note over Backend,DB: AUTOMATED PIPELINE (editor locked)
        Backend->>DB: status → research (15%)
        Backend->>Backend: conductDeepResearch (Tavily API)
        Backend->>DB: Store research in artifact_research
        Backend->>DB: status → foundations (30%)
        Backend->>Backend: analyzeWritingCharacteristics (uses selected references if any)
        Backend->>DB: Store in artifact_writing_characteristics
        Backend->>DB: status → skeleton (45%)
        Backend->>Backend: generateContentSkeleton (Claude)
        Backend->>DB: Store skeleton in content field
    end

    Note over Editor: PIPELINE PAUSES — foundations_approval (50%)
    Editor->>Editor: FoundationsSection auto-expands
    Editor->>Editor: Show characteristics + editable skeleton + selected references

    User->>Editor: Review/edit skeleton
    opt Change writing references
        User->>Editor: Click "Change" on FoundationsReferences
        User->>Editor: Select different references
        User->>Editor: Click "Re-analyze with new references"
        Editor->>Backend: POST /api/artifacts/:id/re-analyze-foundations
        Backend->>DB: Update metadata.selectedReferenceIds
        Backend->>Backend: Re-run foundations pipeline (steps 1-3)
        Backend->>DB: status → foundations → foundations_approval
        Note over Editor: New characteristics + skeleton generated
    end
    User->>Editor: Click "Foundations Approved"
    Editor->>Backend: POST /api/artifacts/:id/approve-foundations

    rect rgb(200, 220, 255)
        Note over Backend,DB: PIPELINE RESUMES (editor locked)
        Backend->>DB: status → writing (70%)
        Backend->>Backend: writeContentSections (Gemini)
        Backend->>DB: status → humanity_checking (80%)
        Backend->>Backend: checkHumanity (Claude)
        Backend->>DB: status → creating_visuals (90%)
        Backend->>Backend: identifyImageNeeds + generateFinalImages
        Backend->>DB: status → ready (100%)
    end

    Note over Editor: Editor unlocked, content ready
    User->>Editor: Review and edit content
    User->>Editor: Click "Mark as Published"
    Editor->>DB: status → published
```

### Step-by-Step

| # | Status | User Action | System Action | UI State |
|---|--------|-------------|---------------|----------|
| 1 | — | Click "+" on Portfolio | Open ArtifactForm | Form dialog |
| 2 | — | Fill type, title, tone | — | Form inputs |
| 2b | — | (Optional) Expand "Writing References" | Show reference picker | Collapsible section |
| 2c | — | (Optional) Select writing references | Store IDs in form state | Cards toggle selection |
| 3 | `draft` | Click "Save as Draft" / "Create Content" | Create artifact in DB (metadata includes selectedReferenceIds) | Navigate to ArtifactPage |
| 4 | `draft` | Click "Create Content" (if draft) | Open ChatPanel, send initial message | Chat opens |
| 5 | `research` | Wait | AI researches via Tavily (6 sources) | Editor locked, progress 15% |
| 6 | `foundations` | Wait | AI analyzes writing characteristics (using selected references if provided, else all active) | Progress 30% |
| 7 | `skeleton` | Wait | AI generates H1 + H2 skeleton | Progress 45% |
| 8 | `foundations_approval` | Review skeleton + characteristics + references | Pipeline paused | FoundationsSection expanded |
| 8b | `foundations_approval` | (Optional) Click "Change" on references | Expand ReferencePicker | Reference selection UI |
| 8c | `foundations_approval` | (Optional) Click "Re-analyze with new references" | Re-run foundations steps 1-3 | Loading state, approval button disabled |
| 9 | `foundations_approval` | Edit skeleton (optional) | — | Skeleton editable in TipTap |
| 10 | `foundations_approval` | Click "Foundations Approved" | Resume pipeline | Brief transition |
| 11 | `writing` | Wait | AI writes full content per section | Progress 70% |
| 12 | `humanity_checking` | Wait | AI removes 24+ AI writing patterns | Progress 80% |
| 13 | `creating_visuals` | Wait | AI generates images for placeholders | Progress 90% |
| 14 | `ready` | Review content, edit as needed | — | Editor unlocked, full content |
| 15 | `published` | Click "Mark as Published" | Set published_at timestamp | Published badge |

---

## Flow: Topic Suggestion with Reference Selection

When the AI suggests topics in the chat, clicking "Create Content" on a suggestion card triggers a reference selection step.

```mermaid
sequenceDiagram
    actor User
    participant Chat as ChatPanel
    participant Dialog as ReferenceSelectionDialog
    participant DB as Supabase
    participant Editor as ArtifactPage

    User->>Chat: Click "Create Content" on suggestion card

    alt User has writing references
        Chat->>Dialog: Open ReferenceSelectionDialog
        User->>Dialog: Select references (or click "Skip")
        alt Skip references
            Dialog->>DB: POST /artifacts (no selectedReferenceIds)
        else Create with references
            Dialog->>DB: POST /artifacts (metadata.selectedReferenceIds)
        end
    else No references exist
        Chat->>DB: POST /artifacts (no dialog shown)
    end

    DB-->>Editor: Navigate to /portfolio/artifacts/:id?autoResearch=true
    Note over Editor: Pipeline starts automatically
```

**Components involved:**
- `ArtifactSuggestionCard` — triggers dialog or direct creation
- `ReferenceSelectionDialog` — wraps `ReferencePicker` in a dialog
- `ChatPanel.handleCreateContent` — passes metadata to `createArtifactMutation`

---

## Flow: Showcase Interview Creation

For `showcase` type artifacts, the pipeline includes an interview phase before research.

```mermaid
sequenceDiagram
    actor User
    participant Editor as ArtifactPage
    participant Chat as ChatPanel
    participant Backend as Content Agent
    participant DB as Supabase

    User->>Editor: Create showcase + Click "Create Content"
    Editor->>Chat: Open chat
    Chat->>Backend: Execute content agent

    Backend->>DB: status → interviewing (5%)
    Backend->>Chat: AI asks Question 1 (case_context dimension)
    User->>Chat: Answer Question 1
    Backend->>DB: Save Q&A to artifact_interviews
    Backend->>Chat: AI asks Question 2 (problem_challenge)
    User->>Chat: Answer Question 2
    Note over Chat: Repeat for 6 questions across 5 dimensions

    Backend->>DB: completeShowcaseInterview
    Backend->>DB: status → research
    Note over Backend: Pipeline continues as blog flow
```

### Interview Dimensions (5)

| Dimension | Purpose |
|-----------|---------|
| `case_context` | Background, company, role, timeline |
| `problem_challenge` | Problem statement, constraints, stakes |
| `approach_methodology` | How the user solved it, tools, methods |
| `results_outcomes` | Measurable results, metrics, impact |
| `lessons_insights` | Lessons learned, recommendations |

### Interview Details

- **6 questions** total across 5 dimensions
- AI dynamically generates questions based on coverage scores
- Each answer stored in `artifact_interviews` table with dimension and coverage_scores
- After completion, interview brief is synthesized and feeds into research phase

---

## Flow: Social Post Generation

Available when a blog or showcase artifact is in `ready` or `published` status.

```mermaid
sequenceDiagram
    actor User
    participant Source as ArtifactPage (blog/showcase)
    participant Backend as Content Agent
    participant DB as Supabase
    participant New as New ArtifactPage (social_post)

    User->>Source: Click "Create Social Post" (three-dot menu)
    Source->>DB: POST /artifacts (type: social_post, metadata.sourceArtifactId)
    DB-->>New: Navigate to new social_post artifact
    New->>Backend: Execute writeSocialPostContent tool
    Backend->>Backend: Read source artifact content
    Backend->>Backend: Generate viral social post
    Backend->>DB: Update social_post content + status → ready
    Note over New: Social post ready for review
```

### Eligibility

```typescript
// Can create social post when:
canCreateSocialPost(artifact) =
  artifact.type IN ('blog', 'showcase') AND
  artifact.status IN ('ready', 'published')
```

---

## Flow: Post-Creation Content Regeneration

Available when a blog, social_post, or showcase artifact is in `ready` or `published` status. Allows users to change writing references and regenerate all content.

```mermaid
sequenceDiagram
    actor User
    participant Editor as ArtifactPage (ready/published)
    participant Modal as AlertDialog
    participant Backend as Content Agent
    participant DB as Supabase

    User->>Editor: Expand FoundationsSection
    User->>Editor: Click "Change" on references
    User->>Editor: Select different references
    User->>Editor: Click "Regenerate with new references"
    Editor->>Modal: Show confirmation modal
    User->>Modal: Click "Regenerate Content"
    Modal->>Backend: POST /api/artifacts/:id/re-analyze-foundations
    Backend->>DB: Update metadata.selectedReferenceIds
    Backend->>DB: status → foundations

    rect rgb(200, 220, 255)
        Note over Backend,DB: REGENERATION PIPELINE (editor locked)
        Backend->>Backend: analyzeWritingCharacteristics
        Backend->>Backend: analyzeStorytellingStructure
        Backend->>Backend: generateContentSkeleton (no pause)
        Backend->>Backend: writeFullContent + humanization
        Backend->>Backend: identifyImageNeeds + generateImages
        Backend->>DB: status → ready
    end

    Note over Editor: Editor unlocked, content regenerated
```

### Key Differences from Initial Creation

| Aspect | Initial Creation | Regeneration |
|--------|-----------------|--------------|
| Research | Runs (Tavily) | Skipped (reuses existing) |
| Skeleton approval | Pauses for user review | Runs straight through |
| Confirmation | None | AlertDialog modal |
| Failure rollback | → last stable status | → original status (ready/published) |

---

## Error Paths

| Error | When | Recovery |
|-------|------|----------|
| Research fails | Tavily API error during research | Retry via chat message or manual research entry |
| Pipeline timeout | Any processing step exceeds timeout | Artifact returns to last stable status |
| Foundations rejected | User wants to restart | Return to draft, re-trigger pipeline |
| Image generation fails | DALL-E 3 / Gemini error | Retry or skip images (content still generated) |
| Content too short | AI generates insufficient content | Edit manually or re-trigger writing via chat |

---

## Polling Behavior

| Status | Polling | Interval | Hook |
|--------|---------|----------|------|
| `draft` | Only if `enableDraftPolling=true` | 2s | useArtifact |
| `interviewing` | Yes | 2s | useArtifact |
| `research` | Yes | 2s | useArtifact + useResearch |
| `foundations` | Yes | 2s | useArtifact + useWritingCharacteristics |
| `skeleton` | **No** (pipeline paused) | — | — |
| `foundations_approval` | **No** (waiting for user) | — | — |
| `writing` | Yes | 2s | useArtifact |
| `humanity_checking` | Yes | 2s | useArtifact |
| `creating_visuals` | Yes | 2s | useArtifact |
| `ready` | No | — | — |
| `published` | No | — | — |

---

## Related Documentation

- [STATUS_VALUES_REFERENCE.md](../artifact-statuses/STATUS_VALUES_REFERENCE.md) - Status reference
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - Pipeline details
- [artifact-page.md](../screens/artifact-page.md) - ArtifactPage screen doc
- [reference-picker.md](../features/reference-picker.md) - Reference picker feature doc
