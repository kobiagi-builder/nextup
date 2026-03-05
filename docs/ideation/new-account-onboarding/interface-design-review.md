# Interface Design Review: New Account Onboarding Wizard

**Reviewer**: Senior Interface Design Specialist (Round 2)
**Date**: 2026-03-02
**Documents Reviewed**: ux-ui-specification.md, ux-feedback-review.md, spec-changes-from-ux-review.md, prd-phase-1.md, prd-phase-2.md, contract.md
**Codebase Reviewed**: UserContextForm.tsx, WritingReferencesManager.tsx, AppShell.tsx, AuthProvider.tsx, ProtectedRoute.tsx, App.tsx, chatLayoutStore.ts, useUserContext.ts, useWritingExamples.ts, ReferenceUploadDialog.tsx, TagsInput.tsx

**Scope**: This review focuses on interface mechanics, state machine completeness, data flow logic, system feedback patterns, routing integration, and component reuse reality. It does not re-litigate UX issues already addressed in Round 1.

---

## Executive Summary

The Round 1 reviewer caught the right product-level problems: LinkedIn scraping reliability, extraction wait time, step count inflation. What they missed is the machinery underneath. This spec has at least 11 interface design problems that will produce production bugs, confusing states, or broken user flows. The most critical three are the async extraction state machine (fundamentally underspecified after the Round 1 change), the routing race condition in AuthProvider, and the data merge conflict between extraction results and user edits. These are not polish issues. They will break during development.

---

## Issue 1: The Async Extraction State Machine Is Broken After Round 1

**Severity: Critical. This problem was introduced by a Round 1 accepted change.**

Round 1 correctly identified the blocking spinner as a trust cliff and the spec-changes document (lines 21-29) describes the accepted async flow: user clicks Extract, system immediately advances them to Step 3 with skeleton fields, extraction runs in the background. This change was accepted without updating the state machine to handle the complexity it introduces.

**The states the spec now implies but does not define:**

```
EXTRACTION_STATES:
  idle         -> User has not clicked Extract
  submitted    -> URLs submitted, extraction API called, user now on Step 3
  extracting   -> Backend processing, Step 3 fields show skeletons
  complete     -> All results received
  failed       -> Extraction errored
  timeout      -> 30s elapsed, no results
  skipped      -> User bypassed Step 2 entirely

FIELD_STATES (per field, required by async model):
  skeleton        -> Extraction in progress, field is shimmer
  populated_by_ai -> Extraction filled this field, user has not touched it
  edited_by_user  -> User modified an AI-populated value
  user_authored   -> User wrote from scratch (no extraction result existed)
  empty           -> Neither extraction nor user has filled this
```

None of these states are defined in the spec. The spec describes the loading skeleton visual (spec lines 488-518) and the waterfall animation (lines 532-541), but those describe the old synchronous Step 2 experience. After the async change, skeleton fields are now rendered in Step 3 while those same fields are simultaneously editable.

**Concrete problem 1: The user types into a field that is still loading.**

Step 3 loads. Bio field shows a shimmer. User decides not to wait and starts typing. Two seconds later, extraction completes and tries to populate Bio. The spec says nothing about what happens. The two obvious wrong behaviors are: (a) extraction overwrites the user's text silently, or (b) the extraction result is silently discarded. Neither is specified. The correct behavior requires a merge strategy: if a field's state is `user_authored`, the extraction result for that field is discarded. If the field state is `skeleton`, extraction populates it. This merge policy must be specified explicitly in the spec.

**Concrete problem 2: The ExtractionSummaryBadge renders before extraction completes.**

Spec line 636: `<ExtractionSummaryBadge found={6} total={8} />` shown at Step 3 load time. In the async model, extraction has not finished when Step 3 loads. The badge cannot report "Found 6 of 8 fields" until results arrive. The spec treats this as a static value. It must be dynamic: hidden while extracting, appearing with a fade when extraction resolves. The transition animation for this appearance is not specified.

**Concrete problem 3: AI badges flash from amber to green mid-session.**

Spec line 648: `aiExtracted={!!extractedData.bio}`. In the async model, `extractedData.bio` is `undefined` at Step 3 load time because extraction has not completed. Every `OnboardingField` renders the amber "Needs your input" badge initially, then switches to the green "AI extracted" badge when extraction completes 2-15 seconds later. This is a visible state change on live form fields while the user may already be typing. The spec does not define the transition animation for the badge state change, or what happens to the field if the user is actively typing in it when the badge changes.

**Recommendation**: Add a formal extraction state machine diagram to Section 5 (Step 2) and Section 6 (Step 3) of the spec. Define the merge policy explicitly:

```
Field merge policy (applies when extraction results arrive):
  field.state === 'skeleton'        -> accept result, animate field population
  field.state === 'user_authored'   -> discard result, preserve user input, no badge
  field.state === 'populated_by_ai' -> accept updated result (user never touched it)
  field.state === 'edited_by_user'  -> discard result, preserve user edit, show "AI found different value" option
```

---

## Issue 2: Auto-Save and Extraction Write Race Condition

**Severity: Critical.**

The spec defines auto-save at lines 789-792: every field change debounces at 500ms and auto-saves to `onboarding_progress`. The implementation example at lines 1959-1977 shows this mutation firing on field change.

Now combine this with async extraction: user opens Step 3, immediately starts typing in the Bio field. The auto-save fires at 500ms, writing `about_me.bio = "partial text"` to the backend. Two seconds later, extraction completes and attempts to write `about_me.bio = "AI extracted bio"` to the same record.

PRD FR-1.10 says extraction results are stored in `onboarding_progress`. The auto-save also writes to `onboarding_progress`. Both paths write to the same JSON structure in the same database row with no conflict resolution logic. If `useAutoSave` and the extraction completion handler both call `updateOnboardingProgress.mutateAsync` within a concurrent window, React Query fires two mutations. The last writer wins. On a variable-latency mobile connection, the outcome is non-deterministic.

**Compounding factor from the existing `useUpdateUserContext` pattern**: That hook (useUserContext.ts lines 86-161) performs a fetch-then-merge-then-update sequence: it reads the existing row, merges the new data, then writes. If two calls hit this pattern simultaneously, the first read may return stale data for the second write's merge calculation. The existing code does not use optimistic locking or ETags to prevent this.

**Recommendation**: The `onboarding_progress` write API must be merge-aware. The backend `PUT /api/onboarding/progress` must deep-merge the incoming delta onto the existing record, not replace it. More cleanly: store extraction results in a dedicated `extraction_results` column and user-edited values in `step_data`. These columns never overwrite each other. The frontend combines them on read using the field provenance model from Issue 1, but on write they are always separate.

---

## Issue 3: Routing Race Condition Between Auth, Migration, and Onboarding Detection

**Severity: Critical.**

Reading `AuthProvider.tsx` lines 35-55: when a user signs in, the provider fires a data migration call to `POST /api/auth/migrate-data`. This is fire-and-forget -- not awaited, failing silently. `setLoading(false)` is called at line 26, before migration completes.

PRD FR-1.36 requires `ProtectedRoute` to redirect to `/onboarding` if the user is authenticated but onboarding is not complete. The spec implementation note at lines 1930-1940 shows this check happening in `ProtectedRoute`. But `ProtectedRoute.tsx` currently reads only `useAuth()` (line 7). Adding onboarding status requires fetching `onboarding_progress`, which requires a network call on every protected page render.

**Race condition 1: First login, onboarding row not yet created.**

User signs in for the first time. `onAuthStateChange` fires. `setLoading(false)` is called. `ProtectedRoute` renders and attempts to check `onboarding_progress`. The row does not yet exist because the backend user-creation flow (triggered by migration) may still be in flight. The query returns null. The spec interprets null as "new user, show onboarding." This is correct behavior -- but it depends on the row not existing. If a race condition causes an empty `onboarding_progress` row to be created before the check fires, the user bypasses onboarding.

**Race condition 2: Returning user on a new device.**

User completed onboarding on Device A. Returns on Device B where `localStorage.data-migrated` is not set. `onAuthStateChange` fires with `SIGNED_IN`, triggering migration again (AuthProvider line 35). If migration performs any write to `onboarding_progress` -- even a no-op -- and the implementation uses `INSERT ... ON CONFLICT DO UPDATE`, it could reset `completed_at` to null. The spec does not specify whether migration is idempotent with respect to `onboarding_progress`.

**Race condition 3: Page refresh mid-onboarding.**

User is on Step 3, presses F5. `AuthProvider` fires, calls `getSession`, sets `loading = false`. `ProtectedRoute` renders. React Query cache is cold on reload. The `onboarding_progress` query is in-flight. During this in-flight window, if `ProtectedRoute` renders its children instead of a loading spinner, the portfolio page may flash briefly before the redirect to `/onboarding` fires. The spec does not define the loading behavior for this case.

**Recommendation**: Define a formal three-state onboarding detection model:

```
onboarding_progress row does not exist  -> new user, show onboarding Step 1
completed_at is null                    -> returning incomplete user, resume at last_step
completed_at is not null                -> completed user, never redirect to /onboarding
```

Move the detection logic into a new `OnboardingGate` component that wraps the router between `AuthProvider` and `AppShell`. `OnboardingGate` renders a loading spinner while `onboarding_progress` is fetching, then redirects or renders children. Keep `ProtectedRoute` as auth-only. This separates two distinct concerns that the spec currently proposes merging into one component.

---

## Issue 4: ProtectedRoute Cannot Redirect to /onboarding Without Architecture Work

**Severity: High.**

The spec implementation note at lines 1930-1935 proposes:

```tsx
<Route path="/onboarding" element={
  <ProtectedRoute requireOnboarding={false}>
    <OnboardingPage />
  </ProtectedRoute>
} />
```

This requires adding a `requireOnboarding` prop to the existing `ProtectedRoute`. Reading `ProtectedRoute.tsx` (all 22 lines), it is a simple auth guard that reads `useAuth()`. Adding onboarding awareness requires it to also read onboarding status -- a second async concern with its own loading state. The spec never defines what `requireOnboarding={false}` means semantically (presumably: allow access even if onboarding is incomplete, but still require authentication).

**Unspecified behaviors the spec must define:**

- What renders when a completed user navigates directly to `/onboarding`? A redirect to `/portfolio`? An error screen? The spec says "never show onboarding again" (PRD FR-1.37) but does not handle direct URL navigation.
- After a user skips onboarding and lands on the portfolio, the spec proposes a "Complete your profile" card (spec-changes lines 51-55). If PortfolioPage calls `useOnboardingProgress` and sees `completed_at` is null, does it redirect back to `/onboarding` or show the card? These behaviors must be mutually exclusive and clearly specified.
- Can a user on Step 3 open the app in a second tab simultaneously? The second tab will also check `onboarding_progress` and potentially redirect. The spec does not address multi-tab behavior.

**Recommendation**: Document the routing architecture decision in Section 17. The cleanest pattern for this codebase:

```
1. Keep ProtectedRoute unchanged (auth-only)
2. Add OnboardingGate between ProtectedRoute and AppShell
3. OnboardingGate owns the onboarding_progress check and redirect logic
4. /onboarding route uses ProtectedRoute only, no AppShell, no OnboardingGate
5. OnboardingPage internally checks: if completed_at is set, redirect to /portfolio immediately
6. PortfolioPage shows the "Complete profile" card based on onboarding_progress state, never redirects
```

---

## Issue 5: UserContextForm.tsx Cannot Be Reused As-Is

**Severity: High.**

Spec line 1880 states: "Forms: React Hook Form + Zod -- Match existing `UserContextForm.tsx` patterns." After reading the component fully, direct reuse is not viable for three structural reasons.

**Reason 1: Submit and Cancel buttons are embedded in every section form.**

`AboutMeForm` renders its own Save/Cancel button row at lines 134-144. `ProfessionForm` at lines 218-228. `GoalsForm` at lines 423-431. The spec's wizard shows navigation exclusively in the `WizardStepFooter` component, separated from the form fields. Reusing these forms directly renders two button rows: the form's own Save/Cancel and the wizard's Back/Save & Continue footer. The spec's component hierarchy (lines 623-750) shows form fields with no embedded buttons, which is correct -- but this requires the existing component to either expose a `hideButtons` prop or be refactored before reuse.

**Reason 2: The Cancel button is semantically wrong in the wizard context.**

`UserContextFormProps` line 59 requires `onCancel: () => void`. In the wizard, Cancel has no meaning. The user navigates Back. Passing a no-op is misleading to the next developer who reads the wizard code and sees `onCancel={() => {}}`.

**Reason 3: CustomersForm unconditionally calls ICP hooks.**

Lines 262-263 call `useIcpSettings()` and `useUpsertIcpSettings()` regardless of `showIcp`. The comment at line 261 acknowledges this: "always called (React rules), data ignored when showIcp=false." During onboarding, ICP settings are explicitly out of scope (contract.md Out of Scope section). Every render of Step 4 (Customers + Goals) would fire `GET /api/customers/icp-settings`. This is a spurious network call the spec never acknowledges.

**Practical recommendation**: Do not reuse `UserContextForm.tsx` directly. Extract the four Zod schemas (`aboutMeSchema`, `professionSchema`, `customersSchema`, `goalsSchema`) into a shared `schemas/userContext.ts` file. Build four new onboarding-specific form components -- `OnboardingAboutMeForm`, `OnboardingProfessionForm`, `OnboardingCustomersForm`, `OnboardingGoalsForm` -- that use those schemas but implement wizard-compatible interfaces: no embedded buttons, no Cancel prop, no ICP hooks. This is the correct "reuse the patterns" interpretation of FR-1.25.

---

## Issue 6: WritingReferencesManager Reuse Is Unrealistic

**Severity: High.**

Spec line 994 calls Step 5 a "simplified version of `ReferenceUploadDialog`." After reading both components, the simplification required is not visual -- it is structural.

**Problem 1: ReferenceUploadDialog is a Sheet (side drawer), not an inline card.**

`ReferenceUploadDialog.tsx` imports `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` (lines 21-24). The spec's Step 5 embeds the upload interface as an inline `Card` within the scrollable wizard content area. The DOM structures are incompatible. The dialog cannot be "simplified" into an inline card. It must be rebuilt as a new component.

**Problem 2: The callback surface is incompatible with the wizard's tracking requirements.**

`ReferenceUploadDialog` requires four callbacks: `onSubmitPaste`, `onSubmitFile`, `onSubmitFileUrl`, `onSubmitPublicationUrl` (lines 50-75 of that file). The wizard also needs to call these same mutations. But additionally, the wizard must track each resulting reference ID in its local state (the `addedReferences` list shown at spec line 1023). This tracking layer does not exist in either the dialog or the manager. It must be built.

**Problem 3: Extraction polling continues during the completion step.**

`useWritingExamples.ts` lines 76-81 include built-in polling: the query refetches every 2 seconds when any reference has `extraction_status === 'extracting'` or `'pending'`. If the user submits a URL reference in Step 5 (triggering background extraction), polling starts. The user then clicks Continue and advances to Step 6 (confetti animation). The polling continues in the background, causing React Query cache updates during the completion step. The spec does not address polling lifecycle at wizard completion. This will cause silent re-renders and may interrupt the confetti animation timing if re-renders force a component update.

**Recommendation**: Build `OnboardingReferenceUpload` as a new component using the same hooks as `WritingReferencesManager` (`useCreateWritingExample`, `useUploadWritingExample`, `useExtractFromUrl`, `useExtractPublication`) but with an inline Card layout and a simple `onReferenceAdded: (id: string) => void` callback. When the completion step mounts, explicitly stop the writing examples polling by calling `queryClient.cancelQueries({ queryKey: writingExamplesKeys.list() })` or by setting `refetchInterval` to false via a store flag.

---

## Issue 7: The Zustand Store Shape Is Completely Unspecified

**Severity: High.**

Spec line 1882 is the entirety of the state management specification: "State: Zustand (client) + React Query (server)." The implementation example at lines 1970-1976 shows `setFormData(prev => ...)` inside a Textarea onChange, implying local `useState` per step component. This is insufficient for the async extraction model for three specific reasons.

**Reason 1: Data loss on step unmount.**

User fills Step 3, clicks Next. Step 3 unmounts. All `useState` values are garbage collected. Auto-save debounces at 500ms. If the user typed and immediately clicked Next within 500ms, the debounce has not fired. When the user clicks Back, Step 3 remounts and re-fetches from `onboarding_progress`. The last auto-saved state may be several edits stale. The user sees a form missing their recent work.

**Reason 2: Extraction cannot reach an unmounted component.**

Extraction arrives while the user is on Step 4. The results need to update Step 3 fields. Step 3 is unmounted. There is no subscriber. The results write to `onboarding_progress` server-side, but the client-side form state is stale. When the user navigates back to Step 3, the form fetches from `onboarding_progress` and shows the extracted values -- but with no field provenance information. Every field looks equally "user-authored" or equally "AI-extracted" depending on how the fetch populates the form, because provenance was never stored.

**Reason 3: Field provenance cannot survive step navigation with local state.**

The AI badge system (`aiExtracted={!!extractedData.bio}`) requires knowing which fields came from extraction vs. user input. This information lives in local `useState`. When Step 3 unmounts and remounts, all provenance is lost. A field the user edited (changing its badge from "AI extracted" to no badge, indicating user authorship) re-shows the "AI extracted" badge after Back navigation, because the form re-initializes from `onboarding_progress` which stores values without provenance metadata.

**Recommended Zustand store shape for `frontend/src/features/onboarding/stores/onboardingStore.ts`:**

```typescript
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
  currentStep: number
  extractionStatus: 'idle' | 'submitted' | 'extracting' | 'complete' | 'failed' | 'timeout'
  extractionJobId: string | null
  linkedInUrl: string
  websiteUrl: string
  formData: OnboardingFormData
  fieldProvenance: Record<string, FieldProvenance>
  addedReferenceIds: string[]

  setStep: (step: number) => void
  setExtractionStatus: (status: OnboardingWizardStore['extractionStatus']) => void
  applyExtractionResults: (results: Partial<OnboardingFormData>) => void
  updateField: (path: string, value: unknown) => void
  addReferenceId: (id: string) => void
  removeReferenceId: (id: string) => void
  reset: () => void
}
```

This store must NOT use `persist` middleware. Onboarding form data is server-persisted via `onboarding_progress`. Zustand serves only as in-memory working state between server syncs. On page reload, the store re-hydrates from `onboarding_progress` via a `useEffect` in the wizard root component.

---

## Issue 8: Collapsed Fields Create an Undiscovered Extraction Data Gap

**Severity: Medium.**

Spec-changes lines 33-35 accepted collapsing Methodologies and Certifications behind an "Add more detail (optional)" disclosure toggle. The spec component hierarchy at lines 720-736 still renders both fields as always visible -- the accepted change was never applied to the spec itself. This is a documentation debt. More importantly, it surfaces a new interaction problem.

If extraction populates `methodologies` or `certifications`, those fields are hidden. The ExtractionSummaryBadge at spec line 636 counts all fields, including hidden ones. The user sees "Found 6 of 8 fields" but only 5 fields are visible. The discrepancy is unexplained. Users may assume the interface has a bug or that they missed something.

Concrete scenario: extraction finds `methodologies: "Agile, OKRs, JTBD"`. The field is collapsed. The badge says "Found 6 of 8." The user reviews all visible fields, sees the AI content, confirms it, and clicks Save & Continue. The `methodologies` value was never reviewed. The AI content engine will use it, but the user never confirmed it. This violates the "you just confirm" promise from the Welcome step.

**Recommendation**: The disclosure toggle must indicate extraction presence dynamically:
- No extraction data in hidden fields: "Add more detail (optional)"
- Extraction data exists in one or more hidden fields: "AI found 2 more fields -- review them (optional)"

Clicking the toggle expands to show the extracted fields with AI badges. This surfaces the AI's work rather than hiding it.

---

## Issue 9: Progress Bar Percentages Are Wrong After Step Renumbering

**Severity: Medium.**

Spec-changes lines 43-50 accepted renaming the visible step count to "Step 1 of 4" through "Step 4 of 4." The spec's progress percentage table at lines 210-218 has not been updated. It still shows 6-step percentages:

| Top Bar Label | Step Shown | Progress Bar |
|--------------|-----------|-------------|
| (unnumbered) | Welcome | 17% |
| Step 1 of 4 | Import | 33% |
| Step 2 of 4 | About Me + Profession | 50% |
| Step 3 of 4 | Customers + Goals | 67% |
| Step 4 of 4 | Writing Voice | 83% |
| (unnumbered) | Completion | 100% |

The progress bar showing 33% when the top bar says "Step 1 of 4" creates a mismatched signal. Users who associate "Step 1 of 4" with 25% completion will perceive the bar as slightly ahead. The endowed progress effect (spec line 144) is undermined when the two signals conflict.

Additionally, spec line 193 still contains the string `"Step {current} of 6: {stepName}"`. If implemented as written, this renders "Step 1 of 6: Import" while the accepted change specifies "Step 1 of 4." A developer implementing from the spec will produce the wrong output.

**Recommendation**: Update spec line 193's format string to `"Step {current} of 4: {stepName}"`. Revise the progress percentage table to use values consistent with 4 productive steps while preserving the endowed progress effect. Suggested values: Welcome = 15%, Step 1 = 36%, Step 2 = 57%, Step 3 = 78%, Step 4 = 100%.

---

## Issue 10: Focus Management Is Underspecified for Async Extraction State

**Severity: Medium.**

Spec line 1520 specifies: "On step transition, focus moves to the step headline (h1)." This is correct for normal transitions.

In the async extraction model, Step 3 has two distinct initial render states that require different focus behavior. The spec defines only one.

**State A (extraction already complete):** Fields are pre-populated. Focus on h1 ("Review your profile") is appropriate. The user reads the headline, then tabs into the first populated field.

**State B (extraction still running):** Fields show shimmer skeletons. Focus on h1 ("Review your profile") is technically functional but misleading. A screen reader user who tabs after the headline will encounter skeleton elements. The spec shows Skeleton components at lines 501-516 with no ARIA attributes specified. Without `aria-hidden="true"` on shimmer elements, a screen reader will attempt to read them and announce nothing meaningful.

**Missing ARIA specifications for async extraction:**

The spec's accessibility section (lines 1509-1537) does not address the skeleton state at all. Required additions:
- Each skeleton element: `aria-hidden="true"` (prevents screen reader from encountering empty shimmer)
- The fieldset containing loading fields: `aria-busy="true"` (announces that content is loading)
- An `aria-live="polite"` region that announces "Profile data loaded -- 6 of 8 fields extracted" when extraction completes
- After extraction completes and fields are populated, focus should move to the ExtractionSummaryBadge, not remain on h1

**Recommendation**: Add a subsection to Section 13 (Accessibility) titled "Async Extraction State" that specifies the ARIA attributes, live region content, and focus target for both the skeleton state and the extraction-complete transition.

---

## Issue 11: Browser Back Button Creates a History Stack Bug

**Severity: Medium.**

Spec lines 1638-1644 specify: "Browser back button navigates to previous wizard step. History entries pushed for each step: `/onboarding?step=1`, `/onboarding?step=2`, etc."

This means the "Next" button pushes a new history entry. The wizard's own "Back" button calls `navigate(-1)` (or equivalent), consuming a history entry. These two navigation mechanisms create a double-entry problem:

1. User goes: Welcome -> Step 1 -> Step 2 -> Step 3
2. History stack: `[welcome, step1, step2, step3]` -- correct
3. User clicks wizard Back button -> Step 2
4. History stack is still `[welcome, step1, step2, step3]`, current pointer at step2
5. User clicks wizard Next -> Step 3
6. A new entry is pushed: `[welcome, step1, step2, step3, step2, step3]`
7. User presses browser Back from Step 3 -> goes to Step 2 (correct)
8. User presses browser Back again from Step 2 -> goes to Step 3 (wrong -- user expects to continue backward)

The history stack now contains a forward loop. Browser back navigation becomes unpredictable after the user has used the wizard's Back button at least once.

Additional gap: spec line 1643 says "If on Step 1, back button shows skip confirmation." The Welcome step is Step 1 in the old numbering, Step 0 conceptually (it's unnumbered). The Import step is the first productive step. The spec should clarify: "If on the Import step (first productive step), browser back navigates to the Welcome screen. If on the Welcome screen, browser back shows the skip confirmation dialog."

**Recommendation**: The wizard's "Back" button should use `navigate(path, { replace: true })` rather than `navigate(-1)`. This replaces the current history entry rather than consuming a history entry. Only the "Next" / "Save & Continue" button pushes new entries. Browser back then always corresponds to steps the user has not yet reviewed in the current forward session, creating predictable navigation.

---

## Issue 12: Completion Step's Personalized Data Sources Are Unspecified

**Severity: Medium.**

Spec line 1124: `You're all set, {firstName}!`

The spec never defines where `firstName` comes from. Reading `AuthProvider.tsx`, the context provides `user: User | null`. Supabase `User` has `user_metadata` which may contain `full_name` from OAuth providers. The app uses email/password signup -- `SignupPage` is not in the reviewed files, so it is unclear whether `full_name` is collected. If it is not, `user.user_metadata.full_name` will be empty for all email/password users and the fallback is undefined.

Spec line 1143: `Voice trained on ${referenceCount} reference(s)`. `referenceCount` derives from the wizard's `addedReferenceIds` store. If the user submitted a URL reference in Step 5 (which triggers background extraction), the reference may still be in `extracting` or `pending` status at completion time. The count shown is "references submitted," not "references processed." The copy "Voice trained on" implies processing is complete, which is inaccurate.

**Recommendation for `firstName`**: Define an explicit fallback chain in Section 17:
1. `user.user_metadata?.full_name?.split(' ')[0]` if not empty
2. `user.email?.split('@')[0]` as second fallback
3. The literal string `"there"` as final fallback (yielding "You're all set, there!")

**Recommendation for `referenceCount`**: Change the copy to "Writing samples added: {n}" which does not imply AI processing has completed. Alternatively, wait for all submitted references to clear `extracting` status before showing the completion step (spec already has a 30s timeout for extraction, so this does not create an indefinite wait).

---

## Issue 13: Skip During In-Flight Extraction Has No Defined Behavior

**Severity: Medium.**

After Round 1, extraction starts when "Extract My Profile" is clicked and the user immediately advances to Step 3. No part of the spec addresses what happens when the user skips during extraction.

**Scenario**: User clicks Extract, advances to Step 3, decides to skip, clicks "Skip setup for now," confirms the dialog. Onboarding is marked complete (PRD FR-1.4). The user lands on `/portfolio`.

The extraction API call is still running on the backend. There is no `AbortController` or cancellation mechanism specified anywhere in the spec. The backend completes extraction, writes results to `onboarding_progress.extraction_results`, returns a 200. The frontend, now on the portfolio page, ignores the response. The extraction results sit in a completed-and-skipped `onboarding_progress` record permanently, never applied to `user_context`.

The "Complete your profile" card shown to users who skipped (spec-changes lines 51-55) may or may not surface these extraction results when the user later resumes. The spec does not address this.

**Recommendation**: Choose and document one of these two behaviors:

Option A (Cancel): Use `AbortController` on the extraction fetch when skip is confirmed. Backend sees a cancelled request, does not write results. Clean state. Implementation note belongs in Section 17.

Option B (Silent import): Let extraction complete. On completion, silently apply extraction results to `user_context` even though onboarding was skipped. The user's profile is pre-populated when they next visit the profile page. This is the better user outcome -- they receive the AI value even from a skipped session. This behavior should be explicitly documented as the intended product decision, as it constitutes a significant UX choice about what "skip" means.

---

## Issue 14: canvas-confetti Dynamic Import Has No Error Handling

**Severity: Low.**

Spec line 2000: "Load `canvas-confetti` dynamically only when Step 6 is reached." The approach is correct. The missing piece: if the dynamic import fails (CDN unavailability, CSP restriction, network timeout), the `ConfettiCelebration` component errors. Without an error boundary, this error propagates up and could crash the entire completion step.

Additionally, the spec groups `ConfettiCelebration` and `AnimatedCheckmark` in the same component directory (spec lines 1913-1914). If a developer bundles them together in a lazy-loaded chunk, an import failure would also take down `AnimatedCheckmark`. The checkmark is the primary success signal on the completion step, not merely decorative. It must not be at risk from a confetti import failure.

**Recommendation**: `AnimatedCheckmark` should be a statically imported SVG component. Its implementation is trivial (a single SVG with CSS `stroke-dashoffset` animation) and adds negligible bundle size. Only `ConfettiCelebration` should be dynamically imported, wrapped in a `React.Suspense` with `null` fallback:

```tsx
const ConfettiCelebration = React.lazy(() => import('../shared/ConfettiCelebration'))

// In CompletionStep:
<React.Suspense fallback={null}>
  <ConfettiCelebration active={true} />
</React.Suspense>
```

If confetti fails to load, the step renders without confetti but with the checkmark, headline, and CTA intact. No crash.

---

## Issue 15: The Round 1 Mobile Tab Fix Was Never Applied to the Spec

**Severity: Low.**

Spec-changes lines 57-62 accepted: "Replace 4-column grid on mobile with 2-column grid showing Paste + URL, with 'More options' button expanding to show File + Publication."

The spec's component hierarchy at line 998 still shows:
```tsx
<TabsList className="w-full grid grid-cols-4 h-9">
```

This is unchanged from before Round 1. The fix was accepted in spec-changes but never applied to the spec's component code. A developer implementing from the spec rather than the changes doc will build the pre-Round-1, non-compliant interface.

The touch target table at spec line 1486 also still reads: "Tab Triggers: 36px height (slightly under, compensate with padding)." After Round 1's fix, this acknowledged violation should no longer exist. The table still documents the bug rather than the fix.

---

## Issue 16: Disagreement With the Mobile Tab Fix Accepted in Round 1

**Severity: Low (design disagreement with an accepted change).**

Spec-changes lines 57-62 accepted a 2-column grid on mobile with File and Publication uploads hidden behind a "More options" button.

This is the wrong tradeoff. File upload (PDF, DOCX) is likely the highest-value action for mobile users. On iOS and Android, the native file picker provides access to iCloud Drive, Google Drive, Dropbox, and on-device camera -- a richer selection experience than desktop for users who save articles to cloud storage. Hiding File behind "More options" specifically penalizes the scenario where mobile excels.

The WCAG 2.1 AA touch target problem (36px tabs at 320px viewport) is real and must be fixed. But the solution should not require progressive disclosure of useful functionality.

**Recommended alternative**: On mobile, replace the 4-column tab grid with a vertical stacked layout:

```
[Paste Text           ] (full-width row, min-height 44px)
[Upload File          ] (full-width row, min-height 44px)
[URL                  ] (full-width row, min-height 44px)
[Article / Publication] (full-width row, min-height 44px)
```

Four full-width rows totaling approximately 176px. Fits comfortably in any viewport above 375px when placed above the fixed footer. All methods visible, all touch targets compliant, no progressive disclosure. The active row gets a primary styling treatment to show selection.

---

## Summary: Issues by Severity

| # | Issue | Severity | Introduced by Round 1? |
|---|-------|----------|----------------------|
| 1 | Async extraction state machine undefined (field states, merge policy) | Critical | Yes |
| 2 | Auto-save + extraction write race condition | Critical | Yes |
| 3 | Auth / migration / onboarding detection race condition in AuthProvider | Critical | No |
| 4 | ProtectedRoute cannot redirect to /onboarding without architecture decision | High | No |
| 5 | UserContextForm.tsx reuse not viable (embedded buttons, Cancel, ICP hooks) | High | No |
| 6 | WritingReferencesManager reuse unrealistic (Sheet vs card, polling at Step 6) | High | No |
| 7 | Zustand store unspecified; local useState insufficient for async model | High | No |
| 8 | Collapsed fields hide extraction data without indication | Medium | Yes |
| 9 | Progress bar percentages inconsistent with accepted 4-step renumbering | Medium | Yes |
| 10 | Focus management unspecified for async skeleton state | Medium | Yes |
| 11 | Browser Back button creates double-history-entry bug | Medium | No |
| 12 | Completion step firstName and referenceCount sources unspecified | Medium | No |
| 13 | Skip during in-flight extraction has undefined behavior | Medium | Yes |
| 14 | canvas-confetti import has no error boundary; AnimatedCheckmark should be static | Low | No |
| 15 | Round 1 mobile tab fix never applied to spec component hierarchy | Low | Yes (incomplete) |
| 16 | Mobile Step 5 "More options" hides most-useful upload method (disagreement) | Low | Yes |

---

## Priority Action Items Before Development Begins

**Critical -- must resolve before Phase 1 development:**

1. Add the extraction state machine to the spec. Define all extraction states, all field-level provenance states, and the merge policy (what happens when extraction results arrive for a field the user has already edited). Every component in Steps 2, 3, and 4 depends on this model. This is the single highest-value thing missing from the spec.

2. Resolve the auto-save vs. extraction write race. Choose between: (a) merge-aware backend write API for `onboarding_progress`, or (b) separate database columns for `extraction_results` and `step_data` that never overwrite each other.

3. Define the routing architecture. Document which component owns onboarding detection, how it handles the auth/migration timing window, and what renders during the `onboarding_progress` fetch loading state. The `ProtectedRoute` modification implied in the spec is insufficient -- this needs a dedicated component.

**High -- must resolve before Phase 1 development:**

4. Document that UserContextForm.tsx will not be reused directly. Specify that onboarding forms share the Zod schemas but build new wizard-compatible components.

5. Define the Zustand store shape in Section 17. The local-useState approach in the implementation example will not work with async extraction or Back navigation.

6. Clarify WritingReferencesManager situation: Step 5 needs a new `OnboardingReferenceUpload` inline card component. Document this explicitly.

**Medium -- must resolve before Phase 2 development:**

7. Apply all Round 1 accepted changes to the spec itself. Currently the spec contradicts its own changes document on three points: field collapse layout (spec lines 720-736), format string (line 193), and touch target table (line 1486).

8. Add async extraction skeleton ARIA specifications to the accessibility section.

9. Define the `firstName` fallback chain for the completion step.

10. Define skip-during-extraction behavior (cancel vs. silent import).

11. Fix the browser Back button history specification: use `replace` for Back, `push` for Next.

---

*End of Interface Design Review (Round 2). This document should be read alongside ux-feedback-review.md and spec-changes-from-ux-review.md. The issues here are additive to Round 1, not substitutes for it.*
