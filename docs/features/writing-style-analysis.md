# Writing Style Analysis

**Created:** 2026-02-19
**Last Updated:** 2026-02-24
**Version:** 2.0.0
**Status:** Complete

## Overview

Writing Style Analysis extracts 20+ characteristics from the user's writing examples and artifact context, creating a profile that the content writing phase uses to match the user's voice. As of Phase 1 of the Writing References Redesign, examples are **categorized by artifact type** (blog, social_post, showcase), and the analysis tool filters examples to match the artifact being created.

---

## Writing References System

### Per-Artifact-Type References

Users maintain separate reference collections for each content type:

| Artifact Type | Purpose | Example References |
|---------------|---------|-------------------|
| `blog` | Long-form blog posts | LinkedIn articles, Medium posts, personal blog entries |
| `social_post` | Short-form social media | LinkedIn posts, Twitter threads |
| `showcase` | Case studies | Client case studies, project showcases |

Each type has dramatically different writing characteristics. Separate collections ensure the AI learns the correct voice per format.

### Upload Methods (4)

| Method | Source Type | Endpoint | Sync/Async |
|--------|-----------|----------|------------|
| Paste text | `pasted` | `POST /api/user/writing-examples` | Sync (201) |
| File upload | `file_upload` | `POST /api/user/writing-examples/upload` | Sync (201) |
| File URL | `url` | `POST /api/user/writing-examples/extract-url` | Async (202+poll) |
| Publication URL | `url` | `POST /api/user/writing-examples/extract-publication` | Async (202+poll) |

### File Parsing

Binary file formats are parsed server-side by `contentExtractor.ts`:

| Format | Library | Method |
|--------|---------|--------|
| `.txt`, `.md` | Built-in | `buffer.toString('utf-8')` |
| `.docx` | mammoth | `mammoth.extractRawText({ buffer })` |
| `.pdf` | pdf-parse v2 | `PDFParse` class with `getText()` |

### Publication Scraping

Publication URLs are scraped by `publicationScraper.ts`:

| Platform | Library | Extraction Method |
|----------|---------|-------------------|
| LinkedIn | cheerio | `<article>` / `og:description` / JSON-LD |
| Medium | cheerio | `<article>` / semantic elements |
| Substack | cheerio | `.post-content` / `.body.markup` |
| Reddit | fetch (JSON API) | Append `.json`, extract `selftext` |
| Generic | cheerio | `<article>` / `<main>` / paragraph heuristic |

Scrape results are cached in-memory for 1 hour (MD5 URL hash key). Rate limited to 5 requests/user/minute.

### Extraction Status

| Status | Meaning |
|--------|---------|
| `success` | Content extracted, ready for analysis |
| `extracting` | Async extraction in progress |
| `failed` | Extraction failed (retry available for URL-based refs) |
| `pending` | Waiting to start |

---

## How It Works

### Tool: `analyzeWritingCharacteristics`

**Trigger:** Pipeline step 2 (after `conductDeepResearch`)
**Status transition:** `research` -> `foundations`
**AI Provider:** Claude Sonnet (temperature 0.3)

### Input Sources (5)

| Source | Table | Purpose |
|--------|-------|---------|
| Artifact | `artifacts` | Title, content, tone |
| Research | `artifact_research` | Top 10 results by relevance |
| Writing examples | `user_writing_examples` | Max 5 active examples **filtered by artifact_type** |
| User context | `user_context` | Profession, goals, audience |
| Author brief | `artifacts.metadata` | Interview brief (showcase only) |

**Key change:** The tool now filters `user_writing_examples` by `artifact_type` matching the artifact being created:

```typescript
// writingCharacteristicsTools.ts line 422-428
const { data: writingExamples } = await getSupabase()
  .from('user_writing_examples')
  .select('name, content, analyzed_characteristics')
  .eq('user_id', artifact.user_id)
  .eq('is_active', true)
  .eq('artifact_type', artifactType)
  .limit(5);
```

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
- `value` -- the characteristic value
- `confidence` -- 0-1 score
- `source` -- `'artifact'`, `'examples'`, `'mix'`, or `'default'`
- `reasoning` -- explanation

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

1. **`writeContentSections`** (Gemini) -- main content writing, matches voice
2. **`checkHumanity`** (Claude) -- preserves voice during humanization
3. **`improveTextContent`** (Claude) -- matches style in improvements

---

## Frontend Display

The `FoundationsSection` component displays characteristics during `skeleton`/`foundations_approval` status via a `WritingCharacteristicsDisplay` sub-component. Users can review how the AI interpreted their style before approving foundations.

---

## Backend Services

| Service | File | Purpose |
|---------|------|---------|
| Content Extractor | `backend/src/services/contentExtractor.ts` | DOCX/PDF/MD/TXT text extraction |
| Publication Scraper | `backend/src/services/publicationScraper.ts` | LinkedIn/Medium/Substack/Reddit scraping |
| Upload Controller | `backend/src/controllers/writingExamplesUpload.controller.ts` | File upload, URL extraction, retry, publication extraction |
| CRUD Controller | `backend/src/controllers/writingExamples.controller.ts` | List, get, create, update, delete |

---

## Known Limitations

- Requires at least 1 writing example per artifact type (better with 3+)
- Analysis quality depends on example variety and length
- Characteristics are per-artifact (not globally reused)
- Default fallbacks used if analysis parsing fails
- LinkedIn scraping only works for public posts (authentication-protected posts will fail)
- Publication scraper uses in-memory cache (lost on server restart)

---

## Related Documentation

- [writing-style-setup-flow.md](../flows/writing-style-setup-flow.md) - How examples are uploaded
- [writing-style-page.md](../screens/writing-style-page.md) - Writing references UI
- [content-creation-agent.md](./content-creation-agent.md) - Pipeline context
- [content-agent-endpoints.md](../api/content-agent-endpoints.md) - API endpoints
