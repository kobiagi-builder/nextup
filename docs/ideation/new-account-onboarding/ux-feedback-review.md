# UX/UI Critique: New Account Onboarding Wizard

**Reviewer**: Senior UX/UI Design Critic
**Date**: 2026-03-02
**Documents Reviewed**: ux-ui-specification.md, ux-research-findings.md, prd-phase-1.md, prd-phase-2.md, contract.md

**Verdict**: Solid foundation. Well-researched. But it has six specific problems that will kill the 90% completion target if left unaddressed. This critique names them without softening.

---

## 1. Drop-Off Risks: Where Users Will Actually Abandon

### Step 2 (Import) is the highest-risk step in the entire flow

**The LinkedIn URL problem.** A significant portion of consultants and advisors do not have their LinkedIn URL memorized. On mobile, they now need to: (1) leave the wizard, (2) open LinkedIn, (3) find their own profile, (4) copy the URL, (5) switch back to the browser, (6) find the onboarding tab, and (7) paste the URL. That is a 7-step detour on mobile before the user has even started the "under 3 minutes" promise.

**Recommendation**: Add a secondary option below the LinkedIn URL field: "Find my LinkedIn URL" -- a small link that opens LinkedIn's profile search in a new tab. Even better: add a hint that says "It looks like: linkedin.com/in/yourname" with a small illustration.

**The extraction wait is a trust cliff.** The spec specifies up to 15 seconds for extraction (NFR-1.1). That is the happy path. On a slow network or with a slow Claude response, this could hit 30 seconds. Users who have been waiting 20 seconds for a spinner are not reading "Extracting expertise and skills..." and feeling delighted.

**Drop-off prediction**: ~20-25% of users will bounce or skip during a long extraction wait.

**Recommendation**: Make extraction async-first. Start extraction in background the moment user clicks "Extract My Profile" and immediately advance them to Step 3 with skeleton fields and a subtle "AI is still working..." indicator. When extraction finishes, fields populate. If extraction fails, they already have blank fields to fill.

**Step 3 has a hidden form-length problem.** 7 fields across two sections on one scrollable step. When extraction fails or finds little, the user is staring at 7 empty boxes and the promise of "most of the work is done by AI" has just evaporated.

**Drop-off prediction**: ~10-15% of users with poor/no extraction results will abandon on Step 3.

**Recommendation**: Make Methodologies and Certifications collapsed by default behind a "Add more detail (optional)" disclosure button. On first render, show only: Bio, Value Proposition, Expertise Areas.

**Step 5 is where the "under 3 minutes" promise officially dies for engaged users.** If a user actually engages with Step 5 the time promise breaks. Change to "under 3 minutes to set up your profile" (not including optional voice training).

---

## 2. Over-Engineering: What Is Noise

### Step 1 entrance animation sequence is excessive
7 staggered entrance animations with delays up to 700ms. Cut to 3 stages: (1) icon + headline at 0ms, (2) subtitle + badge at 150ms, (3) value props + CTA at 300ms. Total: 300ms.

### Background radial gradient shifting between steps is undevelopable and unnoticeable
No user has ever noticed a 3% opacity gradient shift. Cut it entirely.

### Progress bar glow effect is noise
Nobody completes onboarding because "the progress bar glowed." Remove it.

### Rotating extraction status messages are not a substitute for speed
These paper over a slow backend. Replace with async extraction, not optimized copy.

### 17 separate files in feature directory
Over-componentization. WizardStep, WizardStepContent, WizardStepFooter should be one WizardLayout.tsx with named exports.

---

## 3. Missing Patterns

### No re-engagement strategy for partial completers
Without a re-engagement path, the 90% target can only be achieved by single-session completers. Missing: persistent "Complete your setup" banner in main app with progress indicator.

### No empty-state design for main app post-onboarding-skip
Users who skip land on empty portfolio. What do they see? No guidance = punishment for skipping.

### Writing Voice step has no immediate value demonstration
No "before/after" hook, no preview of what AI sounds like with vs. without voice. Missing: micro-preview showing AI content "in your voice" after adding one reference.

### No trust signal at point of data collection
"Your data stays private" is on the welcome screen, before any data is requested. At the LinkedIn URL input, there is no privacy signal. Add reassurance near the input.

---

## 4. Step Count Honesty

The spec counts Welcome and Completion as steps ("6 steps"). The research recommends 4 steps. Welcome and Completion require no user input -- they are not cognitive steps. "Step 2 of 6: Import" means the user is on the first productive step and already has 5 more labeled steps ahead.

**Recommendation**: Show "Step 1 of 4: Import" and don't count welcome/completion in the numbered progression.

---

## 5. Mobile Reality Check

### 4-tab interface on Step 5 is broken at 320px
Four icon-only tabs in grid-cols-4 at h-9 gives 80px x 36px -- does not meet WCAG 44x44px touch targets. Replace with single select dropdown on mobile.

### Fixed footer + keyboard interaction needs more than one sentence
The visualViewport API behavior varies across iOS Safari, Chrome Android, Firefox Android. This deserves a full specification section.

### Swipe gestures conflict with scrollable form content
Step 3 has scrollable content. Swipe-left for navigation conflicts with vertical scroll on iOS Safari. Cut swipe navigation entirely.

---

## 6. Copy Critique

### "Let's set up your advisor OS" -- conceptually confused
"Advisor OS" is a product category label, not a benefit. Better: "We'll learn how you work so every output sounds like you"

### "Most of the work is done by AI -- you just confirm" -- over-promises
When extraction fails, this is a broken promise. Better: "AI extracts what it can from your LinkedIn -- you fill in the rest."

### "Where can we learn about you?" -- conversationally awkward
Better: "Pull in your professional profile" or "Start with your LinkedIn and website."

### "Teach the AI your voice" -- genuinely good. Keep it.

### "Time to create something brilliant" -- trying too hard
"Brilliant" is a superlative consultants are trained to distrust. Better: "Your profile is ready. Let's see what NextUp can do."

---

## 7. Extraction Waterfall Animation Reality Check

The "simulated stagger" for synchronous extraction results will feel fake to sophisticated users. Consultants use AI tools professionally -- they'll spot a suspiciously even 200ms field population.

**Recommendation**: Use animation only first time. On return to Step 2, show results immediately. If extraction is truly streaming, animation is authentic.

---

## 8. Writing References Step: Completion Likelihood

Expect 40-60% of users who reach Step 5 to skip it entirely. This is not a failure -- it reflects reality. The spec should accept this and optimize for post-onboarding re-engagement.

**The real problem**: Users have not yet used the product or seen AI output. They have no reference point for why their voice matters. This is asking for the most effortful step before the user has experienced the reward.

**Recommendation**: Make benefit concrete: "One example is enough to get started" or show a micro-preview of AI-generated content in their voice.

---

## 9. Accessibility Gaps

### AI badge text (10px) is a WCAG violation
text-[10px] is below 12px best practice. Use text-xs (12px) minimum.

### Chip toggles missing group role
Chips need role="group" container with aria-labelledby for screen reader context.

### Focus management on extraction complete is under-specified
No specific DOM target for programmatic focus after extraction.

### URL validation on submit is unspecified
Spec covers blur validation but not what happens when user clicks "Extract" with invalid URL.

---

## 10. BIGGEST BLIND SPOT: LinkedIn Scraping Will Fail for a Majority of Users

**This is the most critical issue in the entire spec.**

LinkedIn actively blocks server-side scraping: rate limiting, IP banning, bot detection, CAPTCHA challenges. The spec's "fetch HTML, send to Claude" approach will reliably fail when:
1. Profile requires login to view (default for many privacy settings)
2. Backend IP is rate-limited/banned
3. LinkedIn serves a login wall or CAPTCHA
4. Profile serves mobile redirect with minimal data

**Realistic failure rate: 40-60%+** for server-side LinkedIn scraping without OAuth.

The spec's fallback (show error, offer manual entry) is a complete collapse of the "AI-powered" value proposition.

**Recommendations**:
- Option A: Make website URL the primary extraction source (easier to scrape reliably). LinkedIn is enhancement.
- Option B: Be transparent: "If your LinkedIn profile is public, we can pre-fill your details."
- Option C: Eliminate scraping entirely. Ask users to paste their LinkedIn bio/experience into a structured text field. AI still processes it.

---

## Priority Summary

| Priority | Issue | Impact |
|----------|-------|--------|
| Critical | LinkedIn scraping reliability | Breaks core value proposition |
| Critical | Extraction async-first model | Direct drop-off on Step 2 |
| High | Step 3 field count (7 visible) | Drop-off for partial-extraction users |
| High | Step 2 LinkedIn URL friction on mobile | Drop-off before extraction starts |
| High | Welcome headline value communication | Lower click-through on CTA |
| Medium | Mobile tab triggers at 320px | WCAG violation |
| Medium | Writing Voice value demonstration | Lower Step 5 engagement |
| Medium | Swipe navigation conflicts | Production bugs |
| Medium | AI badge text 10px | WCAG violation |
| Low | Step count inflation (6 vs 4) | Minor psychological friction |
| Low | Welcome animation 700ms | Minor, easy fix |
| Low | Progress bar glow | No conversion impact |
