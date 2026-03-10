# Onboarding Wizard

**Created:** 2026-03-02
**Last Updated:** 2026-03-10
**Version:** 2.2.0
**Status:** Complete (Phase 1 + Phase 2)

## Overview

The onboarding wizard guides new users through profile setup in ~2 minutes. It detects new users via the `OnboardingGate` route guard, optionally scrapes LinkedIn/website profiles via AI to pre-fill form fields, and walks users through profile completion, market context, and writing reference uploads. On completion, the collected data is written to the `user_context` table so the AI content engine can produce personalized output immediately.

Phase 2 added UX polish: CSS-first step transition animations, extraction waterfall reveal, field provenance badges, skip confirmation dialog, mobile-optimized layouts, accessibility improvements (ARIA, reduced motion), and a celebration sequence on completion.

## How It Works

### User Perspective

1. New user logs in and is automatically redirected to `/onboarding`
2. Welcome screen explains the setup process with staggered entrance animation
3. User optionally provides LinkedIn/website URLs for automatic profile extraction
4. Profile fields are revealed one-by-one in a waterfall animation as AI extraction results arrive
5. Each pre-filled field shows an "AI-extracted" badge; user-edited fields show "Needs your input"
6. User reviews About Me, Expertise, Market, and Goals sections across 3 form steps
7. MarketStep includes all 4 customer ICP fields (ideal client description, company stage multi-select, employee count range, industry verticals tags) and ChipToggle priorities selector (Thought Leadership, Lead Generation, etc.)
8. User optionally uploads writing references for voice analysis (mobile: vertical stacked layout)
9. Completion screen with animated checkmark, confetti, personalized greeting, and summary rows

### Technical Perspective

#### Route Guard (OnboardingGate)

`OnboardingGate` sits between `ProtectedRoute` and `AppShell` in the route tree. It queries `GET /api/onboarding/progress` and:
- If no row exists or `completed_at` is null: redirects to `/onboarding`
- If `completed_at` is set: renders the app normally
- On error: fails open (never locks out existing users)

#### Profile Extraction (Backend)

`ProfileExtractionService` (`backend/src/services/ProfileExtractionService.ts`):
1. Fetches website and/or LinkedIn URLs with 15s timeout
2. Extracts text using cheerio
3. Sends combined text to Claude Haiku 4.5 with a structured JSON prompt
4. Returns `ExtractedProfileFields` or `{ __error: true }` on failure
5. Controller writes results to `onboarding_progress.extraction_results` in the background

The extraction uses the Vercel AI SDK pattern (`generateText` from `ai` + `anthropic` from `@ai-sdk/anthropic`), consistent with the rest of the codebase.

#### Field Provenance System

Each form field has a provenance: `'ai'`, `'user'`, or `'empty'`.
- When extraction results arrive, only `'empty'` fields are filled (provenance set to `'ai'`)
- When the user edits a field, provenance is set to `'user'`
- Fields with `'user'` provenance are never overwritten by extraction results
- Provenance drives the `AiExtractedBadge` component: green "AI-extracted" for `'ai'`, amber "Needs your input" for `'user'`/`'empty'` with data

#### Extraction Waterfall Reveal (Phase 2)

`useExtractionWaterfall` hook reveals fields one-by-one with staggered delays (200ms default) after extraction completes. When `reducedMotion` is true, all fields appear instantly. The waterfall resets when `trigger` goes false (e.g., on extraction retry), allowing replay.

Each field in ProfileStep is wrapped with `OnboardingField`, which coordinates:
- `ExtractionSkeletonField` placeholder during extraction
- Waterfall visibility gating
- `AiExtractedBadge` provenance indicator
- `scrollIntoView` on mobile keyboard focus

After all fields are revealed, `ExtractionSummaryBadge` fades in showing "Found X of Y fields".

#### Polling & Timeout

- React Query polls `GET /api/onboarding/progress` every 2 seconds when `extractionStatus` is `'extracting'` or `'submitted'`
- A 30-second timeout transitions to `'timeout'` status, showing the form with a fallback message
- If the user refreshes during extraction, `hydrateFromServer` detects null `extraction_results` with step >= 2 and restarts polling

#### Step Transitions (Phase 2)

`WizardLayout` wraps step content with a `key={animationKey}` that forces React remount on step change. The `navigationDirection` store field determines which CSS animation class is applied:
- `onboarding-step-enter-forward` — slides from right
- `onboarding-step-enter-backward` — slides from left
- `opacity-100` — instant show when `reducedMotion` is true

#### Skip Confirmation (Phase 2)

Pressing Escape on steps 1-4 opens a `SkipConfirmationDialog` (shadcn AlertDialog). Button layout: "Skip for now" (muted, left) and "Keep going" (prominent, right) — encouraging continuation. Copy communicates the value tradeoff: "NextUp's AI uses your profile to generate content in your voice — the more you add, the better your results." On confirm: saves `completed_at`, navigates to `/portfolio`. A guard prevents Escape from re-triggering while the dialog is already open.

#### Completion (Phase 2)

`CompletionStep` on mount:
1. Writes `formData` to `user_context` via `PUT /api/user-context`
2. Saves `completed_at` to `onboarding_progress`
3. Plays celebration: `AnimatedCheckmark` (SVG stroke animation) + `ConfettiCelebration` (canvas-confetti, lazy-loaded ~6KB)
4. Shows personalized greeting via `useFirstName()` fallback chain: `user_metadata.full_name` → bio first word (capitalized, < 20 chars) → "there" (email prefixes skipped — too impersonal for celebration screen)
5. Staggered entrance: checkmark 0ms, subheadline 350ms, headline 400ms, completion rows 700/800/900ms, CTA 1000ms
6. Resets the Zustand store on "Go to my portfolio" click

#### Reduced Motion (Phase 2)

`useReducedMotion` hook reads `prefers-reduced-motion: reduce` via `matchMedia` and listens to change events. When active:
- All CSS animations collapse to instant opacity transitions via `@media (prefers-reduced-motion: reduce)` block in `index.css`
- Confetti is replaced with a static `PartyPopper` icon
- Waterfall reveals all fields instantly
- Checkmark renders as static SVG (no stroke animation)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/onboarding/progress` | Get current user's onboarding row (or `{ progress: null }`) |
| PUT | `/api/onboarding/progress` | Upsert progress (current_step, step_data, completed_at) |
| POST | `/api/onboarding/extract-profile` | Start background extraction (returns 202). Rate limited: 10/hour |

## Database

**Table:** `onboarding_progress`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to auth.users, unique constraint |
| `current_step` | int | 0-5 (0=welcome, 5=completion) |
| `step_data` | jsonb | Form data saved per step |
| `extraction_results` | jsonb | AI extraction output (written only by extraction service) |
| `completed_at` | timestamptz | Set when wizard finishes or user skips |
| `created_at` | timestamptz | Auto-set on insert |
| `updated_at` | timestamptz | Auto-updated via trigger |

RLS policies: users can only read/write their own row.

## Frontend Files

### Pages & Shell

| File | Purpose |
|------|---------|
| `frontend/src/features/onboarding/pages/OnboardingPage.tsx` | Root page, hydration, redirect logic |
| `frontend/src/features/onboarding/components/WizardShell.tsx` | Step router, ProgressBar, skip link, WizardLayout wrapper |
| `frontend/src/features/onboarding/components/WizardLayout.tsx` | Step transition animations, offline banner, Escape key → skip dialog |
| `frontend/src/features/onboarding/components/ProgressBar.tsx` | Custom gradient progress bar with ARIA attributes |

### Step Components

| File | Purpose |
|------|---------|
| `frontend/src/features/onboarding/components/steps/WelcomeStep.tsx` | Welcome screen with 3-stage staggered entrance, time badge, value props |
| `frontend/src/features/onboarding/components/ImportStep.tsx` | URL input + extraction trigger, duplicate URL warning |
| `frontend/src/features/onboarding/components/ProfileStep.tsx` | About Me + Profession with extraction waterfall, collapsed fields, OnboardingField wrappers |
| `frontend/src/features/onboarding/components/MarketStep.tsx` | Customers section (all 4 ICP fields: ideal client, company stage, employee range, industry verticals) + Goals + ChipToggle priorities selector |
| `frontend/src/features/onboarding/components/VoiceStep.tsx` | Writing reference upload |
| `frontend/src/features/onboarding/components/CompletionStep.tsx` | Celebration: AnimatedCheckmark, confetti, personalized greeting, summary rows |
| `frontend/src/features/onboarding/components/OnboardingReferenceUpload.tsx` | 4-method reference upload (mobile: vertical buttons, desktop: shadcn Tabs) |

### Shared Components (Phase 2)

| File | Purpose |
|------|---------|
| `frontend/src/features/onboarding/components/shared/AnimatedCheckmark.tsx` | SVG checkmark with circle + stroke animation |
| `frontend/src/features/onboarding/components/shared/ConfettiCelebration.tsx` | canvas-confetti wrapper (lazy-loaded, ~6KB) |
| `frontend/src/features/onboarding/components/shared/AiExtractedBadge.tsx` | Field provenance badge: green "AI-extracted" or amber "Needs your input" |
| `frontend/src/features/onboarding/components/shared/ExtractionSummaryBadge.tsx` | "Found X of Y fields" badge after waterfall completes |
| `frontend/src/features/onboarding/components/shared/OnboardingField.tsx` | Wraps form fields with label, badge, skeleton, waterfall visibility |
| `frontend/src/features/onboarding/components/shared/ExtractionSkeletonField.tsx` | Skeleton placeholder for textarea/input/chips during extraction |
| `frontend/src/features/onboarding/components/shared/CollapsedFieldsToggle.tsx` | Expand/collapse for secondary fields (methodologies, certifications) |
| `frontend/src/features/onboarding/components/shared/ShowMoreText.tsx` | Truncate text at 300 chars with "Show more"/"Show less" toggle |
| `frontend/src/features/onboarding/components/shared/ChipToggle.tsx` | Toggle chip with check animation, `role="checkbox"`, `active:scale-95` |
| `frontend/src/features/onboarding/components/shared/SkipConfirmationDialog.tsx` | AlertDialog confirming skip with `data-portal-ignore-click-outside` |

### Hooks

| File | Purpose |
|------|---------|
| `frontend/src/features/onboarding/hooks/useOnboardingProgress.ts` | React Query hooks (progress + save) |
| `frontend/src/features/onboarding/hooks/useExtractProfile.ts` | Extraction mutation |
| `frontend/src/features/onboarding/hooks/useExtractionWaterfall.ts` | Staggered field reveal with delay, reset on trigger change |
| `frontend/src/features/onboarding/hooks/useReducedMotion.ts` | prefers-reduced-motion media query listener |

### Store & Types

| File | Purpose |
|------|---------|
| `frontend/src/features/onboarding/stores/onboardingWizardStore.ts` | Zustand store (no persist): step, direction, extraction, formData, provenance, revealed fields |
| `frontend/src/features/onboarding/schemas/userContext.ts` | Shared Zod schemas |
| `frontend/src/features/onboarding/types/onboarding.ts` | TypeScript interfaces |

### Route Guard

| File | Purpose |
|------|---------|
| `frontend/src/components/auth/OnboardingGate.tsx` | Route guard: redirects incomplete onboarding to `/onboarding` |

## Backend Files

| File | Purpose |
|------|---------|
| `backend/src/controllers/onboarding.controller.ts` | 3 endpoints: getProgress, saveProgress, extractProfile |
| `backend/src/routes/onboarding.ts` | Router with rate limiter on extract |
| `backend/src/services/ProfileExtractionService.ts` | URL scraping + Claude Haiku extraction |

## CSS Animations (Phase 2)

All animations are CSS-first, defined in `frontend/src/index.css`:

| Keyframe | Duration | Usage |
|----------|----------|-------|
| `onboarding-step-enter-forward` | 250ms | Step transition sliding from right |
| `onboarding-step-enter-backward` | 250ms | Step transition sliding from left |
| `onboarding-fade-up` | 400ms | Staggered entrance (elements slide up + fade in) |
| `onboarding-fade-in` | 300ms | Simple opacity fade in |
| `onboarding-scale-in` | 300ms | Scale from 0.8 to 1 + fade in |
| `onboarding-badge-enter` | 250ms | Badge scale + fade entrance |
| `onboarding-chip-check` | 150ms | ChipToggle check icon pop |
| `onboarding-checkmark-circle` | 300ms | SVG circle stroke draw |
| `onboarding-checkmark-stroke` | 300ms | SVG checkmark stroke draw |

Utility classes: `.onboarding-animate-fade-up`, `.onboarding-animate-fade-in`, `.onboarding-animate-scale-in`, `.onboarding-animate-badge-enter`

All animations collapse to instant opacity via `@media (prefers-reduced-motion: reduce)`.

## Known Limitations

- Extraction depends on website/LinkedIn URL accessibility (some sites block scraping)
- LinkedIn profiles behind login walls return limited data
- Claude Haiku 4.5 wraps JSON in markdown fences — `stripFences()` handles this
- No re-extraction button (user must re-enter the wizard from step 1)
- Writing references uploaded during onboarding are not linked to a specific artifact type
- `canvas-confetti` adds ~6KB to the completion step bundle (lazy-loaded)

## Related Documentation

- [Onboarding Flow](../flows/onboarding-flow.md)
- [Onboarding Page Screen](../screens/onboarding-page.md)
- [Profile Page](../screens/profile-page.md)
- [Database Schema Reference](../Architecture/database/database-schema-reference.md)
