# NextUp Content Creation Flow — UX/UI Design Review

## Executive Summary

NextUp has an intelligently conceived product idea — AI-powered content creation for fractional leaders and consultants — and the design reflects a solid structural foundation. The "Midnight Architect" design system is well-documented and principled. The split-panel layout, the progressive AI pipeline (Research → Foundations → Writing → Image), and the conversational case study interview flow are genuinely differentiated UX decisions that serve the product well.

However, the current implementation runs significantly lighter than the design system it is built upon. The app is deployed overwhelmingly in light mode, and the light mode palette is extremely pale, low-contrast, and lacking depth. The experience reads as unfinished rather than premium. Key moments that should feel delightful — the first artifact completion, the research phase completing, the foundations approval — pass without ceremony. The typography hierarchy is weak throughout; nearly everything is the same visual weight, which makes it hard for users to instantly understand what matters most on any screen.

The most urgent issues are structural: the onboarding flow is interrupted by an unexplained blank loading screen after login, the empty portfolio page has a mismatched empty-state icon, the artifact editor during generation provides far too little feedback in the right panel, and the header bar during the live generation phase loses its primary CTA entirely. Mobile is undercooked — the portfolio screen is completely inaccessible on mobile because the AI panel takes over the entire viewport. None of these are fundamental rethinks; they are targeted fixes that would substantially raise the perceived quality of the product.

The design shows clear talent and ambition. The AI pipeline progress experience in the left panel is warm and readable. The case study interview chat flow is genuinely excellent — human, efficient, and well-paced. With focused improvements to contrast, hierarchy, loading states, the onboarding transition, and mobile layout, this product would feel comfortably in the premium tier that its design system promises.

---

## Overall Scores

| Dimension | Score | Notes |
|---|---|---|
| Usability | 6.5 / 10 | Core flow is learnable but has friction points (blank redirect, missing CTAs during generation) |
| Visual Design | 5.5 / 10 | Light mode feels washed out and flat; dark mode would be significantly stronger |
| Consistency | 6.0 / 10 | Design system exists but is unevenly applied (status badge colors, typography weights) |
| Delight | 5.0 / 10 | Pipeline copy is warm; animations and micro-interactions are mostly absent |
| Accessibility | 5.0 / 10 | Contrast failures in muted text + status badges; focus states not visible in screenshots |
| Mobile | 4.0 / 10 | Portfolio is inaccessible; editor is too small to use; no mobile-optimized layout for core flows |

---

## Screen-by-Screen Analysis

---

### 1. Login Page (Screenshots 01, 02)

**Score: 6 / 10**

**What works:**
- Clean two-column split: brand panel left, form right. Classic and immediately legible.
- Google SSO is prominently placed at the top — correct priority ordering.
- "Forgot password?" positioned inline with the Password label — good placement, matches user mental model.
- Form completion state (screenshot 02) shows password field with blue focus ring — at least one input state is visible.
- Marketing copy (AI-powered content, Client management, Built for advisors) provides value context during the form-fill moment.

**Issues found:**

**Issue 1.1: Left panel contrast failure — text is nearly invisible on the blue background.**
The feature list copy ("AI-powered content creation in your voice", "Client & engagement management", "Built for advisors and fractional leaders") renders in a very dark navy color against the electric blue background. The contrast ratio is estimated at approximately 2.5:1 — well below the WCAG AA minimum of 4.5:1. The check icons share this contrast problem.
- **Severity:** Critical (accessibility)
- **Fix specification:** Change the feature list text color to `rgba(255, 255, 255, 0.90)` (white at 90% opacity). Change the check icon color to `rgba(255, 255, 255, 0.80)`. Estimated contrast ratio on the blue background (#2563EB range): approximately 8:1, passing AAA. The "NextUp" wordmark and tagline "Your AI-powered advisory practice OS." should use `rgba(255, 255, 255, 1.0)` (full white). Apply via: `color: rgba(255,255,255,0.9)` or Tailwind `text-white/90`.

**Issue 1.2: Left panel has no visual identity beyond a flat blue rectangle.**
The brand panel is a solid blue with small centered logo, wordmark, and three bullet points. The large empty areas above and below suggest no compositional intention. The panel does not reinforce brand warmth or premium quality.
- **Severity:** Medium
- **Fix specification:** Add a subtle radial gradient overlay to the panel background. Gradient: `radial-gradient(ellipse at 30% 70%, rgba(14, 204, 237, 0.15) 0%, transparent 60%)`. This introduces the brand cyan as a glow in the lower-left corner, reinforcing the "Midnight Architect" luminous quality even in the login panel. Additionally, move the content block to vertical center with `justify-content: center` and add `padding: 64px 48px`. The feature list should have `margin-top: 40px` from the tagline, not the current tightly stacked position.

**Issue 1.3: The "or" divider between Google SSO and email form is extremely faint.**
The horizontal rule divider with "or" text in the center is nearly invisible — very light gray. It is semantically important (explaining the two auth paths) but visually absent.
- **Severity:** Medium
- **Fix specification:** Set the divider line color to `#D1D5DB` (Tailwind `gray-300`). Set the "or" text to `font-size: 0.75rem` (12px), `color: #6B7280` (Tailwind `gray-500`), `font-weight: 500`. The overall divider height should be `margin: 16px 0` above and below.

**Issue 1.4: No page title — the first visual heading is "Welcome back" but the tagline "Sign in to your account" is redundant.**
"Welcome back" and "Sign in to your account" convey the same information. The subtitle adds no new context.
- **Severity:** Low
- **Fix specification:** Remove the subtitle "Sign in to your account." Keep "Welcome back" as the heading at `font-size: 1.5rem` (24px), `font-weight: 600`. Below it, add a single line: "New to NextUp? Sign up" instead of repeating in the footer. This removes the bottom redundant sign-up prompt and places registration discovery directly under the heading where a new user would look first.

---

### 2. Post-Login Redirect (Screenshot 03)

**Score: 2 / 10**

**What works:**
- Nothing notable. This screen is a critical UX failure.

**Issues found:**

**Issue 2.1: The post-login redirect lands on what appears to be a partially loaded onboarding page with only a progress bar and skeleton loaders — no explanation of what is happening.**
After login, the user sees "Step 2 of 4: Your Profile" in the top-left, a half-filled blue progress bar, and a page full of skeleton/shimmer content below. There is no heading that has loaded, no animation that reassures the user, and no context for why they are seeing skeleton lines. It looks like a broken page, not a designed loading state.
- **Severity:** Critical
- **Fix specification:**
  - Add a full-width welcome interstitial that displays for 1.5–2 seconds before the onboarding page renders. The interstitial content: centered on a white/near-white background, the NextUp logo at 48px, a heading "Setting up your workspace..." at `text-heading-lg` (24px, font-weight 600), and a single animated progress indicator (either a thin line progress bar in brand blue `#025EC4` at full width of the screen, or a pulsing dot row: `• • •` at 8px each, spaced 6px apart, with a staggered opacity animation: `animation: pulse 1.2s ease-in-out infinite; animation-delay: 0s / 0.2s / 0.4s`).
  - The interstitial transitions via `opacity: 0` fade at `transition: opacity 300ms ease-out` into the actual onboarding step 1.
  - If the interstitial is not feasible, at minimum: the skeleton loading state must show the page title "Your Profile" in rendered text (not skeleton), and the progress bar must have a label: "Analyzing your LinkedIn profile — this takes 10–15 seconds."

---

### 3. Onboarding — Step 2: Your Profile Loading (Screenshots 03, 04, 04b)

**Score: 5 / 10**

**What works:**
- The step indicator "Step 2 of 4: Your Profile" is clear and provides location context.
- "Skip for now" in the top-right corner is a good escape hatch — it is visible but not prominent, correctly de-emphasized.
- The blue progress bar filling left to right is a standard, understood pattern.
- The loading copy "Analyzing your profile... This usually takes 10–15 seconds." is friendly and honest — setting a time expectation is excellent practice.

**Issues found:**

**Issue 3.1: The skeleton content does not match the shape of the actual content that will appear.**
The skeleton loaders appear to show a form with multiple sections, but based on the screenshot, when the profile data loads, it likely shows structured profile fields. The skeleton blocks are generic horizontal bars that do not correspond to named form sections. This breaks the expectation that the skeleton is a preview of the real content.
- **Severity:** Medium
- **Fix specification:** Replace generic skeleton bars with labeled skeleton sections that mirror the real form layout. Each section should have: a skeleton heading block (`height: 12px, width: 100px, border-radius: 4px, background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%), background-size: 200% 100%, animation: shimmer 1.5s infinite`), followed by 2–3 skeleton input-shaped blocks (`height: 40px, width: 100%, border-radius: 6px`) with `margin-top: 8px` between them and `margin-bottom: 24px` between sections. The shimmer animation: `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`.

**Issue 3.2: The progress bar fills to approximately 50% (Step 2 of 4) but uses a gradient from dark blue to cyan that is visually busy and inconsistent with the design system's prescribed gradient usage.**
- **Severity:** Low
- **Fix specification:** Simplify the progress bar fill to a solid `#025EC4` (brand-500) in light mode, `height: 4px`, `border-radius: 9999px`. The track behind it: `background: #E5E7EB` (gray-200), same dimensions. This is cleaner, more consistent, and reduces visual noise during a loading state where simplicity is critical.

**Issue 3.3: The loading spinner is a browser-native circle spinner — not branded.**
The "C" or circular spinner next to "Analyzing your profile..." is a native browser throbber element, inconsistent with the rest of the UI.
- **Severity:** Medium
- **Fix specification:** Replace with a custom inline spinner. Implementation: an SVG circle with `stroke-dasharray: 56; stroke-dashoffset: 56; animation: spin-arc 1s linear infinite` where `@keyframes spin-arc { to { stroke-dashoffset: 0; stroke-dashoffset: -56 } }`. Size: `16px x 16px`. Stroke color: `#025EC4` (brand-500 in light mode). Thickness: `stroke-width: 2`. Place it 8px to the left of the text with `gap: 8px` in a flex row.

---

### 4. Onboarding — Step 3 (Screenshot 04c)

**Score: 5 / 10**

**Issues found:**

**Issue 4.1: Screenshot 04c appears identical to 04b — the same skeleton loading state.**
If Step 3 also shows a skeleton loading state without any differentiation from Step 2, the user has no sense of progression. The progress bar moves but nothing else changes visually.
- **Severity:** High
- **Fix specification:** Each onboarding step's skeleton should have a step-specific icon or heading visible before the AI data loads. For Step 3, render the step title (e.g. "Your Expertise Areas") as real non-skeleton text in the heading position, with only the form fields below rendered as skeletons. The heading should always load immediately — only the data-dependent content needs a skeleton state.

---

### 5. Skip Confirmation Dialog (Screenshot 04d)

**Score: 7 / 10**

**What works:**
- The copy is excellent: "You can finish this anytime in Settings. NextUp's AI uses your profile to generate content in your voice — the more you add, the better your results." This is honest, useful, and not guilt-inducing.
- "Keep going" is the primary action and renders darker / more prominent — correct.
- "Skip for now" is de-emphasized as a ghost/secondary action — correct priority.

**Issues found:**

**Issue 5.1: The dialog's button hierarchy violates the design system's button variant rule.**
Both "Skip for now" and "Keep going" appear to use the same general button style with only a background shade difference. "Keep going" should be the `default` variant (filled brand blue), and "Skip for now" should be `outline` or `ghost` variant. As rendered, both look like secondary actions.
- **Severity:** High
- **Fix specification:** "Keep going" button: `variant="default"`, `size="default"`, background `#025EC4`, text `white`, `border-radius: 6px`, `padding: 8px 16px`. "Skip for now" button: `variant="outline"`, `size="default"`, background transparent, border `1px solid #D1D5DB` (gray-300), text `#374151` (gray-700). The visual weight difference should be immediate and unmistakable.

**Issue 5.2: The dark overlay behind the dialog is a jarring dark gray (`#424242` range), inconsistent with the nearly-white onboarding page underneath.**
The overlay creates a harsh contrast shift that makes the dialog feel like an interruption rather than a contextual decision.
- **Severity:** Low
- **Fix specification:** Change the modal overlay to `background: rgba(0, 0, 0, 0.40)` (40% black). The current value appears to be approximately 55–60% opacity. The dialog itself should have `box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15)` to lift it from the overlay without relying on the overlay's darkness for perceived elevation.

---

### 6. Empty Portfolio Page (Screenshot 05)

**Score: 5.5 / 10**

**What works:**
- The two-panel layout (AI Assistant left, Portfolio content right) is immediately understandable and differentiating.
- The "Create Artifact" CTA button in the empty state is well-placed and prominent.
- The AI assistant prompt chips ("Help me write a LinkedIn post", "Research topic ideas", "Improve my content") are a clever way to demonstrate value before any content exists.
- The "+ New" button in the top-right header is visible and consistently positioned.

**Issues found:**

**Issue 6.1: The empty state icon is a document with an "X" mark — which communicates error or deletion, not an empty starting state.**
A document with an X reads as "something went wrong" or "file not found." For a first-time user seeing their empty portfolio, this sends entirely the wrong signal.
- **Severity:** High
- **Fix specification:** Replace the document-X icon with either: (a) a `Sparkles` or `PenLine` icon from Lucide React in size `32px`, color `#9CA3AF` (gray-400), centered within a `64px x 64px` circle of background `#F3F4F6` (gray-100), `border-radius: 50%`. Or (b) a simple three-line document icon with a plus (+) mark in the corner (a "create document" metaphor). Empty state heading: "Your portfolio is ready" (not "No artifacts yet" which reads as a system message). Subtext: "Create your first piece of content and it will appear here." This reframes the empty state as potential rather than absence.

**Issue 6.2: The left AI Assistant panel shows a robot icon, but the panel is labeled "Content Research" in the header when it is on the portfolio page — which is confusing.**
The left panel header says "Content Research" but the panel content says "AI Assistant." These two names describe the same thing but create a mental mismatch.
- **Severity:** Medium
- **Fix specification:** Standardize to one name. Given that this panel handles both research queries and general content chat, "AI Assistant" is more accurate and approachable. Update the header label to "AI Assistant" consistently. Apply `font-size: 0.875rem` (14px), `font-weight: 600`, `color: #111827` (gray-900), with the sparkles icon at `16px x 16px`, `color: #025EC4` (brand-500) positioned to the left.

**Issue 6.3: The filter tabs (All, Posts, Blogs, Showcases) and the status dropdown serve no purpose on an empty portfolio — they should be hidden or disabled when there is no content.**
Showing filter controls on an empty state adds visual noise and suggests content exists that can be filtered.
- **Severity:** Medium
- **Fix specification:** Conditionally hide the filter row when `artifactCount === 0`. The filter row should only render when there is at least one artifact. Use a CSS transition to fade it in: `transition: opacity 200ms ease-in` when it appears. This also reduces the visual complexity of the first-time user's experience.

**Issue 6.4: The "+" on the "Create Artifact" empty state button and the "+ New" header button provide two redundant entry points to the same action without visual distinction.**
Both buttons trigger the creation dialog. Having two equally prominent buttons for the same action is confusing — it makes the UI feel duplicated.
- **Severity:** Low
- **Fix specification:** The empty state CTA should be the primary, larger entry point: `Button variant="default" size="lg"`, icon `Sparkles` at `16px`, text "Create your first piece". The header "+ New" button should be `size="default"` (slightly smaller) and positioned as the persistent utility control. This way the empty state CTA teaches the user what to do, and the header button becomes the habitual control after they understand the pattern.

---

### 7. Create New Content Dialog (Screenshots 06, 07, 08, 09, 10, 11, 30, 31)

**Score: 6.5 / 10**

**What works:**
- The three-button footer (Cancel / Save as Draft / Create Content) is correctly ordered: dismiss → save → commit.
- Type selection with an icon per type (speech bubble for Social Post, document for Blog Post, trophy for Case Study) is a clear, scannable pattern.
- The "Content (optional)" label correctly signals that the field is not required.
- The dialog title "Create New Content" is clear and unambiguous.
- The type dropdown correctly uses icons next to the selected value and in the dropdown options — consistent.

**Issues found:**

**Issue 7.1: The dialog appears over a darkened backdrop but the backdrop is the same charcoal gray used in the skip confirmation dialog — this suggests a single global overlay style rather than a contextual one. The dialog itself renders with no visual entry animation.**
When the dialog opens (screenshot 06 vs 07), there is no transition — it appears instantaneously, which feels abrupt.
- **Severity:** Medium
- **Fix specification:** Add an entry animation to the dialog. Implementation using Tailwind `animate-in` (shadcn built-in): `data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`. Duration: `150ms`. Easing: `ease-out` on open, `ease-in` on close. The dialog should also gain `box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)` for appropriate modal elevation.

**Issue 7.2: The form has no visual grouping between fields — all fields run together with equal vertical spacing, making the form feel like a flat list rather than a structured form.**
Type, Tone, Title, Content, and Tags all have identical spacing between them. The form should group related fields and use visual cues to show which fields are primary vs. optional.
- **Severity:** High
- **Fix specification:**
  - Group "Type" and "Tone" together as a row or as conceptually linked fields (meta/configuration): add a subtle `border-bottom: 1px solid #F3F4F6` (gray-100) divider `margin-bottom: 20px, margin-top: 4px` between the Tone field and the Title field.
  - Title gets `margin-top: 20px` to visually separate it as "the content" section.
  - The field label style should be `font-size: 0.875rem` (14px), `font-weight: 500`, `color: #374151` (gray-700), with `margin-bottom: 6px`.
  - Add 20px vertical spacing between each field group instead of the current 16px, which feels cramped.

**Issue 7.3: The "Tone" dropdown does not explain what "Tone" affects for users who are new to the product.**
A first-time user may not know what selecting "Professional" vs. other tones will produce. There is no hint text.
- **Severity:** Medium
- **Fix specification:** Add an inline help tooltip to the Tone label. Implementation: a `HelpCircle` icon from Lucide React at `14px x 14px`, `color: #9CA3AF` (gray-400), positioned 6px to the right of the "Tone" label text. On hover of the icon, show a Tooltip with text: "Sets the writing style for AI-generated content. Professional = polished and formal, Conversational = warm and direct." Tooltip position: above the label, `max-width: 240px`, `padding: 8px 12px`, `background: #1F2937` (gray-800), `color: white`, `border-radius: 6px`, `font-size: 0.75rem`.

**Issue 7.4: The "Tags" field has no autocomplete, no example tags, and no visual indication of what happens after the user types a tag and presses Enter.**
The placeholder "Type a tag and press Enter..." is functional but unfriendly. There are no example tags shown, and no visual feedback about what a tag looks like once created.
- **Severity:** Medium
- **Fix specification:**
  - Show ghost/suggested tags below the Tags input when the field is empty. Suggestions: pill-shaped chips in `background: #F3F4F6` (gray-100), `color: #6B7280` (gray-500), `font-size: 0.75rem`, `padding: 3px 10px`, `border-radius: 9999px`. Example suggestions: "strategy", "leadership", "product". Clicking a suggestion adds it.
  - Once a tag is entered and the user presses Enter, render the tag as a colored pill inside the input: `background: #EFF6FF` (blue-50), `color: #1D4ED8` (blue-700), `border: 1px solid #BFDBFE` (blue-200), `border-radius: 9999px`, `padding: 2px 10px`, with an `x` close icon at `12px x 12px` on the right.

**Issue 7.5: The "Create Content" primary button and "Save as Draft" secondary button are visually competing — both have similar visual weight in the footer.**
Looking at the footer row: "Cancel" is text-only, "Save as Draft" is an outlined button with a save icon, and "Create Content" is the filled primary button. In screenshots, the weight difference between "Save as Draft" and "Create Content" is not dramatic enough.
- **Severity:** Medium
- **Fix specification:** "Save as Draft": `variant="outline"`, `size="default"`, border `1px solid #D1D5DB`, text `#374151`, no icon (or a very subtle `Save` icon at 14px). "Create Content": `variant="default"`, `size="default"`, `background: #025EC4`, text `white`, with the sparkles AI icon at `16px x 16px` on the left. The visual weight gap should be the difference between an outlined control and a filled one. Apply `gap: 8px` between the buttons in the footer, and `justify-content: flex-end` to push them right.

---

### 8. Artifact Editor — Draft State (Screenshot 12)

**Score: 5 / 10**

**What works:**
- The content type badge "Blog" next to the title inline in the editor is a clean, low-profile way to indicate type.
- The Tags input row is inline and accessible.
- The rich text toolbar with familiar formatting controls (H1, H2, Bold, Italic, Code, List, Blockquote, Link) is immediately recognizable.
- The Tone selector is accessible directly in the toolbar area, which is a sensible placement.

**Issues found:**

**Issue 8.1: The "Create Content" CTA button in the top-right header appears to be the primary action for triggering AI generation, but its visual treatment (bright blue filled button) makes it look like a generic save/submit button rather than an AI-specific action.**
The AI generation trigger is the most important action on this screen, but it looks like any other form submit button.
- **Severity:** High
- **Fix specification:** Add the `Sparkles` icon from Lucide React (16px, white) to the left of the "Create Content" text on this button. Add a subtle glow effect in light mode: `box-shadow: 0 0 0 3px rgba(2, 94, 196, 0.15)`. Change button label to "Generate with AI" to make the mechanism explicit. Apply `font-weight: 600` to the button text. This differentiates the AI trigger from a generic form submit and builds user confidence that clicking it will do something intelligent.

**Issue 8.2: The "Research" accordion section at the top has no explanation of what it contains or why it is collapsed.**
A user who created this artifact without understanding the pipeline would not know what "Research" refers to. The collapsed accordion gives no preview.
- **Severity:** Medium
- **Fix specification:** Add a subtitle to the Research accordion header: next to the "Research" label, add `text-xs text-muted-foreground ml-2` with the text "AI-gathered context for your content". This appears even when the accordion is collapsed. When empty (pre-generation), show a muted text inside: "Research will appear here after generation begins."

**Issue 8.3: The rich text editor renders only the user's one-sentence content description with massive empty white space below — it looks like an empty broken form.**
The editor canvas has the content description from the creation dialog ("Exploring the critical role of product strategy...") as the only content, with the full lower half of the screen empty and white. This is the correct state (pre-generation) but visually alarming.
- **Severity:** Medium
- **Fix specification:** Add a subtle guided placeholder inside the editor canvas below the existing content. Placeholder text (non-editable, lighter color): "Your full content will appear here after AI generation. You can also write directly." Style: `color: #9CA3AF` (gray-400), `font-size: 0.875rem`, `font-style: italic`, `margin-top: 24px`. This frames the white space as intentional and tells the user what to expect next.

---

### 9. AI Content Creation Pipeline — Research Phase (Screenshots 13, 14)

**Score: 7 / 10**

**What works:**
- The left panel transitions naturally from "AI Assistant" to "AI Assistant" + live generation chat — seamless.
- The agent copy is friendly and specific: "I'm starting the research phase." "Gathering context from multiple sources about [topic]..." — this is warm, not robotic.
- "Research complete." with a green checkmark emoji (screenshot 14) is an effective low-effort delight moment.
- "Found 12 relevant sources." is a satisfying, specific progress indicator.
- "Moving to content structure..." keeps the narrative momentum.

**Issues found:**

**Issue 9.1: The blue user message bubble ("Create content: 'Why Product Strategy Matters for Fractional Leaders'") uses the same heavy blue as the primary brand color, making it visually very dominant — it reads as more important than the AI responses below it.**
The user's initial instruction message should be de-emphasized after the conversation has begun, since it is historical context, not the current action.
- **Severity:** Low
- **Fix specification:** Add slight opacity reduction to the user message bubble after the AI has started responding: `opacity: 0.85`. Additionally, set a `max-height` on the user message bubble (`max-height: 80px`) with `overflow: hidden` and a "show more" link if text overflows. The user message background can remain brand blue, but add `font-size: 0.875rem` (14px) to match the AI response text size, reducing its comparative visual weight.

**Issue 9.2: During the research phase, the right panel shows the collapsed accordion sections (Research, Foundations) and the editor with "Content is being generated..." text — but the lock icon next to this text is visually tiny and the message is lost in the large white space.**
The right panel during generation is dead space — the user's attention is entirely in the left panel, but the right panel gives no sense of progress or liveness.
- **Severity:** High
- **Fix specification:**
  - In the right panel editor area, replace the static "Content is being generated..." text with an animated skeleton that represents the expected document structure. Show 2–3 shimmer skeleton blocks of different widths (representing heading, paragraph, paragraph) with the shimmer animation. This communicates that content is being assembled.
  - Add a visible "Working on it..." banner or inline status chip at the top of the editor area: `background: #EFF6FF` (blue-50), `border: 1px solid #BFDBFE` (blue-200), `color: #1D4ED8` (blue-700), `padding: 8px 16px`, `border-radius: 6px`, `font-size: 0.875rem`. Text: "AI is researching your topic..." with a pulsing dot indicator `width: 6px, height: 6px, border-radius: 50%, background: #025EC4, animation: pulse 1.2s ease-in-out infinite`.

---

### 10. Foundations Phase — Loading and Approval (Screenshots 15, 16, 17, 18, 19)

**Score: 6 / 10**

**What works:**
- When the Foundations accordion expands and shows actual written content (screenshots 18, 19), the experience is genuinely satisfying — the user can see intelligent AI-generated structure, the Hook, Execution Trap, and Closing sections.
- The "Foundations Approved — Start Writing" button at the bottom (screenshot 17) is a strong, clear approval CTA.
- The left panel continues narrating progress clearly.

**Issues found:**

**Issue 10.1: The skeleton/loading state of the Foundations section (screenshot 16) is identical to the Profile onboarding skeleton — no visual distinction between "profile loading" and "content structure loading."**
These are very different contexts, yet the skeletons look identical. The Foundations skeleton should look like an outline/document skeleton, not a form skeleton.
- **Severity:** Medium
- **Fix specification:** The Foundations skeleton should use a document-shaped layout: a wider first skeleton block (simulating a heading, `height: 20px, width: 60%`), followed by three blocks of text-width skeletons (`height: 14px`) at varying widths (95%, 88%, 70%), then a gap, then another heading-like block, then more lines. Gap between "sections": `margin-bottom: 24px`. The blocks at line-level height give the visual expectation of an article draft, not a form.

**Issue 10.2: Screenshots 15–16 show the same content regardless of which "phase" is rendering — the left panel shows the same messages but the right panel does not update its Research accordion to show data even though Research is complete.**
After Research completes in the left panel ("Research complete. Found 12 relevant sources."), the Research accordion in the right panel remains collapsed with no indicator that it now contains data. The user has no way to explore what was researched.
- **Severity:** High
- **Fix specification:** When the Research phase completes, the Research accordion header should visually update to indicate data is available: add a green dot indicator (8px, `background: #10B981`, `border-radius: 50%`) to the right of the "Research" label, and add a count badge showing "12 sources" in `background: #D1FAE5, color: #065F46, font-size: 0.625rem (10px), padding: 2px 8px, border-radius: 9999px`. Additionally, auto-expand the Research accordion briefly (1 second) and then re-collapse, drawing attention to the new data. This micro-behavior is a delight moment that communicates intelligence.

**Issue 10.3: The "Foundations Approved — Start Writing" button (screenshot 17) appears at the very bottom of a long scroll — the user may not discover it.**
If the Foundations content is long (which it is — it includes Hook, full body sections, and Closing), the approval button is below the fold.
- **Severity:** High
- **Fix specification:** The "Foundations Approved — Start Writing" button should be rendered in a sticky footer bar that stays visible at the bottom of the right panel regardless of scroll position. Implementation: `position: sticky; bottom: 0; padding: 16px 24px; background: hsl(var(--background)); border-top: 1px solid #F3F4F6; z-index: 10`. The button inside: `variant="default", size="lg"`, full-width or centered with max-width 320px, `background: #025EC4, color: white, font-weight: 600`. Alongside the button, add a small Foundations approval badge so the user understands what they are approving: "Approve structure and proceed to writing."

---

### 11. Writing Phase (Screenshots 20, 21, 22)

**Score: 6.5 / 10**

**What works:**
- The shimmer/skeleton that appears in the editor as writing begins (screenshot 21) is very well done — it mimics the shape of a document with varied-width skeleton lines, which is semantically correct for "writing in progress."
- As sections appear progressively (screenshot 22), the content populates in a readable sequence.
- The left panel continues narrating with specific progress markers ("Writing content...").

**Issues found:**

**Issue 11.1: The header bar during writing loses all primary CTA — no button is visible in the top right during the writing phase (screenshots 20, 21, 22).**
Looking at the top-right of the editor during the writing phase: no action button is visible. The user is stuck watching the generation with no way to interact or interrupt. This is a passive experience with no exit.
- **Severity:** High
- **Fix specification:** During AI generation, show a disabled "Cancel Generation" ghost button in the top-right header: `variant="outline", size="sm", text="Cancel", icon: XCircle at 14px`. The button should be interactive (if cancellation is supported) or rendered as a tooltip-bearing disabled state explaining "Generation in progress — please wait." Additionally, show a loading spinner animation inside the header to make the header itself feel alive: a small `12px` animated ring spinner to the left of the page title.

**Issue 11.2: The left panel during writing shows "Writing content..." without any section-level progress (e.g., "Writing Hook...", "Writing section 2 of 5...").**
The left panel is the user's primary window into what the AI is doing. During writing, it provides one generic message rather than specific section-by-section progress.
- **Severity:** Medium
- **Fix specification:** As each section of the document is written, append a new message to the left panel conversation: "Writing Hook...", "Writing main sections...", "Adding conclusion...". Each message appears as a new bubble with the same text treatment as existing agent messages (`font-size: 0.875rem, color: #374151`). These updates create a sense of narrative progress and reinforce trust that the AI is doing something intelligent.

---

### 12. Image Generation Phase (Screenshot 23)

**Score: 6 / 10**

**What works:**
- The image generation phase continues in the left panel with appropriate messaging.
- The right panel now shows more content being filled in — the user can see the post is taking shape.

**Issues found:**

**Issue 12.1: There is no visual indication in the right panel that images are specifically being generated — the editor looks the same as during the writing phase.**
Image generation is a distinct phase, but the right panel does not reflect this. There are no placeholder image slots showing where images will appear.
- **Severity:** Medium
- **Fix specification:** During image generation, show image placeholder slots in the editor at the positions where images will be inserted. Each placeholder: `aspect-ratio: 16/9, background: linear-gradient(135deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%), background-size: 200% 100%, animation: shimmer 2s infinite, border-radius: 8px`. Inside the placeholder, center an `ImageIcon` from Lucide React at `32px x 32px`, `color: #9CA3AF`, with text below: "Generating image..." in `font-size: 0.75rem, color: #9CA3AF`. This tells the user exactly where the images will land and provides a satisfying before/after when images appear.

---

### 13. Content Ready State (Screenshots 25, 26, 27, 28, 39)

**Score: 7 / 10**

**What works:**
- The header CTA transforms from "Create Content" to two buttons: "Create Social Post" and "Mark as Published" — this is an excellent post-completion action set.
- The "Content Complete!" banner in the left panel (screenshot 27) is a warmly worded completion moment.
- The editor unlocks with actual rich content including AI-generated images embedded in the flow.
- The images generated are contextually relevant and visually high-quality.
- The full-view screenshot (39) shows a well-structured, long-form article with multiple images — this is genuinely impressive output.

**Issues found:**

**Issue 13.1: The "Content Complete!" success moment in the left panel is just a text message — there is no visual celebration of this milestone.**
The most important moment in the entire user journey (content is done!) passes with a chat bubble message. This is a prime delight opportunity that is missed entirely.
- **Severity:** High
- **Fix specification:**
  - When "Content Complete!" triggers, show a brief (1.2 second) confetti-like animation in the left panel area. Implementation: 12–15 colored dots (`width: 6px, height: 6px, border-radius: 50%`) in the brand colors (`#025EC4, #0ECCED, #10B981, #F59E0B`) that animate from the center of the panel outward with `transform: translate(random X, random Y) scale(0)` to `transform: translate(larger X, larger Y) scale(1)` with `opacity: 1 -> 0`, total duration 1000ms, easing `cubic-bezier(0, 0, 0.2, 1)`. This can be implemented as a lightweight pure CSS/Tailwind animation without a library.
  - Alternatively (simpler): change the "AI Assistant" header of the left panel to show a momentary brand-color shimmer/glow: `box-shadow: 0 0 0 2px rgba(2, 94, 196, 0.5)` that fades out over 2 seconds.
  - The "Content Complete!" bubble itself should use a different background: `background: #D1FAE5` (green-100), `color: #065F46` (green-900), `border: 1px solid #6EE7B7` (green-300) — matching the "ready" status color from the design system.

**Issue 13.2: The header during the ready state shows the title truncated (screenshot 25 shows "Why Product Strategy Matters for Fraction..." with no way to see the full title).**
The page title is cut off with an ellipsis in the narrow header. This is especially problematic for longer titles.
- **Severity:** Medium
- **Fix specification:** The header title should use `max-width: calc(100% - 400px)` (leaving room for the CTA buttons), `overflow: hidden, text-overflow: ellipsis, white-space: nowrap`. On hover of the title, show a tooltip with the full title. Tooltip implementation: shadcn `Tooltip` component, trigger on hover, `delayDuration: 300ms`. Additionally, consider reducing the title font-size in the header from `~18px` to `text-sm (14px) font-weight: 600` so it has more room without truncation.

**Issue 13.3: The "Mark as Published" and "Create Social Post" buttons are positioned together in the top-right corner with insufficient visual differentiation between a committed action (Publish) and a generative action (Create Social Post).**
Publish is a consequential, one-way action. Creating a Social Post is a generative action. They are presented as peers.
- **Severity:** Medium
- **Fix specification:** "Mark as Published": `variant="default", size="sm"`, filled brand blue, with a `Upload` or `CheckCircle` icon at 14px. "Create Social Post": `variant="outline", size="sm"`, bordered, with a `Sparkles` icon at 14px. Add `margin-right: 8px` between them. This hierarchy says: Publish is the primary conclusion; Social Post derivation is a secondary path. Consider also adding a confirmation tooltip that appears on hover of "Mark as Published": "This will mark your content as published and make it available to share."

**Issue 13.4: Markdown formatting leaks into the card preview on the Portfolio page (screenshot 29) — the content preview shows "## Why Product Strategy..." with raw markdown syntax visible to the user.**
Raw `##` heading markers appear in the content preview on the artifact card.
- **Severity:** Critical
- **Fix specification:** The card preview text should be rendered through a markdown-strip function before display. Implementation: a `stripMarkdown(text: string): string` utility function that replaces heading markers (`/^#{1,6}\s/gm` → `''`), bold/italic markers (`/[*_]{1,3}/g` → `''`), links (`/\[([^\]]+)\]\([^\)]+\)/g` → `'$1'`), and other inline markdown. Apply this to the `preview` prop passed to the artifact card component. The truncated preview should then show clean prose text.

---

### 14. Portfolio with Artifact Cards (Screenshots 29, 36, 37)

**Score: 6 / 10**

**What works:**
- The card layout shows content type icon + status badge + title + preview + timestamp — all the right metadata.
- Status badges use distinct colors (green "Content Ready", purple "Interviewing") that differentiate at a glance.
- The grid layout adapts to two columns when there are multiple cards (screenshot 36).

**Issues found:**

**Issue 14.1: The artifact cards have no hover state visible in the screenshots — they appear completely static with no interactive affordance.**
Cards are the primary navigation element (clicking opens the artifact). Without a hover state, users may not know they are clickable.
- **Severity:** High
- **Fix specification:** Apply the design system's `card-interactive` class to all artifact cards. This produces on hover: `transform: translateY(-2px)`, `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)` (light mode), `transition: all 200ms ease`. Additionally, add a subtle `border-color` change on hover: from `border-border` to `border-primary/30`. The cursor should be `cursor: pointer`. These changes make the cards unmistakably interactive.

**Issue 14.2: The kebab menu (three-dot) appears only in the top-right corner of the card on screenshot 37, but its trigger affordance is not visible at rest — the user must hover to discover it.**
The kebab menu is a hidden affordance. For professional users who value efficiency, the action menu should be consistently discoverable.
- **Severity:** Medium
- **Fix specification:** Show the kebab button at reduced opacity at rest (`opacity: 0.4`), and full opacity on card hover (`group-hover:opacity-100`). This way it is always technically visible (not completely hidden) but becomes prominent on hover. Add `aria-label="Artifact options"` to the button for accessibility. The menu itself should include at minimum: "Open", "Duplicate", "Download", "Delete" — with "Delete" separated by a divider and styled in destructive red.

**Issue 14.3: The "Interviewing" status badge (screenshot 36) uses a purple color that is not defined in the design system's status color table.**
The design system specifies: draft=slate, in-progress=amber, ready=cyan, published=emerald, archived=dark-slate. "Interviewing" maps to a state within the case study flow but uses purple, which is not part of the defined palette.
- **Severity:** Medium
- **Fix specification:** Map "Interviewing" to the amber `in-progress` status color: `background: #FEF3C7` (amber-100), `color: #92400E` (amber-800), `border: 1px solid #FDE68A` (amber-200). The text "Interviewing" should remain. This brings the status within the defined palette and correctly signals "action required / in progress." If the design system is to be updated to formally include "Interviewing" as a status, add: hex `#7C3AED` (purple-700) for the badge, but this requires a design system update.

---

### 15. Portfolio AI Assistant Panel (Screenshot 38)

**Score: 7 / 10**

**What works:**
- The panel is well-structured and consistently placed.
- The prompt chips are still visible and functional with artifacts present.
- The panel width is proportional — approximately 33% of the viewport.

**Issues found:**

**Issue 15.1: The AI Assistant panel has no way to be collapsed or hidden on the portfolio page — it permanently occupies one-third of the screen width, reducing the content grid area.**
Professional users who have established habits will want to maximize the content grid area when managing a large portfolio.
- **Severity:** Medium
- **Fix specification:** Add a collapse toggle to the right edge of the left panel. Implementation: a `ChevronLeft` icon button at `20px x 20px`, positioned `absolute right: -10px, top: 50%` of the panel, `background: white`, `border: 1px solid #E5E7EB`, `border-radius: 50%`. On click, the panel collapses to `width: 0` with `overflow: hidden` and `transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1)`. A collapsed state should show a `ChevronRight` icon on the left edge of the content area to re-expand. Store collapse state in localStorage so it persists across page reloads.

---

### 16. Case Study Interview Flow (Screenshots 32, 33, 34, 35)

**Score: 8 / 10**

**What works:**
- The interview flow is genuinely excellent UX. The AI explains why it needs to conduct an interview ("Since this is a showcase artifact, I need to conduct an interview first to gather the specific details..."), which respects the user's intelligence.
- Follow-up questions are specific and contextual ("What exactly was preventing them from scaling beyond $1M ARR?") — this feels like a real conversation, not a form.
- The user's typed answer (screenshot 34) renders in a clear blue bubble, while the AI responses are on the left with a subtle background — standard messaging convention correctly applied.
- The text area auto-expands with user input (screenshot 34) — very good behavior.
- The conversation format respects that case studies require rich, contextual input — this is a brilliant UX decision for this content type.

**Issues found:**

**Issue 16.1: The right panel during the interview phase shows "Content is being generated..." even though no content is being generated — the interview is still in progress.**
The right panel status message is incorrect for the interview state. Content generation has not started.
- **Severity:** Medium
- **Fix specification:** During the interview phase, the right panel lock message should read: "Your interview answers will shape this case study." Style: `color: #6B7280` (gray-500), `font-size: 0.875rem`, centered. Below it, show a subtle illustration or icon: a microphone or conversation bubbles icon from Lucide React at `48px x 48px`, `color: #D1D5DB` (gray-300). This correctly frames the interview as a data-gathering phase, not a generation phase.

**Issue 16.2: There is no progress indicator during the interview — the user does not know how many questions remain.**
The interview could be 3 questions or 10. Without knowing, users may feel anxious or lose motivation to continue.
- **Severity:** Medium
- **Fix specification:** Add a progress indicator in the right panel during the interview. Format: "Question 2 of approximately 4" in `font-size: 0.75rem, color: #9CA3AF` at the top of the right panel, below the title. Update this as questions progress. If the question count is dynamic, show "Question 2" without the total. This small addition significantly reduces uncertainty and improves completion rates.

**Issue 16.3: The send button for the interview text area (screenshot 34) is a filled blue circle with an arrow — consistent with the chat pattern, but the button appears to be the same Send button used in the general AI chat. There is no "Submit Answer" label to distinguish it as a more formal interview submission.**
The send button semantics matter during an interview — this is not casual chat. The button should feel like a purposeful submission.
- **Severity:** Low
- **Fix specification:** When a user is in interview mode (detected by conversation state), add a small label below the text area: "Press Enter to submit your answer, Shift+Enter for a new line." This is already shown in other screens but should be more prominent during interview mode. Additionally, show a tooltip on the Send button during interview mode: "Submit answer and receive next question." Tooltip trigger: hover, `delayDuration: 500ms`.

---

### 17. Mobile Views (Screenshots 40, 41)

**Score: 3 / 10**

**What works:**
- Screenshot 41 shows the AI Assistant panel in a mobile-appropriate sheet with a close button (X) visible in the top-right — this is the correct mobile pattern.
- The AI panel content (icon, title, prompt chips, input) translates reasonably to the narrow mobile viewport.

**Issues found:**

**Issue 17.1: The mobile artifact editor (screenshot 40) is completely unusable — the text is at approximately 10px and the entire long-form article is rendered in a tiny scrollable column with no toolbar access.**
The mobile editor shows the full desktop artifact editor compressed into a phone viewport. The toolbar buttons are at approximately 12px, the article text is unreadable at 10–11px, and the generated images are squeezed to thumbnail size. This is a critical mobile failure.
- **Severity:** Critical
- **Fix specification:**
  - Implement a dedicated mobile view for the artifact editor. On mobile (`max-width: 768px`), the editor should show:
    - A simplified mobile toolbar with only essential formatting: Bold, Italic, Heading, Link — in a single row, `height: 44px` (minimum touch target), icons at `20px x 20px`, spaced `16px` apart.
    - Font size: `text-base` (16px) for body text — never below 16px on mobile to prevent iOS auto-zoom on focus.
    - Images: `width: 100%` with `aspect-ratio: auto` and `border-radius: 8px` — responsive full-width images.
    - The header should show: back arrow (← left), truncated title (max 200px), and a "..." menu button (right). The CTA buttons ("Mark as Published" etc.) move into the "..." overflow menu.
  - The chat panel should be completely hidden on mobile during editor view, accessible via a floating button: `position: fixed, bottom: 80px, right: 16px, width: 48px, height: 48px, border-radius: 50%, background: #025EC4, box-shadow: 0 4px 12px rgba(2, 94, 196, 0.4)` with a chat icon at `20px x 20px` in white. Tapping it opens the AI panel as a bottom sheet with `height: 70vh, border-radius: 16px 16px 0 0`.

**Issue 17.2: The mobile portfolio page is completely inaccessible — only the AI Assistant panel is visible, with no way to see or access the portfolio content grid.**
Screenshot 41 shows the mobile view of the portfolio as being entirely the AI chat panel. The content grid (the actual portfolio) is not visible and there is no navigation to reach it.
- **Severity:** Critical
- **Fix specification:**
  - Implement a bottom tab bar for mobile navigation within the Portfolio section. Two tabs: "Portfolio" (grid icon) and "Assistant" (sparkles icon). Default tab: "Portfolio" (showing the content grid). The tabs sit at the bottom of the screen at `height: 56px`, with `background: white`, `border-top: 1px solid #E5E7EB`.
  - The Portfolio tab shows the content grid at full mobile width with single-column card layout, `padding: 16px`, `gap: 12px` between cards.
  - The "+ New" button becomes a FAB (floating action button): `position: fixed, bottom: 72px, right: 16px, width: 56px, height: 56px, border-radius: 50%, background: #025EC4, color: white`, with a `+` icon at `24px`. This is the standard mobile content creation pattern.
  - The Assistant tab shows the current chat panel content.

---

## Cross-Cutting Issues

**CC-1: Sidebar navigation lacks tooltips for icon-only collapsed state.**
The left sidebar shows icons only when collapsed. Hovering should reveal a tooltip with the section name, but no tooltip system is visible in any screenshot. Requires adding Tailwind `Tooltip` from shadcn on each nav item with `content={sectionName}` and `side="right"`, `delayDuration: 400ms`.

**CC-2: No global empty focus-state ring visible in any screenshot.**
None of the screenshots show a focus ring on any interactive element. Either focus states are not implemented or they are visually insufficient. Every interactive element must have a clearly visible focus ring for keyboard navigation: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.

**CC-3: The "Content is being generated..." lock state appears in at least three different screens with no progress specificity.**
The same locked-editor message appears during Research, Foundations loading, Writing, and Image generation — all using the same "Content is being generated..." text with a lock icon. Each phase should have its own contextually accurate locked state message (see individual screen fixes above).

**CC-4: Typography weight variation across the app is insufficient — most text renders at the same visual weight.**
Looking across screenshots, page titles, section headings, body text, and muted labels all appear to be approximately the same weight (regular/normal). The design system defines `font-weight: 600` for headings and `font-weight: 500` for labels. Apply `font-weight: 600` to: page titles (Portfolio, artifact title), dialog titles, accordion section headers. Apply `font-weight: 500` to: form labels, nav item text, tab labels. Apply `font-weight: 400` to: body text, preview text, timestamps.

**CC-5: The AI message bubbles in the generation flow use plain white backgrounds — they are not visually differentiated from the page background.**
The AI response messages ("I'm starting the research phase.") sit on a white/off-white background that is nearly identical to the panel background. They lack the subtle differentiation that would make the conversation scannable.
- **Fix specification:** AI agent messages: `background: #F8FAFC` (slate-50), `border: 1px solid #E2E8F0` (slate-200), `border-radius: 12px 12px 12px 2px` (bottom-left is flat — directional bubble), `padding: 12px 16px`. User messages: `background: #025EC4` (brand-500), `color: white`, `border-radius: 12px 12px 2px 12px` (bottom-right is flat), `padding: 12px 16px`.

---

## Delight Opportunities

**DO-1: Foundations approval celebration.**
When the user clicks "Foundations Approved — Start Writing", briefly animate the Foundations accordion header: cycle it from neutral → green (`background: #D1FAE5, color: #065F46`) over 400ms, hold for 600ms, then transition to a "completed" visual state with a checkmark icon. Duration total: 1000ms. Copy in the left panel: "Foundations locked in. Time to write."

**DO-2: Typing indicator in the interview flow.**
When the AI is composing its next interview question, show the typing indicator (three pulsing dots) in the left panel before the message appears. Implementation: three `6px` circles in `color: #D1D5DB` with staggered `animation: bounce 1s ease infinite` at delays 0ms, 150ms, 300ms. This is the standard chat typing indicator and immediately signals "the AI is thinking."

**DO-3: Artifact card hover reveals a quick-open preview.**
On hovering an artifact card for more than 600ms, show a small floating preview card (200px wide, `max-height: 300px`) positioned to the right of the hovered card (or above if near the right edge). The preview shows the first 200 characters of content, rendered as clean text (no markdown). On mobile, suppress this behavior. This is a classic efficiency delight for power users.

**DO-4: Progress ring in Research accordion header.**
While research is running, show a subtle progress ring animation in the Research accordion header — a `16px x 16px` circular ring that fills from 0% to 100% (estimated or real) as the research phase runs. When research completes, the ring fills fully and transitions to a static filled green circle. This gives the right panel its own sense of activity during generation.

**DO-5: "Your content is ready" toast notification.**
When generation completes, show a toast notification from the bottom-right: `background: white, border-left: 4px solid #10B981 (emerald), padding: 16px, border-radius: 8px, box-shadow: 0 10px 25px rgba(0,0,0,0.12)`. Title: "Content ready!" in `font-weight: 600, font-size: 0.875rem`. Body: "Your blog post is ready to review and publish." Dismiss after 5 seconds or on click. This is especially important so users who navigate away during generation can be alerted.

---

## Accessibility Audit

| Issue | WCAG Criterion | Severity |
|---|---|---|
| Login page left panel: feature text on blue background (~2.5:1 contrast) | 1.4.3 Contrast (AA) | Critical |
| Muted text (timestamps, captions) at `text-muted-foreground` — likely below 4.5:1 in light mode | 1.4.3 Contrast (AA) | High |
| "Interviewing" purple badge on white card background — purple at low saturation may fail | 1.4.3 Contrast (AA) | Medium |
| No visible focus states shown in any screenshot — keyboard navigation likely impaired | 2.4.7 Focus Visible | Critical |
| Kebab menu button has no visible label — icon-only without sr-only text | 1.1.1 Non-text content | High |
| Native browser spinner used in onboarding — not accessible to screen readers | 4.1.3 Status Messages | Medium |
| "Content is being generated..." locked state — no ARIA live region announcement when state changes | 4.1.3 Status Messages | Medium |
| Mobile editor text below 16px renders at ~10–11px — violates minimum legible size | 1.4.4 Resize Text | Critical |
| Skip dialog lacks focus trap — focus may escape the modal when Tab is pressed | 2.1.1 Keyboard | High |
| Type dropdown icons in Create dialog have no alt text or aria-label | 1.1.1 Non-text content | Medium |

---

## Mobile-Specific Issues

| Issue | Screen | Severity |
|---|---|---|
| Portfolio content grid is completely inaccessible — only AI panel shown | Portfolio (mobile) | Critical |
| Artifact editor text is ~10–11px, well below minimum readable size | Artifact editor (mobile) | Critical |
| Toolbar formatting buttons are below 44px touch target minimum | Artifact editor (mobile) | High |
| Images in mobile editor are squeezed, not responsive | Artifact editor (mobile) | High |
| No floating "New" FAB button for mobile content creation | Portfolio (mobile) | High |
| The close button on mobile AI panel (X) is the only navigation control — no bottom tabs | Mobile (all) | High |
| Header title is not truncated properly on mobile — runs off screen | Artifact editor (mobile) | Medium |

---

## Priority-Ordered Improvements List

---

**1. Fix mobile portfolio: implement tab-based layout (Portfolio / Assistant tabs) with full-width content grid**
- **Impact:** Critical — the core product is completely inaccessible on mobile for the portfolio view
- **Specification:** Add bottom tab bar (`height: 56px, background: white, border-top: 1px solid #E5E7EB`) with two tabs using Lucide icons: `LayoutGrid` for Portfolio, `Sparkles` for Assistant. Portfolio tab is default. Content grid: `padding: 16px, gap: 12px, single column`. FAB for New: `position: fixed, bottom: 72px, right: 16px, width: 56px, height: 56px, border-radius: 50%, background: #025EC4`.

---

**2. Fix mobile artifact editor: implement mobile-specific editor layout**
- **Impact:** Critical — the editor is unusable on mobile
- **Specification:** On `max-width: 768px`: body `font-size: 16px` minimum, simplified 4-button toolbar (`height: 44px`), images at `width: 100%`, CTA buttons moved to overflow menu, AI chat as FAB-triggered bottom sheet (`height: 70vh, border-radius: 16px 16px 0 0`).

---

**3. Fix login page left panel text contrast to WCAG AA minimum**
- **Impact:** Critical — accessibility compliance
- **Specification:** Feature list text: `color: rgba(255,255,255,0.90)`. Check icons: `color: rgba(255,255,255,0.80)`. "NextUp" wordmark and tagline: `color: white`. Verify contrast ratio ≥ 4.5:1 against the blue panel background.

---

**4. Fix post-login redirect blank loading screen: add a welcome interstitial**
- **Impact:** Critical — first impression failure
- **Specification:** Show centered interstitial: NextUp logo at `48px`, heading "Setting up your workspace..." at `24px, font-weight: 600`, animated progress bar (thin, full-width, brand blue `#025EC4`, `height: 3px, border-radius: 9999px`). Duration: 1.5–2s, then `opacity: 0` fade to onboarding step 1 over `300ms`.

---

**5. Strip markdown from artifact card previews**
- **Impact:** Critical — broken content display visible to all users
- **Specification:** Add `stripMarkdown(text: string): string` utility. Patterns: `/^#{1,6}\s/gm` → `''`, `/[*_]{1,3}/g` → `''`, `/\[([^\]]+)\]\([^\)]+\)/g` → `'$1'`. Apply to `preview` prop in artifact card component.

---

**6. Add a sticky approval CTA bar at the bottom of the Foundations panel**
- **Impact:** High — users cannot discover the approval button without scrolling
- **Specification:** `position: sticky, bottom: 0, padding: 16px 24px, background: hsl(var(--background)), border-top: 1px solid #F3F4F6, z-index: 10`. Button: `variant="default", size="lg", width: 100%, background: #025EC4, color: white, font-weight: 600`. Label: "Approve structure and start writing."

---

**7. Add hover state and interactive affordances to artifact cards**
- **Impact:** High — cards appear non-interactive
- **Specification:** On hover: `transform: translateY(-2px), box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), border-color: rgba(2,94,196,0.30)`. Transition: `all 200ms ease`. `cursor: pointer`. Kebab button: `opacity: 0.4` at rest, `opacity: 1` on card hover.

---

**8. Fix the empty state icon from document-X to a positive creation metaphor**
- **Impact:** High — wrong emotional signal on first-time experience
- **Specification:** Replace with `Sparkles` or `PenLine` icon at `32px` inside a `64px x 64px` circle, `background: #F3F4F6, border-radius: 50%`. Heading: "Your portfolio is ready." Subtext: "Create your first piece of content and it will appear here."

---

**9. Add phase-specific loading content to the right panel during AI generation**
- **Impact:** High — right panel is dead space during the core AI experience
- **Specification:** Research phase: status chip `background: #EFF6FF, border: 1px solid #BFDBFE, color: #1D4ED8, padding: 8px 16px, border-radius: 6px`. Text: "AI is researching your topic..." + pulsing dot. Writing phase: shimmer skeleton blocks (3 sections, varied widths). Image phase: shimmer image placeholder slots with `ImageIcon` at `32px` and "Generating image..." label.

---

**10. Add "Content Ready" celebration moment**
- **Impact:** High — the highest-value moment in the product passes without ceremony
- **Specification:** "Content Complete!" bubble: `background: #D1FAE5, color: #065F46, border: 1px solid #6EE7B7`. Panel header brief shimmer glow: `box-shadow: 0 0 0 3px rgba(16,185,129,0.3)` fading to none over `2s`. Toast notification: `background: white, border-left: 4px solid #10B981, padding: 16px, border-radius: 8px, shadow: 0 10px 25px rgba(0,0,0,0.12)`. Auto-dismiss: 5s.

---

**11. Implement consistent focus rings on all interactive elements**
- **Impact:** High — WCAG 2.4.7 violation
- **Specification:** Apply to all buttons, inputs, links, and interactive elements: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`. In light mode, ring color `#025EC4`. In dark mode, ring color `#0ECCED`. `ring-offset-color` matches the element's background.

---

**12. Fix button hierarchy in the skip confirmation dialog**
- **Impact:** High — violates design system button variant rules
- **Specification:** "Keep going": `variant="default"`, `background: #025EC4, color: white, border-radius: 6px, padding: 8px 16px`. "Skip for now": `variant="outline"`, `background: transparent, border: 1px solid #D1D5DB, color: #374151`.

---

**13. Add typing indicator to the AI chat during message composition**
- **Impact:** Medium — immediately communicates "AI is thinking"
- **Specification:** Three `6px` circles, `color: #D1D5DB`, in a flex row with `gap: 4px`. Animation: `@keyframes bounce { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }`, `animation-duration: 1s, animation-timing-function: ease, animation-iteration-count: infinite`. Stagger delays: 0ms, 150ms, 300ms.

---

**14. Add inline contextual help tooltip to the Tone selector**
- **Impact:** Medium — reduces confusion for first-time users
- **Specification:** `HelpCircle` icon at `14px x 14px, color: #9CA3AF`, `margin-left: 6px` from label text. Tooltip: `max-width: 240px, padding: 8px 12px, background: #1F2937, color: white, border-radius: 6px, font-size: 0.75rem`. Content: "Sets the writing style. Professional = polished and formal, Conversational = warm and direct."

---

**15. Add Research accordion update notification when research completes**
- **Impact:** Medium — connects left panel progress to right panel state
- **Specification:** On research completion: add green dot indicator (`8px, background: #10B981, border-radius: 50%`) to Research accordion header. Add count badge: `"12 sources", background: #D1FAE5, color: #065F46, font-size: 10px, padding: 2px 8px, border-radius: 9999px`. Auto-expand accordion for 1 second then collapse.

---

**16. Replace browser-native spinner with branded custom spinner throughout**
- **Impact:** Medium — polish and consistency
- **Specification:** SVG circle, `16px x 16px`, `stroke: #025EC4 (light mode) / #0ECCED (dark mode)`, `stroke-width: 2`, `stroke-dasharray: 40`, animated full rotation: `@keyframes spin { to { transform: rotate(360deg) } }`, `animation: spin 800ms linear infinite`. Use everywhere a loading spinner is shown (onboarding, generation phases, send button).

---

**17. Add progress indicator to the case study interview flow**
- **Impact:** Medium — reduces user anxiety about interview length
- **Specification:** In the right panel during interview, at the top: "Question 2 of approximately 4" in `font-size: 0.75rem, color: #9CA3AF`. Update as questions progress.

---

**18. Improve the "Create New Content" dialog visual grouping**
- **Impact:** Medium — reduces form cognitive load
- **Specification:** Divider between configuration (Type, Tone) and content (Title, Content, Tags): `border-bottom: 1px solid #F3F4F6`, `margin: 16px 0`. Field label style: `font-size: 0.875rem, font-weight: 500, color: #374151`. Field spacing: `margin-bottom: 20px` between field groups.

---

**19. Fix the "Cancel" primary action visibility during AI generation**
- **Impact:** Medium — users have no exit during generation
- **Specification:** Show `variant="outline", size="sm"` "Cancel" button in header during generation. If cancel is not supported: disabled state with tooltip "Generation in progress — please wait." Header also shows small `12px` spinner ring next to the page title.

---

**20. Standardize the AI panel header label from "Content Research" to "AI Assistant" consistently**
- **Impact:** Low — branding consistency
- **Specification:** Update the panel header to "AI Assistant" everywhere. Style: `font-size: 0.875rem, font-weight: 600, color: #111827`. Icon: `Sparkles` at `16px x 16px, color: #025EC4` to the left of the label.
