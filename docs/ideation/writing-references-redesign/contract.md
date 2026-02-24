# Writing References Redesign Contract

**Created**: 2026-02-24
**Confidence Score**: 96/100
**Status**: Draft

## Problem Statement

NextUp's content agent creates 3 distinct artifact types (blog posts, social posts, showcases) that require dramatically different writing styles. The current Writing Style screen (`/settings/style`) was built as a flat, untyped list of writing examples that:

1. **Has no artifact-type awareness** — all references are stored in a single pool. When the `analyzeWritingCharacteristics` tool runs, it pulls all examples regardless of whether the user is writing a blog or a showcase. This produces diluted, generic style characteristics.

2. **Has broken/limited upload capabilities** — only supports paste and `.txt`/`.md` file read via `file.text()`, which fails silently for binary formats (DOCX, PDF). No URL-based extraction exists at all. Users who write primarily on LinkedIn, Medium, or Substack have no way to import their published work.

3. **Is disconnected from the pipeline** — references exist in the database but the content agent doesn't filter by type, and there's no feedback loop showing users whether their uploaded content was extracted correctly.

The result: the feature exists but delivers no value. Users can't effectively teach the AI their voice per content type, and the content agent produces generic-sounding output.

## Goals

1. **Per-type reference management**: Users can upload, view, and delete writing references organized by artifact type (blog, social post, showcase), with each type having its own collection and progress indicator.

2. **3 extraction methods that work**: Support file upload (.md, .txt, .docx, .pdf), file URL (download + extract), and publication URL (LinkedIn, Medium, Substack, Reddit scraping) — all with reliable text extraction and status feedback.

3. **Extraction verification**: After every upload, show extraction status (pending/extracting/success/failed), a text preview, word count, and allow retry on failure — so users can confirm the system captured their content correctly.

4. **Pipeline integration**: The `analyzeWritingCharacteristics` tool filters references by artifact type, so blog references inform blog writing and showcase references inform showcase writing.

## Success Criteria

- [ ] The `/settings/style` screen shows 3 tabs (Blog, Social Post, Showcase), each with its own reference list and progress indicator
- [ ] Users can upload references via file upload (.md, .txt, .docx, .pdf) with correct text extraction for all formats
- [ ] Users can paste a file URL and the system downloads + extracts text content
- [ ] Users can paste a publication URL (LinkedIn post/article, Medium, Substack, Reddit) and the system scrapes + extracts article content
- [ ] Each reference card shows: name, source type icon, word count, extraction status, content preview, delete button
- [ ] Extraction status is visible (pending, extracting, success, failed) with retry option for failures
- [ ] Users can click a reference to view the full extracted content
- [ ] The `user_writing_examples` table has an `artifact_type` column
- [ ] The `analyzeWritingCharacteristics` tool filters examples by the current artifact's type
- [ ] When zero references exist for a type, the pipeline proceeds with default characteristics (no blocking)
- [ ] No minimum word count enforced — any length reference is accepted
- [ ] Existing writing examples are migrated (assigned a default type or marked as untyped)

## Scope Boundaries

### In Scope

- Frontend: Redesign WritingStylePage with tabbed per-type interface
- Frontend: Multi-method upload flow (file, file URL, publication URL)
- Frontend: Extraction status display, preview, retry, full-content view
- Backend: New extraction endpoint(s) for DOCX, PDF parsing
- Backend: New scraping endpoint using headless browser/HTTP for publication URLs (LinkedIn, Medium, Substack, Reddit)
- Backend: DB migration adding `artifact_type` column to `user_writing_examples`
- Backend: Update `analyzeWritingCharacteristics` to filter by artifact type
- Backend: Update CRUD API to support `artifact_type` parameter
- Data migration: Handle existing untyped references

### Out of Scope

- Auto-analysis of uploaded references (writing characteristics analysis happens during artifact pipeline, not on upload)
- Batch import / bulk upload multiple references at once
- Reference editing (users delete and re-upload, not edit extracted content)
- Reference sharing between users
- Real-time collaborative reference management
- Analytics on reference usage or quality
- OAuth-based import (e.g., connecting LinkedIn account to auto-import posts)

### Future Considerations

- AI-powered reference quality scoring ("this example is too short to be useful")
- Automatic type detection from content ("this looks like a social post")
- Reference deduplication detection
- Import from Google Docs / Notion
- Reference versioning (track when user updates a reference)

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
