# Implementation Spec: New Account Onboarding — Phase 2

**Phase**: 2 of 2
**Focus**: UX polish, animations, delightful micro-interactions, and production readiness
**Design System**: "Midnight Architect" / "Calm Confidence"
**Target**: 90%+ completion rate
**Prerequisite**: Phase 1 complete (all wizard steps functional, database schema in place)

**Source documents**:
- `contract.md`
- `prd-phase-2.md`
- `ux-ui-specification.md`
- `ux-feedback-review.md` (Round 1 critique)
- `spec-changes-from-ux-review.md` (Round 1 accepted changes)
- `interface-design-review.md` (Round 2 critique)
- `spec-changes-from-interface-review.md` (Round 2 accepted changes)

---

## Table of Contents

1. [Technical Approach](#1-technical-approach)
2. [File Changes](#2-file-changes)
3. [Implementation Details](#3-implementation-details)
   - [3.1 CSS Keyframes and Animation Utilities](#31-css-keyframes-and-animation-utilities)
   - [3.2 Step Transitions](#32-step-transitions)
   - [3.3 Welcome Step Entrance Animation](#33-welcome-step-entrance-animation)
   - [3.4 Extraction Skeleton and Waterfall Reveal](#34-extraction-skeleton-and-waterfall-reveal)
   - [3.5 ExtractionSummaryBadge Polish](#35-extractionsummarybadge-polish)
   - [3.6 AiExtractedBadge State Transitions](#36-aiextractedbadge-state-transitions)
   - [3.7 Collapsed Fields Disclosure Toggle](#37-collapsed-fields-disclosure-toggle)
   - [3.8 Progress Bar Animation](#38-progress-bar-animation)
   - [3.9 ChipToggle Micro-Interaction](#39-chiptoggle-micro-interaction)
   - [3.10 AnimatedCheckmark (Static Import)](#310-animatedcheckmark-static-import)
   - [3.11 ConfettiCelebration (Lazy Import)](#311-confetticelebration-lazy-import)
   - [3.12 CompletionStep Entrance Sequence](#312-completionstep-entrance-sequence)
   - [3.13 Skip Experience Polish](#313-skip-experience-polish)
   - [3.14 Mobile Layout: VoiceStep Upload Methods](#314-mobile-layout-voicestep-upload-methods)
   - [3.15 Keyboard-Aware Layout (Mobile)](#315-keyboard-aware-layout-mobile)
   - [3.16 Button Hover and Press States](#316-button-hover-and-press-states)
   - [3.17 Long Content Truncation ("Show more")](#317-long-content-truncation-show-more)
   - [3.18 Extraction Timeout and Retry UI](#318-extraction-timeout-and-retry-ui)
   - [3.19 Network Disconnection Handling](#319-network-disconnection-handling)
   - [3.20 Duplicate URL Handling](#320-duplicate-url-handling)
   - [3.21 Accessibility Additions](#321-accessibility-additions)
   - [3.22 Personalized Completion Copy (firstName fallback chain)](#322-personalized-completion-copy-firstname-fallback-chain)
   - [3.23 prefers-reduced-motion](#323-prefers-reduced-motion)
4. [Testing Requirements](#4-testing-requirements)
5. [Error Handling](#5-error-handling)
6. [Validation Commands](#6-validation-commands)
7. [Open Items](#7-open-items)

---

## 1. Technical Approach

Phase 2 adds no new backend endpoints, no new database columns, and no new React Query keys. Everything in this phase is a frontend-only change layered on top of the Phase 1 functional foundation. The guiding constraint is: zero regression risk to Phase 1 behavior while adding animation, polish, and resilience.

Animation strategy is CSS-first. All entrance animations, transitions, and micro-interactions are implemented as Tailwind utility classes backed by CSS keyframes defined in `index.css`. No JavaScript animation libraries are introduced. The one exception is `canvas-confetti` (~6KB gzipped), which is already specified in the UX design and is the only animation that cannot be achieved purely in CSS. It is lazy-loaded so it has zero impact on Time-to-Interactive for users who never reach the completion step.

State management for animation is handled through a combination of: (a) a `useIsFirstRender` hook that drives entrance animations, (b) a `data-animation-state` attribute pattern that drives CSS transitions in response to Zustand store state changes, and (c) a `useReducedMotion` hook that checks `prefers-reduced-motion` at the React layer and passes it as a prop or context value to all animated components. This three-layer approach keeps animation logic out of business logic and makes the reduced-motion path a first-class concern rather than an afterthought.

The Phase 1 Zustand store (`onboardingStore.ts`) already tracks `extractionStatus` and `fieldProvenance`. Phase 2 consumes these values to drive visual state — skeleton-to-populated transitions, badge state changes, and ExtractionSummaryBadge visibility — without adding new store state. The one addition to the store is a `revealedFieldIndices` Set that tracks which fields have completed their waterfall animation, used to coordinate the ExtractionSummaryBadge fade-in timing. This is ephemeral UI state, never persisted.

---

## 2. File Changes

### New Files

```
frontend/src/features/onboarding/
  components/
    shared/
      AnimatedCheckmark.tsx          -- Static SVG checkmark (stroke-dashoffset animation)
      ConfettiCelebration.tsx        -- canvas-confetti wrapper (lazy-loaded)
      ExtractionSummaryBadge.tsx     -- Animated badge that fades in on extraction complete
      AiExtractedBadge.tsx           -- Per-field AI badge with provenance-driven states
      SkipConfirmationDialog.tsx     -- Non-judgmental skip confirmation
      ShowMoreText.tsx               -- Truncated text with "Show more" toggle
      CollapsedFieldsToggle.tsx      -- Disclosure toggle with extraction-aware copy
  hooks/
    useReducedMotion.ts              -- Reads prefers-reduced-motion media query
    useIsFirstRender.ts              -- Returns true only on the first render of a component
    useExtractionWaterfall.ts        -- Coordinates per-field reveal timing
    useKeyboardAwareLayout.ts        -- Manages visualViewport on mobile keyboard open

frontend/src/
  index.css                          -- Modified (new keyframes added)
```

### Modified Files

```
frontend/src/features/onboarding/
  components/
    WizardLayout.tsx                 -- Add step transition wrapper
    ProgressBar.tsx                  -- Upgrade to animated gradient fill with smooth transition
    steps/
      WelcomeStep.tsx                -- Add 3-stage entrance animation
      ImportStep.tsx                 -- Already has waterfall; add skeleton aria, timeout UI
      ProfileStep.tsx                -- Add collapsed fields toggle, aria-busy, waterfall wiring
      MarketStep.tsx                 -- Add chip press animation, chip group ARIA
      VoiceStep.tsx                  -- Mobile vertical stacked layout for upload methods
      CompletionStep.tsx             -- Add celebration sequence, personalized copy, confetti
  stores/
    onboardingStore.ts               -- Add revealedFieldIndices: Set<string>
                                        Add markFieldRevealed: (fieldKey: string) => void

frontend/src/index.css               -- Add onboarding-specific keyframes
```

---

## 3. Implementation Details

### 3.1 CSS Keyframes and Animation Utilities

Add the following block to the `@layer utilities` section at the bottom of `/Users/kobiagi/Desktop/Development/Product_Consultant_Helper/frontend/src/index.css`, after the existing `selection-context-banner` rule:

```css
/* =============================================================================
   Onboarding Wizard Animations
   ============================================================================= */

/* --- Step Transitions --- */
@keyframes onboarding-step-enter-forward {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes onboarding-step-exit-backward {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(24px);
  }
}

@keyframes onboarding-step-enter-backward {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* --- Content Entrance (used for staggered field/element reveals) --- */
@keyframes onboarding-fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes onboarding-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes onboarding-scale-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Waterfall: badge slides in from right */
@keyframes onboarding-badge-enter {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* --- Chip selection checkmark appears --- */
@keyframes onboarding-chip-check {
  from {
    opacity: 0;
    transform: scale(0.5) rotate(-10deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* --- Completion checkmark (circle + stroke) --- */
@keyframes onboarding-checkmark-circle {
  from { stroke-dashoffset: 166; }
  to   { stroke-dashoffset: 0; }
}

@keyframes onboarding-checkmark-stroke {
  from { stroke-dashoffset: 48; }
  to   { stroke-dashoffset: 0; }
}

/* --- Utility classes --- */
.onboarding-animate-fade-up {
  animation: onboarding-fade-up 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.onboarding-animate-fade-in {
  animation: onboarding-fade-in 200ms ease-out both;
}

.onboarding-animate-scale-in {
  animation: onboarding-scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.onboarding-animate-badge-enter {
  animation: onboarding-badge-enter 200ms ease-out both;
}

/* prefers-reduced-motion: collapse all onboarding animations to instant opacity */
@media (prefers-reduced-motion: reduce) {
  .onboarding-animate-fade-up,
  .onboarding-animate-fade-in,
  .onboarding-animate-scale-in,
  .onboarding-animate-badge-enter {
    animation: onboarding-fade-in 0ms both;
  }
}
```

**Design rationale**: Using CSS keyframes (not inline styles or a library) keeps animation performance on the compositor thread. The `cubic-bezier(0.16, 1, 0.3, 1)` curve is a snappy ease-out that feels tactile without overshooting. All durations are under 350ms to respect the principle that UI animations should not make users wait.

---

### 3.2 Step Transitions

**File**: `frontend/src/features/onboarding/components/WizardLayout.tsx`

The wizard tracks navigation direction (forward vs. backward) to apply directionally-appropriate transitions. A step entering from a forward navigation slides in from the right; entering from backward navigation slides in from the left.

```tsx
// In onboardingStore.ts — add this field and action:
interface OnboardingWizardStore {
  // ...existing fields...
  navigationDirection: 'forward' | 'backward' | null;
  setNavigationDirection: (dir: 'forward' | 'backward') => void;
}

// In WizardLayout.tsx:
interface WizardLayoutProps {
  currentStep: number;
  children: React.ReactNode;
}

export function WizardLayout({ currentStep, children }: WizardLayoutProps) {
  const direction = useOnboardingStore((s) => s.navigationDirection);
  const [animationKey, setAnimationKey] = useState(currentStep);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setAnimationKey(currentStep);
  }, [currentStep]);

  const animationClass = reducedMotion
    ? 'opacity-100'
    : direction === 'forward'
      ? '[animation:onboarding-step-enter-forward_250ms_cubic-bezier(0.16,1,0.3,1)_both]'
      : '[animation:onboarding-step-enter-backward_250ms_cubic-bezier(0.16,1,0.3,1)_both]';

  return (
    <div
      key={animationKey}
      className={animationClass}
    >
      {children}
    </div>
  );
}
```

**Critical note**: The `key={animationKey}` prop on the wrapper div is what forces React to unmount and remount the step content, which re-triggers the CSS animation. Without the key change, React diffs the DOM in place and the animation never fires. The animation applies to the entering step only; the exiting step is already removed from the DOM by the time React commits the next step.

**Navigation integration**: When "Save & Continue" / "Get Started" / "Extract My Profile" is called:
1. Call `setNavigationDirection('forward')` on the store
2. Then call `setStep(n + 1)` / `navigate('/onboarding?step=...')`

When the wizard Back button is clicked:
1. Call `setNavigationDirection('backward')` on the store
2. Then call `navigate('/onboarding?step=...', { replace: true })`

---

### 3.3 Welcome Step Entrance Animation

**File**: `frontend/src/features/onboarding/components/steps/WelcomeStep.tsx`

The Round 1 review cut the entrance animation from 7 stages / 700ms to 3 stages / 300ms. The implementation uses CSS `animation-delay` via Tailwind's arbitrary value syntax.

```tsx
// frontend/src/features/onboarding/components/steps/WelcomeStep.tsx

export function WelcomeStep() {
  const reducedMotion = useReducedMotion();

  // When reducedMotion is true, all delays become 0 and opacity starts at 1
  const delay = (ms: number) =>
    reducedMotion ? {} : { animationDelay: `${ms}ms` };

  return (
    <WizardStep>
      <WizardStepContent className="text-center">

        {/* Stage 1: Icon + Headline (0ms) */}
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 onboarding-animate-scale-in"
          style={delay(0)}
        >
          <Sparkles className="h-7 w-7 text-primary" />
        </div>

        <h1
          className="text-[1.875rem] font-semibold tracking-tight mt-6 onboarding-animate-fade-up"
          style={delay(0)}
        >
          We'll personalize NextUp to how you work
        </h1>

        {/* Stage 2: Subtitle + Time badge (150ms) */}
        <p
          className="text-base text-muted-foreground mt-3 max-w-[420px] mx-auto leading-relaxed onboarding-animate-fade-up"
          style={delay(150)}
        >
          AI extracts what it can from your profiles — you refine and confirm.
        </p>

        <div
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground onboarding-animate-fade-in"
          style={delay(150)}
        >
          <Clock className="h-4 w-4" />
          Under 3 minutes to set up your profile
        </div>

        {/* Stage 3: Value props + CTA (300ms) */}
        <div
          className="mt-8 space-y-3 text-left max-w-[380px] mx-auto onboarding-animate-fade-up"
          style={delay(300)}
        >
          <ValuePropRow icon={Sparkles} text="AI-powered profile extraction" />
          <ValuePropRow icon={Shield} text="Your data stays private and secure" />
          <ValuePropRow icon={PenLine} text="Content tailored to your voice" />
        </div>

      </WizardStepContent>

      <WizardStepFooter>
        <div
          className="onboarding-animate-fade-up"
          style={delay(300)}
        >
          <Button size="lg" className="w-full sm:w-auto min-w-[200px]" onClick={handleGetStarted}>
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <button
            className="text-sm text-muted-foreground hover:text-foreground mt-3 block mx-auto transition-colors duration-150"
            onClick={handleSkip}
          >
            Skip setup for now
          </button>
        </div>
      </WizardStepFooter>
    </WizardStep>
  );
}
```

**Copy reference** (from Round 1 accepted changes):
- Headline: "We'll personalize NextUp to how you work"
- Subtitle: "AI extracts what it can from your profiles — you refine and confirm."
- Time badge: "Under 3 minutes to set up your profile"

---

### 3.4 Extraction Skeleton and Waterfall Reveal

**File**: `frontend/src/features/onboarding/hooks/useExtractionWaterfall.ts`

The waterfall animation orchestrates the field-by-field reveal when `extractionStatus` transitions to `'complete'`. Each field gets a 200ms delay between its reveal. Per field: label fades in (150ms), content slides up 8px (300ms), AI badge slides from right (200ms with 100ms additional delay). The skeleton crossfades to real content (200ms).

```ts
// frontend/src/features/onboarding/hooks/useExtractionWaterfall.ts

interface WaterfallEntry {
  fieldKey: string;
  visible: boolean;
  animationClass: string;
}

interface UseExtractionWaterfallReturn {
  entries: WaterfallEntry[];
  allRevealed: boolean;
}

/**
 * Accepts an ordered list of field keys and, when `trigger` becomes true,
 * reveals them one by one at `delayBetween` millisecond intervals.
 *
 * Returns `visible: false` for each field until its reveal timeout fires.
 * When `reducedMotion` is true, all fields are immediately visible.
 */
export function useExtractionWaterfall(
  fieldKeys: string[],
  trigger: boolean,
  delayBetween = 200,
  reducedMotion = false,
): UseExtractionWaterfallReturn {
  const [revealedCount, setRevealedCount] = useState(
    reducedMotion && trigger ? fieldKeys.length : 0
  );

  useEffect(() => {
    if (!trigger) return;
    if (reducedMotion) {
      setRevealedCount(fieldKeys.length);
      return;
    }

    let count = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    fieldKeys.forEach((_, i) => {
      const t = setTimeout(() => {
        count += 1;
        setRevealedCount(count);
      }, i * delayBetween);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [trigger, fieldKeys.length, delayBetween, reducedMotion]);

  const entries: WaterfallEntry[] = fieldKeys.map((key, i) => ({
    fieldKey: key,
    visible: i < revealedCount,
    animationClass: 'onboarding-animate-fade-up',
  }));

  return {
    entries,
    allRevealed: revealedCount >= fieldKeys.length,
  };
}
```

**File**: `frontend/src/features/onboarding/components/shared/ExtractionSkeleton.tsx` (modified)

```tsx
// The skeleton wrapper for a single field during extraction.
// aria-hidden prevents screen readers from encountering empty shimmer content.

interface ExtractionSkeletonFieldProps {
  type: 'textarea' | 'input' | 'chips';
}

export function ExtractionSkeletonField({ type }: ExtractionSkeletonFieldProps) {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      <Skeleton className="h-3 w-20" />  {/* label skeleton */}
      {type === 'textarea' && (
        <>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </>
      )}
      {type === 'input' && (
        <Skeleton className="h-9 w-32" />
      )}
      {type === 'chips' && (
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      )}
    </div>
  );
}
```

**File**: `frontend/src/features/onboarding/components/shared/OnboardingField.tsx` (modified)

The `OnboardingField` component now accepts a `visible` prop from the waterfall hook. When `visible` is false and extraction is in progress, it renders the skeleton. When `visible` becomes true, it animates in with `onboarding-animate-fade-up`. The AI badge uses `onboarding-animate-badge-enter` with a 100ms delay relative to the content.

```tsx
interface OnboardingFieldProps {
  label: string;
  fieldKey: string;
  provenance: 'ai' | 'user' | 'empty';
  extractionStatus: 'idle' | 'submitted' | 'extracting' | 'complete' | 'failed' | 'timeout' | 'skipped';
  visible: boolean;           // controlled by useExtractionWaterfall
  skeletonType?: 'textarea' | 'input' | 'chips';
  description?: string;
  children: React.ReactNode;
}

export function OnboardingField({
  label,
  fieldKey,
  provenance,
  extractionStatus,
  visible,
  skeletonType = 'textarea',
  description,
  children,
}: OnboardingFieldProps) {
  const showSkeleton = (extractionStatus === 'extracting') && !visible;
  const showAiBadge = provenance === 'ai';
  const showNeedsInputBadge = provenance === 'empty' && extractionStatus === 'complete';

  if (showSkeleton) {
    return <ExtractionSkeletonField type={skeletonType} />;
  }

  return (
    <div
      className={cn(
        "space-y-1.5",
        visible && extractionStatus === 'complete' && "onboarding-animate-fade-up"
      )}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldKey}>{label}</Label>
        <div className="flex items-center gap-1.5">
          {showAiBadge && (
            <AiExtractedBadge variant="extracted" />
          )}
          {showNeedsInputBadge && (
            <AiExtractedBadge variant="needs-input" />
          )}
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}
```

---

### 3.5 ExtractionSummaryBadge Polish

**File**: `frontend/src/features/onboarding/components/shared/ExtractionSummaryBadge.tsx`

The badge is invisible during extraction and fades in (200ms) when `allRevealed` from `useExtractionWaterfall` becomes true. It counts only visible (non-collapsed) fields, and appends "+{n} collapsed" if hidden fields have extraction data.

```tsx
interface ExtractionSummaryBadgeProps {
  found: number;
  total: number;
  collapsedWithData?: number;    // count of hidden fields that have AI data
  visible: boolean;              // controlled by allRevealed from waterfall hook
}

export function ExtractionSummaryBadge({
  found,
  total,
  collapsedWithData = 0,
  visible,
}: ExtractionSummaryBadgeProps) {
  // Focus target for screen reader announcement on extraction complete
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && badgeRef.current) {
      badgeRef.current.focus();
    }
  }, [visible]);

  if (!visible) return null;

  const collapsedNote = collapsedWithData > 0
    ? ` (+${collapsedWithData} collapsed)`
    : '';

  return (
    <div
      ref={badgeRef}
      tabIndex={-1}
      aria-label={`Profile data loaded. ${found} of ${total} fields extracted${collapsedNote}.`}
      className={cn(
        "inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full",
        "bg-emerald-500/10 onboarding-animate-fade-in",
        // Focus ring for programmatic focus (not visible to mouse users)
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        Found {found} of {total} fields{collapsedNote}
      </span>
    </div>
  );
}
```

**Integration in ProfileStep.tsx**:

```tsx
// Inside ProfileStep:
const { entries, allRevealed } = useExtractionWaterfall(
  VISIBLE_FIELD_KEYS,         // does NOT include collapsed fields
  extractionStatus === 'complete',
  200,
  reducedMotion
);

// aria-live region (placed once at top of step):
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {extractionStatus === 'extracting' && 'Loading profile data from your profiles...'}
  {allRevealed && `Profile data loaded. ${foundCount} of ${totalCount} fields extracted.`}
</div>

// The badge itself:
<ExtractionSummaryBadge
  found={foundCount}
  total={totalCount}
  collapsedWithData={collapsedFieldsWithData}
  visible={allRevealed}
/>
```

---

### 3.6 AiExtractedBadge State Transitions

**File**: `frontend/src/features/onboarding/components/shared/AiExtractedBadge.tsx`

Two badge variants:
- `'extracted'` — green, "AI extracted", shown when `provenance === 'ai'`
- `'needs-input'` — amber, "Needs your input", shown when `provenance === 'empty'` AND extraction is complete (i.e., the AI could not find this field)

Both badges use `text-xs` (12px) as specified in Round 1 accepted change #9. Never `text-[10px]`.

```tsx
interface AiExtractedBadgeProps {
  variant: 'extracted' | 'needs-input';
}

export function AiExtractedBadge({ variant }: AiExtractedBadgeProps) {
  if (variant === 'extracted') {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
          "bg-emerald-500/10",
          "onboarding-animate-badge-enter"     // slides in from right
        )}
      >
        <Sparkles className="h-3 w-3 text-emerald-500 flex-shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          AI extracted
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-amber-500/10",
        "onboarding-animate-fade-in"
      )}
    >
      <PenLine className="h-3 w-3 text-amber-500 flex-shrink-0" aria-hidden="true" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Add your details
      </span>
    </span>
  );
}
```

**Critical constraint from Round 2 spec changes**: The badge is never shown during extraction (`extractionStatus === 'extracting'`). Skeletons show no badge. The badge transition from "none" to "AI extracted" happens as part of the waterfall reveal animation, coordinated by `OnboardingField` receiving `visible: true` from the waterfall hook.

**Field focus protection**: If the user is actively focused on a field when extraction completes for that field, the extraction result is discarded (`fieldProvenance[key]` is already `'user'` because focus sets provenance). No badge change, no re-render of the field value. This is enforced in `applyExtractionResults` in the store (Phase 1 spec), not in the badge component.

---

### 3.7 Collapsed Fields Disclosure Toggle

**File**: `frontend/src/features/onboarding/components/shared/CollapsedFieldsToggle.tsx`

Implements the Round 2 accepted change #8: the disclosure toggle text adapts dynamically based on whether hidden fields (Methodologies, Certifications) have extraction data.

```tsx
interface CollapsedFieldsToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  collapsedFieldsWithData: number;     // count of hidden fields that have AI-extracted content
}

export function CollapsedFieldsToggle({
  isExpanded,
  onToggle,
  collapsedFieldsWithData,
}: CollapsedFieldsToggleProps) {
  const hasHiddenData = collapsedFieldsWithData > 0;

  const label = isExpanded
    ? 'Show less'
    : hasHiddenData
      ? `AI found ${collapsedFieldsWithData} more field${collapsedFieldsWithData !== 1 ? 's' : ''} — review them (optional)`
      : 'Add more detail (optional)';

  // When there's hidden AI data and the section is collapsed, use amber color
  // to draw attention. Otherwise, use muted styling.
  const colorClass = !isExpanded && hasHiddenData
    ? 'text-amber-600 dark:text-amber-400 hover:text-amber-500'
    : 'text-muted-foreground hover:text-foreground';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 text-sm transition-colors duration-150 mt-2",
        colorClass
      )}
      aria-expanded={isExpanded}
    >
      {!isExpanded && hasHiddenData && (
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          isExpanded && "rotate-180"
        )}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}
```

**Integration in ProfileStep.tsx**:

```tsx
// VISIBLE fields (always rendered): bio, value_proposition, years_experience, expertise_areas, industries
// COLLAPSED fields (behind toggle): methodologies, certifications

const [collapsedExpanded, setCollapsedExpanded] = useState(false);

// Derived: how many collapsed fields have AI-extracted content?
const collapsedFieldsWithData = [
  fieldProvenance['about_me.methodologies'],
  fieldProvenance['about_me.certifications'],
].filter(p => p === 'ai').length;

// Render:
<CollapsedFieldsToggle
  isExpanded={collapsedExpanded}
  onToggle={() => setCollapsedExpanded(prev => !prev)}
  collapsedFieldsWithData={collapsedFieldsWithData}
/>

{collapsedExpanded && (
  <div className="space-y-4 onboarding-animate-fade-up mt-4">
    {/* Methodologies + Certifications fields */}
  </div>
)}
```

---

### 3.8 Progress Bar Animation

**File**: `frontend/src/features/onboarding/components/ProgressBar.tsx`

Replace the existing Progress (shadcn Radix) component with a custom implementation that:
1. Uses the correct 4-step percentage table (Round 2 accepted change #9)
2. Adds a gradient fill (brand-500 to brand-300 in dark mode, blue primary in light mode)
3. Removes the glow effect (Round 1 cut, item #13)
4. Has a 600ms cubic-bezier transition on width

```tsx
// Percentage map (from spec-changes-from-interface-review.md, Issue 9):
export const STEP_PROGRESS: Record<number, number> = {
  0: 15,   // Welcome (endowed progress)
  1: 36,   // Step 1 of 4: Import
  2: 57,   // Step 2 of 4: Your Profile
  3: 78,   // Step 3 of 4: Your Market
  4: 93,   // Step 4 of 4: Your Voice
  5: 100,  // Completion
};

interface ProgressBarProps {
  stepIndex: number;   // 0=Welcome, 1=Import, 2=Profile, 3=Market, 4=Voice, 5=Completion
}

export function ProgressBar({ stepIndex }: ProgressBarProps) {
  const progress = STEP_PROGRESS[stepIndex] ?? 0;

  return (
    <div
      className="h-1.5 w-full rounded-full bg-border/30 overflow-hidden"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Onboarding progress: ${progress}%`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[hsl(214,83%,39%)] to-[hsl(187,89%,49%)] dark:from-[#025EC4] dark:to-[#0ECCED]"
        style={{
          width: `${progress}%`,
          transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
}
```

**Step label format** (Round 2 accepted change #9): `"Step {n} of 4: {stepName}"`

```tsx
// Step labels for the top bar:
const STEP_LABELS: Record<number, string | null> = {
  0: null,                       // Welcome: no step label
  1: 'Step 1 of 4: Import',
  2: 'Step 2 of 4: Your Profile',
  3: 'Step 3 of 4: Your Market',
  4: 'Step 4 of 4: Your Voice',
  5: null,                       // Completion: no step label
};
```

---

### 3.9 ChipToggle Micro-Interaction

**File**: `frontend/src/features/onboarding/components/shared/ChipToggle.tsx` (modify existing)

Add:
1. The Check icon that appears via `onboarding-chip-check` when selected
2. A scale press effect on `active:` state
3. `role="checkbox"` with `aria-checked` on each chip
4. `role="group"` with `aria-labelledby` on the container (Round 1 accepted change #10)

```tsx
// ChipToggle component:
export function ChipToggle({ label, icon: Icon, selected, onToggle, id }: ChipToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      id={id}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg min-h-[44px]",
        "border transition-all duration-150 cursor-pointer select-none",
        "active:scale-95",                  // tactile press feedback
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground hover:bg-secondary hover:border-border"
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0",
            selected ? "text-primary" : "text-muted-foreground"
          )}
          aria-hidden="true"
        />
      )}
      <span className={cn("text-sm", selected && "font-medium")}>
        {label}
      </span>
      {selected && (
        <Check
          className="h-3.5 w-3.5 text-primary flex-shrink-0 onboarding-animate-chip-check"
          aria-hidden="true"
          style={{ animation: 'onboarding-chip-check 150ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
        />
      )}
    </button>
  );
}

// Container in MarketStep.tsx:
<div
  role="group"
  aria-labelledby="priorities-label"
  className="flex flex-wrap gap-2"
>
  <span id="priorities-label" className="sr-only">Priorities: select all that apply</span>
  {PRIORITY_OPTIONS.map((option) => (
    <ChipToggle key={option.value} id={`priority-${option.value}`} ... />
  ))}
</div>
```

---

### 3.10 AnimatedCheckmark (Static Import)

**File**: `frontend/src/features/onboarding/components/shared/AnimatedCheckmark.tsx`

This component is a statically imported SVG. It must NOT be lazy-loaded (Round 2 accepted change #14). The checkmark is the primary success signal on the completion step — it must render unconditionally, regardless of whether confetti loads.

```tsx
// frontend/src/features/onboarding/components/shared/AnimatedCheckmark.tsx

interface AnimatedCheckmarkProps {
  className?: string;
  reducedMotion?: boolean;
}

/**
 * SVG checkmark that draws itself using stroke-dashoffset animation.
 * Circle draws first (0–300ms), checkmark stroke draws second (300–600ms).
 * Total duration: 600ms.
 *
 * When reducedMotion is true, the checkmark is immediately visible (no animation).
 */
export function AnimatedCheckmark({ className, reducedMotion = false }: AnimatedCheckmarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="26"
        cy="26"
        r="25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="166"
        strokeDashoffset={reducedMotion ? 0 : 166}
        style={
          reducedMotion
            ? undefined
            : {
                animation: 'onboarding-checkmark-circle 300ms cubic-bezier(0.16, 1, 0.3, 1) 0ms forwards',
              }
        }
      />
      <path
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="48"
        strokeDashoffset={reducedMotion ? 0 : 48}
        style={
          reducedMotion
            ? undefined
            : {
                animation: 'onboarding-checkmark-stroke 300ms cubic-bezier(0.16, 1, 0.3, 1) 300ms forwards',
              }
        }
      />
    </svg>
  );
}
```

The CSS keyframes for `onboarding-checkmark-circle` and `onboarding-checkmark-stroke` are defined in `index.css` (section 3.1 above). The `strokeDasharray` and initial `strokeDashoffset` values are set so the paths are invisible at start and fully drawn at end. The circle path circumference is `2 * π * 25 ≈ 157`; rounding up to 166 ensures the path is fully hidden at dashoffset=166 even with subpixel rendering variations.

---

### 3.11 ConfettiCelebration (Lazy Import)

**File**: `frontend/src/features/onboarding/components/shared/ConfettiCelebration.tsx`

This component is dynamically imported. If the import fails (network error, CSP restriction), `Suspense fallback={null}` ensures the completion step renders without confetti — never crashes.

```tsx
// frontend/src/features/onboarding/components/shared/ConfettiCelebration.tsx

import confetti from 'canvas-confetti';

interface ConfettiCelebrationProps {
  active: boolean;
}

/**
 * Fires confetti from canvas-confetti on mount when `active` is true.
 * Uses a canvas element appended to document.body (not the React tree).
 * canvas-confetti manages its own canvas lifecycle.
 */
export function ConfettiCelebration({ active }: ConfettiCelebrationProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active || firedRef.current) return;
    firedRef.current = true;

    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#0ECCED', '#025EC4', '#10b981', '#f59e0b', '#f0f4f8'],
        gravity: 1.2,
        drift: 0,
        ticks: 200,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [active]);

  // No DOM output — canvas-confetti creates its own canvas
  return null;
}
```

**Usage in CompletionStep.tsx**:

```tsx
// Lazy import at top of CompletionStep.tsx:
const ConfettiCelebration = React.lazy(
  () => import('../shared/ConfettiCelebration')
);

// In the render:
<React.Suspense fallback={null}>
  <ConfettiCelebration active={true} />
</React.Suspense>
```

**prefers-reduced-motion behavior**: The `useReducedMotion` hook is called in `CompletionStep`. If `reducedMotion` is true, do not render `ConfettiCelebration` at all. Instead render a static `PartyPopper` icon (Lucide) next to the headline. This is not handled inside `ConfettiCelebration` itself — the parent makes the decision based on the media query so the lazy import is never even attempted.

```tsx
// In CompletionStep:
const reducedMotion = useReducedMotion();

{!reducedMotion ? (
  <React.Suspense fallback={null}>
    <ConfettiCelebration active={true} />
  </React.Suspense>
) : (
  <PartyPopper
    className="absolute top-8 right-8 h-6 w-6 text-primary opacity-60"
    aria-hidden="true"
  />
)}
```

---

### 3.12 CompletionStep Entrance Sequence

**File**: `frontend/src/features/onboarding/components/steps/CompletionStep.tsx`

The completion step has its own entrance sequence (separate from the wizard step transition) because it is a celebration moment. The sequence:

1. Animated checkmark begins drawing at 0ms (600ms total)
2. "You're all set, {firstName}!" fades up at 400ms
3. Subtitle fades up at 550ms
4. Completion summary rows stagger in at 700ms, 800ms, 900ms
5. CTA button fades up at 1000ms
6. Confetti fires at 300ms (overlaps with checkmark draw)

```tsx
// headline + subtitle entrance: use animation-delay via inline style
<h1
  className="text-[1.875rem] font-semibold tracking-tight mt-6 onboarding-animate-fade-up"
  style={reducedMotion ? undefined : { animationDelay: '400ms' }}
>
  Your profile is ready. Let's get to work.
</h1>
```

Wait — the completion headline copy was updated in Round 1 accepted changes:
- Old: "Time to create something brilliant"
- New: "Your profile is ready. Let's get to work."

The `You're all set, {firstName}!` text is the subheadline (personalized), and the main h1 is the action-forward headline. Adjust the component to:

```tsx
{/* Personalized subheadline */}
<p
  className="text-base text-muted-foreground mt-1 onboarding-animate-fade-in"
  style={{ animationDelay: reducedMotion ? '0ms' : '350ms' }}
>
  You're all set, {firstName}!
</p>

{/* Primary headline */}
<h1
  className="text-[1.875rem] font-semibold tracking-tight mt-3 onboarding-animate-fade-up"
  style={{ animationDelay: reducedMotion ? '0ms' : '400ms' }}
>
  Your profile is ready. Let's get to work.
</h1>
```

**Completion summary row stagger**:

```tsx
const completionRows = [
  { icon: Sparkles, text: 'Profile complete', done: profileComplete },
  {
    icon: PenLine,
    text: `${referenceCount} writing sample${referenceCount !== 1 ? 's' : ''} added`,
    done: referenceCount > 0,
  },
  { icon: Target, text: 'Goals defined', done: goalsComplete },
];

{completionRows.map((row, i) => (
  <CompletionRow
    key={i}
    {...row}
    className={cn(
      "onboarding-animate-fade-up",
    )}
    style={{ animationDelay: reducedMotion ? '0ms' : `${700 + i * 100}ms` }}
  />
))}
```

Note the copy change from Round 2 (spec-changes-from-interface-review.md, Issue 12):
- Old: `Voice trained on ${referenceCount} reference(s)`
- New: `${referenceCount} writing sample${referenceCount !== 1 ? 's' : ''} added`

---

### 3.13 Skip Experience Polish

**File**: `frontend/src/features/onboarding/components/shared/SkipConfirmationDialog.tsx`

The skip dialog is a small non-blocking confirmation (shadcn `AlertDialog`), not a full modal interruption. Copy (from PRD FR-2.13):

```tsx
// SkipConfirmationDialog.tsx
export function SkipConfirmationDialog({
  open,
  onConfirm,
  onCancel,
}: SkipConfirmationDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        data-portal-ignore-click-outside   // MANDATORY per portaled-components-pattern rule
        className="max-w-sm"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Skip setup for now?</AlertDialogTitle>
          <AlertDialogDescription>
            No worries! You can complete your profile anytime in Settings.
            Your account is ready to use.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Keep going
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-muted text-muted-foreground hover:bg-muted/80">
            Skip for now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Post-skip: "Complete profile" card on portfolio** (Phase 1 builds the card structure; Phase 2 polishes it):

The card on the portfolio page uses `onboarding-animate-fade-up` with a 100ms delay so it doesn't compete visually with the portfolio content loading. It is a non-blocking gentle nudge — never blocking, never a banner that demands immediate action. The card renders only when `onboardingProgress?.completed_at === null`.

```tsx
// In PortfolioPage.tsx (polished card):
{!onboardingProgress?.completed_at && (
  <div className="onboarding-animate-fade-up mb-6" style={{ animationDelay: '100ms' }}>
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Complete your profile</p>
            <p className="text-xs text-muted-foreground">
              Help the AI create better content for you
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-shrink-0"
        >
          <Link to="/onboarding">Resume setup</Link>
        </Button>
      </CardContent>
    </Card>
  </div>
)}
```

---

### 3.14 Mobile Layout: VoiceStep Upload Methods

**File**: `frontend/src/features/onboarding/components/steps/VoiceStep.tsx`

Round 2 accepted change #16 overrides Round 1: on mobile (`< 640px`), use a vertical stacked layout with 4 full-width rows instead of the 4-column tab grid or 2-column grid. All touch targets must be `min-h-[44px]`. This is detected via the existing `useIsMobile` hook at `frontend/src/hooks/useIsMobile.ts`.

```tsx
// VoiceStep.tsx — upload method selector:
const isMobile = useIsMobile();   // true at < 768px

{isMobile ? (
  // Mobile: vertical stacked rows (each full-width, min-height 44px)
  <div className="space-y-1.5">
    {UPLOAD_METHODS.map((method) => (
      <button
        key={method.value}
        type="button"
        onClick={() => setActiveMethod(method.value)}
        className={cn(
          "w-full flex items-center gap-3 px-4 rounded-lg min-h-[44px]",
          "border transition-colors duration-150 text-left",
          activeMethod === method.value
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:bg-secondary"
        )}
      >
        <method.Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{method.label}</span>
        {activeMethod === method.value && (
          <Check className="h-4 w-4 ml-auto text-primary" aria-hidden="true" />
        )}
      </button>
    ))}
  </div>
) : (
  // Desktop: shadcn Tabs (4-column grid)
  <Tabs value={activeMethod} onValueChange={setActiveMethod}>
    <TabsList className="w-full grid grid-cols-4">
      {UPLOAD_METHODS.map((method) => (
        <TabsTrigger key={method.value} value={method.value}>
          <method.Icon className="h-3.5 w-3.5" />
          <span className="ml-1.5">{method.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
    {/* Tab panels */}
  </Tabs>
)}

// UPLOAD_METHODS definition:
const UPLOAD_METHODS = [
  { value: 'paste',       label: 'Paste Text',          Icon: Type },
  { value: 'file',        label: 'Upload File',         Icon: Upload },
  { value: 'url',         label: 'URL',                 Icon: Link2 },
  { value: 'publication', label: 'Article / Publication', Icon: Globe },
] as const;
```

---

### 3.15 Keyboard-Aware Layout (Mobile)

**File**: `frontend/src/features/onboarding/hooks/useKeyboardAwareLayout.ts`

When the virtual keyboard opens on iOS/Android, it reduces the visible viewport. Without handling this, the fixed footer navigation (Back/Continue buttons) can be obscured by the keyboard, making it impossible to advance to the next step.

```ts
// frontend/src/features/onboarding/hooks/useKeyboardAwareLayout.ts

interface KeyboardAwareLayoutState {
  footerOffset: number;    // pixels to add to footer bottom offset when keyboard is open
  isKeyboardOpen: boolean;
}

/**
 * Uses the visualViewport API to detect keyboard open/close on mobile.
 * Falls back to window resize events on browsers without visualViewport support.
 *
 * Returns `footerOffset` — apply as `paddingBottom` or `bottom` on the wizard footer.
 *
 * Safari iOS behavior: visualViewport.height shrinks when keyboard opens.
 * Chrome Android behavior: same.
 * Firefox Android: same, but may lag 1 frame.
 */
export function useKeyboardAwareLayout(): KeyboardAwareLayoutState {
  const [footerOffset, setFooterOffset] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const windowHeight = window.innerHeight;

    const handleResize = () => {
      const keyboardHeight = windowHeight - vv.height - vv.offsetTop;
      if (keyboardHeight > 100) {
        // Keyboard is open: lift footer above keyboard
        setFooterOffset(keyboardHeight);
        setIsKeyboardOpen(true);
      } else {
        setFooterOffset(0);
        setIsKeyboardOpen(false);
      }
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  return { footerOffset, isKeyboardOpen };
}
```

**Integration in WizardStepFooter.tsx**:

```tsx
// WizardStepFooter.tsx:
const isMobile = useIsMobile();
const { footerOffset } = useKeyboardAwareLayout();

return (
  <div
    className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm"
    style={
      isMobile
        ? {
            paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${footerOffset}px)`,
            transition: 'padding-bottom 200ms ease-out',
          }
        : undefined
    }
  >
    <div className="max-w-2xl mx-auto flex items-center justify-between px-5 h-20">
      {children}
    </div>
  </div>
);
```

**Scroll-into-view for focused inputs**: In addition to the footer offset, ensure tapped inputs scroll into view above the keyboard. Use `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` on the `onFocus` handler of each form field in the wizard. This is added globally to `OnboardingField` rather than per-field:

```tsx
// In OnboardingField.tsx:
const handleFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
  // Small delay to let keyboard animation start before scrolling
  setTimeout(() => {
    e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 100);
}, []);

// Pass as onFocus to children via cloneElement or a wrapper div with onFocusCapture:
<div onFocusCapture={handleFocus}>
  {children}
</div>
```

---

### 3.16 Button Hover and Press States

**File**: Tailwind class additions across CTA buttons in all step components.

The primary CTA buttons need tactile press feedback. The existing `Button` component from `frontend/src/components/ui/button.tsx` already has `transition-colors` in its base class. Phase 2 adds the active scale:

```tsx
// Add to the primary button variant in button.tsx — add `active:scale-[0.98]` to the default variant:
default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98] transition-transform duration-100",

// For the wizard's specific CTA buttons, a custom class wraps them:
// Applied in WizardStepFooter or per-step buttons:
<Button
  size="lg"
  className="min-w-[160px] active:scale-[0.97] transition-transform duration-75"
>
  Save & Continue
</Button>
```

The `active:scale-[0.97]` is slightly more pronounced on the large wizard CTA than the standard `active:scale-[0.98]` on smaller buttons — gives the sensation of physically pressing a key.

Ghost buttons (Back) get a subtle press:
```tsx
<Button variant="ghost" className="active:scale-[0.98] transition-transform duration-75">
```

---

### 3.17 Long Content Truncation ("Show more")

**File**: `frontend/src/features/onboarding/components/shared/ShowMoreText.tsx`

When extracted content exceeds a threshold (e.g., bio over 300 characters), truncate with a "Show more" toggle. This prevents the waterfall animation from being overwhelmed by large text blocks and keeps the initial view clean.

```tsx
interface ShowMoreTextProps {
  text: string;
  maxChars?: number;
  className?: string;
}

export function ShowMoreText({ text, maxChars = 300, className }: ShowMoreTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxChars;

  const displayText = needsTruncation && !expanded
    ? `${text.slice(0, maxChars)}…`
    : text;

  return (
    <span className={className}>
      {displayText}
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="ml-1 text-xs text-primary hover:underline focus-visible:ring-1 focus-visible:ring-ring rounded"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </span>
  );
}
```

Apply in `OnboardingField` when displaying AI-extracted content in textareas. The textarea `value` always holds the full text; `ShowMoreText` is only used in read-only preview contexts (the extraction complete preview card in ImportStep), not in editable fields.

---

### 3.18 Extraction Timeout and Retry UI

**File**: `frontend/src/features/onboarding/components/steps/ProfileStep.tsx` (and ImportStep.tsx)

When `extractionStatus === 'timeout'` (30 seconds elapsed with no result), show an inline message with a retry option. This replaces the skeleton state without blocking the user from proceeding.

```tsx
// In ProfileStep.tsx, within the fieldset when extractionStatus === 'timeout':
{extractionStatus === 'timeout' && (
  <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 onboarding-animate-fade-in">
    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
    <div className="flex-1">
      <p className="text-sm font-medium text-foreground">
        Extraction is taking longer than expected
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        The fields below are empty — fill them in manually, or try again.
      </p>
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetryExtraction}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Try again'
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismissTimeout}
        >
          Fill in manually
        </Button>
      </div>
    </div>
  </div>
)}
```

**Timeout implementation in `useProfileExtraction.ts`** (Phase 1 hook, Phase 2 wires the timer):

```ts
// In useProfileExtraction.ts, after calling the extraction API:
useEffect(() => {
  if (extractionStatus !== 'extracting') return;

  const timeoutId = setTimeout(() => {
    if (extractionStatus === 'extracting') {
      setExtractionStatus('timeout');
    }
  }, 30_000);

  return () => clearTimeout(timeoutId);
}, [extractionStatus]);
```

---

### 3.19 Network Disconnection Handling

**File**: `frontend/src/features/onboarding/components/WizardLayout.tsx`

NextUp already has a `ConnectionBanner` component at `frontend/src/components/ConnectionBanner.tsx` and a `use-connection-status.ts` hook. Phase 2 wires these into the wizard.

```tsx
// In WizardLayout.tsx — add at the top of the wizard, below the TopBar:
const { isOnline } = useConnectionStatus();

{!isOnline && (
  <div
    className="mx-auto max-w-2xl px-4 mb-2 onboarding-animate-fade-in"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm text-amber-600 dark:text-amber-400">
      <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>
        You're offline. Your progress is saved — keep filling in what you know.
      </span>
    </div>
  </div>
)}
```

Auto-save already writes to Supabase via React Query. When offline, React Query mutations will queue and retry when connection is restored (this is default React Query behavior with the `networkMode: 'offlineFirst'` setting, which should be confirmed in the existing query client configuration). No additional implementation needed for the save behavior itself.

---

### 3.20 Duplicate URL Handling

**File**: `frontend/src/features/onboarding/components/steps/ImportStep.tsx`

If the user enters the same URL in both the LinkedIn and Website fields, show an inline warning (not an error — it won't block progress, since the same URL can be scraped once and used for both).

```tsx
// In ImportStep.tsx, derived from the two URL values in the store:
const isDuplicateUrl =
  linkedInUrl.trim() !== '' &&
  websiteUrl.trim() !== '' &&
  linkedInUrl.trim() === websiteUrl.trim();

{isDuplicateUrl && (
  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1.5 onboarding-animate-fade-in">
    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
    Both URLs are the same — we'll use it once for extraction.
  </p>
)}
```

---

### 3.21 Accessibility Additions

**Async Extraction State ARIA** (Round 2 accepted change #10):

Applied in `ProfileStep.tsx`:

```tsx
{/* aria-live region: screen reader announces extraction state changes */}
<div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
  {extractionStatus === 'extracting' && 'Loading profile data from your profiles...'}
  {allRevealed && `Profile data loaded. ${foundCount} of ${totalCount} fields extracted.`}
  {extractionStatus === 'timeout' && 'Profile extraction timed out. You can fill in the fields manually.'}
  {extractionStatus === 'failed' && 'Profile extraction was not successful. You can fill in the fields manually.'}
</div>

{/* Fieldset ARIA: aria-busy while extracting */}
<fieldset aria-busy={extractionStatus === 'extracting'}>
  {/* All profile fields */}
</fieldset>
```

**Focus management on extraction complete** (Round 2 accepted change #10):
- `ExtractionSummaryBadge` has `tabIndex={-1}` and a `ref`
- When `allRevealed` becomes true, `badgeRef.current?.focus()` is called (see section 3.5)
- Fields the user is currently editing do not have their focus disrupted (React does not move focus unless `.focus()` is explicitly called)

**Progress bar ARIA** (from spec):
```tsx
role="progressbar"
aria-valuenow={progress}
aria-valuemin={0}
aria-valuemax={100}
aria-label={`Onboarding progress: ${progress}%`}
```

**ChipToggle group ARIA** (Round 1 accepted change #10):
```tsx
role="group"
aria-labelledby="priorities-label"
```
Each chip: `role="checkbox"` with `aria-checked={selected}`

**Keyboard navigation**:
- Tab / Shift+Tab: moves between all interactive elements in the wizard (browser default, no custom implementation needed — ensure no focus trap exists outside modals)
- Enter on focused CTA button: activates button (browser default for `<button>`)
- Escape: triggers skip confirmation dialog (wired in `WizardLayout.tsx` via `useEffect` on `keydown`)

```tsx
// In WizardLayout.tsx:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && currentStep > 0 && currentStep < 5) {
      // Open skip confirmation
      setSkipDialogOpen(true);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [currentStep]);
```

---

### 3.22 Personalized Completion Copy (firstName fallback chain)

**File**: `frontend/src/features/onboarding/components/steps/CompletionStep.tsx`

Implements the firstName fallback chain from Round 2 accepted change #12:

```tsx
// In CompletionStep.tsx:
import { useAuth } from '@/features/auth/hooks/useAuth';  // or equivalent

function useFirstName(): string {
  const { user } = useAuth();
  const { formData } = useOnboardingStore();

  // 1. Try to extract first name from bio (look for first capitalized word)
  const bioFirstName = formData.about_me.bio
    ? formData.about_me.bio.trim().split(/\s+/)[0]
    : null;
  // Only use bio-derived name if it looks like a real name (not "I" or "The" etc.)
  const isLikelyName =
    bioFirstName &&
    bioFirstName.length > 1 &&
    bioFirstName.length < 20 &&
    /^[A-Z]/.test(bioFirstName);

  if (isLikelyName) return bioFirstName;

  // 2. Try user_metadata.full_name (populated by OAuth or signup)
  const metaName = user?.user_metadata?.full_name?.trim().split(/\s+/)[0];
  if (metaName && metaName.length > 0) return metaName;

  // 3. Try email prefix
  const emailPrefix = user?.email?.split('@')[0];
  if (emailPrefix && emailPrefix.length > 0) return emailPrefix;

  // 4. Fallback
  return 'there';
}

// Usage:
const firstName = useFirstName();
// Renders: "You're all set, Alex!" or "You're all set, there!"
```

---

### 3.23 prefers-reduced-motion

**File**: `frontend/src/features/onboarding/hooks/useReducedMotion.ts`

```ts
// frontend/src/features/onboarding/hooks/useReducedMotion.ts

/**
 * Returns true if the user has requested reduced motion via OS accessibility settings.
 * Uses matchMedia to detect `prefers-reduced-motion: reduce`.
 *
 * This hook is used throughout the onboarding wizard to conditionally disable animations.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}
```

**Reduced-motion behavior per feature**:

| Feature | reducedMotion=false | reducedMotion=true |
|---------|--------------------|--------------------|
| Step transitions | Slide from right/left, 250ms | Instant opacity change |
| Welcome entrance | 3-stage stagger 0/150/300ms | All elements immediately visible |
| Extraction waterfall | Field-by-field, 200ms apart | All fields appear simultaneously |
| ExtractionSummaryBadge | Fades in 200ms | Immediately visible |
| AI badge slide | Slides from right 200ms | Immediately visible |
| Chip checkmark | Scale in 150ms | Immediately visible |
| AnimatedCheckmark | Draws 600ms | Pre-drawn, static |
| Confetti | Fires 80 particles | Not rendered; static PartyPopper icon instead |
| CompletionStep stagger | Rows enter 700/800/900ms | All rows immediately visible |
| Disclosure toggle | ChevronDown rotates 200ms | No rotation animation |
| Progress bar fill | 600ms cubic-bezier | Instant (still uses CSS transition; set `transition: none`) |

The `useReducedMotion` hook is called once at the top of each step component and passed down as a prop to sub-components that need it. Do not call it multiple times per render tree — call it at the wizard root (`OnboardingPage.tsx` or `WizardLayout.tsx`) and pass it down via context or props.

---

## 4. Testing Requirements

### Unit Tests (Vitest)

All tests follow the build-first requirement: `npm run build` must pass before tests are run.

**`useExtractionWaterfall.test.ts`**:
- Fields are all invisible when `trigger=false`
- Fields reveal sequentially at `delayBetween` ms intervals when `trigger=true`
- All fields are immediately visible when `reducedMotion=true`
- Cleanup: timers are cleared on unmount (no state updates after unmount)

**`useReducedMotion.test.ts`**:
- Returns `true` when `matchMedia('(prefers-reduced-motion: reduce)').matches` is true
- Responds to `change` events on the media query

**`useFirstName.test.ts`** (or inline in `CompletionStep.test.ts`):
- Returns first word of bio when bio is set and looks like a name
- Falls back to `user_metadata.full_name` when bio is empty/short
- Falls back to email prefix when `full_name` is absent
- Returns `"there"` when all sources are absent

**`CollapsedFieldsToggle.test.tsx`**:
- Label is "Add more detail (optional)" when `collapsedFieldsWithData=0`
- Label shows count when `collapsedFieldsWithData > 0`
- `aria-expanded` attribute reflects `isExpanded` prop

**`ExtractionSummaryBadge.test.tsx`**:
- Not rendered when `visible=false`
- Rendered with correct count when `visible=true`
- Includes "+{n} collapsed" suffix when `collapsedWithData > 0`
- `focus()` is called on mount when `visible` transitions to true

**`AnimatedCheckmark.test.tsx`**:
- Renders SVG with correct stroke-dashoffset values for animated state
- Renders SVG with `strokeDashoffset=0` when `reducedMotion=true`
- Does NOT throw when rendered without any props

**`ProgressBar.test.tsx`**:
- Renders correct `aria-valuenow` for each step index
- Progress values match the `STEP_PROGRESS` constant
- `role="progressbar"` is present

### Integration Tests

**`extraction-waterfall.integration.test.tsx`**:
- ProfileStep renders skeleton fields when `extractionStatus='extracting'`
- Skeleton fields have `aria-hidden="true"`
- Fieldset has `aria-busy="true"` during extraction
- After waterfall completes (`allRevealed=true`), `ExtractionSummaryBadge` is visible
- Focus moves to `ExtractionSummaryBadge` after reveal

**`skip-flow.integration.test.tsx`**:
- Clicking "Skip setup for now" opens `SkipConfirmationDialog`
- Clicking "Keep going" closes dialog without navigation
- Clicking "Skip for now" calls `markOnboardingComplete` and navigates to portfolio
- Pressing Escape on any productive step (1–4) opens skip dialog

**`mobile-voice-layout.integration.test.tsx`**:
- At viewport width < 640px, vertical stacked layout renders (4 full-width rows)
- All rows have `min-height >= 44px`
- At viewport width >= 640px, Tabs component renders

### E2E Tests (Playwright)

Credentials: `kobiagi+nextuptest@gmail.com` / `Qwerty12345` (per `.claude/rules/testing/playwright-credentials.md`)

**`onboarding-animations.e2e.ts`**:
- Step transitions do not show stale content during animation
- Progress bar updates on each step advance
- Completion step fires confetti and renders checkmark

**`onboarding-mobile.e2e.ts`** (at 390px viewport width, iPhone 14 emulation):
- All CTA buttons have touch target >= 44x44px (measured via `boundingBox()`)
- Upload method rows in VoiceStep are full-width and vertically stacked
- Footer navigation is visible above keyboard when an input is focused (visual snapshot)

**`onboarding-reduced-motion.e2e.ts`**:
- Run with `--force-prefers-reduced-motion` (Playwright emulateMedia)
- Confetti is not rendered on CompletionStep
- PartyPopper static icon IS rendered on CompletionStep
- No CSS animation classes are applied with non-zero durations

**`onboarding-timeout.e2e.ts`** (requires mocked backend):
- After 30 seconds without extraction response, timeout message appears
- "Try again" button re-calls extraction API
- "Fill in manually" button dismisses the timeout message and shows empty fields

---

## 5. Error Handling

### Extraction Timeout (FR-2.22)

- After 30s elapsed with `extractionStatus === 'extracting'`: transition to `'timeout'`
- Display: amber inline banner with "Try again" and "Fill in manually" options
- Retry: re-calls `POST /api/onboarding/extract-profile` with same URLs, resets to `'extracting'`
- "Fill in manually": sets `extractionStatus = 'failed'`, shows all fields empty with amber "Add your details" badges
- Fallback messaging is encouraging, not error-like: "Extraction is taking longer than expected" — NOT "Error: extraction failed"

### Network Disconnection (FR-2.23)

- Offline banner renders at top of wizard (see section 3.19)
- Auto-save mutations queue via React Query's default offline behavior
- If user is mid-extraction when going offline: extraction API call may fail; if `fetch` throws `TypeError: Failed to fetch`, catch it and set `extractionStatus = 'failed'`
- When connection restores: queued auto-save mutations fire automatically; no user action needed

### Confetti Import Failure

- `ConfettiCelebration` is wrapped in `React.Suspense fallback={null}`
- If the dynamic import throws: the Suspense boundary catches it and renders `null`
- The `AnimatedCheckmark`, headline, and CTA are unaffected (statically imported)
- No error boundary needed around confetti specifically; `Suspense` with `null` fallback is sufficient

### All Errors Must Be Encouraging

The rule for all error states in the wizard: copy must be forward-looking, not blame-assigning.

| Situation | Correct copy | Wrong copy |
|-----------|-------------|-----------|
| Extraction timeout | "Taking longer than expected" | "Extraction failed" |
| No LinkedIn found | "We couldn't find this info — add it below" | "LinkedIn URL not accessible" |
| Network offline | "You're offline. Your progress is saved." | "Connection error" |
| Extraction total failure | "We weren't able to pre-fill your details — let's do it manually!" | "Error: could not scrape URL" |

---

## 6. Validation Commands

Run these in order after implementation:

```bash
# 1. TypeScript compilation (must pass with zero errors)
cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/frontend && npm run build

# 2. Unit tests
npm run test

# 3. Check touch targets (manual: run at 390px viewport in browser DevTools)
# All buttons in WizardStepFooter, ChipToggle, VoiceStep upload rows must
# report boundingClientRect().height >= 44 and .width >= 44

# 4. Reduced motion check (manual: enable in OS accessibility settings or
# use Playwright emulateMedia('reduced-motion'))
# Verify: no CSS animations play, confetti absent, checkmark pre-drawn

# 5. Screen reader check (manual: VoiceOver macOS or NVDA Windows)
# Verify: extracting state announces "Loading profile data..."
# Verify: complete state announces "Profile data loaded. X of Y fields extracted."
# Verify: ExtractionSummaryBadge receives focus on extraction complete

# 6. Playwright E2E
npm run test:e2e -- --grep "onboarding"

# 7. Performance check: ensure no layout thrash
# Open Chrome DevTools Performance tab, record through a full wizard session
# Verify: no "Long Animation Frames" > 50ms during step transitions or waterfall

# 8. Supabase advisors (after any schema changes — Phase 2 has none, but confirm)
# mcp__supabase__get_advisors({ project_id: "ohwubfmipnpguunryopl", type: "security" })
```

---

## 7. Open Items

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | Writing Voice micro-preview (FR-2.26 deferred from Round 1) | Low | Show a sample AI output "in your voice" after adding a reference. Deferred because it requires sampling the AI model during onboarding, which adds latency to a flow already promising "under 3 minutes." Revisit when AI response times improve or when a cached preview approach is viable. |
| 2 | Re-engagement banner full UX spec | Low | The portfolio "Complete profile" card is implemented. A persistent app-level banner (e.g., top of every page) for users who skipped is deferred. Risk: banner fatigue. Needs dedicated UX decision on frequency and dismissal. |
| 3 | Animation 60fps validation on low-end Android | Medium | The step transition and waterfall animations need testing on a Moto G Power or similar budget Android device. CSS transforms should be composited (no layout thrash), but confirm via Performance trace. If jank is observed, simplify waterfall to opacity-only (no translateY). |
| 4 | iOS Safari safe-area-inset-bottom on older devices | Low | `env(safe-area-inset-bottom, 0px)` is supported on iOS 11.2+. No action needed unless testing reveals issues on iPhone SE (1st gen) or older iPads. |
| 5 | Supabase writing examples polling at Step 6 | Medium | Phase 1 should implement `queryClient.cancelQueries({ queryKey: writingExamplesKeys.list() })` when the completion step mounts (per Round 2 Issue 6 spec change). Confirm this is in the Phase 1 implementation. If not, it belongs in Phase 2 and must be added to `CompletionStep.tsx`'s `useEffect` on mount. |
| 6 | Post-onboarding welcome message on PortfolioPage (FR-2.27) | Low | A one-time "Welcome, {firstName}! Here's what you can do next." message for new users who just completed onboarding. Implementation: check if `completed_at` was set within the last 30 seconds (or use a session-scoped flag in sessionStorage). Low priority — the completion step already provides this moment. |