# Research Pipeline

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The Research Pipeline is the first step in the content creation process. It uses the Tavily API to gather web research from multiple sources, storing results that inform the writing characteristics analysis and content generation phases.

---

## How It Works

### Tool: `conductDeepResearch`

**Trigger:** Pipeline step 1
**Status transition:** `draft` → `research` (or `interviewing` → `research` for showcases)
**API Provider:** Tavily API (web search)

### Sources

Research queries target 6 source types:
- Reddit
- LinkedIn
- Quora
- Medium
- Substack
- General web

### Flow

1. Generate search queries from artifact title and topic
2. Execute parallel Tavily searches across source types
3. Score results by relevance
4. Store top results in `artifact_research` table
5. Update artifact status to `research`

### Storage

Results stored in `artifact_research` table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| artifact_id | uuid | FK to artifacts |
| source_url | text | Source URL |
| source_type | text | reddit, linkedin, quora, etc. |
| title | text | Article/post title |
| content | text | Extracted content |
| relevance_score | numeric | 0-1 relevance score |
| metadata | jsonb | Additional metadata |
| created_at | timestamptz | Timestamp |

### Usage Downstream

Research results are consumed by:
1. **`analyzeWritingCharacteristics`** — top 10 results by relevance
2. **Content writing prompts** — provide factual grounding

---

## Frontend

The `ResearchArea` component (collapsible section in ArtifactPage) displays research results with source links. It polls during `research` status via `useResearch` hook (2s interval).

---

## Known Limitations

- Limited to Tavily API sources (no direct web scraping)
- Research quality depends on topic specificity
- Duration: 10-30 seconds per run
- No caching between similar topics

---

## Related Documentation

- [artifact-creation-flow.md](../flows/artifact-creation-flow.md) - Pipeline position
- [content-creation-agent.md](./content-creation-agent.md) - Pipeline overview
