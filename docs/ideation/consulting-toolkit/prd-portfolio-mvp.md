# PRD: Consulting Toolkit - Portfolio MVP

**Contract**: ./contract.md
**Phase**: MVP
**Focus**: Portfolio Domain with AI Capabilities

## Phase Overview

This MVP delivers the Portfolio domain - the first domain of the Consulting Toolkit vision. The consultant will be able to create three types of artifacts (Social Posts, Blogs, Showcases), collaborate with AI capabilities through conversation, and maintain a consistent writing voice across all content.

The MVP includes **manual user context entry** as a foundation for AI personalization. Users enter information about themselves, their profession, customers, and goals. This context informs all AI capabilities and serves as the precursor to the full User Knowledge system planned for future phases.

The **AI capabilities** (topic research, narrative generation, content creation) are described functionally - the specific implementation (single agent with skills vs. multiple specialized agents) is a technical decision for the spec phase.

After this phase completes, the consultant will have:
- Manual context about themselves that AI can reference
- A unified system for managing all portfolio content
- AI capabilities for topic research, narrative generation, and style-matched content creation
- A topic backlog to capture and develop content ideas
- Writing style examples that AI references for authentic voice
- Foundation architecture for future domains (CRM, Advisor)

## User Stories

### User Context
1. As a consultant, I want to enter information about myself so that AI understands my background and expertise.
2. As a consultant, I want to describe my target customers so that AI can tailor content to my audience.
3. As a consultant, I want to state my goals so that AI suggestions align with my priorities.

### Artifact Management
4. As a consultant, I want to create LinkedIn posts with structured metadata so that I can build thought leadership consistently.
5. As a consultant, I want to create blog articles with audience targeting so that I can publish to Medium/Substack effectively.
6. As a consultant, I want to create showcases of past work so that I can demonstrate expertise to potential clients.
7. As a consultant, I want to view and manage all my content artifacts in one place so that I have a unified portfolio view.

### Topic Management
8. As a consultant, I want to capture content ideas in a topic backlog so that I never lose a good idea.
9. As a consultant, I want to turn a topic into a draft artifact so that I can develop ideas into published content.
10. As a consultant, I want AI to research and suggest topics so that I always have fresh content ideas.

### AI-Assisted Creation
11. As a consultant, I want to chat with AI while creating content so that it feels like collaboration, not automation.
12. As a consultant, I want AI to generate drafts from my topics so that I have a starting point to refine.
13. As a consultant, I want AI to mimic my writing style so that AI-generated content sounds like me.
14. As a consultant, I want to provide writing examples that AI learns from so that my voice is captured accurately.

### Interaction Modes
15. As a consultant, I want to switch between chat and direct editing so that I can work in my preferred mode.
16. As a consultant, I want inline suggestions while editing so that AI helps without interrupting my flow.

### Supporting Features
17. As a consultant, I want to track my skills and expertise so that I can identify relevant content angles.
18. As a consultant, I want light and dark mode so that I can work comfortably in any lighting condition.

## Functional Requirements

### User Context (Manual Entry)

- **FR-1.1**: System shall provide a User Context section for manual entry of user information
- **FR-1.2**: User Context shall include "About Me": bio, background, years of experience, unique value proposition
- **FR-1.3**: User Context shall include "Profession": expertise areas, industries served, methodologies known, certifications
- **FR-1.4**: User Context shall include "Customers": target audience description, ideal client profile, industries they serve
- **FR-1.5**: User Context shall include "Goals": content goals, business goals, current priorities
- **FR-1.6**: System shall store User Context in Supabase
- **FR-1.7**: AI capabilities shall have access to User Context for personalization
- **FR-1.8**: System shall allow editing User Context at any time

### Artifact Management - Core

- **FR-2.1**: System shall support three artifact types: Social Post, Blog, Showcase
- **FR-2.2**: System shall store all artifacts in Supabase with type-specific schemas
- **FR-2.3**: System shall display artifacts in list view with filtering by type and status
- **FR-2.4**: System shall support artifact statuses: Draft, In Progress, Ready, Published, Archived
- **FR-2.5**: System shall allow editing artifact content and metadata
- **FR-2.6**: System shall support soft delete (archive) of artifacts

### Artifact Types - Social Posts

- **FR-3.1**: Social Post schema: platform (default LinkedIn), title, content, target_audience, hashtags, status, published_url, published_date
- **FR-3.2**: System shall enforce LinkedIn character limits (3000 chars) with visual indicator
- **FR-3.3**: System shall suggest hashtags based on content
- **FR-3.4**: System shall support image attachments (stored in Supabase Storage)

### Artifact Types - Blogs

- **FR-4.1**: Blog schema: title, subtitle, content (rich text), target_audience, platform (Medium/Substack), status, published_url, published_date, estimated_read_time
- **FR-4.2**: System shall support rich text editing (headings, lists, bold, italic, links, images)
- **FR-4.3**: System shall calculate estimated read time based on word count
- **FR-4.4**: System shall support embedding published blog content for display (research platform support)

### Artifact Types - Showcases

- **FR-5.1**: Showcase schema: title, company, role, timeframe, problem, approach, results, metrics (array), learnings, tags, status
- **FR-5.2**: System shall support multiple metrics per showcase with label/value pairs
- **FR-5.3**: System shall support tagging by industry, skill, and project type
- **FR-5.4**: System shall support image gallery for showcase visuals

### Topic Backlog

- **FR-6.1**: Topic schema: title, description, source (manual/ai-suggested), target_artifact_type, status (idea/researching/ready/executed), priority, created_date
- **FR-6.2**: System shall display topics in kanban view by status
- **FR-6.3**: System shall allow manual topic creation
- **FR-6.4**: System shall allow converting topic to artifact (execute)
- **FR-6.5**: System shall link executed topics to resulting artifacts

### AI Capabilities - Foundation

- **FR-7.1**: System shall provide multi-LLM abstraction supporting GPT-4 and Claude
- **FR-7.2**: System shall allow configuring which LLM to use for different capability types
- **FR-7.3**: System shall store conversation history per artifact/topic
- **FR-7.4**: System shall support streaming responses for real-time feedback
- **FR-7.5**: System shall handle LLM errors gracefully with retry and fallback
- **FR-7.6**: AI shall access User Context when generating any content

### AI Capabilities - Topic Research

- **FR-8.1**: AI shall research content ideas based on User Context (expertise, industry, goals)
- **FR-8.2**: AI shall use web search to find trending topics in user's domain
- **FR-8.3**: AI shall suggest topics through conversational interface
- **FR-8.4**: AI shall allow refining suggestions through dialogue
- **FR-8.5**: AI shall add approved topics directly to backlog

### AI Capabilities - Narrative Generation

- **FR-9.1**: AI shall generate content drafts from topic descriptions
- **FR-9.2**: AI shall adapt output format based on target artifact type
- **FR-9.3**: AI shall incorporate User Context for relevant personalization
- **FR-9.4**: AI shall allow iterative refinement through conversation
- **FR-9.5**: AI shall insert generated content into artifact editor

### AI Capabilities - Content Creation & Style

- **FR-10.1**: AI shall access stored writing style examples
- **FR-10.2**: AI shall analyze examples to extract style characteristics
- **FR-10.3**: AI shall generate content mimicking user's voice
- **FR-10.4**: AI shall use one example as explicit reference per generation when requested
- **FR-10.5**: AI shall explain style choices when asked
- **FR-10.6**: AI shall support full content creation (not just narratives)

### Writing Style Examples

- **FR-11.1**: System shall store 4-5 writing style examples per user
- **FR-11.2**: System shall support pasting example text directly
- **FR-11.3**: System shall allow labeling examples (e.g., "LinkedIn tone", "Technical blog")
- **FR-11.4**: System shall display style analysis summary for stored examples
- **FR-11.5**: System shall allow selecting which examples to use for generation

### Interaction Modes

- **FR-12.1**: System shall provide chat panel mode (AI chat on side, editor in main area)
- **FR-12.2**: System shall provide inline suggestion mode (AI suggestions appear in editor context)
- **FR-12.3**: System shall provide direct editing mode (no AI, just editor)
- **FR-12.4**: System shall allow switching between modes without losing context
- **FR-12.5**: System shall remember user's preferred mode

### Skills Matrix

- **FR-13.1**: System shall store skills with: name, category, proficiency (1-5), years_experience
- **FR-13.2**: System shall support skill categories: Product Strategy, User Research, Analytics, Technical, Leadership, Industry
- **FR-13.3**: System shall display skills in visual matrix format
- **FR-13.4**: System shall allow linking skills to showcases
- **FR-13.5**: AI capabilities shall access skills matrix for context

### Theme & UI

- **FR-14.1**: System shall support light and dark mode themes
- **FR-14.2**: System shall persist theme preference across sessions
- **FR-14.3**: System shall respect system preference for initial theme selection
- **FR-14.4**: System shall provide theme toggle in UI header/settings

### Frontend Design Requirements

#### Visual Design Language: "Midnight Architect"

- **FR-16.1**: System shall implement a sophisticated, depth-layered interface with deep blue foundations
- **FR-16.2**: Dark theme shall use color palette: #030812 (base), #020764 (deep indigo), #043780 (dark blue), #025EC4 (medium blue), #0ECCED (cyan accent)
- **FR-16.3**: Light theme shall provide inverted palette with high contrast accessibility
- **FR-16.4**: Primary interactive elements shall use cyan (#0ECCED) as accent color
- **FR-16.5**: All color combinations shall meet WCAG AA contrast requirements (4.5:1 minimum)

#### Typography

- **FR-17.1**: System shall use Plus Jakarta Sans as primary font family
- **FR-17.2**: Display headings shall range from 30px to 48px
- **FR-17.3**: Body text shall use 14px-16px with 1.5-1.6 line height
- **FR-17.4**: Code/data elements shall use JetBrains Mono monospace font

#### Layout Structure

- **FR-18.1**: System shall implement app shell with fixed sidebar navigation (72px expanded, 56px collapsed)
- **FR-18.2**: Main content area shall have maximum width of 1200px centered on large screens
- **FR-18.3**: AI chat panel shall appear as side panel (320-400px) on desktop, overlay on tablet/mobile
- **FR-18.4**: Responsive breakpoints: 640px (mobile), 768px (tablet), 1024px (desktop), 1280px (large desktop)

#### Key Screen Requirements

- **FR-19.1**: Home dashboard shall display domain cards with Thinkup-style hand-drawn illustrations
- **FR-19.2**: Content hub shall display artifacts in list view with type icon, status badge, and metadata
- **FR-19.3**: Artifact editor shall implement split view (60% editor, 40% AI chat panel)
- **FR-19.4**: Topic backlog shall display 4-column kanban (Ideas, Researching, Ready, Executed)
- **FR-19.5**: User profile shall display section-based layout with collapsible edit forms
- **FR-19.6**: Skills matrix shall display visual proficiency bars with star ratings

#### Component Standards

- **FR-20.1**: Buttons shall support variants: primary (gradient), secondary (outline), ghost, danger, icon
- **FR-20.2**: Cards shall implement hover lift effect with shadow and border glow
- **FR-20.3**: Form inputs shall display cyan border glow on focus
- **FR-20.4**: Status badges shall use semantic colors: gray (draft), amber (in progress), cyan (ready), green (published)
- **FR-20.5**: All modals/portals shall include `data-portal-ignore-click-outside` attribute

#### Animation & Motion

- **FR-21.1**: Page transitions shall use fade + slide (200ms ease-out)
- **FR-21.2**: Chat messages shall animate in from sender direction
- **FR-21.3**: AI streaming text shall display character-by-character with blinking cursor
- **FR-21.4**: Kanban cards shall implement drag with slight rotation and shadow
- **FR-21.5**: Loading states shall use skeleton placeholders with pulse animation

#### Illustration Style

- **FR-22.1**: Domain cards shall include hand-drawn style SVG illustrations
- **FR-22.2**: Illustrations shall use 1.5-2px stroke weight with blue/cyan palette
- **FR-22.3**: Empty states shall display relevant illustrations with guidance text
- **FR-22.4**: AI assistant shall have friendly icon representation (sparkle motif)

#### Mobile Responsiveness

- **FR-23.1**: System shall be usable on tablet (768px+) and functional on mobile (< 640px)
- **FR-23.2**: Mobile navigation shall use hamburger menu with slide-out drawer
- **FR-23.3**: Mobile shall display bottom navigation bar with 5 primary items
- **FR-23.4**: AI chat shall display as full-screen modal on mobile/tablet
- **FR-23.5**: All touch targets shall be minimum 44px × 44px
- **FR-23.6**: Mobile editor shall use floating action button for AI access
- **FR-23.7**: Topic kanban shall convert to swipeable tab-based list on mobile
- **FR-23.8**: System shall respect iOS safe areas (notch, home indicator)
- **FR-23.9**: Typography shall scale down appropriately on mobile (display text reduced by ~20%)
- **FR-23.10**: Forms shall be usable with on-screen keyboard without layout breaking

### Data Architecture (Multi-tenancy Prep)

- **FR-15.1**: All database tables shall include user_id field
- **FR-15.2**: All database tables shall include account_id field for future organization support
- **FR-15.3**: Database schema shall support row-level security policies (not enforced in MVP)
- **FR-15.4**: API endpoints shall be structured to support user context injection
- **FR-15.5**: Data model shall allow adding authentication without schema migration

## Non-Functional Requirements

- **NFR-1**: AI responses shall begin streaming within 3 seconds
- **NFR-2**: Artifact list shall load within 2 seconds for up to 500 artifacts
- **NFR-3**: Rich text editor shall handle documents up to 10,000 words without lag
- **NFR-4**: All data shall be stored in Supabase with row-level security ready for future multi-tenancy
- **NFR-5**: UI shall be responsive on tablet and desktop (mobile deferred)
- **NFR-6**: System shall support offline draft editing with sync on reconnect
- **NFR-7**: Conversation history shall persist across sessions
- **NFR-8**: LLM abstraction shall allow adding new providers without modifying capability code
- **NFR-9**: Architecture shall support adding new domains (CRM, Advisor) without major refactoring

## Dependencies

### Prerequisites

- Existing React 19 + Express + Supabase codebase
- OpenAI API key for GPT-4
- Anthropic API key for Claude (optional, can default to GPT-4)
- Supabase project with Storage bucket configured

### External Research Required

- Medium API capabilities for embedding/integration
- Substack API capabilities for embedding/integration
- Recommend one platform based on research findings
- Theme implementation approach (CSS variables, Tailwind dark mode, or theme provider)

## Acceptance Criteria

### User Context
- [ ] Can enter and save About Me information
- [ ] Can enter and save Profession details
- [ ] Can enter and save Customer profile
- [ ] Can enter and save Goals
- [ ] AI references User Context in generated content

### Artifact Management
- [ ] Can create a Social Post with all metadata fields
- [ ] Can create a Blog with rich text content
- [ ] Can create a Showcase with metrics and tags
- [ ] Can view all artifacts in filtered list view
- [ ] Can edit and save artifact changes
- [ ] Can archive artifacts

### Topic Backlog
- [ ] Can create topics manually
- [ ] Can view topics in kanban by status
- [ ] Can convert topic to artifact draft
- [ ] Topics link to resulting artifacts

### AI Capabilities
- [ ] Can chat with AI and receive topic suggestions based on User Context
- [ ] AI can add approved topics to backlog
- [ ] Can chat with AI to generate draft content
- [ ] AI inserts content into editor
- [ ] Can store 4-5 writing style examples
- [ ] AI generates content matching stored style
- [ ] AI responses stream in real-time

### Interaction Modes
- [ ] Can use chat panel mode with side-by-side layout
- [ ] Can switch to inline suggestion mode
- [ ] Can switch to direct editing mode
- [ ] Mode preference persists across sessions

### Supporting Features
- [ ] Can add and manage skills in matrix view
- [ ] Can toggle between light and dark mode
- [ ] Theme preference persists across sessions

### Data Architecture
- [ ] All tables include user_id and account_id fields
- [ ] Schema supports future RLS policies
- [ ] API structure ready for auth injection

### Frontend Design
- [ ] Dark theme implements the Midnight Architect color palette (#030812 base, #0ECCED accent)
- [ ] Light theme provides accessible inverted palette
- [ ] Plus Jakarta Sans font renders correctly across all text elements
- [ ] App shell displays sidebar navigation (72px expanded, 56px collapsed on tablet)
- [ ] AI chat panel displays correctly as side panel (desktop) and overlay (mobile/tablet)
- [ ] Domain cards on home page include hand-drawn style illustrations
- [ ] Artifact cards display type icon, status badge with correct colors, and metadata
- [ ] Topic kanban supports drag-and-drop between 4 columns
- [ ] Chat messages animate in with fade + slide effect
- [ ] AI streaming text displays character-by-character with blinking cursor
- [ ] All interactive elements have visible focus indicators for accessibility
- [ ] Color contrast meets WCAG AA requirements (4.5:1 minimum)
- [ ] Buttons implement correct variants: primary (gradient), secondary (outline), ghost
- [ ] Form inputs display cyan border glow on focus
- [ ] Modals include `data-portal-ignore-click-outside` attribute

### Mobile Responsiveness
- [ ] Mobile navigation drawer slides in from left on hamburger tap
- [ ] Bottom navigation bar displays on mobile with 5 items
- [ ] All touch targets are at least 44px × 44px
- [ ] AI chat displays as full-screen modal on mobile
- [ ] Editor displays floating action button for AI on mobile
- [ ] Topic kanban converts to tab-based swipeable list on mobile
- [ ] iOS safe areas are respected (notch, home indicator)
- [ ] Forms remain usable when on-screen keyboard is open
- [ ] Typography scales down appropriately on small screens
- [ ] Horizontal scroll doesn't break on any viewport

## Open Questions

1. **Blog Platform**: Should we prioritize Medium or Substack? Need to research:
   - API availability for embedding
   - Edit-in-place capability
   - Pricing for API access
   - User base overlap with target audience

2. **Inline Suggestions UX**: How should inline mode work?
   - Comment-style annotations?
   - Highlighted suggestions with accept/reject?
   - Ghost text completion?

3. **Style Analysis**: How detailed should style analysis be?
   - Simple summary ("professional, concise, uses questions")?
   - Detailed metrics (sentence length, vocabulary level, tone scores)?

4. **Conversation Persistence**: How long to retain AI conversation history?
   - Per artifact only?
   - Cross-artifact for context?
   - Configurable retention?

5. **AI Implementation**: Single agent with multiple skills vs. multiple specialized agents?
   - To be decided in spec phase based on LLM capabilities and UX goals

---

*Review this PRD and provide feedback before spec generation.*
