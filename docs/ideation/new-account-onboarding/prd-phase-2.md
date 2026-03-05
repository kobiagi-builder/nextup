# PRD: New Account Onboarding - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 2
**Focus**: UX polish, animations, delightful micro-interactions, and production readiness

## Phase Overview

Phase 2 transforms the functional wizard from Phase 1 into a delightful, playful experience that achieves the 90%+ completion rate target. This phase focuses exclusively on UX quality: animations, transitions, micro-interactions, celebration moments, mobile polish, and edge case handling.

This phase is sequenced second because polish requires a working foundation. With Phase 1's complete wizard flow in place, Phase 2 can focus on making every interaction feel crafted and intentional. The UX research and frontend-design specification (produced alongside Phase 1) directly informs the design decisions here.

After this phase, the onboarding wizard is production-ready: fast, delightful, accessible, and resilient to edge cases.

## User Stories

1. As a new user, I want the onboarding to feel smooth and animated so that I enjoy the setup process rather than viewing it as a chore.
2. As a new user, I want to see celebration moments when I complete steps so that I feel a sense of progress and accomplishment.
3. As a new user on mobile, I want the onboarding to be perfectly usable on my phone so that I can set up my profile from anywhere.
4. As a new user, I want clear visual feedback during profile extraction so that I know the system is working and how much progress has been made.
5. As a user who skips onboarding, I want a non-judgmental experience so that I don't feel guilty about skipping.

## Functional Requirements

### Animations & Transitions

- **FR-2.1**: Smooth step transitions (slide or fade between wizard steps).
- **FR-2.2**: Content entrance animations (fields, cards, and text animate in when a step loads).
- **FR-2.3**: Button hover/press states with tactile feedback animations.
- **FR-2.4**: Progress bar animation (smooth fill between steps, not jumping).

### Extraction UX Polish

- **FR-2.5**: Animated extraction loading state: show which fields are being extracted in real-time (or simulated progress).
- **FR-2.6**: Field-by-field reveal animation: as extraction completes, show fields populating one at a time with a "typing" or "fill" animation.
- **FR-2.7**: Confidence indicators on extracted fields: visual distinction between "extracted with confidence" and "needs your input" fields.
- **FR-2.8**: Fallback messaging when extraction finds nothing: encouraging, not error-like ("We couldn't find this info - you can add it below!").

### Celebration & Delight

- **FR-2.9**: Step completion micro-celebrations (subtle checkmark animation, progress ring fill).
- **FR-2.10**: Final completion celebration (confetti, success animation, personalized message using the user's name/bio from extracted data).
- **FR-2.11**: Encouraging copy throughout: contextual tips, friendly tone, no corporate jargon.

### Skip Experience

- **FR-2.12**: Skip button is visible but not prominent (secondary styling, positioned subtly).
- **FR-2.13**: Skip confirmation is brief and non-judgmental: "No worries! You can always complete your profile later in Settings."
- **FR-2.14**: After skip, show a non-intrusive "Complete Profile" prompt on the main app (not blocking, just a gentle nudge).

### Mobile Polish

- **FR-2.15**: Full-screen wizard on mobile with optimized touch targets.
- **FR-2.16**: Swipe gestures for step navigation on mobile.
- **FR-2.17**: Keyboard-aware layout: form fields scroll into view when keyboard appears.
- **FR-2.18**: Mobile-optimized file upload for writing references (camera option for document photos).

### Progress & Navigation Polish

- **FR-2.19**: Visual step indicator (dots, numbered pills, or illustrated progress bar showing step names).
- **FR-2.20**: Step indicator is clickable for navigation (can jump to any completed or current step).
- **FR-2.21**: Keyboard navigation support (Tab, Enter, Escape for skip).

### Edge Cases & Resilience

- **FR-2.22**: Handle slow extraction gracefully: timeout after 30s with user-friendly message and option to retry or skip.
- **FR-2.23**: Handle network disconnection mid-wizard: save in-progress data, show reconnection message.
- **FR-2.24**: Handle duplicate URLs (user enters same LinkedIn URL twice).
- **FR-2.25**: Handle very long extracted content: truncate with "Show more" for fields that exceed display limits.

### Transition to Main App

- **FR-2.26**: Smooth transition animation from wizard completion to main app layout.
- **FR-2.27**: Personalized welcome message on first portfolio page visit after onboarding ("Welcome, [Name]! Your profile is set up. Here's what you can do next.").

## Non-Functional Requirements

- **NFR-2.1**: All animations run at 60fps (no janky transitions).
- **NFR-2.2**: Animations respect `prefers-reduced-motion` accessibility setting.
- **NFR-2.3**: Mobile wizard loads under 2s on 3G network.
- **NFR-2.4**: Touch targets minimum 44x44px on mobile.
- **NFR-2.5**: WCAG 2.1 AA compliant (contrast, keyboard navigation, screen reader support).

## Dependencies

### Prerequisites

- Phase 1 complete (all wizard steps functional)
- UX research findings (from parallel research task)
- Frontend-design UX/UI specification (from parallel design task)

### Outputs

- Production-ready onboarding wizard
- Complete UX specification for future reference

## Acceptance Criteria

- [ ] Step transitions are smooth and animated
- [ ] Extraction loading shows animated field-by-field progress
- [ ] Extracted fields animate in with confidence indicators
- [ ] Completion celebration plays (confetti or equivalent)
- [ ] Skip experience is non-judgmental with "complete later" messaging
- [ ] Wizard is fully functional on mobile (320px+ width)
- [ ] Swipe navigation works on mobile
- [ ] Progress indicator is animated and clickable
- [ ] Slow extraction handled with timeout and retry option
- [ ] Network disconnection handled gracefully
- [ ] Accessibility: keyboard navigation works, reduced-motion respected
- [ ] Transition to main app is smooth
- [ ] All animations run at 60fps on modern browsers
- [ ] No regressions from Phase 1 functionality

---

*Review this PRD and provide feedback before spec generation.*
