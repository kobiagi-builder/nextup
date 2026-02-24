# PRD: Writing References Redesign - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 3
**Focus**: Binary file parsing (DOCX, PDF) and file URL extraction

## Phase Overview

Phase 2 adds the first two advanced extraction methods: binary file upload (DOCX, PDF) and file URL download + extraction. These require backend processing that plain text files don't — DOCX files need XML parsing and PDF files need text layer extraction.

This phase is sequenced second because it extends the upload flow built in Phase 1 with new backend extraction capabilities, without requiring the more complex web scraping infrastructure needed for publication URLs. After this phase, users can upload references from any common document format, either as a local file or via a hosted URL.

The key technical challenge is asynchronous extraction: binary files and URL downloads take time, so the frontend must handle the `pending → extracting → success/failed` status flow with polling or realtime updates.

## User Stories

1. As a consultant, I want to upload a PDF or Word document of my past writing so the AI can learn my style from formal documents.
2. As a user, I want to paste a URL to a document hosted on Google Drive, Dropbox, or any public URL and have the system extract the text automatically.
3. As a user, I want to see a spinner while extraction is in progress and get notified when it completes or fails.
4. As a user, I want to retry a failed extraction without re-uploading the file.

## Functional Requirements

### Backend — File Parsing Service

- **FR-2.1**: New backend service `ContentExtractorService` with methods for each format: `extractFromDocx(buffer)`, `extractFromPdf(buffer)`, `extractFromMarkdown(text)`, `extractFromTxt(text)`.
- **FR-2.2**: DOCX extraction using `mammoth` npm package — extracts text content from `.docx` files, strips formatting.
- **FR-2.3**: PDF extraction using `pdf-parse` npm package — extracts text from PDF text layers. If no text layer (scanned image PDF), returns extraction failure with message "PDF appears to be image-based. Please use a text-based PDF."
- **FR-2.4**: All extraction methods return `{ success: boolean; content: string; wordCount: number; error?: string }`.

### Backend — File Upload Endpoint

- **FR-2.5**: `POST /api/user/writing-examples/upload` accepts multipart form data with: `file` (the document), `name` (string), `artifact_type` (string).
- **FR-2.6**: Accepts file types: `.md`, `.txt`, `.docx`, `.pdf`. Rejects other types with 400 error.
- **FR-2.7**: Max file size: 10MB. Returns 413 if exceeded.
- **FR-2.8**: Processing flow: receive file → validate type/size → create DB row with `extraction_status: 'extracting'` → extract text → update row with content and `extraction_status: 'success'` or `'failed'`.
- **FR-2.9**: Extraction happens synchronously within the request for files under 5MB. For larger files, respond with 202 and process asynchronously (client polls).

### Backend — File URL Extraction Endpoint

- **FR-2.10**: `POST /api/user/writing-examples/extract-url` accepts JSON body: `{ url: string, name: string, artifact_type: string }`.
- **FR-2.11**: Downloads the file from the URL (follow redirects, timeout 30s, max 10MB).
- **FR-2.12**: Detects file type from Content-Type header and URL extension. Supports `.md`, `.txt`, `.docx`, `.pdf`.
- **FR-2.13**: Creates DB row with `extraction_status: 'extracting'`, `source_url: url` → downloads → extracts → updates with content and final status.
- **FR-2.14**: Responds with 202 Accepted and the created row ID. Client polls for status.
- **FR-2.15**: URL validation: must be HTTPS, must not point to localhost or private IPs (SSRF prevention).

### Backend — Retry Endpoint

- **FR-2.16**: `POST /api/user/writing-examples/:id/retry` re-triggers extraction for a failed reference. Only works if `extraction_status` is `'failed'`.
- **FR-2.17**: For `source_type: 'file_upload'`, the file must have been stored (see FR-2.18). For `source_type: 'url'`, re-downloads from `source_url`.
- **FR-2.18**: Uploaded files stored temporarily in Supabase Storage bucket `writing-reference-uploads` for retry capability. Auto-deleted after 7 days or after successful extraction.

### Frontend — Extended Upload Flow

- **FR-2.19**: Upload dialog method selection updated: **Paste Text** | **Upload File** | **File URL** (3 tabs).
- **FR-2.20**: Upload File tab: drag-and-drop zone + file picker. Shows accepted formats (.md, .txt, .docx, .pdf). Shows file size limit (10MB).
- **FR-2.21**: File URL tab: URL input field with paste button. Validates URL format client-side before submit.
- **FR-2.22**: After submit, dialog closes and reference appears in list with `extraction_status: 'extracting'` (spinner).

### Frontend — Status Polling

- **FR-2.23**: References with `extraction_status: 'extracting'` or `'pending'` poll every 2 seconds via React Query `refetchInterval`.
- **FR-2.24**: When status changes to `'success'`, card updates to show content preview and word count.
- **FR-2.25**: When status changes to `'failed'`, card shows error message and "Retry" button.
- **FR-2.26**: Retry button calls the retry endpoint and resets status to `'extracting'`.

## Non-Functional Requirements

- **NFR-2.1**: File upload endpoint handles files up to 10MB within 10 seconds for DOCX/PDF extraction.
- **NFR-2.2**: URL download timeout at 30 seconds. Fail gracefully if target server is slow.
- **NFR-2.3**: SSRF prevention: block private IP ranges, localhost, and non-HTTPS URLs.
- **NFR-2.4**: Uploaded files in Supabase Storage encrypted at rest. Auto-cleanup after 7 days.
- **NFR-2.5**: Error messages are user-friendly: "Could not extract text from this PDF" not "pdf-parse threw ENOENT".

## Dependencies

### Prerequisites

- Phase 1 complete (per-type data model, tabbed UI, extraction_status column)
- npm packages: `mammoth` (DOCX), `pdf-parse` (PDF), `multer` (multipart upload)
- Supabase Storage bucket for temporary file storage

### Outputs for Next Phase

- `ContentExtractorService` reusable for URL-fetched content in Phase 3
- File URL extraction pattern reusable for publication URL scraping
- Status polling infrastructure reusable for async scraping jobs

## Acceptance Criteria

- [ ] Users can upload .docx files and see extracted text content
- [ ] Users can upload .pdf files and see extracted text content
- [ ] Image-based PDFs show a clear failure message
- [ ] Users can paste a URL to a .docx/.pdf/.md/.txt file and content is extracted
- [ ] Extraction status shows spinner while processing, green check on success, red badge on failure
- [ ] Failed extractions can be retried via retry button
- [ ] File size over 10MB is rejected with clear error
- [ ] Non-HTTPS URLs are rejected
- [ ] Upload drag-and-drop works on the file upload tab
- [ ] Backend build compiles with no TypeScript errors
- [ ] Frontend build compiles with no TypeScript errors

---

*Review this PRD and provide feedback before spec generation.*
