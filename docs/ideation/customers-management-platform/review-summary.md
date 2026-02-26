# Review Summary: Customers Management Platform

**Date**: 2026-02-25
**Reviews**: Architecture (37 issues) + Design (41 issues) = 78 total
**Evaluation**: Applied /receiving-code-review principles - critical verification, no blind acceptance

## Disposition Summary

| Verdict | Count | Description |
|---------|-------|-------------|
| ACCEPT | 62 | Valid finding, fix incorporated into specs |
| PARTIALLY ACCEPT | 5 | Valid concern, different fix than suggested |
| REJECT | 3 | False positive or over-engineering |
| DEFER | 3 | Valid but belongs in a later phase |
| **Total** | **73** | (5 duplicates between arch/design reviews merged) |

---

## Architecture Review Evaluations (37 issues)

### CRITICAL (5) - All Accepted

| ID | Verdict | Rationale |
|----|---------|-----------|
| BLIND-001 | **ACCEPT** | Verified: `ChatConfig` has no `endpoint` field. Customer chat would silently route to Content Agent. Fix: add `endpoint?: string` to ChatConfig, modify `useAIChat` to accept endpoint override. |
| BLIND-002 | **ACCEPT** | Verified: `ScreenContext` type lacks `customerId`. Fix: extend ScreenContext as discriminated union with customer variant, put `customerId` in request body. |
| BLIND-003 | **ACCEPT** | Verified: tool-result loop in `useAIChat` fires globally. Fix: create `useCustomerStructuredChat` hook, scope tool-result processing by context key. |
| BLIND-004 | **ACCEPT** | Valid performance concern. `IN (subquery)` scales poorly. Fix: create `is_customer_owner()` helper function + composite index `customers(user_id, id)`. |
| BLIND-005 | **ACCEPT** | Valid architectural concern. Fix: extend `AIService.streamChat` to accept `tools` and `systemPrompt` overrides instead of calling `streamText` directly. |

### HIGH (11) - 10 Accepted, 1 Partially Accepted

| ID | Verdict | Rationale |
|----|---------|-----------|
| BLIND-006 | **ACCEPT** | Filter state in Zustand conflicts with Phase 5 URL params. Fix: use URL query params (`useSearchParams`) as source of truth for filters from Phase 1. Remove filter state from Zustand store. |
| BLIND-007 | **PARTIALLY ACCEPT** | Valid that fetching all receivables client-side is problematic. However, direct Supabase reads is the existing Portfolio pattern. Fix: add backend summary endpoint from Phase 2 (not Phase 5) for aggregated customer card data. Keep direct Supabase reads for individual entity pages. |
| BLIND-008 | **ACCEPT** | Valid ambiguity. Fix: explicitly specify using `RichTextEditor` (the TipTap wrapper), not `ArtifactEditor` (portfolio-coupled). Add shared extraction step. |
| BLIND-009 | **ACCEPT** | sessionStorage-only chat loses context on tab close. Fix: add `customer_chat_messages` table to Phase 1 schema (schema-only), activate with save/load endpoints in Phase 4. |
| BLIND-010 | **ACCEPT** | Non-atomic read-modify-write is a real race condition. Fix: use PostgreSQL `info || $1` atomic JSONB merge. |
| BLIND-011 | **ACCEPT** | JS float precision is real for financial calc. Fix: move balance calculation to backend using PostgreSQL NUMERIC arithmetic. Add negative balance handling. |
| BLIND-012 | **ACCEPT** | Routing ignoring conversation history causes agent thrashing. Fix: check last 3 messages for context, add active agent stickiness, fix `@mention` to use `.includes()`. |
| BLIND-013 | **ACCEPT** | `0XX` placeholder is ambiguous. Fix: replace with instruction to check existing migrations and use next sequential number. |
| BLIND-014 | **DEFER** | Valid but this is Phase 5 work. Fix: add GIN index or join table specification to spec-phase-5.md. |
| BLIND-015 | **ACCEPT** | Local state resets on tab switch. Fix: store `selectedProjectId` in customerStore (Zustand) keyed by customer ID. |
| BLIND-016 | **ACCEPT** | Valid testability concern. Fix: agent tools accept injected `supabase` parameter instead of calling `getSupabase()` internally. |

### MEDIUM (15) - 14 Accepted, 1 Deferred

| ID | Verdict | Rationale |
|----|---------|-----------|
| BLIND-017 | **ACCEPT** | Hard delete destroys financial history. Fix: add `deleted_at TIMESTAMPTZ` column, update RLS to add `AND deleted_at IS NULL`. |
| BLIND-018 | **ACCEPT** | Low cost to add now, prevents migration later. Fix: add `override_status TEXT` to `customer_agreements`. |
| BLIND-019 | **ACCEPT** | Agent needs structured pricing context. Fix: add `unit` field to `AgreementPricing`. |
| BLIND-020 | **ACCEPT** | LLM produces Markdown, TipTap expects HTML. Fix: store as Markdown, convert on editor load using markdown-to-html utility. |
| BLIND-021 | **ACCEPT** | Context builder has no token budget. Fix: add `contextTokenBudget` parameter with priority-based truncation. |
| BLIND-022 | **ACCEPT** | Post-creation navigation not in FRs. Fix: add explicit FR to prd-phase-1.md. |
| BLIND-023 | **ACCEPT** | Chat hook needs activeTab from store. Fix: add `activeCustomerId` and `activeTab` to customerStore. |
| BLIND-024 | **ACCEPT** | Phase 3 cross-reference criterion is trivially met. Fix: remove from Phase 3, note as Phase 5 work. |
| BLIND-025 | **ACCEPT** | Express sub-router needs `mergeParams: true`. Fix: add to spec-phase-2.md. |
| BLIND-026 | **ACCEPT** | Downstream of BLIND-001. Resolved when endpoint field is added. |
| BLIND-027 | **ACCEPT** | Agent needs structured product data. Fix: change `product` from string to nested object. |
| BLIND-028 | **ACCEPT** | Response headers not accessible from Vercel AI SDK streaming. Fix: use AI SDK data streaming protocol. |
| BLIND-029 | **ACCEPT** | Events can't record past dates. Fix: add optional `eventDate` parameter to tool. |
| BLIND-030 | **DEFER** | 100 cards is manageable. Add virtualization note to Phase 5 as optimization. |
| BLIND-031 | **ACCEPT** | String concatenation in search is unsafe. Fix: use PostgreSQL full-text search with `search_vector` column + GIN index. |

### LOW (6) - 4 Accepted, 1 Rejected

| ID | Verdict | Rationale |
|----|---------|-----------|
| BLIND-032 | **ACCEPT** | Should reuse existing StatusBadge. Fix: make CustomerStatusBadge a thin wrapper. |
| BLIND-033 | **ACCEPT** | Lucide icon existence is hard to verify. Fix: use `Target` instead of `Swords`. |
| BLIND-034 | **REJECT** | `CREATE OR REPLACE FUNCTION` is idempotent. The function body is identical across migrations. No real risk of divergence since the logic is trivial (`NEW.updated_at = NOW()`). |
| BLIND-035 | **ACCEPT** | `@pm` could false-positive. Fix: use word boundary regex `^@(product|pm|customer|cm)\b`. |
| BLIND-036 | **ACCEPT** | Customer PII in system prompt gets logged. Fix: add sanitization note for production logging. |
| BLIND-037 | **ACCEPT** | MobileNav.tsx may not exist. Fix: note it may need creation, not just modification. |

---

## Design Review Evaluations (41 issues)

### CRITICAL (6) - All Accepted

| ID | Verdict | Rationale |
|----|---------|-----------|
| DX-001 | **ACCEPT** | BottomNav capacity undefined. Fix: define 4-item priority (Portfolio, Customers, Profile, Settings). |
| DX-006 | **ACCEPT** | Blue/Indigo badges indistinguishable at small sizes. Fix: add icon prefix per status for non-color discrimination. |
| DX-011 | **ACCEPT** | Inline edit has no design. Fix: choose inline edit with pencil icon on hover, Enter/Escape to save/cancel. Remove "Edit Name" from dropdown. |
| DX-012 | **ACCEPT** | @mention override has zero discoverability. Fix: add agent toggle pills above chat input. Keep @mention as power-user secondary. |
| DX-019 | **ACCEPT** | `opacity-0 group-hover:opacity-100` is keyboard-inaccessible. Fix: add `group-focus-within:opacity-100`. |
| DX-020 | **ACCEPT** | Forms must use `BaseTextField`/`BaseTextArea` per project rules. Fix: reference shared base components in all form specs. |

### HIGH (12+) - 11 Accepted, 2 Partially Accepted

| ID | Verdict | Rationale |
|----|---------|-----------|
| DX-002 | **PARTIALLY ACCEPT** | Sub-route would break tab containment. Fix: keep local state approach but store in Zustand per BLIND-015. Remove "inline expansion" terminology, commit to "detail view within tab." |
| DX-003 | **PARTIALLY ACCEPT** | Full-page route is overkill for Phase 3. Fix: commit to Sheet (side panel, max-w-3xl) instead of Dialog. Avoids TipTap-in-Dialog issues while staying within tab context. |
| DX-007 | **ACCEPT** | Outstanding should be visually dominant. Fix: larger font, always amber when > 0, progress bar required. |
| DX-013 | **ACCEPT** | Use DropdownMenu for status, add confirmation for Archive. |
| DX-014 | **ACCEPT** | Make whole agreement card clickable for edit. |
| DX-015 | **ACCEPT** | Log Event dialog not designed. Fix: add full dialog spec with fields. |
| DX-021 | **ACCEPT** | Color-only event typing violates WCAG 1.4.1. Fix: add icons per event type. |
| DX-022 | **ACCEPT** | Dialog focus management incomplete. Fix: add autoFocus spec per dialog. |
| DX-025 | **ACCEPT** | Tab overflow on mobile. Fix: wrap TabsList in `overflow-x-auto scrollbar-none`. |
| DX-026 | **ACCEPT** | Financial summary 3-col breaks on mobile. Fix: `grid-cols-1 sm:grid-cols-3`. |
| DX-029 | **ACCEPT** | "Coming soon" is an anti-pattern. Fix: proper placeholder states using EmptyState component. |
| DX-033 | **ACCEPT** | Negative balance (credit) has no design. Fix: blue "Credit: $X" state. |
| DX-034 | **ACCEPT** | Agent streaming errors too generic. Fix: add typed error states. |
| DX-039 | **ACCEPT** | Native date input inconsistent. Fix: use shadcn Popover + Calendar. |
| DX-041 | **ACCEPT** | Agent attribution per message missing. Fix: add agent label above each assistant message when both agents have spoken. |

### MEDIUM (16) - 14 Accepted, 1 Partially Accepted, 1 Rejected

| ID | Verdict | Rationale |
|----|---------|-----------|
| DX-004 | **ACCEPT** | Tab counts should come from customer detail response. |
| DX-005 | **ACCEPT** | "Horizontal cards" is confusing. Fix: change to "responsive card grid." |
| DX-008 | **PARTIALLY ACCEPT** | Accept mobile stacking. Keep em-dash pattern for zero states (simple and clear). |
| DX-009 | **ACCEPT** | Customer Info should come first for new customers. Reorder Overview tab. |
| DX-010 | **REJECT** | 27 colors is the nature of a complex domain. Users see one context at a time. Reducing artifact types to monochrome + icon would make scanning harder. The existing color-per-entity pattern is used throughout NextUp. |
| DX-016 | **ACCEPT** | Collapsible should preserve state. Use `<Collapsible>` with state preservation. |
| DX-017 | **ACCEPT** | Auto-update invoice status when payment linked. |
| DX-018 | **PARTIALLY ACCEPT** | Accept spatial separation rule. Keep same orange for "On Hold" in both systems since they appear in different UI zones. |
| DX-023 | **ACCEPT** | Mobile touch targets need always-visible actions. Use `useIsMobile()`. |
| DX-024 | **ACCEPT** | Chat panel should have `role="complementary"` landmark. |
| DX-027 | **ACCEPT** | Add `sm:grid-cols-2` for 640px breakpoint. |
| DX-028 | **ACCEPT** | Tab state during mobile chat. Use URL query params for tab. |
| DX-030 | **ACCEPT** | ChatPanel needs customizable suggestions. Add `suggestions` prop. |
| DX-031 | **ACCEPT** | Projects empty state should have dual CTA (manual + AI). |
| DX-035 | **ACCEPT** | Currency input needs validation rules. Add Zod schema on frontend. |
| DX-036 | **ACCEPT** | Auto-save indicator states need explicit definition. |
| DX-037 | **ACCEPT** | Agent routing indicator needs loading/transitional state. |

### LOW (7) - 5 Accepted, 1 Deferred

| ID | Verdict | Rationale |
|----|---------|-----------|
| DX-024 | **ACCEPT** | (covered above) |
| DX-032 | **ACCEPT** | Filter-active empty state needed. Use Portfolio pattern. |
| DX-038 | **DEFER** | Loading sequence is implementation detail. Existing patterns will guide. |
| DX-040 | **ACCEPT** | "Getting Started" panel for new customers is good UX. |

---

## Changes Per Document

### spec-phase-1.md (14 changes)
BLIND-004, BLIND-006, BLIND-009, BLIND-013, BLIND-017, BLIND-018, BLIND-022, BLIND-023, BLIND-027, BLIND-032, BLIND-037

### spec-phase-2.md (5 changes)
BLIND-007, BLIND-011, BLIND-019, BLIND-025, DX-017

### spec-phase-3.md (6 changes)
BLIND-008, BLIND-015, BLIND-020, BLIND-024, BLIND-033, DX-003

### spec-phase-4.md (16 changes)
BLIND-001, BLIND-002, BLIND-003, BLIND-005, BLIND-010, BLIND-012, BLIND-016, BLIND-021, BLIND-026, BLIND-028, BLIND-029, BLIND-035, BLIND-036, DX-034, DX-041, DX-012

### spec-phase-5.md (4 changes)
BLIND-014, BLIND-030, BLIND-031, BLIND-006 (URL params)

### ux-ui-spec.md (30+ changes)
DX-001, DX-002, DX-003, DX-005, DX-006, DX-007, DX-008, DX-009, DX-011, DX-012, DX-013, DX-014, DX-015, DX-016, DX-019, DX-020, DX-021, DX-022, DX-023, DX-024, DX-025, DX-026, DX-027, DX-028, DX-029, DX-030, DX-031, DX-032, DX-033, DX-035, DX-036, DX-037, DX-039, DX-040, DX-041

### PRDs (3 changes)
BLIND-022 (prd-phase-1.md), BLIND-024 (prd-phase-3.md), DX-004 (prd-phase-1.md)
