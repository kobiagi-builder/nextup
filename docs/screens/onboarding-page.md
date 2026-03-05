# Onboarding Page

**Created:** 2026-03-02
**Last Updated:** 2026-03-02
**Version:** 2.1.0
**Status:** Complete

## Overview

The onboarding page (`/onboarding`) renders a multi-step wizard for new users to set up their professional profile. It sits outside the AppShell layout and is protected by `ProtectedRoute` (requires auth) but not by `OnboardingGate` (which would cause a redirect loop).

Phase 2 added: WizardLayout (step transitions + offline banner + Escape key), ProgressBar (gradient fill, ARIA), WelcomeStep extraction to own file, 10 shared components, mobile-optimized VoiceStep, extraction waterfall in ProfileStep, ChipToggle priorities in MarketStep, and celebration sequence in CompletionStep.

## Route

| Path | Component | Layout | Auth |
|------|-----------|--------|------|
| `/onboarding` | `OnboardingPage` | Standalone (no AppShell) | ProtectedRoute |

## Component Hierarchy

```
OnboardingPage
├── WizardShell
│   ├── ProgressBar (steps 1-4, gradient fill, role="progressbar")
│   ├── "Step N of 4" label + "Skip for now" link
│   ├── WizardLayout (transition animations, offline banner, Escape key)
│   │   ├── WelcomeStep (step 0)
│   │   │   └── Staggered entrance (time badge, value props, CTA)
│   │   ├── ImportStep (step 1)
│   │   │   └── Duplicate URL warning (inline amber)
│   │   ├── ProfileStep (step 2)
│   │   │   ├── ExtractionSkeletonField (during extraction, aria-busy)
│   │   │   ├── OnboardingField × 7 (waterfall reveal)
│   │   │   │   ├── AiExtractedBadge (green/amber)
│   │   │   │   └── Form input (Textarea/Input)
│   │   │   ├── CollapsedFieldsToggle (methodologies, certifications)
│   │   │   └── ExtractionSummaryBadge ("Found X of Y fields")
│   │   ├── MarketStep (step 3)
│   │   │   ├── Textarea fields (Ideal Client, Content Goals, Business Goals)
│   │   │   └── ChipToggle group (6 priorities, role="group")
│   │   ├── VoiceStep (step 4)
│   │   │   └── OnboardingReferenceUpload
│   │   │       ├── Mobile: vertical stacked buttons (min-h-[44px])
│   │   │       └── Desktop: Tabs (Paste / File / File URL / Publication)
│   │   │           ├── FileDropZone (reused from portfolio)
│   │   │           └── PublicationUrlInput (reused from portfolio)
│   │   └── CompletionStep (step 5)
│   │       ├── AnimatedCheckmark (SVG stroke animation)
│   │       ├── ConfettiCelebration (React.lazy, canvas-confetti)
│   │       ├── Personalized greeting ("You're all set, {name}!")
│   │       ├── CompletionRow × 3 (profile, samples, goals)
│   │       └── "Go to my portfolio" CTA
│   └── SkipConfirmationDialog (AlertDialog, data-portal-ignore-click-outside)
└── (no AppShell sidebar/header)
```

## Key Components

### OnboardingPage (`frontend/src/features/onboarding/pages/OnboardingPage.tsx`)
- Reads `?step` query param to initialize step
- Hydrates Zustand store from server data via `useOnboardingProgress`
- Redirects to `/portfolio` if `completed_at` is already set
- Renders `WizardShell`

### WizardShell (`frontend/src/features/onboarding/components/WizardShell.tsx`)
- Renders `ProgressBar` with gradient fill (replaces Phase 1 StepIndicator)
- Shows "Step N of 4" label and "Skip for now" link (steps 1-4)
- Wraps step content with `WizardLayout` for transitions
- Skip link opens `SkipConfirmationDialog` instead of direct navigation

### WizardLayout (`frontend/src/features/onboarding/components/WizardLayout.tsx`)
- Step transition: `key={animationKey}` forces remount; CSS animation based on `navigationDirection`
- Offline banner: amber bar with `WifiOff` icon when connection is down
- Escape key: opens `SkipConfirmationDialog` on steps 1-4 (guarded when dialog is already open)

### ProgressBar (`frontend/src/features/onboarding/components/ProgressBar.tsx`)
- Custom gradient progress bar (not shadcn Progress)
- Step-to-percentage mapping: 0→15, 1→36, 2→57, 3→78, 4→93, 5→100
- `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- 600ms transition on width changes

### WelcomeStep (`frontend/src/features/onboarding/components/steps/WelcomeStep.tsx`)
- Extracted from WizardShell (was inline in Phase 1)
- Vertically centered via `min-h-[calc(100vh-200px)]` with `justify-center`
- 3-stage staggered entrance: icon 0ms, text 150ms, buttons 300ms
- Time badge "Under 3 minutes to set up your profile", 3 value proposition rows
- "Get Started" and "Skip for now" buttons

### ImportStep (step 1)
- Website URL and LinkedIn URL input fields
- **Duplicate URL warning**: when both fields match, inline amber text: "Both URLs are the same — we'll use it once for extraction."
- Optional paste text area (via Tabs)
- **Unified bottom navigation**: Back (left), "Skip this step" link + "Extract Profile" button (right) — matches Steps 2-4 pattern
- Sets `navigationDirection` on all navigation actions

### ProfileStep (step 2)
- **Extracting state**: `ExtractionSkeletonField` placeholders (textarea/input/chips types), `aria-busy="true"` on fieldset
- **Waterfall reveal**: `useExtractionWaterfall` reveals fields one-by-one (200ms stagger); each wrapped in `OnboardingField`
- **AiExtractedBadge**: green "AI-extracted" for `'ai'` provenance, amber "Needs your input" for user/empty with data
- **CollapsedFieldsToggle**: methodologies and certifications collapsed by default; amber indicator when AI data exists in hidden fields
- **ExtractionSummaryBadge**: "Found X of Y fields" after waterfall completes
- **Timeout fallback**: form shown with message after 30s
- Back/Continue buttons

### MarketStep (step 3)
- Fields: Ideal Client (textarea), Content Goals (textarea), Business Goals (textarea)
- **Content Priorities**: `ChipToggle` group with 6 options:
  | Value | Label | Icon |
  |-------|-------|------|
  | `thought_leadership` | Thought Leadership | BookOpen |
  | `lead_generation` | Lead Generation | Target |
  | `brand_awareness` | Brand Awareness | Megaphone |
  | `client_retention` | Client Retention | Users |
  | `speaking` | Speaking Opportunities | Mic |
  | `community` | Community Building | MessageCircle |
- "Select all that apply" helper text below label
- Container: `role="group"`, `aria-labelledby="priorities-label"`
- Each chip: `role="checkbox"`, `aria-checked`, check animation on toggle
- Back/Continue buttons

### VoiceStep (step 4)
- `OnboardingReferenceUpload` card for adding writing references
- **Mobile layout** (< 768px): vertical stacked buttons with `min-h-[44px]`, Check icon for selected method
- **Desktop layout** (>= 768px): shadcn Tabs (Paste / File / File URL / Publication)
- Shows added reference count
- "Skip this step" option when no references added
- Back/Continue buttons

### CompletionStep (step 5)
- Vertically centered via `min-h-[calc(100vh-200px)]` with `justify-center`
- Auto-saves `completed_at` and `user_context` on mount (via `useRef` guard for Strict Mode)
- **AnimatedCheckmark**: SVG with `stroke-dashoffset` animation (circle 0-300ms, checkmark 300-600ms)
- **ConfettiCelebration**: `React.lazy` + `Suspense fallback={null}`, fires 80 particles with brand colors
- **Personalized greeting**: `useFirstName()` fallback chain: `user_metadata.full_name` → bio first word (capitalized, < 20 chars) → "there" (email prefix skipped)
- **Staggered entrance**: checkmark 0ms, subheadline 350ms, headline 400ms, CompletionRows 700/800/900ms, CTA 1000ms
- CompletionRow × 3: "Profile complete", "N writing samples added", "Goals defined" — done items show green `CheckCircle2`, pending items show category icon
- "Go to my portfolio" button resets store and navigates
- **Reduced motion**: static `PartyPopper` icon, no stroke animation, no stagger

### Shared Components

| Component | Purpose |
|-----------|---------|
| `AnimatedCheckmark` | SVG circle + checkmark with stroke-dashoffset animation |
| `ConfettiCelebration` | canvas-confetti wrapper, lazy-loaded (~6KB) |
| `AiExtractedBadge` | Two variants: `'extracted'` (green, Sparkles) and `'needs-input'` (amber, PenLine) |
| `ExtractionSummaryBadge` | "Found X of Y fields" — fades in when `visible`, programmatic focus |
| `OnboardingField` | Wraps label + badge + skeleton + waterfall visibility + mobile scroll |
| `ExtractionSkeletonField` | Skeleton placeholder: `'textarea'` / `'input'` / `'chips'` types, `aria-hidden` |
| `CollapsedFieldsToggle` | Expand/collapse toggle, amber when hidden AI data exists, `aria-expanded` |
| `ShowMoreText` | Truncate at 300 chars with "Show more"/"Show less" |
| `ChipToggle` | Toggle chip: `role="checkbox"`, `aria-checked`, check animation, `active:scale-95` |
| `SkipConfirmationDialog` | AlertDialog with `data-portal-ignore-click-outside`; "Skip for now" (muted, left) + "Keep going" (prominent, right) |

## State Management

### Zustand Store (`onboardingWizardStore`)
- `currentStep`: 0-5
- `navigationDirection`: 'forward' | 'backward' | null (Phase 2)
- `extractionStatus`: idle | submitted | extracting | complete | failed | timeout | skipped
- `formData`: OnboardingFormData (about_me, profession, customers, goals sections)
- `fieldProvenance`: Record tracking if each field was set by 'ai', 'user', or 'empty'
- `revealedFieldIndices`: Record<string, boolean> (Phase 2, for waterfall tracking)
- `addedReferenceIds`: string[] of writing example IDs added during onboarding

### React Query Hooks
- `useOnboardingProgress()` — polls every 2s when extractionStatus is 'extracting'/'submitted'
- `useSaveOnboardingProgress()` — PUT mutation for progress upsert
- `useExtractProfile()` — POST mutation returning 202

### Phase 2 Hooks
- `useExtractionWaterfall(fieldKeys, trigger, delay, reducedMotion)` — staggered field reveal, resets on trigger change
- `useReducedMotion()` — `prefers-reduced-motion` media query listener

## OnboardingGate

Located at `frontend/src/components/auth/OnboardingGate.tsx`. Wraps AppShell routes (not the `/onboarding` route itself).

| Condition | Behavior |
|-----------|----------|
| Loading | Full-screen spinner |
| Error | Fail open (render children) |
| No row or `completed_at` null | Redirect to `/onboarding` |
| `completed_at` set | Render children (app) |
| Already on `/onboarding` path | Render children (prevent loop) |

## Portfolio Resume Card

When onboarding is incomplete, PortfolioPage shows a resume card:
- Animated with `onboarding-animate-fade-up` (100ms delay)
- Sparkles icon in `bg-primary/10` container
- "Complete your profile" / "Help the AI create better content for you"
- "Resume setup" outline button linking to `/onboarding`

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| All sizes | Max width `max-w-2xl` centered layout |
| Mobile (< 768px) | VoiceStep: vertical stacked method buttons with min-h-[44px] touch targets |
| Mobile (< 768px) | All interactive elements meet 44px minimum touch target |
| Desktop (>= 768px) | VoiceStep: shadcn Tabs layout |
| Reduced motion | All animations instant, confetti replaced with static icon |

## Keyboard Interactions

| Key | Context | Action |
|-----|---------|--------|
| Escape | Steps 1-4 | Opens SkipConfirmationDialog (guarded when already open) |
| Enter | Form steps | Submits form (native) |
| Tab | ChipToggle group | Focus traversal through chips |
| Space/Enter | ChipToggle | Toggle selection |

## Related Documentation

- [Onboarding Flow](../flows/onboarding-flow.md)
- [Onboarding Wizard Feature](../features/onboarding-wizard.md)
- [Portfolio Page](./portfolio-page.md) — resume card shown for incomplete onboarding
