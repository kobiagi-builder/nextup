# PRD: Showcase Interview Phase - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 2
**Focus**: Persistence, resume, skip interview, and adaptive questioning

## Phase Overview

Phase 2 adds resilience and polish to the interview system built in Phase 1. The core additions are: incremental Q&A persistence (each answer saved immediately, not just at completion), interview resume (pick up where you left off after leaving), skip interview with warning, and fully adaptive questioning that leverages the user's profile to ask smarter questions.

This phase is sequenced second because it builds on the working interview flow from Phase 1. These are enhancements that improve the user experience but aren't required for the core value proposition. After Phase 2, the interview system is production-ready with full resilience.

After this phase, users can safely close their browser mid-interview and return later, skip the interview if they choose, and benefit from questions that are tailored to their professional context.

## User Stories

1. As a consultant, I want my interview progress to be saved after each answer, so that I don't lose work if I close my browser or navigate away
2. As a consultant, I want to resume an interrupted interview where I left off, so that I don't have to re-answer questions
3. As a consultant, I want the option to skip the interview for a showcase if I already have a clear vision, so that I'm not forced through the process when I don't need it
4. As a consultant, I want the AI to use what it already knows about me (from my profile) to ask smarter questions, so that I don't waste time on obvious context
5. As a consultant, I want to see a clear indication that I'm in an interview, so that I understand the current state of my showcase creation

## Functional Requirements

### Incremental Persistence

- **FR-2.1**: Each Q&A pair must be saved to `artifact_interviews` immediately after the user answers (not batched at interview completion)
- **FR-2.2**: The `startShowcaseInterview` tool must save the first question to the database before returning it to the user
- **FR-2.3**: Each subsequent question-answer cycle must be persisted via a tool call (e.g., `saveInterviewAnswer`) that stores the answer and the next question simultaneously
- **FR-2.4**: Coverage scores must be persisted with each Q&A pair so resume can restore scoring state

### Interview Resume

- **FR-2.5**: When a user returns to a showcase artifact in `interviewing` status, the system must detect the existing interview and resume it
- **FR-2.6**: Resume must load all prior Q&A pairs from `artifact_interviews` and inject them into the system prompt or conversation context so Claude has full context of what was already discussed
- **FR-2.7**: Resume must restore the coverage scores from the last Q&A pair and continue from the next logical question
- **FR-2.8**: The chat panel should display a message like "Resuming your interview..." with a brief recap of what was covered so far
- **FR-2.9**: If the user re-sends a message to a showcase in `interviewing` status, the system prompt must instruct Claude to check for existing interview data before starting a new interview

### Skip Interview

- **FR-2.10**: When `startShowcaseInterview` is about to be triggered, check if the user has signaled intent to skip (via a chat message like "skip interview" or a UI button)
- **FR-2.11**: If skipping, display a warning in chat: "Skipping the interview means I'll write this showcase based on the title alone. The content will be less specific to your actual experience. Proceed?"
- **FR-2.12**: If confirmed, transition directly from `draft` to `research` using the existing flow (title as topic description, no enriched brief)
- **FR-2.13**: Store a flag in `artifacts.metadata.interview_skipped: true` so downstream tools can adjust expectations

### Adaptive Questioning

- **FR-2.14**: The `startShowcaseInterview` tool must fetch and pass the user's profile data (expertise areas, industries, skills with proficiency) to Claude's interview context
- **FR-2.15**: The system prompt must instruct Claude to: (a) never ask questions already answered by the profile (e.g., don't ask "what do you do?" if profession is set), (b) use profile context to ask more targeted questions (e.g., if expertise includes "product strategy", ask about specific product decisions rather than generic approach questions), (c) reference the user's known skills when probing methodology
- **FR-2.16**: If the user has prior showcase artifacts, the system prompt should instruct Claude to avoid repetitive question patterns and vary its approach

### Frontend Interview Indicators

- **FR-2.17**: When artifact is in `interviewing` status, the chat panel should show a subtle banner or indicator (e.g., "Showcase Interview - 3/5 dimensions covered")
- **FR-2.18**: The progress indicator should update as coverage scores change (can be derived from the coverage scores in the last chat message metadata)
- **FR-2.19**: Add a "Skip Interview" text link or button visible during the `interviewing` status for users who want to bypass

## Non-Functional Requirements

- **NFR-2.1**: Resume must load and inject prior Q&A context in <3s (database query + prompt construction)
- **NFR-2.2**: Incremental saves must not add perceptible latency to the chat flow (<500ms per save)
- **NFR-2.3**: The system must handle edge cases gracefully: concurrent tab access to same interview, network drops during save, corrupt Q&A data

## Dependencies

### Prerequisites

- Phase 1 complete: `artifact_interviews` table, `interviewing` status, working interview flow
- Phase 1 tools: `startShowcaseInterview`, `completeShowcaseInterview`
- Existing `user_context` and `skills` tables with populated data

### Outputs for Next Phase

- N/A (final phase)

## Acceptance Criteria

- [ ] Closing the browser mid-interview and returning resumes the interview with full context
- [ ] Prior Q&A pairs are visible in the chat history when resuming
- [ ] Coverage scores are correctly restored on resume
- [ ] The AI continues from the next logical question (doesn't re-ask answered questions)
- [ ] "Skip interview" option is available and produces a warning before proceeding
- [ ] Skipped interviews go directly to research with `interview_skipped: true` in metadata
- [ ] The AI adapts questions based on user profile (doesn't ask about profession when already known)
- [ ] The AI references user skills when asking methodology questions
- [ ] Chat panel shows interview progress indicator during `interviewing` status
- [ ] Each Q&A pair is saved to database immediately (verify with database query after each answer)
- [ ] All Phase 1 functionality continues to work
- [ ] All existing tests pass

---

*Review this PRD and provide feedback before spec generation.*
