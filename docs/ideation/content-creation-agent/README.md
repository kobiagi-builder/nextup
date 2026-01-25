# Content Creation Agent - Ideation Package

**Project**: Content Creation Agent (AI-Assisted Content Workflow)
**Status**: PRDs Complete - Ready for Spec Generation
**Created**: 2026-01-24

---

## Quick Navigation

📄 **[Contract](contract.md)** - Approved project contract (problem, goals, scope, constraints)

### Phased PRDs (Product Requirements Documents)

1. **[Phase 1: Research & Skeleton](prd-phase-1.md)** - Foundation
   - Research system with intelligent source matching
   - LLM-generated content skeletons
   - UI: Research area + tone selection
   - Status: Ready for Implementation

2. **[Phase 2: Content Writing & Humanity Check](prd-phase-2.md)** - Core Writing
   - Gemini integration for text generation
   - Humanity check (remove AI patterns)
   - Tone application
   - Status: Ready for Implementation

3. **[Phase 3: Graphics & Completion](prd-phase-3.md)** - Visual Content
   - Placeholder-first image workflow
   - Gemini Nano Banana integration
   - Completion notification
   - Status: Ready for Implementation

4. **[Phase 4: Tone Enhancement](prd-phase-4.md)** - Future
   - Custom tone learning from examples
   - Multi-tone blending
   - Default tone library
   - Status: Future Enhancement

---

## Implementation Roadmap

### MVP Scope (Phases 1-3)

**Timeline Estimate**: 8-12 weeks

**Phase 1** (3-4 weeks):
- Week 1-2: Research system + backend tools
- Week 3: Skeleton generation + UI
- Week 4: Testing + refinement

**Phase 2** (2-3 weeks):
- Week 1: Gemini integration + content writing
- Week 2: Humanity check implementation
- Week 3: Testing + tone application

**Phase 3** (3-4 weeks):
- Week 1-2: Image needs identification + placeholder workflow
- Week 3: Gemini Nano Banana setup + final generation
- Week 4: Testing + notification system

**Phase 4** (Future - 4-6 weeks when prioritized)

---

## Key Features Summary

### Research Phase
- ✅ Intelligent source matching (Reddit, LinkedIn, Quora, Medium, Substack)
- ✅ Deep research with source tracking
- ✅ Cooperative error handling (retry/manual entry)
- ✅ Research area in UI

### Content Creation
- ✅ LLM-generated skeletons (not templates)
- ✅ Section-by-section content writing
- ✅ 8 tone options (MVP) + custom tones (Phase 4)
- ✅ Humanity check (24 AI pattern removal)
- ✅ Real-time streaming to editor

### Graphics
- ✅ Automatic image needs identification
- ✅ Placeholder-first approval workflow
- ✅ Gemini Nano Banana for final generation
- ✅ Regeneration capability

### User Experience
- ✅ Two-button flow: "Add and Edit" vs "Create Content"
- ✅ Research displayed alongside editor
- ✅ AI Assistant modal from artifact page
- ✅ Progress indicators at each phase
- ✅ Approval gates (skeleton, content, placeholders)

---

## Technical Stack

### AI Models
- **Claude**: Reasoning, research, skeleton generation, humanity check
- **Gemini**: Text writing (content generation)
- **Gemini Nano Banana**: Image generation

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- TypeScript
- AI SDK integrations

### Frontend
- React 19
- TypeScript
- Vite
- shadcn/ui + Tailwind CSS
- TanStack Query + Zustand

---

## Database Schema Changes

### New Tables

**artifact_research**:
```sql
CREATE TABLE artifact_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  excerpt TEXT NOT NULL,
  relevance_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**user_tone_profiles** (Phase 4):
```sql
CREATE TABLE user_tone_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tone_profile JSONB NOT NULL,
  example_count INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### New Artifact Statuses

**Phase 1**:
- `researching`
- `skeleton_ready`
- `skeleton_approved`

**Phase 2**:
- `writing`
- `humanity_checking`
- `review_ready`
- `content_approved`

**Phase 3**:
- `identifying_images`
- `generating_placeholders`
- `placeholder_review`
- `generating_images`
- `complete`

---

## User Stories Count

### Phase 1: 11 user stories
- Epic 1: Content Creation Initiation (2 stories)
- Epic 2: Research Phase (3 stories)
- Epic 3: Skeleton Generation (3 stories)
- Epic 4: Tone of Voice Selection (1 story)
- Epic 5: UI Refinement (2 stories)

### Phase 2: 7 user stories
- Epic 1: Content Writing Trigger (1 story)
- Epic 2: Content Generation (2 stories)
- Epic 3: Tone Application (1 story)
- Epic 4: Humanity Check (2 stories)
- Epic 5: Content Approval (1 story)

### Phase 3: 7 user stories
- Epic 1: Image Needs Identification (1 story)
- Epic 2: Placeholder Image Generation (2 stories)
- Epic 3: Final Image Generation (2 stories)
- Epic 4: Completion & Notification (2 stories)

### Phase 4: 7 user stories
- Epic 1: Custom Tone Examples (2 stories)
- Epic 2: Tone Learning & Analysis (2 stories)
- Epic 3: Default Tone Example Library (2 stories)
- Epic 4: Voice Matching Quality (1 story)

**Total: 32 user stories across 4 phases**

---

## Success Metrics

### Phase 1
- Research Success Rate: > 90%
- Skeleton Approval Rate: > 70%
- Time to Skeleton Approval: < 5 minutes

### Phase 2
- Content Quality Score: > 4/5
- Humanity Check Effectiveness: > 80%
- Time to Content Approval: < 10 minutes

### Phase 3
- Image Generation Success Rate: > 90%
- Placeholder Approval Rate: > 70%
- Time to Completion: < 5 minutes

### Phase 4
- Custom Tone Adoption: > 30%
- Tone Match Score: > 80%
- User Satisfaction: > 4.5/5

---

## Next Steps

1. **Review PRDs**: Approve each phase's requirements
2. **Generate Specs**: Create implementation specs for Phase 1
3. **Begin Development**: Start with Phase 1 implementation
4. **Iterate**: Complete Phase 1 → Review → Phase 2 → etc.

---

## Documentation Structure

```
docs/ideation/content-creation-agent/
├── README.md                    # This file (index + summary)
├── contract.md                  # Approved project contract
├── prd-phase-1.md              # Phase 1 PRD (Research & Skeleton)
├── prd-phase-2.md              # Phase 2 PRD (Content Writing)
├── prd-phase-3.md              # Phase 3 PRD (Graphics)
├── prd-phase-4.md              # Phase 4 PRD (Tone Enhancement)
└── specs/                       # Implementation specs (to be generated)
    ├── spec-phase-1.md
    ├── spec-phase-2.md
    ├── spec-phase-3.md
    └── spec-phase-4.md
```

---

## Questions or Feedback?

This ideation package is now complete with:
- ✅ Approved contract
- ✅ 4 phased PRDs with 32 user stories
- ✅ Database schema changes defined
- ✅ Technical stack specified
- ✅ Success metrics established

Ready to generate implementation specs for each phase when you approve the PRDs.
