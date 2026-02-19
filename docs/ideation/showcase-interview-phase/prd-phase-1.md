# PRD: Showcase Interview Phase - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 2
**Focus**: Core interview system - database, tools, prompts, pipeline integration

## Phase Overview

Phase 1 delivers the core interview capability: a new `interviewing` artifact status, a database table to store interview Q&A pairs, two AI tools (`startShowcaseInterview` and `completeShowcaseInterview`), coverage scoring logic, and system prompt instructions that orchestrate the conversational interview in the existing chat panel.

This phase is sequenced first because it establishes the foundational data model and AI behavior. After Phase 1, a user can create a showcase, go through a full interview, and have the enriched brief feed into the existing research/writing pipeline. The interview data persists at completion (not incrementally - that's Phase 2).

After this phase, users get the full interview experience for new showcases. The limitation is that interrupted interviews lose progress (addressed in Phase 2).

## User Stories

1. As a consultant, I want the AI to interview me about my showcase case before writing begins, so that the content reflects my actual experience rather than generic research
2. As a consultant, I want the AI to ask me one question at a time and follow up based on my answers, so that the interview feels like a natural conversation rather than a form
3. As a consultant, I want the AI to tell me when it has enough information to proceed, so that I know the interview is complete
4. As a consultant, I want to see a summary of what the AI learned before it starts researching, so that I can confirm or correct any misunderstandings
5. As a consultant, I want the showcase pipeline to use my interview answers as the foundation for research and writing, so that the final content tells my specific story

## Functional Requirements

### Database & Data Model

- **FR-1.1**: Add `interviewing` to the `ArtifactStatus` type in both frontend and backend, positioned between `draft` and `research`
- **FR-1.2**: Create `artifact_interviews` table with columns: `id` (UUID PK), `artifact_id` (FK to artifacts), `question_number` (int), `dimension` (enum: case_context, problem_challenge, approach_methodology, results_outcomes, lessons_insights), `question` (text), `answer` (text), `coverage_scores` (JSONB - scores after this Q&A), `created_at` (timestamp)
- **FR-1.3**: Create `synthesized_brief` column in `artifact_interviews` or store in `artifacts.metadata.interview_brief` - the final structured brief produced from all Q&A pairs
- **FR-1.4**: Update state machine transitions: `draft` -> `interviewing` (for showcases), `interviewing` -> `research`, and keep existing `draft` -> `research` (for non-showcase types)
- **FR-1.5**: Add RLS policies on `artifact_interviews` table (users can only access interviews for their own artifacts)

### Interview AI Tools

- **FR-1.6**: Create `startShowcaseInterview` tool that: (a) validates the artifact is a showcase and in `draft` status, (b) updates artifact status to `interviewing`, (c) fetches user profile from `user_context` and `skills` tables, (d) returns the first interview question targeting the lowest-coverage dimension, (e) returns initial coverage scores (all zeros)
- **FR-1.7**: Create `completeShowcaseInterview` tool that: (a) receives all Q&A pairs and coverage scores, (b) synthesizes a structured brief from the interview transcript, (c) stores Q&A pairs in `artifact_interviews` table, (d) stores synthesized brief in `artifacts.metadata.author_brief` (same field used by existing pipeline), (e) updates artifact status from `interviewing` to `research`, (f) returns the brief summary for chat display

### Coverage Scoring System

- **FR-1.8**: Define 5 coverage dimensions, each scored 0-20:
  - **Case Context** (0-20): Who was the client? What industry? What was the engagement about? Timeline?
  - **Problem/Challenge** (0-20): What specific problem needed solving? What was the impact? What had been tried before?
  - **Approach/Methodology** (0-20): What approach was taken? What made it unique? What tools/frameworks were used?
  - **Results/Outcomes** (0-20): What measurable results were achieved? What metrics improved? What was the ROI?
  - **Lessons/Insights** (0-20): What was learned? What would be done differently? What's the transferable insight?
- **FR-1.9**: The AI must evaluate coverage scores after each user answer and include them in its internal reasoning
- **FR-1.10**: When total coverage score reaches >=95/100, the AI should signal readiness to wrap up and synthesize the brief
- **FR-1.11**: The AI may continue asking questions past the 95 threshold if it identifies specific gaps, but must not exceed 15 total questions

### System Prompt Integration

- **FR-1.12**: Add interview orchestration instructions to `getBaseSystemPrompt` that activate when: (a) artifact type is `showcase`, and (b) artifact status is `draft` or `interviewing`
- **FR-1.13**: Interview prompt instructions must include: question generation strategy (one question at a time, natural tone), dimension targeting (ask about lowest-scoring dimension), follow-up logic (probe deeper when answers are vague), and completion criteria (score >= 95 or 15 questions reached)
- **FR-1.14**: When a `Create content: "<title>"` message arrives for a showcase artifact, the system prompt must instruct Claude to call `startShowcaseInterview` instead of `conductDeepResearch`
- **FR-1.15**: After interview completion, the system prompt must instruct Claude to call `conductDeepResearch` with the synthesized brief as the `topicDescription` parameter

### Pipeline Integration

- **FR-1.16**: The `PipelineExecutor` must recognize `interviewing` as a valid pre-research status. If `execute()` is called on an artifact in `interviewing` status, it should skip to the interview completion step or wait
- **FR-1.17**: The `conductDeepResearch` tool must accept artifacts in `interviewing` status (transitioning to `research`) when called after interview completion
- **FR-1.18**: The interview flow is chat-driven (not pipeline-driven). The pipeline only kicks in after the interview completes and `conductDeepResearch` is triggered

### Frontend State Machine Updates

- **FR-1.19**: Add `interviewing` to `ArtifactStatus` type, `ARTIFACT_TRANSITIONS`, `STATUS_COLORS` (use a conversational/warm color like indigo), `STATUS_ICONS` (use `MessageCircleQuestion` or `MessagesSquare`), `STATUS_LABELS` (label: "Interviewing")
- **FR-1.20**: Add `interviewing` to `PROCESSING_STATES` so the editor is locked during the interview (content is generated through chat, not manual editing)
- **FR-1.21**: The chat panel must remain active and interactive during `interviewing` status (it's the primary interface for the interview)

## Non-Functional Requirements

- **NFR-1.1**: Interview questions must generate in <2s (standard Claude streaming response time)
- **NFR-1.2**: Coverage scoring computation must not add perceptible latency (it's part of Claude's reasoning, not a separate API call)
- **NFR-1.3**: The `completeShowcaseInterview` tool must complete brief synthesis in <10s
- **NFR-1.4**: Interview data must be secured with RLS policies matching existing artifact security model

## Dependencies

### Prerequisites

- Existing `artifacts` table with `status`, `metadata`, `type` columns
- Existing `user_context` and `skills` tables for profile data
- Existing `AIService.streamChat` with tool-calling capability
- Existing `getBaseSystemPrompt` function with conditional sections
- Existing `conductDeepResearch` tool with `topicDescription` parameter

### Outputs for Next Phase

- `artifact_interviews` table with schema and RLS
- `interviewing` status in both frontend and backend type systems
- Working interview flow for new showcase artifacts
- Synthesized brief stored in `artifacts.metadata.author_brief`
- Two registered AI tools: `startShowcaseInterview`, `completeShowcaseInterview`

## Acceptance Criteria

- [ ] Creating a showcase and triggering content creation starts an interview (not research)
- [ ] The AI asks one question at a time, targeting the lowest-coverage dimension
- [ ] The AI asks follow-up questions when answers are vague or incomplete
- [ ] Coverage scores increase with each substantive answer
- [ ] When score reaches >=95, the AI synthesizes a brief and presents a summary
- [ ] User confirmation in chat triggers `conductDeepResearch` with the enriched brief
- [ ] The research phase produces more targeted queries when using an interview-enriched brief
- [ ] Blog and social post artifacts continue to use the existing flow (no interview)
- [ ] Frontend displays `interviewing` status with appropriate color, icon, and label
- [ ] Editor is locked during interview, chat panel remains interactive
- [ ] `artifact_interviews` rows are created with correct dimension tags and scores
- [ ] RLS policies on `artifact_interviews` prevent cross-user access
- [ ] All existing unit and integration tests continue to pass
- [ ] TypeScript compiles without errors in both frontend and backend

## Open Questions

- Should the coverage score threshold be configurable (e.g., per user preference) or fixed at 95?
- Should the AI display the current coverage score to the user during the interview (e.g., "I now have a good understanding of your approach (95%). Let me ask about the results...") or keep it internal?

---

*Review this PRD and provide feedback before spec generation.*
