# PRD: Phase 4 - Tone Enhancement (Future)

**Phase**: 4 of 4
**Status**: Future Enhancement
**Dependencies**: Phase 1-3 (complete content creation pipeline functional)
**Deliverables**: Custom tone learning, example library, voice matching

---

## Phase Overview

Phase 4 enhances tone matching beyond the MVP dropdown by analyzing user-provided writing examples, building a default tone example library, and enabling AI to match the user's unique voice and style.

**Why Phase 4 Last**:
- Requires existing content pipeline to validate improvements
- Non-critical enhancement (MVP tones sufficient for launch)
- Provides differentiation and advanced customization
- Enables continuous learning from user's own content

---

## User Stories

### Epic 1: Custom Tone Examples

**US-4.1**: As a user, I want to provide examples of my own writing so the AI can learn my unique voice and style.

**Acceptance Criteria**:
- ✅ "Tone Settings" page added to user profile
- ✅ User can upload writing examples:
  - Paste text directly (min 500 words)
  - Upload file (.txt, .md, .docx)
  - Import from existing artifacts (select from dropdown)
- ✅ Minimum 3 examples required for custom tone
- ✅ Maximum 10 examples per custom tone
- ✅ Examples analyzed and stored with metadata:
  - Word count
  - Sentence length average
  - Vocabulary complexity score
  - Common phrases/patterns
  - Detected tone characteristics

**US-4.2**: As a user, I want to name and manage multiple custom tones so I can switch between different writing styles for different purposes.

**Acceptance Criteria**:
- ✅ User can create multiple custom tones (max 5)
- ✅ Each custom tone has:
  - Name (user-defined, e.g., "My LinkedIn Voice")
  - Description (optional)
  - Writing examples (3-10)
  - Status: Active or Inactive
- ✅ User can edit custom tone (add/remove examples, rename)
- ✅ User can delete custom tone
- ✅ Custom tones appear in artifact editor tone dropdown alongside preset tones

---

### Epic 2: Tone Learning & Analysis

**US-4.3**: As a user, I want the AI to analyze my writing examples and extract style patterns so it can replicate my voice accurately.

**Acceptance Criteria**:
- ✅ Tone analysis runs when user saves examples
- ✅ Analysis extracts:
  - **Sentence structure**: Average length, complexity, variation patterns
  - **Vocabulary**: Common words, unique phrases, jargon usage
  - **Voice**: First-person usage, passive vs active, question frequency
  - **Formatting**: Paragraph length, bullet point usage, heading style
  - **Personality markers**: Humor level, formality score, enthusiasm indicators
- ✅ Analysis stored as "tone profile" (JSON schema)
- ✅ Tone profile used to generate custom prompt modifiers
- ✅ Analysis completes in < 60 seconds
- ✅ User shown summary of detected characteristics (optional review UI)

**US-4.4**: As a user, I want the AI to improve its understanding of my tone over time by learning from my approved artifacts.

**Acceptance Criteria**:
- ✅ After user approves/publishes artifact, system asks: "Add this to your tone examples?" (opt-in)
- ✅ Approved artifacts automatically added to tone example pool (max 10 retained)
- ✅ Oldest examples removed when limit reached (FIFO)
- ✅ Tone profile updated with each new example (incremental learning)
- ✅ User notified: "Your tone has been updated based on recent writing."

---

### Epic 3: Default Tone Example Library

**US-4.5**: As a new user, I want to see example content for each preset tone so I understand what each tone sounds like before selecting it.

**Acceptance Criteria**:
- ✅ Tone dropdown shows "View Example" link for each preset tone
- ✅ Clicking "View Example" opens modal with:
  - Sample paragraph written in that tone
  - Key characteristics explained
  - Best use cases (e.g., "Formal: Academic papers, white papers, research reports")
- ✅ Examples cover all 8 preset tones (Formal, Casual, Professional, etc.)
- ✅ Examples written by expert copywriters and reviewed for quality

**US-4.6**: As a user, I want to mix tone characteristics (e.g., "Professional but friendly") so I can fine-tune the voice.

**Acceptance Criteria**:
- ✅ Tone dropdown supports multi-select (max 2 tones)
- ✅ Selected tones blended in prompt (e.g., "Professional tone with friendly elements")
- ✅ Blending strategy:
  - Primary tone (70% weight)
  - Secondary tone (30% weight)
- ✅ Preview shows how tones will blend (sample sentence)
- ✅ User can adjust blend ratio (slider: 30/70, 50/50, 70/30)

---

### Epic 4: Voice Matching Quality

**US-4.7**: As a user, I want to compare AI-generated content against my tone examples so I can verify quality and approve/adjust.

**Acceptance Criteria**:
- ✅ After content writing (Phase 2), "Tone Match Score" shown (0-100%)
- ✅ Score calculated by comparing:
  - Sentence structure similarity
  - Vocabulary overlap
  - Voice consistency
  - Formatting alignment
- ✅ If score < 70%, warning shown: "Content may not match your tone. Review carefully."
- ✅ User can request "Rewrite to Match Tone Better" (triggers regeneration with stricter tone adherence)
- ✅ Tone match history tracked over time (improves with more examples)

---

## Functional Requirements

### FR-1: Tone Analysis Engine

**Requirement**: Extract style patterns from user-provided writing examples.

**Implementation**:
1. Backend tool: `analyzeToneFromExamples`
   - Input: Array of text examples (min 500 words each)
   - Output: Tone profile (JSON schema)
   - Model: Claude (better for linguistic analysis)

2. Claude prompt structure:
   ```
   You are a writing style analyst. Analyze these writing examples and extract the author's unique voice.

   Examples:
   [Text 1]
   [Text 2]
   [Text 3]

   Extract and return JSON:
   {
     "sentence_structure": {
       "avg_length": number,
       "complexity_score": 0-100,
       "variation_pattern": "high" | "medium" | "low"
     },
     "vocabulary": {
       "common_words": ["word1", "word2", ...],
       "unique_phrases": ["phrase1", "phrase2", ...],
       "jargon_level": "high" | "medium" | "low"
     },
     "voice": {
       "first_person_ratio": 0-100,
       "active_voice_ratio": 0-100,
       "question_frequency": 0-100
     },
     "formatting": {
       "avg_paragraph_length": number,
       "bullet_point_usage": "high" | "medium" | "low",
       "heading_style": "formal" | "casual"
     },
     "personality": {
       "humor_level": 0-100,
       "formality_score": 0-100,
       "enthusiasm_indicators": 0-100
     }
   }
   ```

3. Tone profile storage:
   - New table: `user_tone_profiles`
   - Schema:
     ```sql
     CREATE TABLE user_tone_profiles (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       description TEXT,
       tone_profile JSONB NOT NULL,
       example_count INT DEFAULT 0,
       status TEXT DEFAULT 'active', -- 'active' | 'inactive'
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
     );
     ```

### FR-2: Custom Prompt Modifier Generation

**Requirement**: Convert tone profile into LLM prompt modifiers for content generation.

**Implementation**:
1. Generate custom prompt from tone profile:
   ```typescript
   function generateTonePrompt(profile: ToneProfile): string {
     return `
       Write in this style:
       - Sentence length: ${profile.sentence_structure.avg_length} words average
       - ${profile.voice.first_person_ratio > 50 ? "Use first-person frequently" : "Minimize first-person"}
       - ${profile.voice.active_voice_ratio > 70 ? "Prefer active voice" : "Mix active and passive voice"}
       - Vocabulary: ${profile.vocabulary.jargon_level} jargon level
       - Formality: ${profile.personality.formality_score}/100
       - Humor: ${profile.personality.humor_level > 30 ? "Include light humor" : "Maintain serious tone"}
       - Common phrases to use: ${profile.vocabulary.unique_phrases.join(", ")}
     `
   }
   ```

2. Inject custom prompt into content writing tool (Phase 2):
   - Replace preset tone modifier with custom tone prompt
   - Combine with artifact type requirements
   - Add tone match validation step

### FR-3: Tone Blending Logic

**Requirement**: Support multi-tone selection with blending ratios.

**Implementation**:
1. Blend two tone profiles:
   ```typescript
   function blendToneProfiles(
     primary: ToneProfile,
     secondary: ToneProfile,
     ratio: number // 0.5 = 50/50, 0.7 = 70/30
   ): ToneProfile {
     return {
       sentence_structure: {
         avg_length: weighted_average(primary.sentence_structure.avg_length, secondary.sentence_structure.avg_length, ratio),
         // ... blend other fields
       },
       // ... blend all profile sections
     }
   }
   ```

2. Generate blended prompt:
   - Primary tone characteristics weighted by ratio
   - Secondary tone characteristics weighted by (1 - ratio)
   - Resulting prompt includes both tone elements

### FR-4: Tone Match Scoring

**Requirement**: Calculate similarity score between generated content and tone profile.

**Implementation**:
1. Backend tool: `calculateToneMatchScore`
   - Input: Generated content, tone profile
   - Output: Match score (0-100)
   - Model: Claude (linguistic comparison)

2. Scoring dimensions:
   - Sentence structure similarity (25 points)
   - Vocabulary overlap (25 points)
   - Voice consistency (25 points)
   - Formatting alignment (25 points)

3. Display in UI:
   - Score badge in editor toolbar
   - Green (>80), Yellow (70-80), Red (<70)
   - "Improve Match" button if score < 70

---

## Non-Functional Requirements

### NFR-1: Performance

- Tone analysis completes in < 60 seconds for 3 examples
- Tone profile generation in < 30 seconds
- Tone match scoring in < 10 seconds
- Custom tone learning (incremental update) in < 5 seconds

### NFR-2: Accuracy

- Tone match score accuracy: > 85% correlation with human evaluation
- Tone learning improvement: 10%+ improvement after 5 user-approved artifacts
- Custom tone quality: > 80% user satisfaction rating

### NFR-3: Scalability

- Support up to 5 custom tones per user
- Support up to 10 examples per custom tone
- Efficient storage of tone profiles (JSONB in PostgreSQL)
- Cache tone prompts to avoid regeneration

---

## Dependencies

### Backend Dependencies
- **New AI Tool**: `analyzeToneFromExamples` (Claude)
- **New AI Tool**: `calculateToneMatchScore` (Claude)
- **Database Migration**: Add `user_tone_profiles` table
- **Database Migration**: Add `user_tone_examples` table (store example texts)

### Frontend Dependencies
- **New Page**: Tone Settings (user profile section)
- **New Component**: `ToneExampleUpload` (paste/upload examples)
- **New Component**: `ToneProfileManager` (manage custom tones)
- **New Component**: `ToneBlendControls` (multi-select + blend ratio slider)
- **Modified Component**: `ArtifactEditor` (show tone match score, improve match button)
- **New Hook**: `useToneProfiles` (CRUD operations on custom tones)

---

## Acceptance Criteria (Phase 4 Complete)

Phase 4 is complete when:

- ✅ User can upload writing examples and create custom tones
- ✅ Tone analysis extracts style patterns from examples
- ✅ Custom tones appear in artifact editor tone dropdown
- ✅ User can blend two tones (primary + secondary)
- ✅ Default tone example library available for all preset tones
- ✅ Tone match score displayed after content generation
- ✅ User can improve tone match with one click
- ✅ System learns from approved artifacts (incremental tone update)
- ✅ All database migrations applied successfully

---

## Out of Scope (Phase 4)

- ❌ Machine learning model training (use LLM analysis instead)
- ❌ Real-time tone matching during writing (post-generation only)
- ❌ Tone transfer between users (sharing custom tones)
- ❌ Multi-language tone analysis

---

## Testing Requirements

### Unit Tests
- Tone profile extraction from examples
- Tone blending logic (weighted averages)
- Tone match score calculation
- Custom prompt generation from profile

### Integration Tests
- End-to-end: Upload examples → Analyze → Create custom tone → Use in content generation
- Tone learning from approved artifacts
- Multi-tone blending workflow

### E2E Tests (Playwright)
- User creates custom tone from examples
- User selects custom tone in artifact editor
- Tone match score displayed after generation
- User improves tone match

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tone analysis inaccurate (doesn't capture voice) | High | Prompt engineering iteration, require minimum 3 diverse examples, allow manual profile editing |
| Custom tone slower than preset tones | Medium | Cache tone prompts, optimize prompt length, show progress indicators |
| User uploads low-quality examples | Low | Minimum word count requirement, quality validation, guide users on example selection |

---

## Success Metrics

- **Custom Tone Adoption**: > 30% of active users create at least 1 custom tone
- **Tone Match Score**: Average > 80% for custom tones
- **User Satisfaction**: > 4.5/5 rating on tone matching quality
- **Tone Learning Effectiveness**: 15%+ improvement in match score after 5 approved artifacts

---

## Future Enhancements (Beyond Phase 4)

- **Voice Library**: Public tone profiles shared by users
- **Industry-Specific Tones**: Pre-built tones for specific industries (legal, medical, tech, marketing)
- **A/B Tone Testing**: Generate content in multiple tones, let user choose best
- **Real-Time Tone Adjustment**: Slider to adjust tone during content editing

Phase 4 completes the Content Creation Agent with advanced tone customization and learning capabilities.
