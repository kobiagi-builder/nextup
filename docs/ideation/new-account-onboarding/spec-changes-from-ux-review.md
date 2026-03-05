# Spec Changes from UX Review (Round 1: Frontend-Design Critique)

**Date**: 2026-03-02
**Feedback Source**: /frontend-design sub-agent (senior UX critic)
**Evaluation Method**: /receiving-non-code-feedback skill

## Changes Applied to Spec

### CRITICAL Changes

#### 1. Extraction Architecture: Tiered Approach (was: LinkedIn-primary scraping)
**Why**: Existing codebase has NO LinkedIn profile scraping infrastructure. `publicationScraper.ts` handles articles, not `/in/` pages. LinkedIn profile scraping from server-side will fail 40-60%+ of the time.

**New architecture**:
- **Primary**: Website URL scraping (reliable, extend existing `fetchHtml` + cheerio patterns)
- **Secondary**: LinkedIn URL scraping (attempt with graceful fallback, reuse `publicationScraper` patterns)
- **Tertiary**: Paste fallback ("Paste your LinkedIn About section" textarea)
- **Framing**: "If your LinkedIn is public, we'll extract what we can" (honest, not over-promising)
- **UI change**: Add "Or paste your LinkedIn bio" text area below the URL input as immediate fallback

#### 2. Extraction Model: Async-First (was: blocking spinner)
**Why**: 15-30 second spinner is a trust cliff. Users should move forward, not wait.

**New flow**:
1. User enters URLs and clicks "Extract"
2. System immediately advances to Step 2 (About Me + Profession) with skeleton fields
3. Background extraction runs; when results arrive, fields populate with fade-in animation
4. If extraction fails, fields remain empty with "Needs your input" badges
5. No spinner page, no waiting state

### HIGH Priority Changes

#### 3. Step 3 Field Collapse (was: 7 fields visible)
Show 5 fields by default: Bio, Value Proposition, Years of Experience, Expertise Areas, Industries. Hide Methodologies + Certifications behind "Add more detail (optional)" disclosure toggle.

#### 4. LinkedIn URL Helper
Add below LinkedIn URL input:
- Hint text: "It looks like: linkedin.com/in/your-name"
- Small link: "How to find your LinkedIn URL" (opens help tooltip or LinkedIn search)

#### 5. Step Numbering: 4 Steps (was: 6)
- Welcome = unnumbered intro screen (no "Step X of Y")
- Step 1 of 4: Import
- Step 2 of 4: Your Profile
- Step 3 of 4: Your Market
- Step 4 of 4: Your Voice
- Completion = unnumbered celebration screen
- Progress bar still shows smooth 0-100% across all screens

#### 6. Post-Skip Empty State
When user skips onboarding and lands on portfolio:
- Show a card: "Complete your profile to get personalized content" with progress indicator
- Single CTA: "Resume Setup" linking back to onboarding wizard
- This is Phase 1 scope (not deferred to Phase 2)

### MEDIUM Priority Changes

#### 7. Mobile Tab Interface (Step 5)
Replace 4-column grid on mobile with:
- 2-column grid showing Paste + URL
- "More options" button expanding to show File + Publication
- All touch targets >= 44x44px

#### 8. Remove Swipe Navigation
Cut FR-2.16 entirely. Swipe conflicts with scrollable form content.

#### 9. AI Badge Text Size
Change from `text-[10px]` to `text-xs` (12px). WCAG compliance.

#### 10. Chip Toggle Group Role
Add `role="group"` with `aria-labelledby` to chip container.

#### 11. Copy Changes
| Location | Was | Now |
|----------|-----|-----|
| Welcome headline | "Let's set up your advisor OS" | "We'll personalize NextUp to how you work" |
| Welcome subtitle | "Most of the work is done by AI -- you just confirm" | "AI extracts what it can from your profiles -- you refine and confirm" |
| Import headline | "Where can we learn about you?" | "Start with your LinkedIn and website" |
| Completion headline | "Time to create something brilliant" | "Your profile is ready. Let's get to work." |
| Time promise | "Under 3 minutes" | "Under 3 minutes to set up your profile" |

### LOW Priority Changes (Cut)

#### 12. Background Gradient Shifting
Removed. Use static background color. Not noticeable, not worth dev effort.

#### 13. Progress Bar Glow
Removed. Smooth fill animation is sufficient.

#### 14. Entrance Animation Timing
Reduced from 7 stages / 700ms to 3 stages / 300ms total.

## Changes Deferred to Phase 2

- Writing Voice micro-preview (show AI content "in your voice" after adding reference)
- Re-engagement banner concrete UX design (currently FR-2.14, needs full treatment)
- Keyboard interaction full spec for mobile (visualViewport API, fallbacks)

## Changes Rejected

| Feedback | Reason for Rejection |
|----------|---------------------|
| "Eliminate LinkedIn scraping entirely" | User explicitly wants LinkedIn extraction. Tiered approach addresses reliability. |
| "Writing References is wrong moment" | User explicitly included this step. Already fully skippable. |
| "17 files too many" | Project pattern uses separate component files. Consolidate layout wrappers only. |
| "Waterfall animation feels fake" | First-time reveal is worth keeping. Use real streaming when possible. Show immediately on return visits. |
