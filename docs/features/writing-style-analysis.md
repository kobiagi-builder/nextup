# Writing Style Analysis

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

Writing Style Analysis extracts 20+ characteristics from the user's writing examples and artifact context, creating a profile that the content writing phase uses to match the user's voice.

---

## How It Works

### Tool: `analyzeWritingCharacteristics`

**Trigger:** Pipeline step 2 (after `conductDeepResearch`)
**Status transition:** `research` → `foundations`
**AI Provider:** Claude Sonnet (temperature 0.3)

### Input Sources (5)

| Source | Table | Purpose |
|--------|-------|---------|
| Artifact | `artifacts` | Title, content, tone |
| Research | `artifact_research` | Top 10 results by relevance |
| Writing examples | `user_writing_examples` | Max 5 active examples |
| User context | `user_context` | Profession, goals, audience |
| Author brief | `artifacts.metadata` | Interview brief (showcase only) |

### Output: Writing Characteristics

Flexible JSONB structure with characteristics like:

| Characteristic | Example Values | Source |
|---------------|---------------|--------|
| `tone` | formal, casual, professional, conversational | artifact + examples |
| `voice` | first-person, third-person, we/our | examples |
| `sentence_structure` | simple, complex, varied | examples |
| `vocabulary_complexity` | basic, intermediate, advanced | examples |
| `pacing` | fast, measured, thorough | examples |
| `use_of_evidence` | heavy, light, anecdotal | examples |
| `use_of_examples` | frequent, occasional, minimal | examples |
| `emotional_appeal` | logical, emotional, balanced | examples |
| `humor_level` | frequent, occasional, dry_asides, none | examples |
| `hook_style` | question, bold_claim, story, statistic | examples |
| `closing_type` | diagnostic_questions, reflective_question | examples |

Each characteristic includes:
- `value` — the characteristic value
- `confidence` — 0-1 score
- `source` — `'artifact'`, `'examples'`, `'mix'`, or `'default'`
- `reasoning` — explanation

### Storage

Written to `artifact_writing_characteristics` table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| artifact_id | uuid | FK to artifacts |
| characteristics | jsonb | Full characteristics object |
| summary | text | 2-3 sentence human summary |
| recommendations | text | Content generation recommendations |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Last update |

---

## Usage in Pipeline

The characteristics are consumed by:

1. **`writeContentSections`** (Gemini) — main content writing, matches voice
2. **`checkHumanity`** (Claude) — preserves voice during humanization
3. **`improveTextContent`** (Claude) — matches style in improvements

---

## Frontend Display

The `FoundationsSection` component displays characteristics during `skeleton`/`foundations_approval` status via a `WritingCharacteristicsDisplay` sub-component. Users can review how the AI interpreted their style before approving foundations.

---

## Known Limitations

- Requires at least 1 writing example (better with 3+)
- Analysis quality depends on example variety and length
- Characteristics are per-artifact (not globally reused)
- Default fallbacks used if analysis parsing fails

---

## Related Documentation

- [writing-style-setup-flow.md](../flows/writing-style-setup-flow.md) - How examples are uploaded
- [writing-style-page.md](../screens/writing-style-page.md) - Writing examples UI
- [content-creation-agent.md](./content-creation-agent.md) - Pipeline context
