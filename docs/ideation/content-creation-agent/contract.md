# Content Creation Agent - Contract

**Project**: Content Creation Agent (AI-Assisted Content Workflow)
**Created**: 2026-01-24
**Status**: Contract for Approval (Updated)

---

## Problem Statement

Users currently create artifact content manually without AI assistance, resulting in:
- Time-consuming research and content writing
- Inconsistent content quality and structure
- No guided workflow from idea to finished content
- Manual image sourcing and generation

**Impact**: Users spend significant time on content creation instead of strategic work.

---

## Goals

Build an AI-powered Content Creation Agent that guides users through a complete 7-phase workflow:

1. **Research Phase**: Deep research with source tracking
2. **Skeleton Phase**: Type-specific content structure generation
3. **Approval Phase**: User review and editing of skeleton
4. **Writing Phase**: AI content generation based on approved skeleton
5. **Humanity Check**: Refine content to sound natural
6. **Graphics Phase**: Placeholder generation → user approval → final images
7. **Notification Phase**: Alert user when content is ready

**Primary Outcome**: Users create high-quality, research-backed content with AI assistance in a structured workflow.

---

## Success Criteria

### User Flow Success
- ✅ AI suggestions show "Add and Edit" + "Create Content" buttons
- ✅ Manual artifacts show "Save" + "Create Content" buttons
- ✅ "Create Content" triggers automatic research and workflow start
- ✅ Research results stored with sources/references and displayed in UI

### Content Quality Success
- ✅ Skeleton matches artifact type (blog/social_post/showcase)
- ✅ Skeleton pushed to artifact editor for user editing
- ✅ User can approve skeleton to proceed to content writing
- ✅ Content passes humanity check (sounds natural/human)
- ✅ Images generated with placeholder-first approach (user approves concepts)
- ✅ Tone of voice matches user selection (dropdown per artifact)

### Error Handling Success
- ✅ Research failures notify user with advisory (allow manual input)
- ✅ Agent cooperates with user to resolve issues
- ✅ User can enter research data manually if needed

### UI Success
- ✅ Portfolio/Artifact page updated with Research area (right side)
- ✅ AI Assistant opens as modal/panel (button-triggered)
- ✅ Research results visible with sources and references

---

## Scope

### In Scope (MVP)
- ✅ Content Creation Agent with 7-phase workflow
- ✅ Research storage and display system
- ✅ Type-specific skeleton generation (blog, social_post, showcase) - **LLM-generated, not templates**
- ✅ Skeleton editing in artifact editor
- ✅ Content writing tool integration
- ✅ Humanity check tool integration (using humanizer skill patterns)
- ✅ Image generation with placeholder-first workflow (Gemini Nano Banana)
- ✅ UI refinement: Research area + AI Assistant modal
- ✅ **Tone of Voice & Writing Style** (MVP):
  - Dropdown selection per artifact (formal, casual, professional, conversational, technical, friendly, etc.)
  - Later phase: Based on user-provided examples + default pre-stored examples

### Explicitly Out of Scope
- ❌ Publishing automation (separate feature)
- ❌ Multi-language support (future phase)
- ❌ A/B testing of content variations (future phase)
- ❌ Analytics dashboard for content performance (future phase)
- ❌ Collaborative editing (future phase)
- ❌ Custom tone examples in MVP (later phase)

### Implementation Decisions (Updated)

**Artifact Types**: All three types (blog, social_post, showcase) implemented simultaneously - no sequential priority.

**Research Sources**:
- Deep research LLM best practices investigation required
- Intelligent source matching based on research topic and characteristics
- Primary sources to include:
  - Reddit (community discussions, real experiences)
  - LinkedIn (professional insights, industry trends)
  - Quora (Q&A, expert opinions)
  - Medium (thought leadership, deep-dives)
  - Substack (independent analysis, newsletters)
- Source selection strategy: Match relevant source to research context (e.g., technical topics → Medium/Substack, community sentiment → Reddit, professional insights → LinkedIn)

**Humanity Check Criteria**:
- Use `.claude/skills/humanizer/SKILL.md` patterns (24 patterns based on Wikipedia's "Signs of AI writing")
- Key focus areas:
  - Remove AI vocabulary overuse (crucial, delve, tapestry, landscape, etc.)
  - Eliminate promotional language and inflated symbolism
  - Replace superficial "-ing" analyses with concrete statements
  - Add personality and voice (not just sterile correctness)
  - Vary sentence structure naturally
  - Use specific details over vague claims

**Image Generation Tool**:
- **Gemini Nano Banana** (not DALL-E, Midjourney, or Stable Diffusion)
- Requires configuration from scratch (not currently available)

---

## Key Architectural Decisions

### User Interaction Model
**AI Suggestions**:
- Button 1: "Add and Edit" (save as draft, open editor, no workflow start)
- Button 2: "Create Content" (save + auto-start research workflow)

**Manual Creation**:
- Button 1: "Save" (save as draft, no workflow start)
- Button 2: "Create Content" (save + start research workflow)

### Research Failure Strategy
**Cooperative Error Handling**:
- Notify user about research failure/insufficient results
- Provide advisory on the issue
- Allow manual research data entry
- User decides: retry with refinement, enter manually, or cancel

### Skeleton Generation Strategy
**LLM-Generated (Not Templates)**:
- Skeleton structure created dynamically by LLM for each artifact
- Based on artifact type (blog/social_post/showcase) and research results
- No pre-defined templates - allows flexibility and customization
- Skeleton pushed directly to artifact editor for user editing

### Skeleton Approval Flow
**Editor-Based Approval**:
- Skeleton pushed directly to artifact editor
- User edits skeleton in place (full editing capabilities)
- User clicks "Approve Skeleton" button when ready
- Agent proceeds to content writing phase

### Image Generation Strategy
**Placeholder-First Workflow**:
1. Agent identifies image needs from skeleton
2. Generate placeholder images (concepts/wireframes)
3. Display placeholders in UI for user approval
4. User approves/rejects each placeholder
5. Generate final images for approved concepts (using Gemini Nano Banana)
6. Insert final images into content

---

## Non-Goals

**What we are NOT building**:
- Automated content publishing system
- Multi-user collaboration features
- Content versioning/history
- Custom AI model training
- Content marketplace or sharing

---

## Risks & Assumptions

### Risks
1. **AI Quality**: Generated content may not meet quality standards (mitigated by humanity check + user approval gates)
2. **Research Reliability**: Research may return low-quality or biased sources (mitigated by cooperative error handling + intelligent source matching)
3. **Token Costs**: 7-phase workflow may consume significant tokens per artifact (need cost monitoring across multiple AI models)
4. **User Abandonment**: Users may abandon mid-workflow (need workflow state persistence)
5. **Image Generation Setup**: Gemini Nano Banana requires configuration from scratch (implementation complexity)

### Assumptions (Updated)
1. **AI Models**: Claude for reasoning, Gemini for text writing, Nano Banana for images (NOT OpenAI)
2. Research tool can access web sources reliably (Reddit, LinkedIn, Quora, Medium, Substack)
3. **Image generation tool needs configuration from scratch** (not currently available)
4. Users understand the 7-phase workflow concept
5. **Skeleton is LLM-generated dynamically** (no pre-existing templates)

---

## Constraints

### Technical Constraints (Updated)
- Must integrate with existing artifact system (types: blog, social_post, showcase)
- Must use current backend AI service architecture
- Must work with existing Supabase database schema
- Frontend must maintain React 19 + shadcn/ui patterns
- **New screens and components MUST follow existing UX/UI patterns**
- Must support multiple AI models (Claude, Gemini, Nano Banana)

### Business Constraints
- Must not significantly increase infrastructure costs (monitoring required for multi-model usage)
- Must maintain current authentication and security model
- Must be intuitive enough to require minimal user training

### Timeline Constraints
- MVP should be implementable in phases (incremental value delivery)
- All artifact types delivered simultaneously (no sequential rollout)

---

## Phasing Strategy (Updated)

**Phase 1: Research & Skeleton** (All artifact types)
- Research phase implementation with intelligent source matching
- Deep research LLM best practices investigation
- Skeleton generation for ALL types (blog, social_post, showcase) - LLM-generated
- UI: Research area display
- Skeleton editing and approval flow
- Tone of voice dropdown (MVP: selection only)

**Phase 2: Content Writing & Humanity Check**
- Content writing tool integration (Gemini)
- Humanity check implementation (humanizer skill patterns)
- Tone application based on dropdown selection
- Content preview and approval

**Phase 3: Graphics & Completion**
- Gemini Nano Banana configuration and integration
- Placeholder image generation
- Final image generation workflow
- Notification system

**Phase 4: Tone Enhancement** (Future)
- User-provided example analysis
- Default tone example library
- Tone learning from user's writing samples

---

## Approval Checkpoint

**Does this contract accurately capture your intent?**

Please review the **updated sections**:
1. ✅ **In Scope (MVP)**: Added tone of voice & writing style
2. ✅ **Implementation Decisions**: All artifact types at once, research sources specified, humanity check criteria defined, image tool selected
3. ✅ **Assumptions**: Corrected AI models (Claude/Gemini/Nano Banana)
4. ✅ **Technical Constraints**: Added UX/UI pattern requirement
5. ✅ **Skeleton Generation**: Clarified LLM-generated (not templates)
6. ✅ **Phasing Strategy**: Updated to deliver all types simultaneously

**Required for approval**: Explicit confirmation that this updated contract matches your vision for the Content Creation Agent.
