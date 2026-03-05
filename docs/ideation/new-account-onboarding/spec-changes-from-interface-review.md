# Spec Changes from Interface Design Review (Round 2: Interface Mechanics)

**Date**: 2026-03-02
**Feedback Source**: /interface-design sub-agent (senior interface design specialist)
**Evaluation Method**: /receiving-non-code-feedback skill

## Changes Applied to Spec

### CRITICAL Changes

#### 1. Extraction State Machine (Issue 1) -- ACCEPTED

Verified: The async-first model accepted in Round 1 (spec-changes-from-ux-review.md, item 2) introduced field-level complexity the spec never addressed. Spec lines 488-541 describe extraction loading and waterfall animation for the old synchronous Step 2. After the async change, Step 3 fields can be simultaneously loading AND editable. The spec has no merge policy.

**Added to spec Section 5 (Step 2) and Section 6 (Step 3):**

Extraction state machine:
```
EXTRACTION_STATES:
  idle       -> User has not clicked Extract
  submitted  -> URLs submitted, API called, user advanced to Step 2 of 4
  extracting -> Backend processing, Step 2 fields show skeletons
  complete   -> Results received, fields populated
  failed     -> Extraction errored (show fallback messaging)
  timeout    -> 30s elapsed (show timeout message + retry option)
  skipped    -> User bypassed Import step entirely
```

Field provenance states (per field):
```
FIELD_PROVENANCE:
  'empty'  -> Neither extraction nor user has filled this field
  'ai'     -> Extraction populated this field, user has not touched it
  'user'   -> User typed/edited this field (regardless of whether AI had a value)
```

Field merge policy (when extraction results arrive asynchronously):
```
IF field provenance === 'empty' (still skeleton):
  -> Accept extraction result, animate field population, set provenance to 'ai'
IF field provenance === 'user' (user already typed):
  -> Discard extraction result, preserve user input, no badge change
IF field provenance === 'ai' (extraction already populated, user hasn't touched):
  -> Accept updated result (unlikely but handles retry scenario)
```

ExtractionSummaryBadge behavior:
- Hidden while `extractionStatus === 'extracting'`
- Fades in (200ms) when extraction completes
- Only counts fields the user can see (adjusts if collapsed fields are hidden)

AI badge transition:
- Fields in skeleton state show no badge (just shimmer)
- When extraction populates a field, green "AI extracted" badge fades in with the field content
- If user is actively focused on a field when extraction arrives for that field, extraction result is discarded (field provenance is 'user' the moment they focus it)

#### 2. Separate Extraction and User Data Storage (Issue 2) -- ACCEPTED (modified)

Verified: The auto-save writes to `onboarding_progress` and extraction completion also writes to `onboarding_progress`. Both target the same JSON structure. On variable-latency connections, the last writer wins non-deterministically.

**Resolution**: Use separate columns in `onboarding_progress`:
- `extraction_results` JSONB -- written only by the extraction endpoint, never by auto-save
- `step_data` JSONB -- written only by auto-save and "Save & Continue", never by extraction

Frontend combines them on read using the field provenance model: if `step_data` has a value for a field, use it. Otherwise, fall back to `extraction_results`. This eliminates the race condition entirely -- the two write paths never touch the same column.

The reviewer's alternative (merge-aware backend API) adds complexity without eliminating the fundamental problem. Separate columns is cleaner.

#### 3. Routing Architecture with OnboardingGate (Issue 3) -- ACCEPTED

Verified against `AuthProvider.tsx` (lines 25-27): `setLoading(false)` fires at line 27 inside `onAuthStateChange`, which runs before the fire-and-forget migration at line 35-54 completes. `ProtectedRoute.tsx` (all 22 lines) is a simple auth guard with no onboarding awareness.

**Routing architecture decision:**

1. `ProtectedRoute` stays unchanged (auth-only guard)
2. New `OnboardingGate` component wraps `AppShell` inside `ProtectedRoute`
3. `OnboardingGate` fetches `onboarding_progress` via React Query
4. While fetching: renders a full-screen loading spinner (prevents portfolio flash)
5. Detection logic:
   - Row does not exist -> redirect to `/onboarding` (new user)
   - `completed_at` is null -> redirect to `/onboarding?step={last_step}` (returning incomplete)
   - `completed_at` is not null -> render children (completed user)
6. `/onboarding` route uses `ProtectedRoute` only (no `AppShell`, no `OnboardingGate`)
7. `OnboardingPage` internally checks: if `completed_at` is set, redirect to `/portfolio`
8. `PortfolioPage` shows "Complete profile" card when `completed_at` is null, never redirects

Route structure in `App.tsx`:
```tsx
<Route element={<ProtectedRoute><OnboardingGate><AppShell /></OnboardingGate></ProtectedRoute>}>
  {/* All app routes */}
</Route>
<Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
```

Migration idempotency: The `POST /api/auth/migrate-data` endpoint must NOT create or modify `onboarding_progress`. Onboarding row creation happens only when the user first reaches `/onboarding` (the page creates the row if it doesn't exist).

### HIGH Priority Changes

#### 4. UserContextForm.tsx: Share Schemas, Not Components (Issue 5) -- ACCEPTED

Verified against `UserContextForm.tsx`: embedded Save/Cancel buttons in every section form (AboutMeForm, ProfessionForm, GoalsForm), `onCancel` prop required, CustomersForm unconditionally calls `useIcpSettings()`. Direct reuse is structurally incompatible with the wizard pattern.

**Change**: Update spec Section 17 "Component Reuse Strategy" table:
- Remove implication that form sections are reused
- Add: "Extract Zod schemas (`aboutMeSchema`, `professionSchema`, `customersSchema`, `goalsSchema`) into shared `schemas/userContext.ts`"
- Build new onboarding form components: `OnboardingAboutMeFields`, `OnboardingProfessionFields`, `OnboardingCustomersFields`, `OnboardingGoalsFields`
- New components: no embedded buttons, no Cancel prop, no ICP hooks, return field values via Zustand store

Spec line 1881 changes from "Match existing `UserContextForm.tsx` patterns" to "Share Zod validation schemas from `UserContextForm.tsx`. Build new wizard-compatible form components."

#### 5. WritingReferencesManager: New Inline Component (Issue 6) -- ACCEPTED

Verified against `ReferenceUploadDialog.tsx`: imports Sheet/SheetContent/SheetHeader (side drawer pattern). Spec Step 5 needs an inline Card. DOM structures are incompatible.

**Change**: Build `OnboardingReferenceUpload` as a new inline Card component:
- Uses the same hooks: `useCreateWritingExample`, `useUploadWritingExample`, `useExtractFromUrl`, `useExtractPublication`
- Layout: inline Card (not Sheet)
- Callback: `onReferenceAdded: (id: string) => void` to track in Zustand store
- On wizard completion, cancel writing examples polling via `queryClient.cancelQueries`

Update spec line 994 from "simplified version of `ReferenceUploadDialog`" to "new `OnboardingReferenceUpload` component using the same hooks but with inline Card layout."

#### 6. Zustand Store Definition (Issue 7) -- ACCEPTED

Verified: Spec line 1882 says "State: Zustand (client) + React Query (server)" with no store shape. The `useState` pattern in spec lines 1970-1976 fails with: (a) data loss on step unmount within debounce window, (b) extraction results can't reach unmounted components, (c) field provenance lost on Back navigation.

**Added to spec Section 17:**

```typescript
// frontend/src/features/onboarding/stores/onboardingStore.ts

interface OnboardingFormData {
  about_me: {
    bio: string
    value_proposition: string
    years_experience: number | null
    expertise_areas: string
    industries: string
    methodologies: string
    certifications: string
  }
  customers: {
    ideal_client: string
    industries_served: string[]
  }
  goals: {
    content_goals: string
    business_goals: string
    priorities: string[]
  }
}

type FieldProvenance = 'ai' | 'user' | 'empty'

interface OnboardingWizardStore {
  // Navigation
  currentStep: number

  // Extraction
  extractionStatus: 'idle' | 'submitted' | 'extracting' | 'complete' | 'failed' | 'timeout'
  linkedInUrl: string
  websiteUrl: string

  // Form data (survives step navigation)
  formData: OnboardingFormData
  fieldProvenance: Record<string, FieldProvenance>

  // Writing references tracking
  addedReferenceIds: string[]

  // Actions
  setStep: (step: number) => void
  setExtractionStatus: (status: OnboardingWizardStore['extractionStatus']) => void
  applyExtractionResults: (results: Partial<OnboardingFormData>) => void
  updateField: (path: string, value: unknown) => void
  addReferenceId: (id: string) => void
  removeReferenceId: (id: string) => void
  reset: () => void
}
```

No `persist` middleware. Server-persisted via `onboarding_progress`. On page reload, store re-hydrates from server data via `useEffect` in wizard root component.

The `applyExtractionResults` action implements the merge policy: only populates fields where `fieldProvenance[path] === 'empty'`.

#### 7. ProtectedRoute Architecture Decision (Issue 4) -- ACCEPTED (subsumed by Issue 3)

The OnboardingGate pattern from Issue 3 resolves this entirely. `ProtectedRoute` stays unchanged. No `requireOnboarding` prop needed. Issue 4's specific behavioral questions are answered:
- Completed user navigates to `/onboarding` directly -> `OnboardingPage` checks `completed_at`, redirects to `/portfolio`
- Skipped user on portfolio -> shows "Complete profile" card, never redirects back to `/onboarding`
- Multi-tab: both tabs check `onboarding_progress` independently. Second tab that opens during onboarding shows the same wizard state (reads from server). No conflict because reads are idempotent.

### MEDIUM Priority Changes

#### 8. Dynamic Disclosure Toggle for Collapsed Fields (Issue 8) -- ACCEPTED

Spec-changes from Round 1 accepted collapsing Methodologies + Certifications. The reviewer correctly identified that extraction may populate hidden fields, creating a count discrepancy in ExtractionSummaryBadge.

**Change**: The disclosure toggle text adapts to extraction state:
- No extraction data in hidden fields: "Add more detail (optional)"
- Extraction data found in hidden fields: "AI found {n} more fields -- review them (optional)"
- Clicking expands to show extracted fields with AI badges

ExtractionSummaryBadge counts only visible fields by default, adds "+{n} collapsed" if hidden fields have data.

#### 9. Progress Bar Percentages Update (Issue 9) -- ACCEPTED

Verified: Spec line 193 still says `"Step {current} of 6: {stepName}"` and the percentage table (lines 210-218) uses 6-step percentages. Both contradict the Round 1 accepted change to 4-step numbering.

**Updated progress table:**

| Screen | Top Bar Label | Progress Bar | Rationale |
|--------|---------------|-------------|-----------|
| Welcome | (unnumbered) | 15% | Endowed progress |
| Import | Step 1 of 4 | 36% | Generous reward for low-effort step |
| Your Profile | Step 2 of 4 | 57% | Past halfway, most fields pre-filled |
| Your Market | Step 3 of 4 | 78% | Nearly done |
| Your Voice | Step 4 of 4 | 93% | One click from completion |
| Completion | (unnumbered) | 100% | Celebration |

Spec line 193 format string updated to: `"Step {current} of 4: {stepName}"`

#### 10. Async Extraction ARIA Specifications (Issue 10) -- ACCEPTED

**Added to spec Section 13 (Accessibility) as new subsection "Async Extraction State":**

Skeleton state:
- Each skeleton element: `aria-hidden="true"`
- Fieldset containing loading fields: `aria-busy="true"`
- Screen reader announcement (aria-live="polite" region): "Loading profile data from your profiles..."

Extraction complete transition:
- `aria-busy="false"` on fieldset
- Screen reader announcement: "Profile data loaded. {found} of {total} fields extracted."
- Focus moves to ExtractionSummaryBadge (which has `tabIndex={-1}` and appropriate `aria-label`)

Fields populated by user before extraction completes: no focus disruption, no announcement for those fields.

#### 11. Browser Back Button Fix (Issue 11) -- ACCEPTED

Verified: The spec's approach (push history entry on Next, consume history entry on Back) creates forward loops in the history stack when users mix wizard Back and browser Back.

**Change**: Wizard navigation uses `replace` for Back, `push` for Next:
- "Next" / "Save & Continue" button: `navigate('/onboarding?step={n+1}')` (pushes new entry)
- "Back" button in wizard: `navigate('/onboarding?step={n-1}', { replace: true })` (replaces current entry)
- Browser Back always goes to the previous step the user advanced through
- No forward loops possible

Spec line 1643 clarified: "If on the Import step (first productive step), browser back navigates to the Welcome screen. If on the Welcome screen, browser back shows the skip confirmation dialog."

#### 12. Completion Step Data Sources (Issue 12) -- ACCEPTED

**firstName fallback chain (added to Section 9):**
1. `onboardingStore.formData.about_me.bio` -- extract first name from bio if possible
2. `user.user_metadata?.full_name?.split(' ')[0]` if not empty
3. `user.email?.split('@')[0]` as second fallback
4. Literal string `"there"` (yields "You're all set, there!")

**referenceCount copy change:**
- Was: `Voice trained on ${referenceCount} reference(s)`
- Now: `${referenceCount} writing sample${referenceCount !== 1 ? 's' : ''} added`
- Reason: "Voice trained on" implies processing is complete. References submitted via URL may still be extracting.

#### 13. Skip During In-Flight Extraction: Silent Import (Issue 13) -- ACCEPTED (Option B)

**Chosen behavior**: Let extraction complete silently. If extraction finishes after skip, results are stored in `onboarding_progress.extraction_results`. When the user later opens their profile (or clicks "Resume Setup"), extraction results are available to pre-fill.

Rationale: The user gets AI value even from a skipped session. No wasted backend compute. Clean product behavior -- "skip" means "skip the wizard UI", not "reject all AI help."

No `AbortController` needed. The extraction response writes to `extraction_results` column (never overwrites `step_data` per Issue 2 resolution). No race condition.

### LOW Priority Changes

#### 14. Confetti Error Handling (Issue 14) -- ACCEPTED

`AnimatedCheckmark` becomes a statically imported SVG component (trivial bundle size). `ConfettiCelebration` dynamically imported with `React.lazy` + `Suspense fallback={null}`. If confetti fails to load, completion step renders without confetti but with checkmark, headline, and CTA intact.

#### 15. Apply Round 1 Changes to Spec (Issue 15) -- ACCEPTED

This is a documentation completeness issue. The following spec sections still reflect pre-Round-1 values and must be updated when the spec is finalized:
- Spec line 998: `grid-cols-4` on mobile -> vertical stacked layout (see Issue 16)
- Spec line 1486: touch target table still documents the 36px bug
- Spec lines 720-736: Methodologies/Certifications still visible (should be collapsed behind disclosure toggle)

These will be applied when the spec is updated for implementation.

#### 16. Mobile Step 5 Upload Layout (Issue 16) -- ACCEPTED (reviewer's alternative)

The reviewer's vertical stacked layout is better than the Round 1 accepted 2-column grid:

```
Mobile (< 640px):
[Paste Text           ] (full-width row, min-height 44px)
[Upload File          ] (full-width row, min-height 44px)
[URL                  ] (full-width row, min-height 44px)
[Article / Publication] (full-width row, min-height 44px)
```

Rationale: File upload is high-value on mobile (native file picker accesses cloud storage). Hiding it behind "More options" penalizes the best mobile use case. Four full-width rows fit in any viewport above 375px, all touch targets WCAG compliant, no progressive disclosure needed.

Overrides the Round 1 accepted change (spec-changes-from-ux-review.md, item 7).

## Changes Deferred

None. All 16 issues evaluated and resolved.

## Changes Rejected

None. All issues verified against project reality.

## Summary

| # | Issue | Severity | Decision | Impact on Spec |
|---|-------|----------|----------|---------------|
| 1 | Extraction state machine | Critical | Accepted | New state machine + merge policy in Sections 5-6 |
| 2 | Auto-save race condition | Critical | Accepted (modified) | Separate DB columns for extraction vs user data |
| 3 | Routing race condition | Critical | Accepted | New OnboardingGate component, routing architecture |
| 4 | ProtectedRoute architecture | High | Accepted (subsumed) | Resolved by Issue 3's OnboardingGate |
| 5 | UserContextForm reuse | High | Accepted | Share schemas, build new wizard components |
| 6 | WritingReferencesManager reuse | High | Accepted | New OnboardingReferenceUpload inline component |
| 7 | Zustand store unspecified | High | Accepted | Full store interface added to Section 17 |
| 8 | Collapsed fields hide extraction | Medium | Accepted | Dynamic disclosure toggle text |
| 9 | Progress bar percentages | Medium | Accepted | Updated table + format string |
| 10 | Focus management for async | Medium | Accepted | New ARIA subsection in Section 13 |
| 11 | Browser Back button bug | Medium | Accepted | replace for Back, push for Next |
| 12 | Completion step data sources | Medium | Accepted | firstName fallback chain + copy change |
| 13 | Skip during extraction | Medium | Accepted (Option B) | Silent import, extraction completes |
| 14 | Confetti error handling | Low | Accepted | Static checkmark, lazy confetti |
| 15 | Round 1 changes not applied | Low | Accepted | Will apply when spec updated |
| 16 | Mobile upload layout | Low | Accepted (alternative) | Vertical stacked layout overrides Round 1 |
