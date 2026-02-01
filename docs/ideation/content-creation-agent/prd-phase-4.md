# PRD: Phase 4 - Writing Quality Enhancement

**Phase**: 4 of 4
**Status**: Ready for Implementation
**Dependencies**: Phase 1-3 (complete content creation pipeline functional)
**Deliverables**: Writing characteristics system, foundations workflow, example library, improved content quality

---

## Phase Overview

Phase 4 significantly improves content writing quality by introducing a writing characteristics analysis system and a structured "foundations" workflow that pauses for user approval before content writing begins. The system analyzes writing examples, artifact context, and user context to derive a comprehensive set of characteristics that guide skeleton generation, content writing, and image creation.

**Why Phase 4 Last**:
- Requires existing content pipeline to validate improvements
- Builds on Phase 1-3 infrastructure (research, skeleton, writing, images)
- Provides significant quality differentiation
- Enables AI to match user's unique voice and style

---

## Key Changes Summary

### Status Flow Changes

Phase 4 introduces two new statuses and renames user-facing labels for better UX:

| Internal Value (TypeScript) | Database Value | User-Facing Label | Editor State | Change |
|----------------------------|----------------|--------------------|-------------|--------|
| `draft` | `draft` | **Draft** | Unlocked | - |
| `research` | `research` | **Creating the Foundations** | Locked | Label changed |
| `foundations` | `foundations` | **Creating the Foundations** | Locked | **NEW** |
| `skeleton` | `skeleton` | **Creating the Foundations** | Locked | Label changed |
| `foundations_approval` | `foundations_approval` | **Foundations Approval** | Unlocked | **NEW** |
| `writing` | `writing` | **Creating Content** | Locked | - |
| `creating_visuals` | `creating_visuals` | **Creating Content** | Locked | - |
| `ready` | `ready` | **Content Ready** | Unlocked | - |
| `published` | `published` | **Published** | Unlocked | - |

### New Workflow Pause Point

**Before Phase 4**: `research` → `skeleton` → `writing` (no pause, automatic flow)

**After Phase 4**: `research` → `foundations` → `skeleton` → `foundations_approval` (PAUSE) → `writing`

The pause at `foundations_approval` allows users to:
- Review the skeleton structure
- Review the writing characteristics derived from analysis
- Make adjustments before content writing begins
- Approve the foundations before AI writes

### Agent Notification & Approval Flow

**Critical**: When the skeleton is ready, the agent MUST:
1. Notify the user that foundations are ready for review
2. Explain what was created (skeleton structure + writing characteristics)
3. Explicitly ask the user to review and approve before proceeding
4. Wait for user to click "Foundations Approved" button before continuing

---

## User Stories

### Epic 1: Writing Characteristics System

**US-4.1**: As a user, I want the AI to analyze my writing examples and artifact context to derive specific writing characteristics so the generated content matches my style and purpose.

**Acceptance Criteria**:
- Writing characteristics derived from three sources:
  - **Writing examples**: User-provided examples of their writing style
  - **Artifact context**: The artifact type, content, purpose, and description
  - **User context**: Brand values, preferences, and profile settings
- Agent uses a dedicated tool to analyze and decide on characteristics
- Characteristics stored in artifact metadata (`writing_characteristics` field)
- Characteristics visible in the Foundations UI section
- Characteristics used as input for skeleton, writing, and image generation

**US-4.2**: As a user, I want to upload writing examples so the AI can learn my unique voice and style.

**Acceptance Criteria**:
- "Tone Settings" page added to user profile (settings area)
- User can upload writing examples:
  - Paste text directly (min 500 words)
  - Upload file (.txt, .md, .docx)
  - Import from existing artifacts (select from dropdown)
- Minimum 3 examples required for custom style analysis
- Maximum 10 examples stored per user
- Examples analyzed and stored with metadata:
  - Word count
  - Detected characteristics (tone, voice, pacing, etc.)
  - Source reference

---

### Epic 2: Writing Characteristics Analysis

**US-4.3**: As a user, I want the AI to automatically determine the right writing characteristics for each artifact based on multiple sources.

**Acceptance Criteria**:
- Agent tool: `analyzeWritingCharacteristics`
- Tool analyzes and outputs characteristics across all dimensions
- Sources per characteristic:
  - **From Artifact**: Audience level, Reader persona, Goal/outcome, Depth, Length, Originality level, Use of visuals
  - **From Writing Examples**: Tone, Voice, Point of view, Pacing, Rhetorical style, SEO intent, CTA style, Sensitivity/risk posture
  - **From Mix (Artifact + Examples)**: Structure, Evidence style, Specificity, Actionability, Brand alignment
- Characteristics output as structured JSON
- Analysis runs during `foundations` status
- Results stored in `artifact_writing_characteristics` table

---

### Epic 3: Foundations Workflow & Agent Notification

**US-4.4**: As a user, I want the workflow to pause after skeleton generation and the agent to notify me that foundations are ready for approval.

**Acceptance Criteria**:
- New status `foundations_approval` introduced
- Workflow pauses at `foundations_approval` (user action required to proceed)
- **Agent sends a chat message** when skeleton is ready:
  - Notifies user that foundations are complete
  - Summarizes what was created (skeleton sections, key characteristics)
  - Explicitly asks user to review and approve
  - Example message: "I've completed the foundations for your article. I've created a skeleton with X sections and determined your writing style characteristics. Please review the Foundations section below and click 'Foundations Approved' when you're ready for me to start writing the content."
- Agent WAITS for user approval before proceeding to writing
- Agent does NOT automatically continue to writing phase

**US-4.5**: As a user, I want a prominent "Foundations Approved" button so I can clearly signal that I'm ready for the AI to proceed with writing.

**Acceptance Criteria**:
- **"Foundations Approved" button** prominently displayed in Foundations section
- Button styling: Primary/accent color, large, clearly visible (strong CTA)
- Button only visible when status is `foundations_approval`
- Button disabled during other statuses
- Clicking button:
  1. Changes artifact status from `foundations_approval` → `writing`
  2. Triggers agent to continue with content writing phase
  3. Shows loading state: "Starting content writing..."
  4. Locks the Foundations section (no more edits)
- Button text options considered:
  - ✅ "Foundations Approved" (selected)
  - Alternative: "Approve & Start Writing"
  - Alternative: "Continue to Writing"

**US-4.6**: As a user, I want to see a "Foundations" section in the UI that shows the skeleton and writing characteristics so I understand the content structure before writing begins.

**Acceptance Criteria**:
- New "Foundations" section added between Research and Content sections
- Section name: "Foundations"
- Expand/collapse behavior (same pattern as Research section)
- Expanded by default when status is `skeleton` or `foundations_approval`
- Collapsed by default in all other statuses
- Foundations section displays:
  - **Writing characteristics** (formatted display with categories)
  - **Skeleton content** (TipTap editor, same as Content section)
  - **"Foundations Approved" button** (strong CTA at bottom of section)
- TipTap component allows editing during `foundations_approval` status
- Section header shows status indicator (e.g., "Ready for Review" badge)

---

### Epic 4: Default Tone Example Library

**US-4.7**: As a new user without custom examples, I want the AI to use sensible defaults for writing characteristics so I can still get quality content.

**Acceptance Criteria**:
- System provides default characteristics when no user examples exist
- Defaults vary by artifact type:
  - **Blog**: Professional tone, long-form, narrative structure
  - **Social Post**: Casual tone, punchy pacing, short length
  - **Showcase**: Professional tone, deep-dive depth, case study structure
- Defaults can be overridden by user-uploaded examples
- User notified: "Using default style. Upload examples to customize."

**US-4.8**: As a user, I want to see example content for each preset tone so I understand what each tone sounds like.

**Acceptance Criteria**:
- Tone selector shows "View Example" link for each option
- Clicking "View Example" opens modal with:
  - Sample paragraph written in that tone
  - Key characteristics explained
  - Best use cases
- Examples cover common tones (Formal, Casual, Professional, etc.)

---

## Writing Characteristics Taxonomy

### Flexible Characteristic System

**IMPORTANT**: The characteristics listed below are **examples, not a strict enumeration**. The agent tool has full flexibility to:
- Expand beyond the example options to accurately match the writing style
- Combine multiple values when appropriate (e.g., "Warm but professional")
- Create custom descriptors that better capture the nuance (e.g., "Conversational with technical precision")
- Identify additional characteristics not listed here if they would optimize writing quality
- Use gradients/spectrums rather than discrete categories when more accurate

The goal is to **accurately capture the optimal writing style**, not to fit into predefined boxes.

### Characteristic Categories

The agent analyzes and decides on characteristics using the specified source. Example values are provided for guidance, but the agent should determine the most accurate description.

#### Characteristics Derived from Artifact Context

| Characteristic | Example Options (not exhaustive) | Description |
|---------------|----------------------------------|-------------|
| **Audience Level** | Beginner, Intermediate, Expert, Mixed, Technical-but-accessible | Technical sophistication expected from reader |
| **Reader Persona** | Founder, PM, Engineer, Marketer, Executive, Student, General, etc. | Primary reader archetype |
| **Goal/Outcome** | Inform, Persuade, Teach, Convert, Entertain, Inspire, Build trust, etc. | What the content should achieve |
| **Depth** | High-level overview, Deep dive, Everything to execute, Balanced, etc. | Level of detail and comprehensiveness |
| **Length** | Ultra short (10-100), Very short (100-300), Short (300-500), Medium (500-1000), Long (1000-2000), Extra long (2000+) | Target word count range |
| **Originality Level** | Standard best practices, Fresh angle, Novel framework, Contrarian, etc. | How unique the perspective should be |
| **Use of Visuals** | Tables, Diagrams, Bullet maps, Boxed callouts, Minimal, Heavy, etc. | Text-based visual elements to include |

#### Characteristics Derived from Writing Examples

| Characteristic | Example Options (not exhaustive) | Description |
|---------------|----------------------------------|-------------|
| **Tone** | Formal, Casual, Blunt, Warm, Witty, Skeptical, Optimistic, Urgent, Empathetic, Authoritative, Playful, etc. | Emotional register and attitude |
| **Voice** | First-person singular (I), First-person plural (we), Second-person (you), Third-person neutral, Mixed, etc. | Narrative perspective |
| **Point of View** | Contrarian take, Balanced analysis, Strong opinion, Exploratory, Devil's advocate, etc. | Stance on the topic |
| **Pacing** | Punchy/scannable, Slow/reflective, Dense/academic, Varied, Building momentum, etc. | Reading speed and information density |
| **Rhetorical Style** | Questions, Metaphors, Humor, Urgency, Myth vs reality, Direct, Storytelling, Socratic, etc. | Persuasion techniques used |
| **SEO Intent** | Informational, Commercial, Navigational, None, Snippet-optimized, Long-tail focused, etc. | Search optimization focus |
| **CTA Style** | None, Soft (comment/share), Medium (download), Hard (buy/book call), Embedded throughout, etc. | Call-to-action intensity |
| **Sensitivity/Risk Posture** | Cautious (balanced claims), Bold (strong claims), Compliance-safe, Provocative, etc. | Risk tolerance in statements |

#### Characteristics Derived from Mix (Artifact + Writing Examples)

| Characteristic | Example Options (not exhaustive) | Description |
|---------------|----------------------------------|-------------|
| **Structure** | Narrative story, Checklist, Step-by-step tutorial, FAQ, Framework, Listicle, Problem-solution, Comparison, etc. | Content organization pattern |
| **Evidence Style** | Anecdotes, Data-driven, Research-cited, Expert quotes, Case studies, Personal experience, Analogies, etc. | Type of supporting evidence |
| **Specificity** | Abstract principles, Concrete examples, Templates/scripts, Code samples, Screenshots, etc. | Level of actionable detail |
| **Actionability** | Thought piece, Tactical guide, Hybrid, Reference material, Quick-start, etc. | How immediately actionable |
| **Brand Alignment** | Custom assessment based on brand values, language preferences, taboo topics | Alignment with user's brand |

### Agent Flexibility Guidelines

The agent should:

1. **Analyze holistically** - Consider the full context before deciding on characteristics
2. **Be specific** - "Warm but direct, like a mentor giving tough love" is better than just "Warm"
3. **Combine when needed** - Multiple values can apply (e.g., Tone: "Professional with moments of dry humor")
4. **Create custom descriptors** - If no example fits, create an accurate description
5. **Explain reasoning** - Provide confidence scores and reasoning for each characteristic
6. **Optimize for quality** - The goal is the best possible writing, not fitting predefined categories

---

## Functional Requirements

### FR-1: Agent Notification on Foundations Ready

**Requirement**: Agent must notify user and wait for approval when foundations are complete.

**Implementation**:
1. When skeleton generation completes:
   - Status changes to `foundations_approval`
   - Agent sends chat message to user

2. Agent message template:
   ```
   ✅ **Foundations Complete!**

   I've finished creating the foundations for your {artifact_type}:

   **Skeleton Structure:**
   - {number_of_sections} main sections
   - {section_names_summary}

   **Writing Style:**
   - Tone: {tone}
   - Voice: {voice}
   - Structure: {structure}
   - Length: {length}

   Please review the Foundations section below. You can:
   - Edit the skeleton structure
   - Review the writing characteristics

   When you're satisfied, click **"Foundations Approved"** to start content writing.
   ```

3. Agent behavior:
   - Agent STOPS and WAITS after sending notification
   - Agent does NOT proceed to writing automatically
   - Agent only continues when user clicks "Foundations Approved" button
   - Button click triggers status change and agent resumption

### FR-2: Foundations Approved Button (Strong CTA)

**Requirement**: Prominent button to trigger writing phase continuation.

**Implementation**:
1. Button component: `FoundationsApprovedButton`
   ```tsx
   <Button
     size="lg"
     variant="default"
     className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
     onClick={handleApproveFoundations}
     disabled={status !== 'foundations_approval' || isLoading}
   >
     {isLoading ? (
       <>
         <Loader2 className="mr-2 h-5 w-5 animate-spin" />
         Starting content writing...
       </>
     ) : (
       <>
         <CheckCircle className="mr-2 h-5 w-5" />
         Foundations Approved
       </>
     )}
   </Button>
   ```

2. Button behavior:
   - Located at bottom of Foundations section
   - Full-width for maximum visibility
   - Primary color styling (strong CTA)
   - Icon: Checkmark or similar approval indicator
   - Loading state when clicked
   - Disabled when not in `foundations_approval` status

3. Click handler:
   ```typescript
   const handleApproveFoundations = async () => {
     setIsLoading(true);
     try {
       // 1. Update artifact status
       await updateArtifactStatus(artifactId, 'writing');

       // 2. Trigger agent to continue
       await triggerAgentContinuation(artifactId, 'foundations_approved');

       // 3. Show success toast
       toast.success('Starting content writing...');
     } catch (error) {
       toast.error('Failed to approve foundations');
       setIsLoading(false);
     }
   };
   ```

### FR-3: Writing Characteristics Analysis Tool

**Requirement**: Create an agent tool that analyzes and derives writing characteristics.

**Implementation**:
1. Backend tool: `analyzeWritingCharacteristics`
   - Input: Artifact data, research results, user writing examples, user context
   - Output: Complete characteristics JSON
   - Model: Claude (better for linguistic analysis)

2. Claude prompt structure:
   ```
   You are an expert writing style analyst. Your goal is to derive the OPTIMAL writing characteristics that will produce the highest quality content for this artifact.

   ARTIFACT CONTEXT:
   - Type: {artifact_type}
   - Title: {artifact_title}
   - Description: {artifact_description}
   - Research findings: {research_summary}

   USER WRITING EXAMPLES:
   {examples_text_array}

   USER CONTEXT:
   - Brand values: {brand_values}
   - Language preferences: {language_preferences}
   - Taboo topics: {taboo_topics}

   IMPORTANT: The example options below are GUIDELINES, not strict enumerations.
   You have FULL FLEXIBILITY to:
   - Expand beyond the examples to accurately capture the optimal style
   - Combine multiple values (e.g., "Warm but direct, like a mentor")
   - Create custom descriptors that better capture the nuance
   - Identify additional characteristics if they would improve writing quality
   - Use spectrums/gradients rather than discrete categories when more accurate

   Analyze and determine the optimal value for EACH characteristic below.
   Use the SOURCE guidance to prioritize information:

   ARTIFACT-DERIVED (use artifact context as primary source):
   - audience_level: e.g., Beginner, Intermediate, Expert, Mixed, Technical-but-accessible, etc.
   - reader_persona: e.g., Founder, PM, Engineer, Marketer, Executive, Student, or custom persona
   - goal_outcome: e.g., Inform, Persuade, Teach, Convert, Entertain, Inspire, Build trust, etc.
   - depth: e.g., High-level overview, Deep dive, Everything to execute, Balanced, etc.
   - length: Target word count range (be specific)
   - originality_level: e.g., Standard best practices, Fresh angle, Novel framework, Contrarian, etc.
   - use_of_visuals: e.g., Tables, Diagrams, Bullet maps, Callouts, Minimal, Heavy, etc.

   EXAMPLES-DERIVED (use writing examples as primary source):
   - tone: e.g., Formal, Casual, Warm, Witty, Skeptical, or custom combinations like "Professional with dry humor"
   - voice: e.g., First-person (I), First-person plural (we), Second-person (you), Third-person, Mixed
   - point_of_view: e.g., Contrarian, Balanced, Strong opinion, Exploratory, Devil's advocate, etc.
   - pacing: e.g., Punchy/scannable, Slow/reflective, Dense, Building momentum, Varied, etc.
   - rhetorical_style: e.g., Questions, Metaphors, Humor, Urgency, Storytelling, Socratic, Direct, etc.
   - seo_intent: e.g., Informational, Commercial, Navigational, None, Snippet-optimized, etc.
   - cta_style: e.g., None, Soft, Medium, Hard, Embedded throughout, etc.
   - sensitivity_risk: e.g., Cautious, Bold, Compliance-safe, Provocative, etc.

   MIX-DERIVED (use both artifact and examples):
   - structure: e.g., Narrative, Checklist, Tutorial, FAQ, Framework, Listicle, Problem-solution, etc.
   - evidence_style: e.g., Anecdotes, Data-driven, Research-cited, Expert quotes, Case studies, Personal experience, etc.
   - specificity: e.g., Abstract principles, Concrete examples, Templates/scripts, Code samples, etc.
   - actionability: e.g., Thought piece, Tactical guide, Hybrid, Reference material, etc.
   - brand_alignment: Custom assessment based on provided brand context

   ADDITIONAL CHARACTERISTICS (optional):
   If you identify other characteristics that would significantly improve writing quality for this specific artifact, add them to the output.

   Return JSON with:
   {
     "characteristics": {
       "audience_level": { "value": "...", "confidence": 0.0-1.0, "reasoning": "..." },
       "reader_persona": { "value": "...", "confidence": 0.0-1.0, "reasoning": "..." },
       // ... all characteristics including any additional ones you identify
     },
     "additional_characteristics": {
       // Any characteristics you identified beyond the standard list
       "custom_characteristic_name": { "value": "...", "confidence": 0.0-1.0, "reasoning": "..." }
     },
     "summary": "Brief summary of the writing style profile - be specific and descriptive",
     "recommendations": ["Specific recommendations for optimizing content quality"]
   }
   ```

3. Characteristics storage:
   - New table: `artifact_writing_characteristics`
   - Schema:
     ```sql
     CREATE TABLE artifact_writing_characteristics (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
       characteristics JSONB NOT NULL,
       summary TEXT,
       recommendations JSONB,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW(),
       UNIQUE(artifact_id)
     );
     ```

### FR-4: User Writing Examples Storage

**Requirement**: Store user-provided writing examples for style analysis.

**Implementation**:
1. New table: `user_writing_examples`
   - Schema:
     ```sql
     CREATE TABLE user_writing_examples (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       content TEXT NOT NULL,
       word_count INT NOT NULL,
       source_type TEXT DEFAULT 'manual', -- 'manual', 'file_upload', 'artifact_import'
       source_reference TEXT, -- artifact_id if imported
       analyzed_characteristics JSONB, -- cached analysis results
       status TEXT DEFAULT 'active', -- 'active', 'inactive'
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
     );

     CREATE INDEX idx_user_writing_examples_user_id ON user_writing_examples(user_id);
     ```

2. Example validation:
   - Minimum 500 words per example
   - Maximum 10 examples per user
   - Supported file types: .txt, .md, .docx
   - Strip HTML tags and normalize whitespace

### FR-5: Status Flow Updates

**Requirement**: Update artifact status flow with new statuses and transitions.

**New Statuses**:
- `foundations` - Writing characteristics analysis in progress
- `foundations_approval` - User reviewing foundations (skeleton + characteristics)

**Updated Status Flow**:
```
draft → [User clicks "Create Content"] → research
research → [Research complete] → foundations
foundations → [Characteristics analyzed] → skeleton
skeleton → [Skeleton generated] → foundations_approval
foundations_approval → [User clicks "Foundations Approved"] → writing
writing → [Writing complete] → creating_visuals
creating_visuals → [Images complete] → ready
ready → [User publishes] → published
```

**User-Facing Label Mapping**:
```typescript
const statusLabels: Record<ArtifactStatus, string> = {
  draft: 'Draft',
  research: 'Creating the Foundations',
  foundations: 'Creating the Foundations',
  skeleton: 'Creating the Foundations',
  foundations_approval: 'Foundations Approval',
  writing: 'Creating Content',
  creating_visuals: 'Creating Content',
  ready: 'Content Ready',
  published: 'Published',
};
```

**Editor Lock State**:
```typescript
const isEditorLocked = (status: ArtifactStatus): boolean => {
  return ['research', 'foundations', 'skeleton', 'writing', 'creating_visuals'].includes(status);
};
```

### FR-6: Foundations UI Section

**Requirement**: Add new UI section to display foundations (characteristics + skeleton + approval button).

**Implementation**:
1. New component: `FoundationsSection`
   - Located between Research section and Content section
   - Collapsible panel (same pattern as `ResearchSection`)
   - Expand/collapse toggle in header

2. Default expansion logic:
   ```typescript
   const isFoundationsExpanded = (status: ArtifactStatus): boolean => {
     return ['skeleton', 'foundations_approval'].includes(status);
   };
   ```

3. Section layout:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ Foundations                              [Ready for Review] │
   │ ▼ (expanded)                                    [Collapse] │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │ WRITING CHARACTERISTICS                                     │
   │ ┌─────────────────────────────────────────────────────────┐│
   │ │ Tone: Professional  │  Voice: First-person             ││
   │ │ Pacing: Punchy      │  Structure: Step-by-step         ││
   │ │ Length: Long        │  Depth: Deep dive                ││
   │ │ ... (expandable for all characteristics)               ││
   │ └─────────────────────────────────────────────────────────┘│
   │                                                             │
   │ SKELETON                                                    │
   │ ┌─────────────────────────────────────────────────────────┐│
   │ │ [TipTap Editor with skeleton content]                  ││
   │ │                                                         ││
   │ │ # Article Title                                        ││
   │ │ ## Section 1: Introduction                             ││
   │ │ [Placeholder for introduction...]                      ││
   │ │ ## Section 2: Main Point                               ││
   │ │ [Placeholder for main content...]                      ││
   │ │ ...                                                    ││
   │ └─────────────────────────────────────────────────────────┘│
   │                                                             │
   │ ┌─────────────────────────────────────────────────────────┐│
   │ │                                                         ││
   │ │     ✓  FOUNDATIONS APPROVED                            ││
   │ │                                                         ││
   │ │     (Large, prominent button - full width)             ││
   │ │                                                         ││
   │ └─────────────────────────────────────────────────────────┘│
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
   ```

4. TipTap integration:
   - Read-only during `skeleton` status (loading)
   - Editable during `foundations_approval` status
   - Uses same TipTap configuration as Content section

### FR-7: Characteristics Integration with Tools

**Requirement**: Pass writing characteristics to skeleton, writing, and image generation tools.

**Implementation**:

1. **Skeleton Generation** (update existing tool):
   ```typescript
   interface SkeletonGenerationInput {
     artifact_type: string;
     research_results: ResearchResult[];
     writing_characteristics: WritingCharacteristics; // NEW
   }
   ```
   - Use characteristics to guide skeleton structure
   - Match structure characteristic (narrative, checklist, FAQ, etc.)
   - Consider depth and length for section count
   - Use use_of_visuals to suggest placeholder locations

2. **Content Writing** (update existing tool):
   ```typescript
   interface ContentWritingInput {
     skeleton: string;
     research_results: ResearchResult[];
     writing_characteristics: WritingCharacteristics; // NEW
   }
   ```
   - Apply tone, voice, pacing from characteristics
   - Match evidence_style for citations
   - Follow cta_style for calls-to-action
   - Respect sensitivity_risk for claim strength

3. **Image Generation** (update existing tool):
   ```typescript
   interface ImageGenerationInput {
     content: string;
     placement_context: string;
     writing_characteristics: WritingCharacteristics; // NEW
   }
   ```
   - Match visual style to tone (formal → clean/professional, casual → friendly/colorful)
   - Consider audience_level for complexity
   - Align with brand_alignment settings

---

## Non-Functional Requirements

### NFR-1: Performance

- Writing characteristics analysis completes in < 45 seconds
- Foundations section loads in < 2 seconds
- Status transitions update UI within 1 second
- Example upload and analysis in < 30 seconds
- "Foundations Approved" button response in < 500ms

### NFR-2: Accuracy

- Characteristics analysis accuracy: > 85% alignment with user intent (measured via feedback)
- Default characteristics quality: > 80% user satisfaction rating
- Characteristics improve writing quality: > 15% improvement in user ratings vs Phase 1-3

### NFR-3: Scalability

- Support up to 10 writing examples per user
- Efficient storage of characteristics (JSONB in PostgreSQL)
- Cache example analysis to avoid redundant processing

---

## Dependencies

### Backend Dependencies
- **New AI Tool**: `analyzeWritingCharacteristics` (Claude)
- **Database Migration**: Add `foundations` and `foundations_approval` statuses to artifact status enum
- **Database Migration**: Add `artifact_writing_characteristics` table
- **Database Migration**: Add `user_writing_examples` table
- **Modified Tools**: Update skeleton, writing, and image generation tools with characteristics input
- **Agent Update**: Add notification message when foundations are ready
- **API Endpoint**: Endpoint to handle "Foundations Approved" action and trigger agent continuation

### Frontend Dependencies
- **New Component**: `FoundationsSection` (collapsible panel with characteristics + skeleton editor + approval button)
- **New Component**: `WritingCharacteristicsDisplay` (formatted characteristics view)
- **New Component**: `FoundationsApprovedButton` (strong CTA button)
- **New Component**: `WritingExamplesUpload` (paste/upload/import examples)
- **New Page**: "Writing Style" settings page (user profile section)
- **Modified Component**: `ArtifactPage` (add FoundationsSection between Research and Content)
- **Modified Component**: Status display labels (map new statuses to user-facing labels)
- **New Hook**: `useWritingExamples` (CRUD operations on examples)
- **New Hook**: `useWritingCharacteristics` (fetch characteristics for artifact)
- **Modified Types**: Add new statuses to `ArtifactStatus` enum

### Agent Prompt Updates
- Update content creation agent prompt to include foundations workflow
- Add agent message when foundations are ready (notification + approval request)
- Add logic for agent to WAIT for user approval before continuing
- Update tool calls to pass characteristics to downstream tools
- Add characteristics analysis step after research

---

## Database Migrations Required

### Migration 1: Add New Statuses
```sql
-- Add new artifact statuses
ALTER TYPE artifact_status ADD VALUE 'foundations';
ALTER TYPE artifact_status ADD VALUE 'foundations_approval';
```

### Migration 2: Artifact Writing Characteristics Table
```sql
CREATE TABLE artifact_writing_characteristics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  characteristics JSONB NOT NULL,
  summary TEXT,
  recommendations JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(artifact_id)
);

CREATE INDEX idx_artifact_writing_characteristics_artifact_id
  ON artifact_writing_characteristics(artifact_id);
```

### Migration 3: User Writing Examples Table
```sql
CREATE TABLE user_writing_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INT NOT NULL,
  source_type TEXT DEFAULT 'manual',
  source_reference TEXT,
  analyzed_characteristics JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_writing_examples_user_id ON user_writing_examples(user_id);
```

---

## Code Updates Required

### Backend Updates

1. **Artifact Status Enum** (`backend/src/types/artifact.ts`):
   - Add `foundations` and `foundations_approval` to status enum

2. **Artifact Service** (`backend/src/services/ArtifactService.ts`):
   - Update status transition validation
   - Add foundations workflow logic

3. **Content Creation Agent** (`backend/src/services/agents/ContentCreationAgent.ts`):
   - Add `analyzeWritingCharacteristics` tool
   - Update workflow to include foundations step
   - **Add notification message when foundations are ready**
   - **Add logic to WAIT for user approval before writing**
   - Pass characteristics to downstream tools

4. **Agent Continuation Endpoint** (`backend/src/controllers/...`):
   - New endpoint: `POST /api/artifact/:id/approve-foundations`
   - Triggers agent to continue from `foundations_approval` to `writing`

5. **Skeleton Generation Tool** (`backend/src/services/tools/...`):
   - Accept characteristics parameter
   - Use characteristics in prompt

6. **Content Writing Tool** (`backend/src/services/tools/...`):
   - Accept characteristics parameter
   - Apply characteristics to writing prompt

7. **Image Generation Tool** (`backend/src/services/tools/...`):
   - Accept characteristics parameter
   - Style images based on characteristics

### Frontend Updates

1. **Artifact Status Types** (`frontend/src/types/artifact.ts`):
   - Add new statuses
   - Add status label mapping
   - Add editor lock state logic

2. **Artifact Page** (`frontend/src/features/portfolio/components/artifact/ArtifactPage.tsx`):
   - Add FoundationsSection component
   - Update layout order: Research → Foundations → Content

3. **Foundations Section** (NEW):
   - Create `FoundationsSection.tsx`
   - Create `WritingCharacteristicsDisplay.tsx`
   - Create `FoundationsApprovedButton.tsx`
   - Integrate TipTap for skeleton editing

4. **Settings Page** (NEW or MODIFIED):
   - Add "Writing Style" section
   - Add `WritingExamplesUpload.tsx`

5. **Status Display** (`frontend/src/components/...`):
   - Update status badge labels
   - Handle new statuses in UI

---

## Acceptance Criteria (Phase 4 Complete)

Phase 4 is complete when:

- New statuses (`foundations`, `foundations_approval`) added to database and code
- User-facing status labels updated (research/foundations/skeleton → "Creating the Foundations")
- Workflow pauses at `foundations_approval` for user review
- **Agent sends notification message when foundations are ready**
- **Agent waits for user approval before proceeding to writing**
- **"Foundations Approved" button is prominent and functional**
- Clicking "Foundations Approved" triggers agent continuation to writing phase
- Foundations UI section displays between Research and Content
- Foundations section expands/collapses correctly based on status
- Writing characteristics analysis tool implemented
- Characteristics stored and displayed in Foundations section
- User can upload writing examples (min 3, max 10)
- Writing examples page accessible in settings
- Characteristics passed to skeleton, writing, and image generation tools
- Default characteristics work when no user examples exist
- All database migrations applied successfully
- All artifact types (blog, social_post, showcase) supported

---

## Out of Scope (Phase 4)

- Machine learning model training (use LLM analysis instead)
- Real-time characteristic adjustment during writing
- Sharing custom styles between users
- Multi-language style analysis
- A/B testing of content variations

---

## Testing Requirements

### Unit Tests
- Writing characteristics analysis output validation
- Status transition rules (including new statuses)
- Characteristics JSON schema validation
- Example upload validation (word count, file type)
- Foundations approval button state logic

### Integration Tests
- End-to-end: Research → Foundations → Skeleton → Approval → Writing with characteristics
- Agent notification sent when foundations ready
- Agent waits for approval before continuing
- "Foundations Approved" button triggers status change and agent continuation
- Characteristics passed correctly to downstream tools
- User examples impact characteristics analysis
- Default characteristics when no examples exist

### E2E Tests (Playwright)
- User uploads writing examples
- Foundations section appears after research
- Agent message appears when foundations are ready
- Skeleton displayed in Foundations section
- Characteristics displayed correctly
- "Foundations Approved" button is visible and clickable
- User approves foundations
- Agent continues to writing phase after approval
- Content reflects characteristics (tone, structure, etc.)

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Characteristics analysis inaccurate | High | Prompt engineering iteration, allow user to override characteristics, confidence scores |
| New workflow pause frustrates users | Medium | Clear UX explaining the pause benefit, prominent notification from agent |
| Users miss the approval button | Medium | Strong CTA styling, agent message directing to button, email notification option |
| Too many characteristics overwhelms users | Medium | Group characteristics by category, show summary first with expand for details |
| Example quality impacts analysis | Low | Minimum word count, quality guidance, allow re-analysis |

---

## Success Metrics

- **Characteristics Accuracy**: > 85% user agreement with derived characteristics
- **Writing Quality Improvement**: > 20% improvement in user ratings vs no characteristics
- **Foundations Approval Rate**: > 80% of users approve without major changes
- **Approval Button Click Rate**: > 95% of users who reach `foundations_approval` click the button
- **Example Upload Rate**: > 40% of users upload at least 1 writing example
- **Time to Approval**: < 2 minutes from foundations ready to approval

---

## Future Enhancements (Beyond Phase 4)

- **Voice Library**: Public writing style profiles shared by users
- **Industry-Specific Styles**: Pre-built characteristics for industries (legal, medical, tech, marketing)
- **A/B Style Testing**: Generate content with different characteristics, let user choose
- **Real-Time Adjustment**: Sliders to adjust characteristics during content editing
- **Tone Blending**: Mix characteristics from multiple examples (70/30 blend)
- **Incremental Learning**: System learns from approved artifacts to improve future analysis

---

Phase 4 completes the Content Creation Agent with a comprehensive writing characteristics system that significantly improves content quality by understanding and matching user's unique style and purpose. The foundations workflow ensures users have control over the content direction before writing begins.
