# PRD: New Account Onboarding - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 2
**Focus**: Backend infrastructure, AI extraction service, and core wizard flow

## Phase Overview

Phase 1 builds the entire backend infrastructure and delivers a fully functional (but not yet polished) onboarding wizard. This phase is sequenced first because both the AI extraction service and the onboarding state persistence are prerequisites for the frontend wizard to function.

After this phase, a new user logging in will see and complete the full onboarding wizard end-to-end: welcome screen, LinkedIn/website URL entry, AI-powered profile extraction, 4 profile review steps, and writing reference upload. The flow will work but won't yet have the delightful animations, micro-interactions, and polish that Phase 2 adds.

This phase delivers immediate value: new users get guided onboarding instead of being dropped into an empty app, and their profiles are pre-populated from AI extraction.

## User Stories

1. As a new user, I want to be greeted with a welcome screen when I first log in so that I understand what NextUp will do for me and feel welcomed.
2. As a new user, I want to provide my LinkedIn URL and website URL so that the system can automatically extract my professional information.
3. As a new user, I want to see my extracted profile data pre-filled in a step-by-step wizard so that I can review and adjust rather than write from scratch.
4. As a new user, I want to upload writing references during onboarding so that the AI can learn my voice from the start.
5. As a new user, I want to skip the onboarding wizard if I prefer to set up my profile later.
6. As a returning user who didn't finish onboarding, I want to resume where I left off so I don't repeat completed steps.

## Functional Requirements

### Onboarding State Management

- **FR-1.1**: Create `onboarding_progress` database table to track each user's onboarding state (current step, completed steps, extraction results, timestamps).
- **FR-1.2**: Backend API endpoints for reading and updating onboarding progress (`GET /api/onboarding/progress`, `PUT /api/onboarding/progress`).
- **FR-1.3**: New user detection logic: user is "new" if no `onboarding_progress` record exists or `completed_at` is null.
- **FR-1.4**: Mark onboarding as complete when user finishes the last step or explicitly skips.

### AI-Powered Profile Extraction

- **FR-1.5**: Backend endpoint `POST /api/onboarding/extract-profile` that accepts LinkedIn URL and/or website URL.
- **FR-1.6**: Backend fetches URL content (HTML), strips to meaningful text, and sends to Claude for structured extraction.
- **FR-1.7**: Claude extraction maps content to `user_context` fields: `about_me.bio`, `about_me.background`, `about_me.years_experience`, `about_me.value_proposition`, `profession.expertise_areas`, `profession.industries`, `profession.methodologies`, `profession.certifications`, `customers.target_audience`, `customers.ideal_client`, `customers.industries_served`.
- **FR-1.8**: Return extracted fields with confidence indicators (found/not_found per field).
- **FR-1.9**: Handle extraction failures gracefully (URL unreachable, content too sparse, rate limiting) with user-friendly error messages.
- **FR-1.10**: Store extraction results in `onboarding_progress` record for persistence.

### Welcome Step

- **FR-1.11**: Welcome screen with value proposition + personalization messaging (mix of value-focused and personalization-focused).
- **FR-1.12**: "Get Started" CTA button to proceed to next step.
- **FR-1.13**: "Skip Setup" link to bypass entire onboarding.

### Profile Extraction Step

- **FR-1.14**: Input fields for LinkedIn profile URL and website URL (both optional).
- **FR-1.15**: Explanation text: why we need this information and what we'll do with it.
- **FR-1.16**: "Extract" button triggers backend extraction with loading state.
- **FR-1.17**: Show extraction results summary (which fields were found, which weren't).
- **FR-1.18**: Allow user to skip this step if they don't want to provide URLs.

### Profile Review Steps (4 Steps)

- **FR-1.19**: Step 3a - About Me: bio, background, years_experience, value_proposition. Pre-filled from extraction.
- **FR-1.20**: Step 3b - Profession: expertise_areas, industries, methodologies, certifications. Pre-filled from extraction.
- **FR-1.21**: Step 3c - Customers: target_audience, ideal_client, industries_served. Pre-filled from extraction.
- **FR-1.22**: Step 3d - Goals: content_goals, business_goals, priorities. These won't be extracted (too personal) - shown empty.
- **FR-1.23**: Each step saves data to `user_context` on "Next" click (auto-save).
- **FR-1.24**: Each step is individually skippable with "Skip" button.
- **FR-1.25**: Reuse existing form field patterns from `UserContextForm.tsx` for consistency.

### Writing References Step

- **FR-1.26**: Writing reference upload step following existing `WritingReferencesManager` patterns.
- **FR-1.27**: Support all 4 existing upload methods: paste text, file upload, file URL, publication URL.
- **FR-1.28**: Show explanation of why writing references matter for AI personalization.
- **FR-1.29**: Allow adding multiple references or skipping entirely.
- **FR-1.30**: Uploaded references saved to `user_writing_examples` table using existing backend endpoints.

### Wizard Navigation

- **FR-1.31**: Progress indicator showing current step and total steps.
- **FR-1.32**: Back/Next navigation between steps.
- **FR-1.33**: Skip button available on every step.
- **FR-1.34**: Completion screen with transition to main app (portfolio page).

### Routing & Integration

- **FR-1.35**: New route `/onboarding` for the wizard.
- **FR-1.36**: `ProtectedRoute` redirect logic: if user is authenticated but onboarding not complete, redirect to `/onboarding` instead of `/portfolio`.
- **FR-1.37**: After completion or skip, redirect to `/portfolio` and never show onboarding again.

## Non-Functional Requirements

- **NFR-1.1**: AI extraction response time under 15 seconds (including URL fetch + Claude processing).
- **NFR-1.2**: Onboarding state saves within 500ms on each step transition.
- **NFR-1.3**: Wizard must be mobile-responsive (functional, not yet polished).
- **NFR-1.4**: All user data follows existing RLS policies (user can only see/edit their own onboarding data).
- **NFR-1.5**: Extraction endpoint must not log URLs or extracted content in production (PII security).

## Dependencies

### Prerequisites

- Existing `user_context` table and schema
- Existing `user_writing_examples` table and endpoints
- Existing auth flow (Supabase auth + ProtectedRoute)
- Claude API access for extraction (Anthropic SDK)

### Outputs for Phase 2

- `onboarding_progress` table and API
- AI extraction service
- Complete wizard flow (all steps functional)
- Route integration with auth flow

## Acceptance Criteria

- [ ] New users redirected to `/onboarding` on first login
- [ ] Welcome step displays with value + personalization messaging
- [ ] LinkedIn/website URLs accepted and sent to backend for extraction
- [ ] Backend successfully extracts profile fields using Claude
- [ ] Extracted data pre-populates correct profile fields in wizard steps
- [ ] All 4 profile steps display with editable pre-filled fields
- [ ] Writing reference upload works using existing patterns
- [ ] Each step and entire wizard can be skipped
- [ ] Onboarding progress persists across browser sessions
- [ ] Returning users resume at their last incomplete step
- [ ] Completed users redirected to portfolio, never see onboarding again
- [ ] All unit tests passing
- [ ] Integration tests for extraction endpoint passing
- [ ] No PII logged in production

## Open Questions

- Should we show a "profile completeness" score during onboarding steps?
- Should extraction run asynchronously (user proceeds while extraction happens in background)?
- How to handle LinkedIn pages that require authentication to view?

---

*Review this PRD and provide feedback before spec generation.*
