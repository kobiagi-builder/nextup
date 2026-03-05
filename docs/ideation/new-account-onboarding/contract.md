# New Account Onboarding Wizard - Contract

**Created**: 2026-03-02
**Confidence Score**: 95/100
**Status**: Draft

## Problem Statement

New users who sign up for NextUp are immediately dropped into the portfolio page with an empty profile and no guidance. They must manually navigate to the profile page, understand what each field means, and fill everything in from scratch. This creates a cold-start problem: the AI content generation engine cannot personalize outputs without profile data, so the user's first experience with the core product is generic and underwhelming.

This affects every new user. The cost of not solving it is high: users who don't complete their profile get poor AI outputs, lose trust in the product's value, and churn before experiencing personalized content generation. A guided, partially-automated onboarding flow would reduce time-to-value from "hours of manual profile entry" to "2-3 minutes of review and confirmation."

## Goals

1. **Reduce time-to-complete-profile by 70%** - Pre-populate profile fields by scraping the user's LinkedIn profile and website using AI extraction, so users review and confirm rather than write from scratch.
2. **Achieve 90%+ onboarding completion rate** - Design a playful, delightful wizard UX that keeps users engaged through all steps without drop-off.
3. **Ensure profile completeness for AI quality** - Guide users through all 4 profile sections (About Me, Profession, Customers, Goals) so the AI engine has sufficient context from day one.
4. **Collect writing references during onboarding** - Introduce the writing reference upload step early so the AI can learn the user's voice before they create their first artifact.
5. **Support interrupted sessions** - Persist onboarding progress so users can close the browser and resume exactly where they left off.

## Success Criteria

- [ ] New users see the onboarding wizard on first login instead of the portfolio page
- [ ] Users can enter LinkedIn URL and website URL for AI-powered profile extraction
- [ ] Backend successfully fetches URL content and uses Claude to extract structured profile fields
- [ ] Extracted data pre-populates the correct profile fields (bio, expertise, industries, etc.)
- [ ] Fields not found in scraping are left empty for manual entry
- [ ] Profile wizard has 4 steps matching existing sections: About Me, Profession, Customers, Goals
- [ ] Each profile step shows pre-filled data with the ability to edit
- [ ] Writing reference upload step follows existing patterns (paste, file, URL, publication)
- [ ] Users can skip the entire wizard at any point and access the main app
- [ ] Onboarding progress persists in the database across sessions
- [ ] Returning users who didn't finish resume at their last step
- [ ] Users who completed onboarding never see the wizard again
- [ ] Welcome page communicates value proposition and personalization promise
- [ ] Wizard UX is playful, efficient, and prevents drop-off
- [ ] Mobile-responsive design

## Scope Boundaries

### In Scope

- Welcome/landing step with value + personalization messaging
- LinkedIn URL + website URL input step with explanation of why
- AI-powered content extraction (backend fetches URL, Claude extracts structured data)
- Profile completion wizard (4 steps: About Me, Profession, Customers, Goals)
- Pre-population of profile fields from extracted data
- Writing reference upload step (reuse existing upload patterns)
- Skip functionality at every step and for the entire wizard
- Onboarding progress persistence (database-backed, resume across sessions)
- New user detection (first login without completed onboarding)
- Progress indicator showing wizard completion
- Smooth transition from wizard to main app on completion

### Out of Scope

- LinkedIn OAuth API integration - using URL scraping + AI extraction instead
- Mandatory onboarding completion - users can skip freely
- Onboarding analytics dashboard - track basic completion but no detailed funnel analytics
- A/B testing of onboarding variants - single flow for now
- Onboarding for existing users - only triggers for new accounts
- Profile field additions beyond existing schema - uses current `user_context` fields
- ICP settings during onboarding - too advanced for initial setup

### Future Considerations

- Re-engagement flow for users who skipped onboarding (nudge to complete profile)
- LinkedIn OAuth for richer data extraction
- Onboarding completion analytics and funnel optimization
- Industry-specific onboarding paths
- Team/organization onboarding flow
- Video walkthrough option in welcome step

---

_This contract was generated from brain dump input. Review and approve before proceeding to PRD generation._
