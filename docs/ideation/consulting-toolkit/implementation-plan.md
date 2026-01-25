# Consulting Toolkit - Portfolio MVP Implementation Plan

**Overall Progress:** `0%`

## TLDR

Building a Portfolio domain for a consulting toolkit - a content creation system with AI-assisted workflows. Consultants can create three artifact types (Social Posts, Blogs, Showcases), manage a topic backlog via kanban, and collaborate with AI through conversational chat for topic research, narrative generation, and style-matched content creation.

## Critical Decisions

- **Data Architecture**: Hybrid pattern - Supabase direct for CRUD, Express API only for AI operations
- **AI SDK**: Vercel AI SDK with `useChat` hook for streaming, multi-LLM support
- **State Management**: Zustand for UI state + React Query for server state
- **Rich Text Editor**: Tiptap (best React integration, AI examples exist)
- **Drag-and-Drop**: @hello-pangea/dnd (maintained fork of react-beautiful-dnd)
- **Design System**: "Midnight Architect" - deep blue foundations (#030812) with cyan accents (#0ECCED)
- **Font**: Plus Jakarta Sans (display + body), JetBrains Mono (code)
- **Multi-tenancy Prep**: All tables include user_id and account_id fields for future auth

## Tasks:

### Phase 1: Database & Foundation

- [ ] 🟥 **Step 1: Database Schema Setup**
  - [ ] 🟥 Create migration file with all tables (user_context, artifacts, topics, skills, style_examples, ai_conversations, user_preferences)
  - [ ] 🟥 Add indexes for performance (user_id, type, status)
  - [ ] 🟥 Add updated_at trigger function
  - [ ] 🟥 Run migration via MCP Supabase tools
  - [ ] 🟥 Generate TypeScript types from Supabase

- [ ] 🟥 **Step 2: Install Dependencies**
  - [ ] 🟥 Frontend: @ai-sdk/react, zustand, @tanstack/react-query, @hello-pangea/dnd, @tiptap/react, plus-jakarta-sans font
  - [ ] 🟥 Backend: @ai-sdk/openai, @ai-sdk/anthropic, ai

- [ ] 🟥 **Step 3: Design System Foundation**
  - [ ] 🟥 Set up CSS variables for colors, spacing, typography in globals.css
  - [ ] 🟥 Add Plus Jakarta Sans and JetBrains Mono fonts
  - [ ] 🟥 Create ThemeProvider with dark/light/system mode + Supabase persistence
  - [ ] 🟥 Create base shadcn component overrides (button variants, card hover effects, input focus glow)

- [ ] 🟥 **Step 4: App Shell & Navigation**
  - [ ] 🟥 Create AppShell layout component (sidebar + main content area)
  - [ ] 🟥 Create Sidebar component (72px expanded, 56px collapsed, icons + labels)
  - [ ] 🟥 Create mobile navigation drawer and bottom nav bar
  - [ ] 🟥 Set up React Router routes for all pages
  - [ ] 🟥 Add responsive breakpoint handling with useIsMobile hook

### Phase 2: Data Layer & Core Hooks

- [ ] 🟥 **Step 5: TypeScript Types**
  - [ ] 🟥 Create portfolio.ts types file (Artifact, Topic, Skill, UserContext, StyleExample interfaces)
  - [ ] 🟥 Add metadata schemas per artifact type (SocialPostMetadata, BlogMetadata, ShowcaseMetadata)
  - [ ] 🟥 Add state machine transition types

- [ ] 🟥 **Step 6: Zustand Stores**
  - [ ] 🟥 Create portfolioStore.ts (selectedArtifactId, interactionMode, filters, _hasHydrated)
  - [ ] 🟥 Create chatStore.ts (messages by contextId, stable empty array pattern)
  - [ ] 🟥 Add devtools middleware for dev, persist middleware for preferences

- [ ] 🟥 **Step 7: React Query Data Hooks**
  - [ ] 🟥 Create useArtifacts.ts (list, single, create, update, delete)
  - [ ] 🟥 Create useTopics.ts (list, single, create, update with status transition validation)
  - [ ] 🟥 Create useSkills.ts (list, create, update, delete)
  - [ ] 🟥 Create useUserContext.ts (get, update)
  - [ ] 🟥 Create useStyleExamples.ts (list, create, update, delete)
  - [ ] 🟥 Create usePreferences.ts (get, update)

- [ ] 🟥 **Step 8: State Machine Validators**
  - [ ] 🟥 Create stateMachines.ts with ARTIFACT_TRANSITIONS and TOPIC_TRANSITIONS
  - [ ] 🟥 Add canTransition() and getTransitionError() helpers
  - [ ] 🟥 Integrate validation into update mutations

### Phase 3: Core UI Components

- [ ] 🟥 **Step 9: Shared Components**
  - [ ] 🟥 Create StatusBadge component (draft/in_progress/ready/published/archived colors)
  - [ ] 🟥 Create TypeIcon component (social_post/blog/showcase icons)
  - [ ] 🟥 Create ArtifactCard component (type icon, status badge, title, excerpt, metadata)
  - [ ] 🟥 Create TopicCard component (AI-suggested badge, target type, drag handle)
  - [ ] 🟥 Create DomainCard component (illustration, title, description, CTA)
  - [ ] 🟥 Create SkillBar component (proficiency bar, star rating, years)

- [ ] 🟥 **Step 10: Form Components**
  - [ ] 🟥 Create UserContextForm (About Me, Profession, Customers, Goals sections)
  - [ ] 🟥 Create SocialPostForm (title, content, platform, hashtags, target_audience)
  - [ ] 🟥 Create BlogForm (title, subtitle, content, platform, target_audience)
  - [ ] 🟥 Create ShowcaseForm (company, role, timeframe, problem, approach, results, metrics, learnings)
  - [ ] 🟥 Create SkillForm (name, category, proficiency, years_experience)
  - [ ] 🟥 Create StyleExampleForm (label, content textarea)

- [ ] 🟥 **Step 11: Rich Text Editor**
  - [ ] 🟥 Set up Tiptap with extensions (bold, italic, underline, headings, lists, links, images)
  - [ ] 🟥 Create floating toolbar component
  - [ ] 🟥 Add character count display
  - [ ] 🟥 Style editor to match design system

### Phase 4: Pages

- [ ] 🟥 **Step 12: Home Dashboard**
  - [ ] 🟥 Create PortfolioDashboard page with greeting banner
  - [ ] 🟥 Add domain cards grid (Create Content, Explore Topics, Build Profile, Track Skills)
  - [ ] 🟥 Add recent content horizontal scroll section
  - [ ] 🟥 Create hand-drawn style SVG illustrations for domain cards

- [ ] 🟥 **Step 13: Content Hub**
  - [ ] 🟥 Create ArtifactList page with type filter tabs
  - [ ] 🟥 Add status filter dropdown
  - [ ] 🟥 Add search input
  - [ ] 🟥 Display artifacts in list view with ArtifactCard
  - [ ] 🟥 Add "New Artifact" button with type selection

- [ ] 🟥 **Step 14: Topic Backlog (Kanban)**
  - [ ] 🟥 Create TopicsPage with 4-column kanban (Ideas, Researching, Ready, Executed)
  - [ ] 🟥 Implement drag-and-drop with @hello-pangea/dnd
  - [ ] 🟥 Add "New Topic" button
  - [ ] 🟥 Add "AI Research" button placeholder
  - [ ] 🟥 Show link to executed artifact in final column
  - [ ] 🟥 Create mobile swipeable tab-based list view

- [ ] 🟥 **Step 15: User Profile & Settings**
  - [ ] 🟥 Create UserContextPage with section cards (About Me, Profession, Customers, Goals)
  - [ ] 🟥 Add inline editing (click to expand form)
  - [ ] 🟥 Create SkillsPage with category tabs and visual matrix
  - [ ] 🟥 Create StyleExamplesPage with progress indicator and example cards
  - [ ] 🟥 Create SettingsPage with theme toggle

### Phase 5: AI Backend

- [ ] 🟥 **Step 16: AI Service Foundation**
  - [ ] 🟥 Create backend/src/services/ai/ directory structure
  - [ ] 🟥 Create config.ts with AGENT_LIMITS (maxSteps, maxTokens, timeout, costCeiling)
  - [ ] 🟥 Create errors.ts with AIError hierarchy (AgentLimitError, AIErrors constants)
  - [ ] 🟥 Create AIService.ts with getModel() and chat() methods

- [ ] 🟥 **Step 17: AI Tools**
  - [ ] 🟥 Create researchTopics.ts tool (research topics based on user context)
  - [ ] 🟥 Create generateNarrative.ts tool (generate draft from topic)
  - [ ] 🟥 Create createContent.ts tool (style-matched content creation)
  - [ ] 🟥 Create analyzeStyle.ts tool (analyze writing style examples)
  - [ ] 🟥 Add addTopicToBacklog inline tool
  - [ ] 🟥 Add insertContent inline tool

- [ ] 🟥 **Step 18: Prompts & Security**
  - [ ] 🟥 Create system.ts with getSystemPrompt() that includes user context
  - [ ] 🟥 Create sanitizer.ts with dangerous pattern detection
  - [ ] 🟥 Create prompt snapshot tests for regression

- [ ] 🟥 **Step 19: AI Routes**
  - [ ] 🟥 Create backend/src/routes/ai.ts with POST /api/ai/chat endpoint
  - [ ] 🟥 Create backend/src/controllers/ai.controller.ts
  - [ ] 🟥 Add streaming response handling
  - [ ] 🟥 Register routes in backend/src/index.ts

### Phase 6: AI Frontend Integration

- [ ] 🟥 **Step 20: AI Chat Components**
  - [ ] 🟥 Create useAIChat.ts hook wrapping Vercel AI SDK useChat
  - [ ] 🟥 Create ChatPanel.tsx (messages area, input, loading state)
  - [ ] 🟥 Create ChatMessage.tsx (AI/user message styling, tool results)
  - [ ] 🟥 Create ChatInput.tsx (input field, send button, keyboard hints)
  - [ ] 🟥 Create StreamingText.tsx (character-by-character with blinking cursor)
  - [ ] 🟥 Create ToolResultRenderer.tsx (render tool results as interactive cards)

- [ ] 🟥 **Step 21: Artifact Editor with AI**
  - [ ] 🟥 Create ArtifactEditor.tsx with split view (60% editor, 40% chat)
  - [ ] 🟥 Wire up content insertion from AI suggestions
  - [ ] 🟥 Add mode toggle (chat/inline/direct)
  - [ ] 🟥 Create mobile layout with AI FAB button
  - [ ] 🟥 Create ArtifactPage.tsx that combines editor with artifact type forms

- [ ] 🟥 **Step 22: Topic AI Integration**
  - [ ] 🟥 Connect "AI Research" button to open chat with research intent
  - [ ] 🟥 Handle addTopicToBacklog tool result (refresh topics list)
  - [ ] 🟥 Add "Execute to Artifact" flow (create artifact from topic)

### Phase 7: Polish & Testing

- [ ] 🟥 **Step 23: Animations & Loading States**
  - [ ] 🟥 Add page transitions (fade + slide)
  - [ ] 🟥 Add card hover effects (lift, border glow)
  - [ ] 🟥 Add skeleton loaders for lists and cards
  - [ ] 🟥 Add chat message animations (fade + slide from direction)
  - [ ] 🟥 Add drag animation for kanban (slight rotation, shadow)

- [ ] 🟥 **Step 24: Empty & Error States**
  - [ ] 🟥 Create empty state illustrations
  - [ ] 🟥 Add empty state messages for each list
  - [ ] 🟥 Add error boundaries
  - [ ] 🟥 Add toast notifications for success/error actions
  - [ ] 🟥 Add AI error handling with retry option

- [ ] 🟥 **Step 25: Accessibility**
  - [ ] 🟥 Verify color contrast meets WCAG AA (4.5:1)
  - [ ] 🟥 Add visible focus indicators
  - [ ] 🟥 Add ARIA labels for icon buttons
  - [ ] 🟥 Add keyboard navigation for kanban
  - [ ] 🟥 Test with screen reader

- [ ] 🟥 **Step 26: Testing**
  - [ ] 🟥 Write unit tests for data hooks
  - [ ] 🟥 Write unit tests for Zustand stores
  - [ ] 🟥 Write unit tests for AI tools
  - [ ] 🟥 Write prompt snapshot tests
  - [ ] 🟥 Manual E2E testing of all flows

- [ ] 🟥 **Step 27: Final Validation**
  - [ ] 🟥 Run npm run build (verify no TypeScript errors)
  - [ ] 🟥 Test all CRUD operations
  - [ ] 🟥 Test AI chat streaming
  - [ ] 🟥 Test theme persistence
  - [ ] 🟥 Test responsive layouts (mobile, tablet, desktop)
  - [ ] 🟥 Verify offline draft editing with sync on reconnect

---

## Open Items (Resolve During Implementation)

1. **Blog Platform**: Need to research Medium vs Substack API for embedding capability
2. **Web Search for Topics**: MVP uses database templates; consider adding Tavily/Serper later
3. **Conversation Retention**: Implement 24h summarize, 7d delete policy with pinning support
