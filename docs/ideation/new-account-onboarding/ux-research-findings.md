# UX Research Findings: Onboarding Wizard

**Date**: 2026-03-02
**Target**: 90%+ onboarding completion rate
**Context**: NextUp - AI-native OS for advisors/consultants

## Executive Summary

Achieving 90%+ completion rate is ambitious but feasible. Industry average is 20-30%, top performers hit 70-80%, Figma's interactive walkthroughs reach 86%. To push toward 90%+, NextUp needs to combine multiple proven patterns leveraging its unique advantage: AI-powered profile extraction.

## Top 5 Highest-Impact Tactics

### 1. AI-First Data Entry (Endowed Progress)
LinkedIn extraction means users **confirm rather than type**. Pre-filled fields create endowed progress (each AI-extracted field is a "step already done"). This alone could cut manual effort by 60-70%.

**Key insight**: The Endowed Progress Effect (Nunes & Dreze research) shows that when users feel they've already started, completion rates double. Starting the progress bar at 15-20% and showing "already extracted" fields leverages this powerfully.

### 2. Four Steps, Under 3 Minutes
The sweet spot is 3-5 steps. NextUp's content maps perfectly to a condensed flow:
- **Step 1**: Import (LinkedIn URL + Website URL)
- **Step 2**: Profile (About Me + Profession - pre-filled)
- **Step 3**: Market (Customers + Goals)
- **Step 4**: Voice (Writing References)

Multi-step forms convert **86% higher** than single-page forms. Communicate "under 3 minutes" upfront.

### 3. Skeleton Screens with Waterfall Population
During LinkedIn extraction, show the profile card layout with shimmer placeholders, then populate fields one-by-one with smooth animations. This transforms a "waiting" moment into a "delightful reveal" moment.

**Inspired by**: Loom's time-to-value under 60 seconds approach.

### 4. Skip Affordances on Every Non-Critical Step
Making writing references skippable with "Skip for now" reduces bounce by 30%+. Only the LinkedIn/website URL step should be recommended (not required). Everything else is optional.

**Key UX**: Skip buttons should be secondary styling, positioned subtly but clearly visible. Non-judgmental language: "Skip for now" not "Skip."

### 5. Endowed Progress Bar Starting at 15-20%
Combined with AI pre-filling fields, users arrive at Step 2 seeing "60% complete" immediately. Research shows this doubles completion motivation.

## Best-in-Class Examples

### Notion
- Clean, minimal onboarding
- Single question per screen
- Use-case selection determines initial template
- Smooth transitions between steps

### Linear
- Extremely fast setup (under 60 seconds)
- Import-first approach (from Jira, Asana, etc.)
- Minimal required fields
- Dark, polished aesthetic

### Figma
- Interactive walkthrough reaching 86% completion
- "Try it now" approach (learn by doing)
- Progressive disclosure of features
- Celebration moments on milestones

### Jasper AI
- Brand voice setup during onboarding
- URL import for brand knowledge
- Writing sample upload with drag-and-drop
- AI-powered extraction demo during setup

### Calendly
- 3-step wizard with clear progress
- Pre-fills from Google Calendar integration
- Under 2 minutes to complete
- Immediate value (shareable link) at end

### Typeform
- Conversational, one-question-at-a-time format
- Beautiful animations between questions
- High engagement through gamification
- 57% average completion rate (vs 20% industry average for forms)

## UX Patterns That Prevent Drop-Off

### Progressive Disclosure
- Show only what's needed for each step
- Complex fields hidden behind "Advanced" toggles
- Reduce cognitive load per screen

### Micro-Interactions
- Button press animations (scale + color shift)
- Field focus animations (label float, border glow)
- Checkmark animations on step completion
- Subtle confetti or particle effects on final completion

### Progress Indicators
- **Best performing**: Numbered steps with labels (e.g., "Step 2 of 4: Your Expertise")
- **Second best**: Filled progress bar with percentage
- **Avoid**: Dots without labels (users can't gauge remaining effort)
- Progress bars showing "endowed progress" (starting at 15-20%)

### Conversational vs Form-Based
- Hybrid approach works best: form layout with conversational tone
- Chatbot-only onboarding has 3x higher abandonment than guided wizards
- Guided walkthroughs increase engagement by 40%

### Gamification Elements
- Completion percentage visible throughout
- Micro-celebrations at each step (checkmark, green flash)
- Final celebration (confetti, personalized welcome)
- "Profile strength" meter (optional)

## Profile Extraction UX Patterns

### Loading States
- **Best**: Skeleton screen with shimmer effect showing profile layout
- **Good**: Step-by-step progress ("Fetching LinkedIn... Analyzing expertise... Extracting bio...")
- **Avoid**: Spinner with no context

### Partial Extraction Handling
- Green checkmark on found fields
- Subtle "Needs your input" indicator on empty fields
- Pre-filled fields are editable (not locked)
- Success message: "We found 8 of 12 fields from your profiles"

### Error Handling
- "Couldn't reach [URL] - try again or skip"
- Never block progress on extraction failure
- Offer manual entry as immediate fallback

## Multi-Step Form Psychology

### Ideal Number of Steps
- **Sweet spot**: 3-5 steps
- Every extra field drops completion by ~10 percentage points
- Group related fields to reduce perceived complexity

### Field Grouping Strategies
- Group by theme, not by data type
- Maximum 4-5 fields visible per step
- Use cards for selection (industries, expertise) instead of dropdowns
- Chip/tag selection for multi-select fields (industries served, priorities)

### Optional vs Required Fields
- Mark required fields with subtle asterisk
- Most fields should be optional during onboarding
- "You can always update these later in Settings"
- Pre-filled fields from extraction don't feel like work

### Pre-Filled Field Confidence
- Subtle green border or checkmark on AI-extracted fields
- "Extracted from your LinkedIn" label
- Editable by default (click to modify)
- No "lock" icons (feels restrictive)

## Writing Reference Upload Patterns

### Content Platform Approaches
- **Writer.com**: Upload samples, AI reverse-engineers voice profile. No character limits. Can skip examples and paste voice description directly.
- **Jasper**: Brand voice from URL or uploaded documents. Shows real-time analysis.
- **Copy.ai**: Brand voice setup with example content. Drag-and-drop interface.

### Onboarding Integration
- Present as "Teach the AI your voice" (not "Upload references")
- Show value: "The more examples you provide, the more 'you' your content will sound"
- Allow skipping with "We'll use a professional default voice"
- Accept multiple formats: paste, file, URL

## Anti-Patterns to Avoid

### What Kills Completion Rates
1. **Too many required fields** - Every required field is a potential drop-off point
2. **No progress indicator** - Users don't know how much is left
3. **No skip option** - Trapped users abandon entirely
4. **Long text inputs early** - Start with easy wins (URL entry, selections)
5. **Loading without feedback** - Silent waits feel broken
6. **Starting from zero** - No sense of progress (use endowed progress)
7. **Corporate tone** - Feels like a form, not a conversation
8. **Validation errors on submit** - Use inline validation instead
9. **Losing progress on back-navigation** - Data must persist
10. **No mobile optimization** - 60% of traffic is mobile

### Common Mistakes
- Asking for information you could infer
- Showing all steps upfront (overwhelming)
- Using dropdowns when chips/cards work better
- Making the wizard feel like a gate, not a gift

## Data-Backed Insights

| Metric | Value | Source |
|--------|-------|--------|
| Industry avg completion | 20-30% | Multiple |
| Top performer completion | 70-80% | Figma, Calendly |
| Multi-step vs single-page | +86% conversion | Formstack |
| Extra field drop-off | -10% per field | HubSpot |
| Guided walkthrough engagement | +40% | Userpilot |
| Mobile-first completion lift | +34% | StatCounter/Jimo |
| Endowed progress motivation | 2x | Nunes & Dreze |
| Skip availability bounce reduction | -30% | Various |
| Time-to-complete sweet spot | 2-3 minutes | Linear, Calendly |
| Chatbot-only abandonment | 3x higher | Landbot |

## Recommended Approach for NextUp

### Step Flow
```
Welcome (15% progress) → Import URLs (30%) → About + Profession (60%) → Customers + Goals (80%) → Writing Voice (100%)
```

### Key Design Decisions
1. **Single column layout** - Better scanning, especially mobile
2. **Card-based selection** for industries/expertise (not dropdowns)
3. **Chip/tag pattern** for multi-select fields (priorities, industries served)
4. **Skeleton + waterfall** for extraction loading
5. **Inline validation** (not on-submit)
6. **Auto-save** on every field change
7. **"Under 3 minutes" promise** on welcome screen
8. **Celebration at the end** (confetti + personalized welcome)
9. **Non-judgmental skip** on every step

### Mobile Considerations
- CTA buttons in thumb zone (bottom-center)
- Minimum 48x48px touch targets
- Swipe gestures for step navigation
- Vertical scroll, no horizontal layouts
- 34% higher completion with mobile-first design
