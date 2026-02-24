# Showcase Interview

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The Showcase Interview is a guided Q&A feature for `showcase` type artifacts. The AI conducts a 6-question interview across 5 dimensions to gather case study details, then synthesizes a brief that feeds into the content creation pipeline.

---

## What It Does (User Perspective)

1. User creates a `showcase` artifact and clicks "Create Content"
2. AI asks 6 questions one at a time across 5 dimensions
3. User answers each question in the chat panel
4. AI tracks coverage scores and dynamically picks next questions
5. After all questions, AI synthesizes a comprehensive brief
6. Standard content pipeline continues (research → writing → ready)

---

## How It Works (Technical)

### Tools

| Tool | Purpose | DB Writes |
|------|---------|-----------|
| `startShowcaseInterview` | Initialize interview, validate artifact, transition to `interviewing` | `artifacts` (status) |
| `saveInterviewAnswer` | Save Q&A pair incrementally with coverage scores | `artifact_interviews` |
| `completeShowcaseInterview` | Synthesize brief from all answers, store in metadata | `artifact_interviews`, `artifacts` (metadata) |

### Coverage Dimensions (5)

| Dimension | Score Range | Focus |
|-----------|-------------|-------|
| `case_context` | 0-20 | Company, role, timeline, industry |
| `problem_challenge` | 0-20 | Pain points, constraints, stakes |
| `approach_methodology` | 0-20 | Methods, tools, frameworks |
| `results_outcomes` | 0-20 | Metrics, KPIs, before/after |
| `lessons_insights` | 0-20 | Lessons learned, recommendations |

**Completion threshold:** Total score >= 95 (out of 100)

### Status Transitions

```
draft → interviewing (startShowcaseInterview)
interviewing → interviewing (saveInterviewAnswer, incremental)
interviewing → research (conductDeepResearch, after completeShowcaseInterview)
```

Note: `completeShowcaseInterview` does NOT transition status — it stores the brief in `artifacts.metadata.author_brief`. The `conductDeepResearch` tool transitions to `research`.

---

## Database

### artifact_interviews table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| artifact_id | uuid | FK to artifacts |
| user_id | uuid | FK to auth.users |
| question | text | AI-generated question |
| answer | text | User response |
| dimension | text | One of 5 dimensions |
| coverage_scores | jsonb | Per-dimension scores after this answer |
| question_number | integer | 1-6 |
| created_at | timestamptz | Timestamp |

### artifacts.metadata fields

| Field | Set By | Description |
|-------|--------|-------------|
| `author_brief` | completeShowcaseInterview | Synthesized brief from all answers |
| `interview_completed` | completeShowcaseInterview | Boolean flag |
| `interview_coverage_scores` | completeShowcaseInterview | Final coverage scores |
| `interview_question_count` | completeShowcaseInterview | Number of Q&A pairs |

---

## Known Limitations

- Fixed at 6 questions (may not cover all details for complex cases)
- Resume functionality exists but requires artifact to be in `interviewing` status
- Coverage scoring is AI-estimated, not precisely calibrated

---

## Related Documentation

- [showcase-interview-flow.md](../flows/showcase-interview-flow.md) - User flow
- [artifact-creation-flow.md](../flows/artifact-creation-flow.md) - Full pipeline
- [content-creation-agent.md](./content-creation-agent.md) - Pipeline overview
