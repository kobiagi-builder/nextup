# UX/UI Specification: New Account Onboarding Wizard

**Created**: 2026-03-02
**Dependencies**: contract.md, prd-phase-1.md, prd-phase-2.md, ux-research-findings.md
**Target Completion Rate**: 90%+
**Design System**: "Midnight Architect" - Plus Jakarta Sans + Tailwind CSS + shadcn/ui

---

## Table of Contents

1. [Design Direction & Aesthetic](#1-design-direction--aesthetic)
2. [Layout Architecture](#2-layout-architecture)
3. [Progress Indicator](#3-progress-indicator)
4. [Step 1: Welcome](#4-step-1-welcome)
5. [Step 2: Import](#5-step-2-import)
6. [Step 3: About Me + Profession](#6-step-3-about-me--profession)
7. [Step 4: Customers + Goals](#7-step-4-customers--goals)
8. [Step 5: Writing Voice](#8-step-5-writing-voice)
9. [Step 6: Completion](#9-step-6-completion)
10. [Component Specifications](#10-component-specifications)
11. [Animation Specifications](#11-animation-specifications)
12. [Responsive Design](#12-responsive-design)
13. [Accessibility](#13-accessibility)
14. [Error States & Edge Cases](#14-error-states--edge-cases)
15. [Copy & Microcopy](#15-copy--microcopy)
16. [Color & Typography Reference](#16-color--typography-reference)
17. [Implementation Notes](#17-implementation-notes)

---

## 1. Design Direction & Aesthetic

### Conceptual Direction: "Calm Confidence"

The onboarding wizard is the user's first impression of NextUp. Rather than competing for attention with loud gradients or aggressive animations, the wizard projects **calm confidence** -- the feeling that a sophisticated system is quietly building something powerful for you while you relax into a guided conversation.

The tone is: a knowledgeable colleague who already knows a lot about you (from LinkedIn extraction) and just needs a few confirmations to get started. Not a form. Not an interview. A **warm handoff**.

### Aesthetic Pillars

1. **Depth through Layering**: The wizard floats over a subtle gradient background. Content areas use the existing `card` surface with soft borders. The background is not a flat color -- it has a radial gradient that shifts subtly between steps, creating a sense of spatial progression.

2. **Luminous Accents on Dark Canvas**: In dark mode, the cyan accent (`#0ECCED`) is used sparingly but deliberately -- on the progress indicator, on CTA buttons, on AI-extracted field badges. In light mode, the blue primary (`hsl(214, 83%, 39%)`) serves the same role. These accents are "the system talking to you."

3. **Typography-Led Hierarchy**: Each step has a bold `Plus Jakarta Sans` headline (display-md, 1.875rem) and a conversational subtitle in muted foreground. Fields use the body weight. The hierarchy is immediately clear: headline tells you what, subtitle tells you why, fields are the how.

4. **Breathing Space**: Generous padding (32px on desktop, 24px on mobile). No step feels cramped. The content area maxes out at 560px on desktop -- narrow enough to feel intimate, wide enough to hold form fields comfortably.

5. **Delight in the Details**: Micro-interactions that reward: checkmarks that draw themselves, fields that fade in with staggered delays, a progress bar that glows when it advances, confetti that respects `prefers-reduced-motion`.

### What Makes It Memorable

The **AI extraction waterfall reveal** -- watching your profile fields populate one by one, each accompanied by a green AI checkmark, transforming "I have to fill out a form" into "the system already knows me." This is the signature moment.

---

## 2. Layout Architecture

### Full-Screen Container

The wizard takes over the entire viewport. No sidebar, no navigation bar, no app chrome. This is intentional: it eliminates distraction and signals "this is a special moment, not a task."

```
+------------------------------------------------------------------+
|                                                                    |
|  [Background: Subtle radial gradient]                              |
|                                                                    |
|     +--------------------------------------------------+          |
|     |  [NextUp Logo]           [Step X of 6]  [Skip]  |          |
|     +--------------------------------------------------+          |
|     |                                                    |          |
|     |  [Progress Bar - Full Width]                       |          |
|     |                                                    |          |
|     |  +--------------------------------------------+    |          |
|     |  |                                            |    |          |
|     |  |  [Step Content Area]                       |    |          |
|     |  |  max-w: 560px, centered                    |    |          |
|     |  |                                            |    |          |
|     |  |                                            |    |          |
|     |  |                                            |    |          |
|     |  +--------------------------------------------+    |          |
|     |                                                    |          |
|     |  +--------------------------------------------+    |          |
|     |  |  [Navigation: Back | CTA Button]           |    |          |
|     |  +--------------------------------------------+    |          |
|     +--------------------------------------------------+          |
|                                                                    |
+------------------------------------------------------------------+
```

### Desktop Layout (>= 1024px)

```
Viewport:
- Background: Full viewport, `bg-background` with radial gradient overlay
- Wizard container: `max-w-2xl mx-auto` (672px max)
- Content card: `max-w-[560px] mx-auto`
- Top bar: Fixed top, `h-14`, flex between logo and skip link
- Progress bar: Below top bar, `h-1.5`, full width of wizard container
- Content area: Centered, scrollable if content exceeds viewport
- Navigation footer: Fixed bottom of wizard container, `h-20`, flex between back and CTA
- Vertical padding: `pt-14 pb-20` (clear fixed header/footer)
```

### Tablet Layout (768px - 1023px)

```
- Same structure as desktop
- Wizard container: `max-w-lg mx-auto` (512px max)
- Content card: `max-w-[480px] mx-auto`
- Slightly reduced padding: `px-6` instead of `px-8`
```

### Mobile Layout (< 768px)

```
- Full-width, no max-width constraint
- Content: `px-5` horizontal padding
- Top bar: `h-12`, compact logo + step indicator
- Progress bar: `h-1`, thin to save space
- Navigation footer: Fixed at bottom, `safe-area-inset-bottom`
- CTA button fills width at bottom (thumb zone)
- Back button: Text link above CTA, or left-aligned arrow
```

### Z-Index Layering

| Element | z-index | Purpose |
|---------|---------|---------|
| Background gradient | 0 | Atmosphere |
| Content area | 10 | Main wizard content |
| Top bar | 20 | Logo + skip |
| Navigation footer | 20 | CTA + back |
| Extraction overlay | 30 | Loading state during extraction |
| Confetti | 40 | Completion celebration |

---

## 3. Progress Indicator

### Design

The progress indicator is a horizontal bar that spans the full width of the wizard container, positioned directly below the top bar. It uses the Endowed Progress Effect: it starts at 17% (roughly 1/6th) on the Welcome step, giving users the feeling they've already begun.

### Structure

```
TopBar:
+--[NextUp logo]---[Step 2 of 6: Import]---[Skip setup]--+

ProgressBar (below TopBar):
+=========---------------------------------------------+
  17%     (Welcome)

+================---------------------------------+
  33%     (Import)

+============================---------------------+
  50%     (About Me + Profession)

+========================================---------+
  67%     (Customers + Goals)

+================================================-+
  83%     (Writing Voice)

+==================================================+
  100%    (Completion)
```

### Visual Specification

```
Container:
- Height: 6px (desktop), 4px (mobile)
- Background: hsl(var(--border)) with 30% opacity
- Border-radius: 9999px (pill shape)
- Margin: 0 auto, width matches wizard container

Indicator (filled portion):
- Background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))
  - Light mode: blue-500 to blue-400
  - Dark mode: brand-500 (#025EC4) to brand-300 (#0ECCED)
- Border-radius: 9999px
- Transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1)
- Box-shadow (dark mode only): 0 0 8px rgba(14, 204, 237, 0.3)
```

### Step Label in Top Bar

```
Format: "Step {current} of 6: {stepName}"
  - Step 1: "Welcome"
  - Step 2: "Import"
  - Step 3: "Your Profile"
  - Step 4: "Your Market"
  - Step 5: "Your Voice"
  - Step 6: "All Set"

Typography:
  - Font: Plus Jakarta Sans
  - Size: text-sm (14px)
  - Weight: font-medium (500)
  - Color: text-muted-foreground
```

### Progress Percentages by Step

| Step | Label | Progress | Rationale |
|------|-------|----------|-----------|
| 1 | Welcome | 17% | Endowed progress -- user already started |
| 2 | Import | 33% | URL entry is low-effort, reward generously |
| 3 | About Me + Profession | 50% | Halfway point, most fields pre-filled |
| 4 | Customers + Goals | 67% | Two-thirds done |
| 5 | Writing Voice | 83% | Nearly complete, encourages final push |
| 6 | Completion | 100% | Celebration |

---

## 4. Step 1: Welcome

### Purpose
Communicate the value of completing onboarding. Set expectations ("under 3 minutes"). Create momentum with a strong CTA.

### Layout

```
+---------------------------------------------------+
|                                                     |
|             [Sparkles Icon - 48x48]                 |
|                                                     |
|        "Let's set up your advisor OS"               |
|                                                     |
|    "We'll personalize NextUp to your expertise,     |
|     your clients, and your voice. Most of the       |
|     work is done by AI -- you just confirm."        |
|                                                     |
|          [Clock icon] Under 3 minutes               |
|                                                     |
|   +-------------------------------------------+    |
|   |  [Sparkle] AI-powered profile extraction   |    |
|   +-------------------------------------------+    |
|   |  [Shield] Your data stays private          |    |
|   +-------------------------------------------+    |
|   |  [Pen] Content tailored to your voice      |    |
|   +-------------------------------------------+    |
|                                                     |
|          [ Get Started ]  (primary CTA)             |
|                                                     |
|          Skip setup for now                         |
|                                                     |
+---------------------------------------------------+
```

### Component Hierarchy

```tsx
<WizardStep>
  <WizardStepContent className="text-center">
    {/* Hero Icon */}
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
      <Sparkles className="h-7 w-7 text-primary" />
    </div>

    {/* Headline */}
    <h1 className="text-display-md font-semibold tracking-tight mt-6">
      Let's set up your advisor OS
    </h1>

    {/* Subtitle */}
    <p className="text-base text-muted-foreground mt-3 max-w-[420px] mx-auto leading-relaxed">
      We'll personalize NextUp to your expertise, your clients,
      and your voice. Most of the work is done by AI -- you just confirm.
    </p>

    {/* Time estimate badge */}
    <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      Under 3 minutes
    </div>

    {/* Value propositions */}
    <div className="mt-8 space-y-3 text-left max-w-[380px] mx-auto">
      <ValuePropRow icon={Sparkles} text="AI-powered profile extraction" />
      <ValuePropRow icon={Shield} text="Your data stays private and secure" />
      <ValuePropRow icon={PenLine} text="Content tailored to your voice" />
    </div>
  </WizardStepContent>

  <WizardStepFooter>
    <Button size="lg" className="w-full sm:w-auto min-w-[200px]">
      Get Started
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
    <button className="text-sm text-muted-foreground hover:text-foreground mt-3">
      Skip setup for now
    </button>
  </WizardStepFooter>
</WizardStep>
```

### ValuePropRow Component

```
Container: flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50
Icon container: h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center
Icon: h-4 w-4 text-primary
Text: text-sm font-medium text-foreground
```

### Entrance Animation

1. Icon scales in from 0.8 to 1.0 (200ms, ease-out, delay 0ms)
2. Headline fades up from 12px below (300ms, ease-out, delay 100ms)
3. Subtitle fades up (300ms, ease-out, delay 200ms)
4. Time badge fades in (200ms, ease-out, delay 300ms)
5. Value props stagger in from below, 80ms delay between each (300ms, ease-out, delay 400/480/560ms)
6. CTA button fades up (300ms, ease-out, delay 600ms)
7. Skip link fades in (200ms, ease-out, delay 700ms)

---

## 5. Step 2: Import

### Purpose
Collect LinkedIn profile URL and/or website URL for AI extraction. This is the "magic moment" -- the system starts working for the user.

### Layout - Input State

```
+---------------------------------------------------+
|                                                     |
|   "Where can we learn about you?"                   |
|                                                     |
|   "Drop in your LinkedIn and website -- our AI      |
|    will extract your profile in seconds."            |
|                                                     |
|   LinkedIn Profile URL                              |
|   +-----------------------------------------------+ |
|   | [LinkedIn icon] https://linkedin.com/in/...   | |
|   +-----------------------------------------------+ |
|   Helper: "Your public LinkedIn profile URL"        |
|                                                     |
|   Website URL (optional)                            |
|   +-----------------------------------------------+ |
|   | [Globe icon] https://yoursite.com             | |
|   +-----------------------------------------------+ |
|   Helper: "Your personal or company website"        |
|                                                     |
|   [Back]              [Extract My Profile]          |
|                                                     |
|   Skip this step                                    |
|                                                     |
+---------------------------------------------------+
```

### Layout - Extraction Loading State (Skeleton + Waterfall)

When the user clicks "Extract My Profile", the step transforms into a skeleton preview of their profile card. Fields populate one by one as extraction completes (or simulated stagger if extraction returns all at once).

```
+---------------------------------------------------+
|                                                     |
|   "Analyzing your profile..."                       |
|                                                     |
|   [Animated loader] Fetching LinkedIn profile...    |
|                                                     |
|   +-----------------------------------------------+ |
|   |  Profile Preview                               | |
|   |                                                 | |
|   |  Bio                                            | |
|   |  [████████████████████░░░░░░░░] (shimmer)      | |
|   |  [████████████████░░░░░░░░░░░░] (shimmer)      | |
|   |                                                 | |
|   |  Value Proposition                              | |
|   |  [████████████████████████░░░░] (shimmer)      | |
|   |                                                 | |
|   |  Expertise                                      | |
|   |  [████████░░] [██████████░░] (shimmer chips)   | |
|   |                                                 | |
|   |  Industries                                     | |
|   |  [██████░░] [████████████░░] (shimmer chips)   | |
|   |                                                 | |
|   +-----------------------------------------------+ |
|                                                     |
+---------------------------------------------------+
```

### Layout - Extraction Complete State

```
+---------------------------------------------------+
|                                                     |
|   "Here's what we found"                            |
|                                                     |
|   [CheckCircle] Found 8 of 12 fields               |
|                                                     |
|   +-----------------------------------------------+ |
|   |  Profile Preview                               | |
|   |                                                 | |
|   |  Bio                               [AI badge] | |
|   |  "Fractional CPO helping B2B SaaS..."          | |
|   |                                                 | |
|   |  Value Proposition                  [AI badge] | |
|   |  "Bridging product strategy and..."            | |
|   |                                                 | |
|   |  Expertise                          [AI badge] | |
|   |  [Product Strategy] [User Research] [Agile]    | |
|   |                                                 | |
|   |  Industries                         [AI badge] | |
|   |  [B2B SaaS] [FinTech] [Healthcare]             | |
|   |                                                 | |
|   +-----------------------------------------------+ |
|                                                     |
|   "You'll review and edit these in the next steps"  |
|                                                     |
|   [Back]                  [Looks Good, Continue]    |
|                                                     |
+---------------------------------------------------+
```

### Component Hierarchy - Input State

```tsx
<WizardStep>
  <WizardStepContent>
    <h1 className="text-display-md font-semibold tracking-tight">
      Where can we learn about you?
    </h1>
    <p className="text-base text-muted-foreground mt-3 leading-relaxed">
      Drop in your LinkedIn and website -- our AI will extract your
      profile in seconds.
    </p>

    <div className="mt-8 space-y-5">
      {/* LinkedIn URL */}
      <div className="space-y-2">
        <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
        <div className="relative">
          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="linkedin-url"
            placeholder="https://linkedin.com/in/yourname"
            className="pl-10 h-11"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your public LinkedIn profile URL
        </p>
      </div>

      {/* Website URL */}
      <div className="space-y-2">
        <Label htmlFor="website-url">
          Website URL
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="website-url"
            placeholder="https://yoursite.com"
            className="pl-10 h-11"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your personal or company website
        </p>
      </div>
    </div>
  </WizardStepContent>

  <WizardStepFooter>
    <Button variant="ghost" onClick={goBack}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
    <Button size="lg" onClick={handleExtract}>
      <Sparkles className="h-4 w-4 mr-2" />
      Extract My Profile
    </Button>
  </WizardStepFooter>
</WizardStep>
```

### Extraction Loading Skeleton

```tsx
<Card className="border border-border/50 bg-card/50">
  <CardContent className="p-6 space-y-5">
    {/* Status message */}
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>{extractionStatus}</span>
    </div>

    {/* Field skeletons */}
    {PROFILE_FIELDS.map((field, i) => (
      <div key={field.key} className="space-y-1.5">
        <Skeleton className="h-3 w-24" /> {/* Label */}
        {field.type === 'text' ? (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </>
        ) : (
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        )}
      </div>
    ))}
  </CardContent>
</Card>
```

### Extraction Status Messages (Rotating)

```
"Fetching your LinkedIn profile..."     (0-3s)
"Analyzing your experience..."          (3-6s)
"Extracting expertise and skills..."    (6-9s)
"Identifying your industries..."        (9-12s)
"Almost there..."                       (12s+)
```

### Waterfall Population Animation

When extraction results arrive (or from a pre-loaded response), fields reveal one by one:

1. **Delay**: 200ms between each field reveal
2. **Animation per field**:
   - Label fades in (150ms)
   - Content slides up from 8px below + fades in (300ms, ease-out)
   - AI badge slides in from right (200ms, ease-out, 100ms delay after content)
3. **Shimmer removal**: Each skeleton crossfades to real content (200ms)
4. **Total duration**: ~3 seconds for 8 fields (200ms * 8 + animation time)

### AI Extraction Badge

```
Container: inline-flex items-center gap-1 px-2 py-0.5 rounded-full
Background: bg-emerald-500/10
Icon: Sparkles, h-3 w-3 text-emerald-500
Text: text-[10px] font-medium text-emerald-600 dark:text-emerald-400
Label: "AI extracted"
```

### Validation

- LinkedIn URL: Must match `linkedin.com/in/` pattern. Inline error: "Please enter a valid LinkedIn profile URL"
- Website URL: Must start with `http://` or `https://`. Inline error: "Please enter a valid URL"
- Both fields empty: CTA changes to "Continue without extraction" and both fields are optional

---

## 6. Step 3: About Me + Profession

### Purpose
Display and edit the user's personal and professional profile. Fields are pre-filled from AI extraction. This step combines what would be two separate steps in the existing profile page, because the content is related and combining them reduces perceived step count.

### Layout

```
+---------------------------------------------------+
|                                                     |
|   "Review your profile"                             |
|                                                     |
|   "We've pre-filled what we could. Feel free to     |
|    edit anything -- this is your story."             |
|                                                     |
|   [Found 6 of 8 fields]                             |
|                                                     |
|   --- ABOUT ME ---                                  |
|                                                     |
|   Bio                                   [AI badge]  |
|   +-----------------------------------------------+ |
|   | "Fractional CPO helping B2B SaaS startups..." | |
|   +-----------------------------------------------+ |
|                                                     |
|   Value Proposition                     [AI badge]  |
|   +-----------------------------------------------+ |
|   | "I bridge product strategy and execution..."  | |
|   +-----------------------------------------------+ |
|                                                     |
|   Years of Experience                   [AI badge]  |
|   +-----------------------------------------------+ |
|   | 12                                            | |
|   +-----------------------------------------------+ |
|                                                     |
|   --- EXPERTISE ---                                 |
|                                                     |
|   Expertise Areas                       [AI badge]  |
|   +-----------------------------------------------+ |
|   | "Product Strategy, User Research, Agile..."   | |
|   +-----------------------------------------------+ |
|                                                     |
|   Industries                            [AI badge]  |
|   +-----------------------------------------------+ |
|   | [B2B SaaS] [FinTech] [Healthcare] [+]         | |
|   +-----------------------------------------------+ |
|                                                     |
|   Methodologies                                     |
|   +-----------------------------------------------+ |
|   | (empty -- "Add your methodologies...")         | |
|   +-----------------------------------------------+ |
|                                                     |
|   Certifications                                    |
|   +-----------------------------------------------+ |
|   | (empty -- "Add certifications...")             | |
|   +-----------------------------------------------+ |
|                                                     |
|   [Back]                        [Save & Continue]   |
|                                                     |
|   Skip this step                                    |
|                                                     |
+---------------------------------------------------+
```

### Component Hierarchy

```tsx
<WizardStep>
  <WizardStepContent className="space-y-8">
    <div>
      <h1 className="text-display-md font-semibold tracking-tight">
        Review your profile
      </h1>
      <p className="text-base text-muted-foreground mt-2 leading-relaxed">
        We've pre-filled what we could. Feel free to edit anything -- this is your story.
      </p>
      {extractionSummary && (
        <ExtractionSummaryBadge found={6} total={8} />
      )}
    </div>

    {/* Section: About Me */}
    <fieldset className="space-y-4">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        About Me
      </legend>

      <OnboardingField
        label="Bio"
        aiExtracted={!!extractedData.bio}
        description="Who you are and what you do professionally"
      >
        <Textarea
          value={formData.bio}
          onChange={...}
          placeholder="E.g.: Fractional CPO helping B2B SaaS startups build their first product org..."
          rows={3}
        />
      </OnboardingField>

      <OnboardingField
        label="Value Proposition"
        aiExtracted={!!extractedData.value_proposition}
        description="What unique value do you bring to clients?"
      >
        <Textarea
          value={formData.value_proposition}
          onChange={...}
          placeholder="What makes you the right choice?"
          rows={2}
        />
      </OnboardingField>

      <OnboardingField
        label="Years of Experience"
        aiExtracted={!!extractedData.years_experience}
      >
        <Input
          type="number"
          value={formData.years_experience}
          onChange={...}
          placeholder="e.g., 12"
          className="w-32"
          min={0}
          max={50}
        />
      </OnboardingField>
    </fieldset>

    {/* Section: Expertise */}
    <fieldset className="space-y-4">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Expertise
      </legend>

      <OnboardingField
        label="Expertise Areas"
        aiExtracted={!!extractedData.expertise_areas}
        description="Your core skills and specialties"
      >
        <Textarea
          value={formData.expertise_areas}
          onChange={...}
          placeholder="e.g., Product Strategy, User Research, Agile/Scrum"
          rows={3}
        />
      </OnboardingField>

      <OnboardingField
        label="Industries"
        aiExtracted={!!extractedData.industries}
        description="The industries you work in"
      >
        <Textarea
          value={formData.industries}
          onChange={...}
          placeholder="e.g., SaaS / B2B Software, FinTech, Healthcare"
          rows={3}
        />
      </OnboardingField>

      <OnboardingField label="Methodologies">
        <Textarea
          value={formData.methodologies}
          onChange={...}
          placeholder="Frameworks and methods you use (optional)"
          rows={2}
        />
      </OnboardingField>

      <OnboardingField label="Certifications">
        <Textarea
          value={formData.certifications}
          onChange={...}
          placeholder="Professional certifications (optional)"
          rows={2}
        />
      </OnboardingField>
    </fieldset>
  </WizardStepContent>

  <WizardStepFooter>
    <Button variant="ghost" onClick={goBack}>
      <ArrowLeft className="h-4 w-4 mr-2" /> Back
    </Button>
    <Button size="lg" onClick={handleSaveAndContinue}>
      Save & Continue
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  </WizardStepFooter>
</WizardStep>
```

### OnboardingField Component

A wrapper around each form field that optionally shows the AI extraction badge.

```
Props:
  - label: string
  - aiExtracted: boolean
  - description?: string
  - children: ReactNode (the input)

Layout:
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      {aiExtracted && <AiExtractedBadge />}
    </div>
    {description && (
      <p className="text-xs text-muted-foreground">{description}</p>
    )}
    {children}
  </div>
```

### ExtractionSummaryBadge

```
Container: inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-emerald-500/10
Icon: CheckCircle, h-4 w-4 text-emerald-500
Text: text-sm font-medium text-emerald-600 dark:text-emerald-400
Content: "Found {found} of {total} fields"
```

### Scrolling Behavior

This step has more content than fits in a single viewport. The content area scrolls vertically. The top bar (with progress) and footer (with navigation buttons) remain fixed. The scrollable area has `scrollbar-custom` styling.

### Auto-Save

Every field change debounces (500ms) and auto-saves to the `onboarding_progress` record. No explicit "Save" action needed, but the "Save & Continue" button triggers an immediate save before navigation.

---

## 7. Step 4: Customers + Goals

### Purpose
Define the user's target market and content/business objectives. Most fields here are NOT pre-extracted (goals are too personal), so this step relies on good placeholder text and optional fields to feel low-friction.

### Layout

```
+---------------------------------------------------+
|                                                     |
|   "Who do you serve, and where are you headed?"     |
|                                                     |
|   "Help us understand your clients and goals so     |
|    the AI creates relevant content."                 |
|                                                     |
|   --- YOUR CLIENTS ---                              |
|                                                     |
|   Target Audience                                   |
|   +-----------------------------------------------+ |
|   | "B2B SaaS founders and VPs of Product..."     | |
|   +-----------------------------------------------+ |
|                                                     |
|   Ideal Client                          [AI badge]  |
|   +-----------------------------------------------+ |
|   | "Series A-C SaaS companies..."                | |
|   +-----------------------------------------------+ |
|                                                     |
|   Industries You Serve                  [AI badge]  |
|   +-----------------------------------------------+ |
|   | [SaaS] [FinTech] [E-commerce] [+]             | |
|   +-----------------------------------------------+ |
|                                                     |
|   --- YOUR GOALS ---                                |
|                                                     |
|   Content Goals                                     |
|   +-----------------------------------------------+ |
|   | "Establish thought leadership in product..."  | |
|   +-----------------------------------------------+ |
|                                                     |
|   Business Goals                                    |
|   +-----------------------------------------------+ |
|   | "Generate inbound consulting leads..."        | |
|   +-----------------------------------------------+ |
|                                                     |
|   Priorities (choose what matters most)             |
|   [Thought Leadership] [Lead Generation]            |
|   [Brand Awareness] [Client Retention]              |
|   [Speaking Opportunities] [Community Building]     |
|                                                     |
|   [Back]                        [Save & Continue]   |
|                                                     |
|   Skip this step                                    |
|                                                     |
+---------------------------------------------------+
```

### Priorities - Chip/Card Selection

Instead of a free-form input, priorities use a chip selection pattern where users toggle pre-defined options. This is lower friction than typing and produces consistent data.

```tsx
<OnboardingField
  label="Priorities"
  description="Choose what matters most to you (select any that apply)"
>
  <div className="flex flex-wrap gap-2">
    {PRIORITY_OPTIONS.map((option) => (
      <ChipToggle
        key={option.value}
        label={option.label}
        icon={option.icon}
        selected={selectedPriorities.includes(option.value)}
        onToggle={() => togglePriority(option.value)}
      />
    ))}
  </div>
</OnboardingField>
```

### ChipToggle Component

```
Props:
  - label: string
  - icon?: LucideIcon
  - selected: boolean
  - onToggle: () => void

Unselected:
  Container: inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
             border border-border bg-background
             hover:bg-secondary hover:border-border cursor-pointer
             transition-all duration-150
  Icon: h-4 w-4 text-muted-foreground
  Text: text-sm text-foreground

Selected:
  Container: inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
             border border-primary bg-primary/10
             cursor-pointer transition-all duration-150
  Icon: h-4 w-4 text-primary
  Text: text-sm font-medium text-primary
  Checkmark: Check icon, h-3.5 w-3.5 text-primary, appears with scale animation

Touch target: min-h-[44px] (meets WCAG 2.1 AA)
```

### Priority Options

| Value | Label | Icon |
|-------|-------|------|
| thought_leadership | Thought Leadership | BookOpen |
| lead_generation | Lead Generation | Target |
| brand_awareness | Brand Awareness | Megaphone |
| client_retention | Client Retention | Users |
| speaking | Speaking Opportunities | Mic |
| community | Community Building | MessageCircle |
| partnerships | Strategic Partnerships | Handshake |
| recruiting | Talent Attraction | UserPlus |

### Industries Served - Tag Input

Uses the existing `TagsInput` component from `frontend/src/features/portfolio/components/artifact/TagsInput.tsx`. Pre-populated from extraction if available.

```tsx
<OnboardingField
  label="Industries You Serve"
  aiExtracted={!!extractedData.industries_served}
  description="Type and press Enter to add"
>
  <TagsInput
    tags={formData.industries_served}
    onChange={(tags) => updateField('industries_served', tags)}
    placeholder="Add industries (e.g., SaaS, Healthcare)..."
  />
</OnboardingField>
```

---

## 8. Step 5: Writing Voice

### Purpose
Collect writing samples so the AI can learn the user's voice. This step is entirely optional and uses a "teach the AI" framing rather than "upload documents."

### Layout

```
+---------------------------------------------------+
|                                                     |
|   "Teach the AI your voice"                         |
|                                                     |
|   "The more examples you share, the more your       |
|    content will sound like you. We accept articles,  |
|    posts, and documents."                            |
|                                                     |
|   +-----------------------------------------------+ |
|   |                                                 | |
|   |  How would you like to share?                   | |
|   |                                                 | |
|   |  [Paste Text] [Upload File] [URL] [Publication]| |
|   |                                                 | |
|   |  [Active tab content area]                      | |
|   |                                                 | |
|   +-----------------------------------------------+ |
|                                                     |
|   --- Added References ---                          |
|                                                     |
|   [ReferenceCard: "My LinkedIn article..."]   [x]  |
|   [ReferenceCard: "Blog post on AI..."]       [x]  |
|                                                     |
|   +-----------------------------------------------+ |
|   |  [+] Add another reference                     | |
|   +-----------------------------------------------+ |
|                                                     |
|   "You can always add more in Settings later"       |
|                                                     |
|   [Back]                             [Continue]     |
|                                                     |
|   Skip this step                                    |
|                                                     |
+---------------------------------------------------+
```

### Component Hierarchy

```tsx
<WizardStep>
  <WizardStepContent className="space-y-6">
    <div>
      <h1 className="text-display-md font-semibold tracking-tight">
        Teach the AI your voice
      </h1>
      <p className="text-base text-muted-foreground mt-2 leading-relaxed">
        The more examples you share, the more your content will sound like you.
        We accept articles, posts, and documents.
      </p>
    </div>

    {/* Upload interface - simplified version of ReferenceUploadDialog */}
    <Card className="border border-border/50">
      <CardContent className="p-5">
        <Tabs defaultValue="paste">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="paste">
              <Type className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">Paste</span>
            </TabsTrigger>
            <TabsTrigger value="file">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">File</span>
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">URL</span>
            </TabsTrigger>
            <TabsTrigger value="publication">
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">Article</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab contents follow existing ReferenceUploadDialog patterns */}
        </Tabs>
      </CardContent>
    </Card>

    {/* Added references list */}
    {addedReferences.length > 0 && (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Added References
        </h3>
        {addedReferences.map((ref) => (
          <OnboardingReferenceCard
            key={ref.id}
            reference={ref}
            onRemove={handleRemoveReference}
          />
        ))}
      </div>
    )}

    <p className="text-xs text-muted-foreground text-center">
      You can always add more references later in Settings
    </p>
  </WizardStepContent>

  <WizardStepFooter>
    <Button variant="ghost" onClick={goBack}>
      <ArrowLeft className="h-4 w-4 mr-2" /> Back
    </Button>
    <Button size="lg" onClick={handleContinue}>
      {addedReferences.length > 0 ? 'Continue' : 'Skip for Now'}
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  </WizardStepFooter>
</WizardStep>
```

### OnboardingReferenceCard (Compact)

```
Container: flex items-center gap-3 p-3 rounded-lg border border-border bg-card
Icon area: h-8 w-8 rounded bg-secondary flex items-center justify-center
  - FileText icon for paste/file
  - Globe icon for URL/publication
Text area: flex-1
  - Name: text-sm font-medium text-foreground truncate
  - Source: text-xs text-muted-foreground
Remove button: h-7 w-7 rounded hover:bg-destructive/10
  - X icon, h-3.5 w-3.5 text-muted-foreground hover:text-destructive
```

### Dynamic CTA Label

The CTA button text changes based on whether references have been added:
- 0 references: **"Skip for Now"** (ghost-like styling but still primary button)
- 1+ references: **"Continue"** (standard primary)

This removes the need for a separate skip link and makes skipping feel like a natural choice, not a cop-out.

---

## 9. Step 6: Completion

### Purpose
Celebrate the user's completion, create a moment of delight, and smoothly transition to the main app.

### Layout

```
+---------------------------------------------------+
|                                                     |
|              [Confetti particles falling]            |
|                                                     |
|              [Animated checkmark - 64x64]           |
|                                                     |
|         "You're all set, {firstName}!"              |
|                                                     |
|     "NextUp is now personalized to your expertise   |
|      and your voice. Time to create something       |
|      brilliant."                                     |
|                                                     |
|   +-----------------------------------------------+ |
|   |  [Sparkle] Profile complete                    | |
|   |  [PenLine] Voice trained on {n} references    | |
|   |  [Target] Goals defined                        | |
|   +-----------------------------------------------+ |
|                                                     |
|         [ Go to My Dashboard ]                      |
|                                                     |
+---------------------------------------------------+
```

### Component Hierarchy

```tsx
<WizardStep>
  {/* Confetti layer */}
  <ConfettiCelebration active={true} />

  <WizardStepContent className="text-center">
    {/* Animated checkmark */}
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
      <AnimatedCheckmark className="h-8 w-8 text-emerald-500" />
    </div>

    {/* Personalized headline */}
    <h1 className="text-display-md font-semibold tracking-tight mt-6">
      You're all set, {firstName}!
    </h1>

    {/* Subtitle */}
    <p className="text-base text-muted-foreground mt-3 max-w-[420px] mx-auto leading-relaxed">
      NextUp is now personalized to your expertise and your voice.
      Time to create something brilliant.
    </p>

    {/* Completion summary */}
    <div className="mt-8 space-y-2 max-w-[320px] mx-auto text-left">
      <CompletionRow
        icon={Sparkles}
        text="Profile complete"
        done={profileComplete}
      />
      <CompletionRow
        icon={PenLine}
        text={`Voice trained on ${referenceCount} reference${referenceCount !== 1 ? 's' : ''}`}
        done={referenceCount > 0}
      />
      <CompletionRow
        icon={Target}
        text="Goals defined"
        done={goalsComplete}
      />
    </div>
  </WizardStepContent>

  <WizardStepFooter>
    <Button size="lg" className="w-full sm:w-auto min-w-[240px]" onClick={goToDashboard}>
      Go to My Dashboard
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  </WizardStepFooter>
</WizardStep>
```

### CompletionRow

```
Container: flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50
Done state:
  Icon container: h-8 w-8 rounded-lg bg-emerald-500/10
  Icon: h-4 w-4 text-emerald-500
  Text: text-sm font-medium text-foreground
Incomplete state:
  Icon container: h-8 w-8 rounded-lg bg-secondary
  Icon: h-4 w-4 text-muted-foreground
  Text: text-sm text-muted-foreground
```

### Confetti Specification

```
Implementation: Canvas-based confetti (use canvas-confetti library or custom)
Trigger: On step mount, with 300ms delay
Duration: 3 seconds
Particle count: 80
Colors: ['#0ECCED', '#025EC4', '#10b981', '#f59e0b', '#f0f4f8']
Spread: 70 degrees
Origin: { x: 0.5, y: 0.3 } (above center)
Gravity: 1.2 (fall naturally)
Drift: -0.5 to 0.5 (slight horizontal movement)

prefers-reduced-motion: Skip confetti entirely, show static celebration icon instead
```

### Animated Checkmark

```
SVG checkmark that draws itself using stroke-dashoffset animation:
- Total duration: 600ms
- Circle draws first (0-300ms, ease-out)
- Checkmark stroke draws second (300-600ms, ease-out)
- Scale: starts at 0.8, ends at 1.0 (300ms, spring easing)
```

### Transition to Main App

When user clicks "Go to My Dashboard":
1. Wizard fades out (300ms, ease-in)
2. Brief 100ms pause
3. Main app layout fades in (400ms, ease-out)
4. Route changes to `/portfolio`
5. First-visit welcome banner appears in portfolio (handled by portfolio page, not wizard)

---

## 10. Component Specifications

### WizardStep (Layout Wrapper)

```tsx
interface WizardStepProps {
  children: React.ReactNode;
  className?: string;
}

// Full-height flex container for each step
// Handles scroll area between fixed header and footer
```

```
Structure:
  <div className="flex flex-col min-h-0 flex-1">
    <ScrollArea className="flex-1">
      {/* Step content */}
    </ScrollArea>
  </div>
```

### WizardStepContent

```
max-w-[560px] mx-auto px-5 sm:px-8 py-8
```

### WizardStepFooter

```
Desktop:
  Container: px-5 sm:px-8 py-5 border-t border-border/50
             flex items-center justify-between max-w-[560px] mx-auto w-full
  Back button: Left-aligned, ghost variant
  CTA button: Right-aligned, primary variant, size="lg"
  Skip link: Below CTA, text-sm text-muted-foreground, centered

Mobile:
  Container: fixed bottom-0 left-0 right-0 px-5 py-4
             bg-background/95 backdrop-blur-sm border-t border-border/50
             safe-area-inset-bottom
  CTA button: Full-width, size="lg", h-12 (48px touch target)
  Back button: Above CTA, centered text link
  Skip link: Below CTA, centered
```

### OnboardingField

See specification in Step 3 section above.

### AiExtractedBadge

```
Variants:
  - "extracted": Green badge, shows "AI extracted"
  - "needs-input": Amber badge, shows "Needs your input"

extracted:
  Container: inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10
  Icon: Sparkles, h-3 w-3 text-emerald-500
  Text: text-[10px] font-medium text-emerald-600 dark:text-emerald-400

needs-input:
  Container: inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10
  Icon: AlertCircle, h-3 w-3 text-amber-500
  Text: text-[10px] font-medium text-amber-600 dark:text-amber-400
```

### ChipToggle

See specification in Step 4 section above.

### OnboardingReferenceCard

See specification in Step 5 section above.

### Skip Link

```
Element: <button> (not <a>, since it triggers an action)
Base: text-sm text-muted-foreground
Hover: text-foreground underline
Focus: outline-none ring-2 ring-ring ring-offset-2 rounded
Active: text-foreground/80
Label: "Skip this step" (per-step) or "Skip setup for now" (welcome step)
```

### Buttons

Use existing `Button` component from `frontend/src/components/ui/button.tsx`.

| Context | Variant | Size | Additional |
|---------|---------|------|------------|
| Primary CTA | `default` | `lg` | `min-w-[200px]` on desktop, `w-full` on mobile |
| Back | `ghost` | `default` | Left arrow icon |
| Extract Profile | `default` | `lg` | Sparkles icon |
| Skip | custom text link | n/a | Not a Button component |

### Inputs

Use existing `Input` and `Textarea` components. Add these onboarding-specific styles:

```
Input height: h-11 (44px, meets touch target minimum)
Textarea min-height: min-h-[80px] for short fields, min-h-[120px] for long fields
Icon-prefixed inputs: pl-10 for the left icon, icon is absolute positioned
Focus: Uses existing ring-1 ring-ring pattern
Disabled: cursor-not-allowed opacity-50
```

---

## 11. Animation Specifications

### Global Animation Principles

1. **Duration**: 200-400ms for UI transitions, 600-800ms for celebrations
2. **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for standard, `cubic-bezier(0.34, 1.56, 0.64, 1)` for spring/bouncy
3. **Stagger**: 60-100ms between sibling elements
4. **Direction**: Elements enter from below (slide-up) or fade in. Never slide from left/right between steps (feels like a carousel, not a wizard).
5. **Reduced motion**: All animations replaced with instant opacity transitions (150ms fade only)

### Step Transition

```
Exit current step:
  - All content fades out: opacity 1 -> 0, 200ms, ease-in
  - Slight upward movement: translateY(0) -> translateY(-8px), 200ms, ease-in

Enter new step:
  - All content fades in: opacity 0 -> 1, 300ms, ease-out
  - Slides up: translateY(12px) -> translateY(0), 300ms, ease-out
  - Stagger: headline first, then subtitle, then fields

Total transition duration: ~500ms (200ms exit + 300ms enter, no gap)
```

### Progress Bar Animation

```
Width change: 600ms, cubic-bezier(0.4, 0, 0.2, 1)
Glow pulse (dark mode): When progress advances, a brief glow pulse
  - box-shadow: 0 0 16px rgba(14, 204, 237, 0.6) at peak
  - Duration: 800ms total (200ms in, 600ms out)
```

### Field Entrance (Steps 3-5)

```
Each field group animates in sequence:
  - opacity: 0 -> 1, 250ms, ease-out
  - translateY: 8px -> 0, 250ms, ease-out
  - Stagger delay: 60ms between fields
  - Total for 8 fields: ~730ms
```

### Extraction Waterfall Reveal (Step 2)

```
Skeleton-to-content crossfade per field:
  1. Skeleton shimmer stops
  2. Skeleton fades to 0 opacity (150ms)
  3. Real content fades in from below (250ms, ease-out)
  4. AI badge slides in from right (200ms, ease-out, 100ms after content)
  5. Stagger: 200ms between each field
  Total: ~2.5s for 8 fields
```

### ChipToggle Selection

```
Select:
  - Border color transition: 150ms
  - Background color transition: 150ms
  - Checkmark icon: scale 0 -> 1, 200ms, spring easing
  - Slight scale bump: 1 -> 1.02 -> 1, 200ms

Deselect:
  - Reverse of above, 150ms
  - Checkmark: scale 1 -> 0, 150ms, ease-in
```

### Button Press

```
Active state:
  - scale: 1 -> 0.97 -> 1, 150ms
  - Feels tactile without being distracting
```

### Confetti (Step 6)

See specification in Step 6 section above.

### Animated Checkmark (Step 6)

See specification in Step 6 section above.

### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  /* All transitions become instant opacity fades */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 150ms !important;
  }

  /* Confetti: disabled entirely */
  /* Checkmark: appears instantly (no draw animation) */
  /* Waterfall: all fields appear at once with simple fade */
  /* Progress bar: no glow effect */
}
```

---

## 12. Responsive Design

### Breakpoints

| Breakpoint | Width | Layout Changes |
|-----------|-------|---------------|
| Mobile S | 320px - 374px | Single column, full-width CTA, compact spacing |
| Mobile M | 375px - 424px | Single column, full-width CTA |
| Mobile L | 425px - 767px | Single column, full-width CTA, slightly more padding |
| Tablet | 768px - 1023px | Single column, centered content, max-w-lg |
| Desktop | 1024px+ | Single column, centered content, max-w-2xl |

### Mobile-Specific Adaptations

**Navigation Footer**:
- Fixed at viewport bottom
- CTA button: `w-full h-12` (full-width, 48px height)
- Back link: Text above CTA, centered
- `safe-area-inset-bottom` for iPhone notch area
- `backdrop-blur-sm bg-background/95` for see-through effect

**Content Area**:
- `px-5` padding (20px)
- Forms stack vertically (no side-by-side fields)
- Chip/tag selection wraps naturally with `flex-wrap`

**Step 2 (Import)**:
- URL inputs stack vertically
- Extraction skeleton adapts to full-width

**Step 5 (Writing Voice)**:
- Tab labels are icon-only on mobile (`<span className="hidden sm:inline">`)
- File drop zone: Full-width, taller touch target

**Top Bar**:
- Mobile: `h-12`, logo + "2/6" compact indicator + Skip
- Desktop: `h-14`, logo + "Step 2 of 6: Import" + Skip setup link

**Keyboard Handling (Mobile)**:
- When input receives focus, scroll field into view above keyboard
- Footer repositions above keyboard (via `visualViewport` API or CSS `env(keyboard-inset-height)`)

### Touch Targets

All interactive elements meet WCAG 2.1 AA requirements:

| Element | Minimum Size | Actual Size |
|---------|-------------|-------------|
| CTA Button | 44x44px | 48px height, full-width on mobile |
| Back Button | 44x44px | 44px height |
| Skip Link | 44x44px | 44px tap target (text + padding) |
| Input Fields | 44x44px | 44px height (h-11) |
| Chip Toggles | 44x44px | 44px height (py-2 + text + padding) |
| Tab Triggers | 44x44px | 36px height (slightly under, compensate with padding) |
| Reference Remove Button | 44x44px | 44px tap target area |

---

## 13. Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast**:
- All text meets 4.5:1 ratio against background
- Primary button text on primary background: verified for both themes
- Muted foreground on card background: minimum 4.5:1
- AI badge text on badge background: minimum 4.5:1
- Focus indicators are visible in both light and dark modes

**Keyboard Navigation**:
- Full wizard navigable via Tab / Shift+Tab
- Enter activates CTA buttons
- Escape triggers skip (with confirmation)
- Arrow keys navigate chip selections in priorities
- Tab order follows visual order: header -> content fields -> footer

**Screen Reader Support**:
- `role="progressbar"` on progress indicator with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Onboarding progress"`
- Steps announced with `aria-live="polite"` region for step changes
- `aria-label` on all icon-only buttons (skip, back, remove reference)
- Form fields have proper `<label>` associations via `htmlFor`
- AI extraction badge has `aria-label="Automatically extracted by AI"`
- Chip toggles use `role="checkbox"` with `aria-checked`
- Error messages linked to fields via `aria-describedby`
- Step transitions announced: "Step 3 of 6: Review your profile"

**Focus Management**:
- On step transition, focus moves to the step headline (`h1`)
- On extraction complete, focus moves to the results summary
- On error, focus moves to the error message
- Focus trap within wizard (Tab doesn't escape to hidden content)
- `tabIndex={-1}` on headlines to allow programmatic focus

**Reduced Motion**:
- All animations respect `prefers-reduced-motion: reduce`
- Confetti replaced with static celebration icon
- Field reveals become instant with opacity-only transition
- Progress bar changes instantly (no glow)

**Form Accessibility**:
- Required fields marked with `aria-required="true"` and visual asterisk
- Error messages use `role="alert"` for immediate announcement
- Inline validation errors appear below the field, associated via `aria-describedby`
- Auto-save confirmed via `aria-live="polite"` status: "Progress saved"

---

## 14. Error States & Edge Cases

### URL Validation Errors (Step 2)

**Invalid LinkedIn URL**:
```
Input: border-destructive
Error message (below input): "Please enter a valid LinkedIn URL (e.g., linkedin.com/in/yourname)"
Icon: AlertCircle, h-3.5 w-3.5 text-destructive
Timing: On blur (not on every keystroke)
```

**Invalid Website URL**:
```
Same pattern as LinkedIn
Message: "Please enter a valid website URL starting with https://"
```

### Extraction Failures (Step 2)

**URL unreachable**:
```
Layout: Replace skeleton with error card
Card: border-amber-500/30 bg-amber-500/5 (warning, not error)
Icon: AlertTriangle, h-5 w-5 text-amber-500
Title: "Couldn't reach that URL"
Description: "The page might be private or temporarily unavailable."
Actions: [Try Again] [Enter Details Manually]
```

**Extraction returned no data**:
```
Card: border-border bg-card (neutral, not alarming)
Icon: Search, h-5 w-5 text-muted-foreground
Title: "We couldn't find much"
Description: "No worries -- you can add your details in the next steps."
Action: [Continue Manually]
```

**Extraction timeout (>30s)**:
```
Card: border-amber-500/30 bg-amber-500/5
Icon: Clock, h-5 w-5 text-amber-500
Title: "This is taking longer than expected"
Description: "We're still working on it. You can wait or continue without extraction."
Actions: [Keep Waiting] [Continue Manually]
Progress bar shows indeterminate animation during wait
```

### Network Disconnection

**During extraction**:
```
Toast notification: "Connection lost. We'll retry when you're back online."
Extraction attempt paused, auto-retries on reconnection
Visual: Extraction skeleton pauses (shimmer stops), amber border appears
```

**During auto-save**:
```
Subtle banner at top: "Offline -- your progress will save when reconnected"
Banner: bg-amber-500/10 text-amber-700 dark:text-amber-400, flex items-center gap-2
Icon: WifiOff, h-4 w-4
Auto-save queues locally and retries on reconnection
```

### Field Validation (Steps 3-4)

**Character limit exceeded**:
```
Counter appears below field: "420 / 500 characters" when within 20% of limit
Counter turns amber at 90%: "475 / 500 characters"
Counter turns destructive at 100%: "500 / 500 characters"
Input prevented beyond limit
```

**Years of experience out of range**:
```
Error below field: "Please enter a number between 0 and 50"
```

### Skip Confirmation

**Skip individual step**:
```
No confirmation needed. Step skipped, progress saved, next step loaded.
```

**Skip entire wizard (from Welcome step)**:
```
Dialog confirmation:
  Title: "Skip setup?"
  Description: "No worries! You can complete your profile anytime in Settings.
               The AI will use default settings until your profile is ready."
  Actions: [Go Back] [Skip to Dashboard]
  Style: Standard AlertDialog with data-portal-ignore-click-outside
```

### Browser Back Button

```
Browser back button navigates to previous wizard step (not out of wizard).
History entries pushed for each step: /onboarding?step=1, /onboarding?step=2, etc.
If on Step 1, back button shows skip confirmation.
```

### Session Resumption

```
On page load:
  1. Fetch onboarding_progress from backend
  2. If progress exists and not completed:
     - Navigate to last incomplete step
     - Pre-fill all previously saved data
     - Show brief "Picking up where you left off" toast
  3. If progress is complete:
     - Redirect to /portfolio (never show wizard again)
```

### Very Long Extracted Content

```
Textarea fields: No truncation needed (user can scroll)
Preview in Step 2: Truncate at 3 lines with "..." for text fields
Chip previews in Step 2: Show max 6 chips, "+N more" badge if exceeded
```

---

## 15. Copy & Microcopy

### Step 1: Welcome

| Element | Copy |
|---------|------|
| Headline | Let's set up your advisor OS |
| Subtitle | We'll personalize NextUp to your expertise, your clients, and your voice. Most of the work is done by AI -- you just confirm. |
| Time badge | Under 3 minutes |
| Value prop 1 | AI-powered profile extraction |
| Value prop 2 | Your data stays private and secure |
| Value prop 3 | Content tailored to your voice |
| CTA | Get Started |
| Skip | Skip setup for now |

### Step 2: Import

| Element | Copy |
|---------|------|
| Headline | Where can we learn about you? |
| Subtitle | Drop in your LinkedIn and website -- our AI will extract your profile in seconds. |
| LinkedIn label | LinkedIn Profile URL |
| LinkedIn helper | Your public LinkedIn profile URL |
| Website label | Website URL (optional) |
| Website helper | Your personal or company website |
| CTA | Extract My Profile |
| No URLs CTA | Continue without extraction |
| Skip | Skip this step |
| Loading headline | Analyzing your profile... |
| Loading messages | (rotating, see Step 2 specification) |
| Results headline | Here's what we found |
| Results summary | Found {n} of {total} fields |
| Results footer | You'll review and edit these in the next steps |
| Results CTA | Looks Good, Continue |

### Step 3: About Me + Profession

| Element | Copy |
|---------|------|
| Headline | Review your profile |
| Subtitle | We've pre-filled what we could. Feel free to edit anything -- this is your story. |
| Section 1 label | About Me |
| Section 2 label | Expertise |
| Bio placeholder | Who you are and what you do professionally. E.g.: Fractional CPO helping B2B SaaS startups build their first product org... |
| Value prop placeholder | What makes you the right choice for clients? |
| Years placeholder | e.g., 12 |
| Expertise placeholder | Your core skills and specialties (e.g., Product Strategy, User Research, Agile/Scrum) |
| Industries placeholder | The industries you work in (e.g., SaaS / B2B Software, FinTech) |
| Methodologies placeholder | Frameworks and methods you use (optional) |
| Certifications placeholder | Professional certifications (optional) |
| CTA | Save & Continue |
| Skip | Skip this step |

### Step 4: Customers + Goals

| Element | Copy |
|---------|------|
| Headline | Who do you serve, and where are you headed? |
| Subtitle | Help us understand your clients and goals so the AI creates relevant content. |
| Section 1 label | Your Clients |
| Section 2 label | Your Goals |
| Target audience placeholder | Who is your content for? (e.g., B2B SaaS founders and VPs of Product) |
| Ideal client placeholder | Describe your dream client (e.g., Series A-C SaaS companies building their first product team) |
| Industries served placeholder | Add industries (e.g., SaaS, Healthcare)... |
| Content goals placeholder | What do you want your content to achieve? (e.g., Establish thought leadership in product strategy) |
| Business goals placeholder | What business outcomes are you driving? (e.g., Generate inbound consulting leads) |
| Priorities label | Priorities (choose what matters most) |
| CTA | Save & Continue |
| Skip | Skip this step |

### Step 5: Writing Voice

| Element | Copy |
|---------|------|
| Headline | Teach the AI your voice |
| Subtitle | The more examples you share, the more your content will sound like you. We accept articles, posts, and documents. |
| Tab: Paste | Paste |
| Tab: File | File |
| Tab: URL | URL |
| Tab: Publication | Article |
| Reference name label | Reference name (optional) |
| Paste placeholder | Paste your writing sample here... |
| Footer note | You can always add more references later in Settings |
| CTA (0 refs) | Skip for Now |
| CTA (1+ refs) | Continue |

### Step 6: Completion

| Element | Copy |
|---------|------|
| Headline | You're all set, {firstName}! |
| Subtitle | NextUp is now personalized to your expertise and your voice. Time to create something brilliant. |
| Summary: Profile | Profile complete |
| Summary: Voice | Voice trained on {n} reference(s) |
| Summary: Goals | Goals defined |
| Summary (skipped) | Profile started -- complete anytime in Settings |
| CTA | Go to My Dashboard |

### Skip Confirmation Dialog

| Element | Copy |
|---------|------|
| Title | Skip setup? |
| Description | No worries! You can complete your profile anytime in Settings. The AI will use default settings until your profile is ready. |
| Cancel | Go Back |
| Confirm | Skip to Dashboard |

### Toast Messages

| Trigger | Message |
|---------|---------|
| Auto-save success | (no toast -- silent) |
| Auto-save failure | "Couldn't save your progress. We'll retry automatically." |
| Resume session | "Picking up where you left off" |
| Extraction started | (no toast -- inline loading state) |
| Reference added | "Reference added" |
| Reference removed | "Reference removed" |
| Network offline | "You're offline. Progress will save when reconnected." |
| Network restored | "Back online. Progress saved." |

### Tone Guidelines

- **Conversational but not cute**: "Drop in your LinkedIn" not "Hey there! Pop your LinkedIn URL here!"
- **Empowering**: "This is your story" not "Please fill in your bio"
- **Non-judgmental skips**: "Skip for now" not "Skip" or "I'll do this later"
- **AI as helper, not replacement**: "We've pre-filled what we could" not "AI has completed your profile"
- **Specific time estimates**: "Under 3 minutes" not "This won't take long"
- **Inclusive**: No gendered language, no assumptions about role titles

---

## 16. Color & Typography Reference

### Color Palette (Wizard-Specific)

The wizard uses the existing NextUp design system colors. These are the most-used tokens:

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--background` | `210 20% 98%` | `220 60% 3%` | Wizard background |
| `--foreground` | `222 47% 11%` | `210 20% 95%` | Primary text |
| `--card` | `0 0% 100%` | `215 52% 10%` | Content surfaces |
| `--muted-foreground` | `215 16% 47%` | `215 16% 57%` | Secondary text, placeholders |
| `--primary` | `214 83% 39%` | `187 89% 49%` | CTA buttons, progress bar, focus rings |
| `--border` | `214 32% 91%` | `215 20% 25%` | Field borders, dividers |
| `--secondary` | `210 16% 93%` | `215 47% 15%` | Chip backgrounds, badges |
| `--destructive` | `340 100% 64%` | `340 100% 64%` | Error states |
| emerald-500 | `#10b981` | `#10b981` | AI extracted badges, success states |
| amber-500 | `#f59e0b` | `#f59e0b` | Warning states, "needs input" badges |

### Background Gradient

```css
/* Subtle radial gradient behind wizard content */
.onboarding-background {
  background:
    radial-gradient(
      ellipse at 30% 20%,
      hsl(var(--primary) / 0.03) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 70% 80%,
      hsl(var(--accent) / 0.02) 0%,
      transparent 50%
    ),
    hsl(var(--background));
}

.dark .onboarding-background {
  background:
    radial-gradient(
      ellipse at 30% 20%,
      hsl(var(--primary) / 0.06) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 70% 80%,
      hsl(var(--accent) / 0.04) 0%,
      transparent 50%
    ),
    hsl(var(--background));
}
```

### Typography

| Element | Font | Size | Weight | Tracking | Color |
|---------|------|------|--------|----------|-------|
| Step headline | Plus Jakarta Sans | `text-display-md` (1.875rem) | `font-semibold` (600) | `tracking-tight` | `text-foreground` |
| Step subtitle | Plus Jakarta Sans | `text-base` (1rem) | `font-normal` (400) | normal | `text-muted-foreground` |
| Section label | Plus Jakarta Sans | `text-xs` (0.75rem) | `font-semibold` (600) | `tracking-wider uppercase` | `text-muted-foreground` |
| Field label | Plus Jakarta Sans | `text-sm` (0.875rem) | `font-medium` (500) | normal | `text-foreground` |
| Field helper | Plus Jakarta Sans | `text-xs` (0.75rem) | `font-normal` (400) | normal | `text-muted-foreground` |
| Field input | Plus Jakarta Sans | `text-sm` (0.875rem) md, `text-base` (1rem) mobile | `font-normal` (400) | normal | `text-foreground` |
| Placeholder | Plus Jakarta Sans | Same as input | `font-normal` (400) | normal | `text-muted-foreground` |
| Button text | Plus Jakarta Sans | `text-sm` (0.875rem) | `font-medium` (500) | normal | Per variant |
| Badge/chip text | Plus Jakarta Sans | `text-xs` (0.75rem) | `font-medium` (500) | normal | Per variant |
| AI badge text | Plus Jakarta Sans | `text-[10px]` | `font-medium` (500) | normal | `text-emerald-600` |
| Progress label | Plus Jakarta Sans | `text-sm` (0.875rem) | `font-medium` (500) | normal | `text-muted-foreground` |
| Skip link | Plus Jakarta Sans | `text-sm` (0.875rem) | `font-normal` (400) | normal | `text-muted-foreground` |

---

## 17. Implementation Notes

### Technology & Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| UI Components | shadcn/ui (Radix) | Reuse existing Button, Input, Textarea, Card, Badge, Tabs, Dialog, ScrollArea, Skeleton |
| Icons | Lucide React | Consistent with rest of app |
| Forms | React Hook Form + Zod | Match existing `UserContextForm.tsx` patterns |
| State | Zustand (client) + React Query (server) | Auto-save via mutation, progress via query |
| Animations | CSS transitions + keyframes | Prefer CSS for simple animations. Use Framer Motion only if spring physics needed. |
| Confetti | canvas-confetti | Lightweight, 6KB. Or custom canvas implementation. |
| Tags | Existing TagsInput component | Already built at `frontend/src/features/portfolio/components/artifact/TagsInput.tsx` |

### File Structure

```
frontend/src/features/onboarding/
  pages/
    OnboardingPage.tsx              # Route wrapper, step router
  components/
    WizardLayout.tsx                # Full-screen layout with header, progress, footer
    WizardStep.tsx                  # Generic step wrapper
    WizardStepContent.tsx           # Content area with max-width
    WizardStepFooter.tsx            # Navigation footer
    ProgressBar.tsx                 # Endowed progress bar
    steps/
      WelcomeStep.tsx               # Step 1
      ImportStep.tsx                # Step 2
      ProfileStep.tsx              # Step 3 (About Me + Profession)
      MarketStep.tsx               # Step 4 (Customers + Goals)
      VoiceStep.tsx                # Step 5 (Writing References)
      CompletionStep.tsx           # Step 6
    shared/
      OnboardingField.tsx           # Field wrapper with AI badge
      AiExtractedBadge.tsx          # Green "AI extracted" badge
      ExtractionSkeleton.tsx        # Shimmer skeleton for extraction loading
      ExtractionResults.tsx         # Post-extraction preview card
      ChipToggle.tsx                # Selectable chip for priorities
      OnboardingReferenceCard.tsx   # Compact reference card
      AnimatedCheckmark.tsx         # SVG draw animation
      ConfettiCelebration.tsx       # Canvas confetti wrapper
  hooks/
    useOnboardingProgress.ts        # React Query hook for progress CRUD
    useProfileExtraction.ts         # Mutation hook for AI extraction
    useOnboardingNavigation.ts      # Step navigation, back/forward, skip
    useAutoSave.ts                  # Debounced field auto-save
  types/
    onboarding.ts                   # OnboardingProgress, ExtractionResult, StepConfig
  config/
    steps.ts                        # Step definitions, labels, progress percentages
    priorities.ts                   # Priority chip options
```

### Routing

```tsx
// In App.tsx or router config
<Route path="/onboarding" element={
  <ProtectedRoute requireOnboarding={false}>
    <OnboardingPage />
  </ProtectedRoute>
} />

// OnboardingPage handles step routing via URL search params:
// /onboarding?step=1 through /onboarding?step=6
// Enables browser back/forward button support
```

### Data Flow

```
1. User logs in -> ProtectedRoute checks onboarding_progress
2. No progress or not completed -> redirect to /onboarding
3. Step 2: User enters URLs -> POST /api/onboarding/extract-profile
4. Backend fetches URLs, sends to Claude, returns structured data
5. Extraction results stored in onboarding_progress record
6. Steps 3-5: Fields auto-save on change (debounced 500ms)
7. On each "Save & Continue": immediate save + advance step
8. Step 6: Mark onboarding as complete (PUT /api/onboarding/progress)
9. Redirect to /portfolio
```

### Auto-Save Implementation

```tsx
// useAutoSave hook pattern
const autoSave = useDebouncedCallback(
  async (fieldPath: string, value: unknown) => {
    await updateOnboardingProgress.mutateAsync({
      step_data: { [fieldPath]: value },
    });
  },
  500
);

// Usage in step components
<Textarea
  value={formData.bio}
  onChange={(e) => {
    setFormData(prev => ({ ...prev, bio: e.target.value }));
    autoSave('about_me.bio', e.target.value);
  }}
/>
```

### Component Reuse Strategy

| Existing Component | Used In | How |
|-------------------|---------|-----|
| `Button` | All steps | Direct reuse, no changes |
| `Input` | Steps 2-4 | Direct reuse, add `h-11` class |
| `Textarea` | Steps 3-5 | Direct reuse |
| `Card` | Steps 2, 5 | Direct reuse for extraction preview and upload area |
| `Badge` | Steps 3-4 | Direct reuse for AI badges |
| `Tabs` | Step 5 | Direct reuse for upload method tabs |
| `Skeleton` | Step 2 | Direct reuse for extraction shimmer |
| `ScrollArea` | All steps | For scrollable content areas |
| `AlertDialog` | Skip confirmation | Direct reuse with `data-portal-ignore-click-outside` |
| `TagsInput` | Step 4 | Direct reuse for industries_served |
| `FileDropZone` | Step 5 | Direct reuse for file upload |
| `Label` | Steps 2-5 | Direct reuse |
| `Progress` | Progress bar | Extend with gradient and glow (or custom component) |

### Performance Considerations

- **Code Splitting**: The onboarding feature should be lazy-loaded (`React.lazy`) since it's only shown once per user. The main app bundle should not include onboarding code.
- **Confetti Library**: Load `canvas-confetti` dynamically only when Step 6 is reached.
- **Image Assets**: None required. The wizard is icon-based (Lucide) to keep bundle small.
- **Auto-Save Debounce**: 500ms prevents excessive API calls during typing.
- **Extraction Polling**: If extraction is async, poll every 2 seconds with exponential backoff.

---

*End of UX/UI Specification. This document should be used as the definitive reference for implementing the onboarding wizard across Phase 1 (functional) and Phase 2 (polished).*
