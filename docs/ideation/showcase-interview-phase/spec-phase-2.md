# Implementation Spec: Showcase Interview Phase - Phase 2

**PRD**: ./prd-phase-2.md
**Estimated Effort**: M (Medium)

## Technical Approach

Phase 2 adds resilience and polish to the Phase 1 interview system. The three main additions are: (1) incremental Q&A persistence via a new `saveInterviewAnswer` tool that saves each answer immediately, (2) interview resume that detects existing interview state and loads prior Q&A pairs into the conversation context, and (3) skip interview support with a warning flow.

The key architectural decision is that resume works by injecting prior Q&A pairs into the system prompt rather than replaying messages. When a user returns to an artifact in `interviewing` status, the system prompt includes a "Resume Context" section with all prior questions and answers, enabling Claude to continue naturally without re-asking questions.

Adaptive questioning is already partially handled by Phase 1 (the `startShowcaseInterview` tool returns user profile data). Phase 2 enhances this by explicitly instructing Claude to leverage the profile in its question selection and by adding prior artifact analysis for question variety.

## File Changes

### New Files

None - all changes are modifications to existing Phase 1 files.

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/services/ai/tools/interviewTools.ts` | Add `saveInterviewAnswer` tool; modify `startShowcaseInterview` to check for existing interview; modify `completeShowcaseInterview` to skip bulk insert if already saved incrementally |
| `backend/src/services/ai/prompts/systemPrompts.ts` | Add resume detection logic, skip interview handling, enhanced adaptive questioning instructions |
| `backend/src/services/ai/AIService.ts` | Register `saveInterviewAnswer` in `AVAILABLE_TOOLS`; add interview data fetching for resume context |
| `backend/src/services/ai/tools/index.ts` | Export `saveInterviewAnswer` |
| `frontend/src/features/portfolio/components/chat/ChatPanel.tsx` | Add interview progress indicator and skip button |
| `frontend/src/features/portfolio/stores/chatStore.ts` | Add interview state tracking (question count, dimensions covered) |

## Implementation Details

### 1. Incremental Persistence: `saveInterviewAnswer` Tool

**Pattern to follow**: `startShowcaseInterview` in `interviewTools.ts`

**Overview**: A new tool that saves a single Q&A pair to the database immediately after each answer. Claude calls this after processing each user response.

```typescript
export const saveInterviewAnswer = tool({
  description: 'Save a single interview Q&A pair to the database. Call this after each user answer during a showcase interview. This enables resume if the user leaves mid-interview.',
  inputSchema: z.object({
    artifactId: z.string(),
    questionNumber: z.number(),
    dimension: z.enum(DIMENSIONS),
    question: z.string().describe('The question that was asked'),
    answer: z.string().describe('The user answer'),
    coverageScores: coverageScoresSchema.describe('Updated coverage scores after this answer'),
  }),
  execute: async ({ artifactId, questionNumber, dimension, question, answer, coverageScores }) => {
    logToFile('TOOL EXECUTED: saveInterviewAnswer', { artifactId, questionNumber, dimension });

    const { error } = await supabaseAdmin
      .from('artifact_interviews')
      .upsert({
        artifact_id: artifactId,
        question_number: questionNumber,
        dimension,
        question,
        answer,
        coverage_scores: coverageScores,
      }, {
        onConflict: 'artifact_id,question_number',
      });

    if (error) {
      logger.error('[saveInterviewAnswer] Failed to save', { error: error.message });
      return { success: false, error: error.message };
    }

    const totalScore = Object.values(coverageScores).reduce((a, b) => a + b, 0);

    return {
      success: true,
      questionNumber,
      totalCoverageScore: totalScore,
      readyToComplete: totalScore >= 95,
    };
  },
});
```

**Key decisions**:
- Uses `upsert` with `onConflict` on `(artifact_id, question_number)` for idempotency
- Returns `readyToComplete` flag so Claude knows when to start wrapping up
- Coverage scores are saved with each row, enabling score-over-time tracking

**Implementation steps**:
1. Add the tool definition to `interviewTools.ts`
2. Export from `index.ts`
3. Register in `AVAILABLE_TOOLS`
4. Update system prompt to instruct Claude to call `saveInterviewAnswer` after each user response

### 2. Update `completeShowcaseInterview` for Incremental Mode

**Overview**: When Q&A pairs are already saved incrementally (Phase 2), `completeShowcaseInterview` should skip the bulk insert and only handle the brief synthesis and metadata update.

```typescript
// In completeShowcaseInterview.execute, after validation:

// Check if pairs already saved incrementally
const { data: existingPairs, error: checkError } = await supabaseAdmin
  .from('artifact_interviews')
  .select('id')
  .eq('artifact_id', artifactId)
  .limit(1);

const alreadySavedIncrementally = existingPairs && existingPairs.length > 0;

if (!alreadySavedIncrementally && interviewPairs.length > 0) {
  // Bulk insert (Phase 1 fallback)
  const rows = interviewPairs.map(pair => ({ /* ... existing logic ... */ }));
  await supabaseAdmin.from('artifact_interviews').insert(rows);
}

// Rest of the function unchanged (metadata update, brief storage)
```

**Implementation steps**:
1. Add check for existing incrementally-saved pairs
2. Skip bulk insert if pairs already exist
3. Keep metadata update logic unchanged

### 3. Interview Resume in System Prompt

**Pattern to follow**: Existing `getBaseSystemPrompt()` conditional sections

**Overview**: When `screenContext.artifactStatus === 'interviewing'`, fetch existing Q&A pairs from the database and inject them into the system prompt as a "Resume Context" section.

This requires a change in `AIService.ts` to fetch interview data before building the system prompt:

```typescript
// In AIService.streamChat, after fetching userContext:
let interviewContext: InterviewResumeData | null = null;

if (screenContext?.artifactStatus === 'interviewing' && screenContext?.artifactId) {
  const { data: existingPairs } = await supabaseAdmin
    .from('artifact_interviews')
    .select('question_number, dimension, question, answer, coverage_scores')
    .eq('artifact_id', screenContext.artifactId)
    .order('question_number', { ascending: true });

  if (existingPairs && existingPairs.length > 0) {
    const lastScores = existingPairs[existingPairs.length - 1].coverage_scores;
    interviewContext = {
      pairs: existingPairs,
      lastCoverageScores: lastScores,
      questionCount: existingPairs.length,
    };
  }
}

const finalSystemPrompt = systemPrompt ?? getBaseSystemPrompt(
  userContext, screenContext, selectionContext, interviewContext  // NEW param
);
```

Then in `systemPrompts.ts`, add interview resume context injection:

```typescript
// In getBaseSystemPrompt, inside the showcase interview block:
if (interviewContext && interviewContext.pairs.length > 0) {
  prompt += `
### INTERVIEW RESUME CONTEXT

This interview was interrupted and is being resumed. Here are the previous Q&A pairs:

${interviewContext.pairs.map(p =>
  `**Q${p.question_number} [${p.dimension}]**: ${p.question}\n**A${p.question_number}**: ${p.answer}`
).join('\n\n')}

**Current coverage scores**: ${JSON.stringify(interviewContext.lastCoverageScores)}
**Total score**: ${Object.values(interviewContext.lastCoverageScores).reduce((a, b) => a + b, 0)}/100
**Questions asked so far**: ${interviewContext.questionCount}

**IMPORTANT**: Do NOT re-ask these questions. Continue from question ${interviewContext.questionCount + 1}.
Acknowledge the resume briefly: "Welcome back! I have your previous answers. Let me continue where we left off."
Then ask the next question targeting the lowest-coverage dimension.
`
}
```

**Key decisions**:
- Resume data is injected into the system prompt (not conversation messages) to avoid message format issues
- Claude gets full Q&A history and scores so it can make intelligent decisions about what to ask next
- A brief resume acknowledgment keeps the user oriented

**Implementation steps**:
1. Add interview data fetching in `AIService.streamChat`
2. Pass `interviewContext` to `getBaseSystemPrompt`
3. Update function signature to accept optional `interviewContext`
4. Add resume context injection in the showcase interview prompt block

### 4. Update `startShowcaseInterview` for Resume

**Overview**: When called on an artifact that already has interview data (user clicked "Create content" again), detect and handle resume.

```typescript
// In startShowcaseInterview.execute, after validation:

// Check for existing interview data (resume scenario)
const { data: existingPairs } = await supabaseAdmin
  .from('artifact_interviews')
  .select('question_number, dimension, question, answer, coverage_scores')
  .eq('artifact_id', artifactId)
  .order('question_number', { ascending: true });

if (existingPairs && existingPairs.length > 0) {
  // Resume mode - don't change status (already interviewing)
  const lastScores = existingPairs[existingPairs.length - 1].coverage_scores;

  return {
    success: true,
    isResume: true,
    existingPairs: existingPairs,
    lastCoverageScores: lastScores,
    questionCount: existingPairs.length,
    // ... also return userProfile and userSkills as before
    instructions: `Resuming interview. ${existingPairs.length} questions already answered. Continue from question ${existingPairs.length + 1}, targeting the lowest coverage dimension.`,
  };
}

// New interview - proceed as Phase 1
```

**Implementation steps**:
1. Add existing interview data check at the start of execute
2. Return resume data if pairs exist
3. Keep new interview logic for the no-data case

### 5. Skip Interview Support

**Overview**: Add handling for when the user wants to skip the interview. This is detected in the system prompt and handled through the existing chat flow.

In `systemPrompts.ts`, add to the showcase interview block:

```typescript
prompt += `
### Skip Interview

If the user explicitly asks to skip the interview (e.g., "skip interview", "just write it", "I don't need the interview"):
1. Inform them: "I can skip the interview, but the showcase content will be less specific to your actual experience since I won't have detailed case information. The content will be based on the title and any description you provided."
2. If they confirm, call conductDeepResearch directly (skip startShowcaseInterview)
3. The artifact will transition draft -> research (skipping interviewing status)
4. Note: the research and writing will use whatever brief description exists, which may result in more generic content
`

// In completeShowcaseInterview or a separate metadata update,
// if skipped, store interview_skipped: true in metadata
```

For the frontend, update `systemPrompts.ts` to handle the "Create content:" detection:

```typescript
// Update the showcase interview override:
// When a "Create content:" message arrives for a showcase:
// - Check if the message also contains "skip interview" or similar
// - If yes, proceed directly to conductDeepResearch
// - If no, call startShowcaseInterview
```

**Implementation steps**:
1. Add skip detection instructions to the system prompt
2. No tool changes needed (skip bypasses interview tools entirely)
3. When skipping, store `interview_skipped: true` in artifact metadata

### 6. Enhanced Adaptive Questioning

**Overview**: Strengthen the system prompt instructions to more explicitly use profile data.

Add to the showcase interview prompt block:

```typescript
prompt += `
### Adaptive Questioning (use profile knowledge)

You have access to the user's profile. Use it:

**What you already know (DO NOT ask about):**
${userContext?.profession ? `- Profession/Role: ${JSON.stringify(userContext.profession)}` : ''}
${userContext?.about_me ? `- Background: Bio and value proposition are known` : ''}
${userContext?.customers ? `- Target audience: Known from profile` : ''}

**How to adapt questions:**
- If the user is a "product consultant", ask about product-specific details (roadmaps, stakeholder alignment, feature prioritization)
- If the user lists specific skills (e.g., "data analysis"), probe how those skills were applied in this case
- If the user has prior showcase artifacts, vary your question style from previous interviews
- Reference known expertise: "Given your experience in [expertise area], what was different about this case?"
`
```

**Implementation steps**:
1. Add adaptive questioning section with dynamic profile data injection
2. This builds on Phase 1's profile data fetching - no new data needed

### 7. Frontend: Interview Progress Indicator

**Pattern to follow**: Existing status indicators in `ChatPanel.tsx`

**Overview**: Show a subtle banner when artifact is in `interviewing` status.

```tsx
// In ChatPanel.tsx, add conditional banner:
{artifact?.status === 'interviewing' && (
  <div className="flex items-center justify-between px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20">
    <div className="flex items-center gap-2 text-sm text-indigo-400">
      <MessageCircleQuestion className="h-4 w-4" />
      <span>Showcase Interview</span>
    </div>
    <button
      onClick={handleSkipInterview}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Skip interview
    </button>
  </div>
)}
```

The "Skip interview" button sends a chat message: "Skip the interview and proceed to research directly."

**Key decisions**:
- Progress is shown as a simple label, not a detailed dimension breakdown (keep it lightweight)
- Skip is a text link, not a prominent button (interview is recommended, skip is the exception)
- The skip action works through the chat (sends a message that Claude interprets)

**Implementation steps**:
1. Import `MessageCircleQuestion` icon from Lucide
2. Add conditional banner in `ChatPanel.tsx`
3. Add `handleSkipInterview` handler that sends a chat message
4. Style to match existing UI patterns

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/unit/services/ai/tools/interviewTools.test.ts` | `saveInterviewAnswer` tool, resume detection in `startShowcaseInterview`, incremental persistence skip in `completeShowcaseInterview` |

**Key test cases**:
- `saveInterviewAnswer` upserts correctly (insert new, update existing)
- `saveInterviewAnswer` returns `readyToComplete: true` when score >= 95
- `startShowcaseInterview` detects existing interview data and returns resume context
- `completeShowcaseInterview` skips bulk insert when pairs already saved incrementally
- Resume context includes all prior Q&A pairs in correct order

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/integration/interviewResume.integration.test.ts` | Full resume flow: start -> save 3 answers -> "abandon" -> resume -> verify context |

**Key scenarios**:
- Start interview, save 3 answers, then call `startShowcaseInterview` again -> returns resume data
- Full skip flow: detect skip intent, verify direct transition to research
- Interview data persists across simulated sessions (database roundtrip)

### Manual Testing

- [ ] Start a showcase interview, answer 3 questions, then refresh the page
- [ ] Return to the artifact and verify the interview resumes with prior context
- [ ] Verify the AI doesn't re-ask questions from the previous session
- [ ] Click "Skip interview" and verify the warning message appears
- [ ] Confirm skip and verify research starts without interview
- [ ] Verify the interview progress indicator appears during `interviewing` status
- [ ] Verify the indicator disappears when interview completes

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| `saveInterviewAnswer` fails (DB error) | Return error, Claude continues conversation (answer not lost from context, just not persisted). Next save will retry. |
| Resume loads corrupt/incomplete data | Claude works with what's available, asks clarifying questions as needed |
| User sends non-answer during interview | System prompt instructs Claude to acknowledge and redirect |
| Concurrent sessions for same interview | Upsert handles duplicates; latest answer wins |

## Validation Commands

```bash
# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Unit tests
cd backend && npm run test:unit

# Integration tests
cd backend && npm run test:integration

# Full build
npm run build
```

## Rollout Considerations

- **Feature flag**: Not needed - incremental save and resume are backwards compatible
- **Data migration**: None - Phase 1 table structure supports both batch and incremental modes
- **Monitoring**: Monitor `saveInterviewAnswer` tool call frequency to ensure it's not adding excessive DB writes
- **Rollback plan**: Revert the `saveInterviewAnswer` tool registration. Phase 1 batch mode continues to work.

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
