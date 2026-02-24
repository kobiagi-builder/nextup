# PRD: Writing References Redesign - Phase 3

**Contract**: ./contract.md
**Phase**: 3 of 3
**Focus**: Publication URL scraping (LinkedIn, Medium, Substack, Reddit)

## Phase Overview

Phase 3 adds the highest-value extraction method: scraping published content from social and publishing platforms. This is the most requested capability because consultants and advisors typically have their best writing already published on LinkedIn, Medium, or Substack — not sitting as local files.

This phase is sequenced last because it requires the most complex backend infrastructure (headless browser or HTTP scraping per platform), has the highest variability (platform HTML changes over time), and benefits from the extraction pipeline built in Phase 2. After this phase, users can import their published work from any major platform with a single URL paste.

The key technical challenge is platform-specific scraping: each platform renders content differently, some require JavaScript rendering, and some have anti-scraping measures. The backend scraper must handle each platform's quirks while presenting a uniform extraction experience to the user.

## User Stories

1. As a consultant who posts on LinkedIn, I want to paste a LinkedIn post or article URL and have my writing extracted as a reference.
2. As a blogger on Medium/Substack, I want to import my published articles by URL so I don't have to copy-paste content manually.
3. As a user who posts on Reddit, I want to paste a Reddit post URL and have the post content extracted (not comments).
4. As a user, I want to see which platform a reference was imported from (LinkedIn icon, Medium icon, etc.) for quick visual identification.

## Functional Requirements

### Backend — Publication Scraper Service

- **FR-3.1**: New `PublicationScraperService` with platform-specific scrapers: `scrapeLinkedIn(url)`, `scrapeMedium(url)`, `scrapeSubstack(url)`, `scrapeReddit(url)`.
- **FR-3.2**: Platform detection from URL patterns:
  - LinkedIn posts: `linkedin.com/posts/`, `linkedin.com/pulse/`, `linkedin.com/feed/update/`
  - Medium: `medium.com/`, `*.medium.com/`, custom domain Medium blogs
  - Substack: `*.substack.com/p/`, custom domain Substack
  - Reddit: `reddit.com/r/*/comments/`, `old.reddit.com/`
- **FR-3.3**: LinkedIn scraping: Use HTTP fetch with appropriate headers. Extract article body from `<article>` or meta description for short posts. Handle both LinkedIn posts (short) and LinkedIn articles/pulse (long-form).
- **FR-3.4**: Medium scraping: Fetch the page, extract article content from `<article>` tag. Handle both `medium.com` and custom domain Medium blogs.
- **FR-3.5**: Substack scraping: Fetch the page, extract post content from the post body container. Handle both `*.substack.com` and custom domains.
- **FR-3.6**: Reddit scraping: Use Reddit's public JSON API (`{url}.json`) to extract post body (selftext). Extract only the original post, not comments.
- **FR-3.7**: Generic fallback: For unrecognized URLs, attempt to extract main content using Readability-style heuristics (largest text block, `<article>` tag, Open Graph description).
- **FR-3.8**: All scrapers return: `{ success: boolean; content: string; wordCount: number; title?: string; platform: string; error?: string }`.

### Backend — Publication Extraction Endpoint

- **FR-3.9**: `POST /api/user/writing-examples/extract-publication` accepts JSON body: `{ url: string, name?: string, artifact_type: string }`.
- **FR-3.10**: Detects platform from URL → routes to appropriate scraper → creates DB row with `extraction_status: 'extracting'`, `source_type: 'url'`, `source_url: url`.
- **FR-3.11**: If `name` is not provided, auto-generates from scraped title or URL slug.
- **FR-3.12**: Responds with 202 Accepted and the created row ID. Extraction happens asynchronously.
- **FR-3.13**: On success: updates row with extracted content, word count, and `extraction_status: 'success'`.
- **FR-3.14**: On failure: updates row with error message and `extraction_status: 'failed'`. Supports retry via existing retry endpoint (FR-2.16).

### Backend — Scraping Infrastructure

- **FR-3.15**: Use `undici` or `node-fetch` for HTTP requests with timeout (30s), user-agent rotation, and redirect following.
- **FR-3.16**: Use `cheerio` for HTML parsing (no headless browser in Phase 3 — keep it lightweight). If Cheerio-based extraction fails for a platform, log it for future headless browser upgrade.
- **FR-3.17**: Rate limiting: max 5 scraping requests per user per minute to prevent abuse.
- **FR-3.18**: Cache scraped content by URL hash for 1 hour to avoid re-scraping the same URL.

### Frontend — Publication URL Tab

- **FR-3.19**: Upload dialog method selection updated to 4 tabs: **Paste Text** | **Upload File** | **File URL** | **Publication URL**.
- **FR-3.20**: Publication URL tab: URL input with platform auto-detection. When user pastes a URL, show detected platform icon and name (e.g., "LinkedIn Article detected").
- **FR-3.21**: Supported platforms displayed as visual chips/icons: LinkedIn, Medium, Substack, Reddit. Plus "Other URL" for generic extraction.
- **FR-3.22**: After submit, same status flow as Phase 2: card appears with `'extracting'` status, polls until complete.

### Frontend — Source Type Icons

- **FR-3.23**: Reference cards show platform-specific icons for publication URLs: LinkedIn (LinkedIn icon), Medium (M icon), Substack (Substack icon), Reddit (Reddit icon).
- **FR-3.24**: For file uploads: document icon. For paste: text icon. For file URLs: link icon.
- **FR-3.25**: Source URL displayed as a clickable link on the reference card (opens in new tab) for publication references.

## Non-Functional Requirements

- **NFR-3.1**: Scraping completes within 30 seconds per URL or fails with timeout.
- **NFR-3.2**: Rate limiting prevents scraping abuse (5 requests/user/minute).
- **NFR-3.3**: No private data exposure: scraper only accesses publicly available content (no auth-required pages).
- **NFR-3.4**: Error messages specify the platform: "Could not extract content from this LinkedIn post" not generic errors.
- **NFR-3.5**: Scraping infrastructure must be modular — adding a new platform should only require adding a new scraper function, not changing the API or frontend.

## Dependencies

### Prerequisites

- Phase 2 complete (ContentExtractorService, status polling, retry endpoint)
- npm packages: `cheerio` (HTML parsing), `undici` or `node-fetch` (HTTP client)
- Existing retry infrastructure from Phase 2

### Outputs for Next Phase

- Complete writing references feature — no further phases planned
- Modular scraping infrastructure reusable for future platforms (Twitter/X, blogs, etc.)

## Acceptance Criteria

- [ ] Users can paste a LinkedIn post URL and see extracted content
- [ ] Users can paste a LinkedIn article/pulse URL and see extracted content
- [ ] Users can paste a Medium article URL and see extracted content
- [ ] Users can paste a Substack post URL and see extracted content
- [ ] Users can paste a Reddit post URL and see the post text extracted (no comments)
- [ ] Unrecognized URLs attempt generic extraction with fallback
- [ ] Platform is auto-detected from URL and shown to user before submission
- [ ] Platform-specific icons appear on reference cards
- [ ] Source URL is clickable on reference cards
- [ ] Failed scrapes show platform-specific error messages
- [ ] Failed scrapes can be retried
- [ ] Rate limiting prevents more than 5 scrape requests per user per minute
- [ ] Backend build compiles with no TypeScript errors
- [ ] Frontend build compiles with no TypeScript errors

---

*Review this PRD and provide feedback before spec generation.*
