# NextUp UX/UI Design Guide

**"Midnight Architect" Design System — Complete Reference for Designers and Developers**

Version: 1.0
Last updated: March 2026
Applies to: `frontend/` — React 19 + Tailwind CSS 3 + shadcn/ui

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing and Layout](#4-spacing-and-layout)
5. [Surface and Elevation](#5-surface-and-elevation)
6. [Component Patterns](#6-component-patterns)
7. [States and Interactions](#7-states-and-interactions)
8. [Animation and Motion](#8-animation-and-motion)
9. [Dark Mode](#9-dark-mode)
10. [Iconography](#10-iconography)
11. [Accessibility](#11-accessibility)
12. [Anti-Patterns](#12-anti-patterns)
13. [Decision Framework](#13-decision-framework)

---

## 1. Design Philosophy

### The "Midnight Architect" Concept

NextUp serves independent consultants, fractional executives, and advisors — professionals who are typically aged 35-55, time-constrained, and value efficiency and professionalism above novelty. They are building a personal brand and need a tool that feels like having a highly capable, discreet assistant.

The design system reflects this context through three deliberate choices:

**Deep blue foundations.** The background palette (`#030812` in dark mode, a near-black midnight blue) communicates focused, nighttime work. It is the color of a professional's late-night session before a big client meeting. It is calm, serious, and concentrated — the opposite of a startup's bright-white dashboard that screams activity.

**Luminous cyan accent.** The single brand accent (`#0ECCED`, `brand-300`) reads as electric intelligence. It is used exclusively on primary actions, active navigation states, AI-related indicators, and focus rings. When cyan appears, the user understands: this is the thing that matters most right now. Unmotivated cyan is noise; motivated cyan is signal.

**Plus Jakarta Sans as the bridge typeface.** This geometric sans-serif is precise and modern (it aligns with the tech context) but warmer than Inter or Roboto. The slight humanist warmth in its letterforms prevents the interface from reading as cold or clinical. For a solo professional who is the face of their brand, the interface should feel like a professional collaborator, not a corporate tool.

### Core Design Principles

**Clarity over cleverness.** Every interface element must earn its place. If a user has to think about what something does, the design has failed. Familiar patterns — cards, sidebars, status badges — are used intentionally because they reduce cognitive load.

**Depth over flatness.** The design achieves visual hierarchy through layered surfaces, not through heavy drop shadows or harsh borders. Each surface level is defined by a subtle background shift. Borders are low-opacity translucent blends that read as structure without visual weight.

**Content first, tools on demand.** The primary reading experience — the artifact editor, the content grid — occupies center stage. Navigation collapses to icons. Chat panels open on demand. Toolbars appear contextually. The professional's work is never obscured by the tool.

**Gray builds structure, color communicates.** The vast majority of the interface uses neutral grays and muted tones. Color (specifically cyan) is reserved for moments of meaning: the primary action, the active route, the AI thinking indicator, the focus ring.

**Every choice must be a choice.** When making a design decision, there must be an explicit reason rooted in user needs or product context. If you cannot articulate why you chose a spacing value, color, or component variant, reconsider the choice.

---

## 2. Color System

### Overview

The color system uses CSS custom properties (HSL format without the `hsl()` wrapper) that Tailwind consumes as `hsl(var(--token))`. This enables opacity modifiers: `bg-primary/20` works correctly.

Colors are defined in `frontend/src/index.css` and mapped to Tailwind tokens in `frontend/tailwind.config.ts`. The active color palette is controlled by `VITE_COLOR_PALETTE` in `frontend/.env.local`.

### Semantic Tokens

Semantic tokens describe the role of a color, not its visual value. Always use semantic tokens in component code, not raw brand scale values. This ensures both light and dark themes work correctly.

#### Foundations

| Token | Light Value (HSL) | Dark Value (HSL) | Usage |
|---|---|---|---|
| `--background` | `210 20% 98%` | `220 60% 3%` | Page background, canvas |
| `--foreground` | `222 47% 11%` | `210 20% 95%` | Primary body text |
| `--card` | `0 0% 100%` | `215 52% 10%` | Cards, panels |
| `--card-foreground` | `222 47% 11%` | `210 20% 95%` | Text on cards |
| `--popover` | `0 0% 100%` | `215 47% 15%` | Modals, dropdowns, tooltips |
| `--popover-foreground` | `222 47% 11%` | `210 20% 95%` | Text in popover layers |

**Usage rule:** Use `bg-background` for the outermost layer. Use `bg-card` for contained content panels. Use `bg-popover` for floating elements (dialogs, dropdowns). Never mix layers arbitrarily — each elevation step should use its corresponding token.

#### Brand / Primary

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--primary` | `214 83% 39%` (deep blue) | `187 89% 49%` (bright cyan `#0ECCED`) | Primary buttons, active states, focus ring |
| `--primary-foreground` | `210 20% 98%` | `220 60% 3%` | Text on primary-colored backgrounds |
| `--ring` | Same as `--primary` | Same as `--primary` | Focus outlines |

**Critical note:** In light mode, `--primary` is a deep blue (`#025EC4`). In dark mode, it becomes bright cyan (`#0ECCED`). This is intentional. The cyan in dark mode has sufficient contrast against deep blue surfaces and creates the luminous quality central to the brand. In light mode, cyan would wash out against light backgrounds, so deep blue is used instead.

#### Supporting Roles

| Token | Usage |
|---|---|
| `--secondary` | Secondary buttons, subtle backgrounds that need a hint of brand color |
| `--muted` | Background of muted regions (code blocks, inactive areas) |
| `--muted-foreground` | Secondary text, placeholders, timestamps, metadata |
| `--accent` | Hover backgrounds, selection highlights (same as primary in dark mode) |
| `--destructive` | Errors, delete actions (`340 100% 64%` — a saturated rose-red) |
| `--border` | General-purpose borders |
| `--input` | Input field borders and backgrounds (same as `--border`) |

```tsx
// Correct usage of semantic tokens in Tailwind classes
<div className="bg-card border border-border text-card-foreground">
  <p className="text-muted-foreground">Secondary text</p>
  <Button className="bg-primary text-primary-foreground">Action</Button>
</div>
```

### Surface Tokens

Surface tokens provide an elevation system for interactive states. They are defined separately from `--card` because they change on hover and selection, whereas `--card` is a static surface.

| Token | Light Value (HSL) | Dark Value (HSL) | Usage |
|---|---|---|---|
| `--surface` | `0 0% 100%` | `215 40% 12%` | Default surface for lists, rows |
| `--surface-hover` | `210 16% 96%` | `215 36% 22%` | Surface on hover |
| `--surface-active` | `210 16% 93%` | `215 36% 28%` | Surface when pressed/active |
| `--surface-selected` | `primary/0.08` | `primary/0.15` | Selected row, active nav item |

```tsx
// Navigation item using surface tokens
<NavLink
  className={({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-lg transition-colors',
      'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
      isActive && 'bg-surface-selected text-foreground border-l-[3px] border-brand-300'
    )
  }
/>
```

### Border Opacity Tokens

These tokens define borders using color with opacity, which produces subtle blends that look correct on both light and dark backgrounds. They are used with Tailwind's arbitrary value syntax.

| Token | Light Value | Dark Value | When to use |
|---|---|---|---|
| `--border-subtle` | foreground at 5% | border color at 10% | Separators in grouped content |
| `--border-default` | foreground at 10% | border color at 20% | Cards, containers (default) |
| `--border-strong` | foreground at 20% | border color at 30% | Important boundaries |
| `--border-accent` | primary at 40% | primary at 50% | Active, selected, focused elements |

```css
/* Usage in custom CSS */
border-color: hsl(var(--border-subtle));
border-color: hsl(var(--border-accent));

/* Usage in Tailwind arbitrary values */
border-[hsl(var(--border-accent))]
```

### Brand Color Scale

The brand scale provides fixed colors for use when you need a specific shade rather than a semantic role. Use these sparingly and only when semantic tokens are insufficient.

| Token | Hex | Description |
|---|---|---|
| `brand-900` | `#020764` | Deep indigo — darkest, decorative only |
| `brand-700` | `#043780` | Dark blue |
| `brand-500` | `#025EC4` | Medium blue — primary in light mode |
| `brand-300` | `#0ECCED` | Bright cyan — THE accent, primary in dark mode |
| `brand-100` | `#7DD3FC` | Light cyan — used for hover states on brand elements |

**Rule:** `brand-300` is the only brand color that should appear on-screen in dark mode. `brand-500` is the only brand color that should appear in light mode. The other values (`brand-700`, `brand-900`) are reserved for gradient backgrounds and decorative elements.

```tsx
// Correct: Cyan accent for active navigation indicator
<span className="border-l-[3px] border-brand-300" />

// Correct: Cyan for AI thinking indicator
<span className="w-2 h-2 rounded-full bg-brand-300 animate-pulse-glow" />

// Wrong: Using brand-300 for a general background in light mode
<div className="bg-brand-300" /> // Will look garish in light mode
```

### Status Colors

Status colors are product-semantic: they map directly to the artifact workflow states. They are used exclusively in status badges, status indicators, and kanban column headers.

| Status | Color | Hex | Usage context |
|---|---|---|---|
| `draft` | Slate gray | `#64748b` | Newly created, not started |
| `in-progress` (AI processing states) | Amber | `#f59e0b` | Requires user attention |
| `ready` | Cyan | `#0ECCED` | Content ready — uses primary accent intentionally |
| `published` | Emerald | `#10b981` | Successfully published |
| `archived` | Dark slate | `#475569` | Archived, de-emphasized |

These colors are defined as fixed hex values in `tailwind.config.ts` (not as CSS custom properties) because they must remain consistent between themes — a published artifact is always emerald, regardless of theme.

```tsx
// In StatusBadge.tsx — how status colors are applied
export const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  // ...
}
```

Note the pattern: all status badges use a tinted background at 10% opacity, text at full color, and a border at 20% opacity. This creates a soft pill that is readable without being harsh.

### Text Gradient

A special gradient is defined for display headings when extra visual impact is needed:

```tsx
// Text gradient: deep blue to cyan
<h1 className="text-gradient">NextUp</h1>
```

```css
/* Defined in index.css */
.text-gradient {
  background-clip: text;
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(135deg, #025EC4 0%, #0ECCED 100%);
}
```

Use sparingly — one instance per screen maximum, reserved for hero headings and onboarding celebration moments.

### Accent Gradient

For backgrounds that need a subtle brand presence:

```css
/* .bg-gradient-accent in index.css */
background: linear-gradient(135deg, #025EC4 0%, #0ECCED 100%);
```

This gradient is used for CTA banners, onboarding progress fills, and icon container backgrounds.

### Color Accessibility

All foreground/background combinations used in the UI must meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text).

Critical pairs:
- `--foreground` on `--background`: Exceeds AAA in both themes
- `--muted-foreground` on `--background`: Meets AA minimum — do not reduce muted text opacity further
- `brand-300` (`#0ECCED`) on dark `--background` (`#030812`): ~6.8:1, passes AA
- White text on `--destructive` (`340 100% 64%`): Meets AA
- `--primary-foreground` on `--primary`: Always calculated to maintain contrast — do not override

---

## 3. Typography

### Font Stack

```css
--font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
--font-body:    'Plus Jakarta Sans', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', monospace;
```

**Plus Jakarta Sans** is loaded from Google Fonts at weights 400, 500, 600, and 700. It is used for all display text, headings, body text, and UI labels. Its geometric construction provides precision; its subtle humanist details provide warmth.

**JetBrains Mono** is used for all code, preformatted text, technical identifiers, and keyboard shortcuts. It is loaded at weights 400, 500, and 600.

### Type Scale

Custom font sizes are defined in `tailwind.config.ts` extending the default Tailwind scale.

| Class | Size | Line Height | Typical Use |
|---|---|---|---|
| `text-display-xl` | `3rem` (48px) | `1.1` | Page hero headings (marketing, landing) |
| `text-display-lg` | `2.25rem` (36px) | `1.15` | Onboarding completion titles |
| `text-display-md` | `1.875rem` (30px) | `1.2` | Section display headings |
| `text-heading-lg` | `1.5rem` (24px) | `1.3` | Page titles, card group headings |
| `text-heading-md` | `1.25rem` (20px) | `1.35` | Section headings, dialog titles |
| `text-heading-sm` | `1.125rem` (18px) | `1.4` | Subsection headings, card titles |
| `text-base` | `1rem` (16px) | `1.5` (Tailwind default) | Body text, descriptions |
| `text-sm` | `0.875rem` (14px) | `1.25` | Secondary text, labels, metadata |
| `text-xs` | `0.75rem` (12px) | `1` | Badges, timestamps, captions |

**Responsive reductions** are applied at `max-width: 640px`:

```css
/* From index.css */
@media (max-width: 640px) {
  :root {
    --text-display-lg: 1.75rem;   /* 36px -> 28px */
    --text-display-md: 1.5rem;    /* 30px -> 24px */
    --text-heading-lg: 1.25rem;   /* 24px -> 20px */
    --text-heading-md: 1.125rem;  /* 20px -> 18px */
  }
}
```

### Typography Hierarchy

Every text element falls into one of four hierarchy levels. Establishing these levels and maintaining them consistently is what makes content readable at a glance.

**Level 1 — Primary:** The main message. Page title, card title, key data point.
```tsx
<h1 className="text-heading-lg font-semibold tracking-tight text-foreground">
  Your Portfolio
</h1>
```

**Level 2 — Secondary:** Supporting context. Subtitles, descriptions, body copy.
```tsx
<p className="text-base text-foreground/80">
  Create and manage your professional content artifacts.
</p>
```

**Level 3 — Tertiary:** Supplementary detail. Metadata, labels, field names.
```tsx
<span className="text-sm text-muted-foreground">
  Last updated 2 hours ago
</span>
```

**Level 4 — Muted:** De-emphasized. Timestamps, empty state descriptions, hints.
```tsx
<span className="text-xs text-muted-foreground/70">
  Requires review
</span>
```

**Do not rely on size alone** to establish hierarchy. Combine size, weight, letter-spacing, and color:

```tsx
// Good: Multi-axis differentiation
<h2 className="text-heading-md font-semibold tracking-tight text-foreground">Section Title</h2>
<p className="text-sm font-normal text-muted-foreground">Section description</p>

// Poor: Only size differs, hierarchy is weak
<h2 className="text-lg text-foreground">Section Title</h2>
<p className="text-sm text-foreground">Section description</p>
```

### Default HTML Heading Styles

Headings (`h1`-`h6`) inherit from the global base styles defined in `index.css`:

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.015em; /* tracking-tight equivalent */
}
```

### Code and Monospace Text

All `code`, `pre`, `kbd`, and `samp` elements inherit JetBrains Mono automatically. For inline code in user content:

```tsx
<code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded text-foreground">
  snippet
</code>
```

### Letter Spacing

Headings use `tracking-tight` (`letter-spacing: -0.025em`) by default. Body text uses the Tailwind default (0). Do not apply positive letter-spacing to body text — it reads as dated and reduces readability.

---

## 4. Spacing and Layout

### The 8px Grid

All spacing in the UI is based on an 8px unit. Tailwind's default spacing scale already follows this convention (`space-1` = 4px, `space-2` = 8px, etc.). Two custom extensions are added:

```ts
// tailwind.config.ts
spacing: {
  '14': '3.5rem',  // 56px — sidebar collapsed width (--sidebar-collapsed)
  '18': '4.5rem',  // 72px — sidebar expanded width (--sidebar-expanded)
}
```

**Common spacing values and their use:**

| Value | px | Use case |
|---|---|---|
| `space-1` | 4px | Micro gaps (icon to text in inline contexts) |
| `space-2` | 8px | Tight internal spacing (badge padding, icon gaps), label-to-input |
| `space-3` | 12px | Standard inline padding, list item gaps |
| `space-4` | 16px | Card internal padding (compact), form field pairs within sections |
| `space-5` | 20px | Medium section gaps |
| `space-6` | 24px | Card internal padding (standard), panel padding |
| `space-8` | 32px | Between major page sections, between form sections |
| `space-10` | 40px | Page top/bottom padding, generous section separation |
| `space-12` | 48px | Empty state vertical padding, wizard centering |

### Comfortable Spacing Standard

NextUp uses an **airy, comfortable** spacing philosophy. Cramped UIs feel rushed and stressful — the opposite of what a professional advisor tool should feel like. All screens follow these vertical rhythm rules:

**Page-level spacing:**
```tsx
// Standard app page
<div className="flex flex-col gap-8 p-6">       // gap-8 (32px) between major sections

// Wizard/onboarding page
<div className="max-w-2xl mx-auto px-4 py-10">  // py-10 (40px) generous top/bottom

// Centered hero/celebration screen
<div className="py-16 min-h-[calc(100vh-200px)]"> // py-16 (64px) for centered layouts
```

**Section-level spacing (the "breathing room" rule):**
```
Between major sections (hero → form, form → buttons):     space-y-8 (32px)
Between fields within a form section:                     space-y-4 (16px)
Between a section heading and its first field:            space-y-4 (16px)
Between label and input:                                  space-y-2 (8px)
Button group top padding:                                 pt-6 (24px)
Title to subtitle (same conceptual group):                mt-2 (8px)
```

**Wizard step spacing:**
```tsx
// Step container (ImportStep, ProfileStep, MarketStep, VoiceStep)
<div className="space-y-8">        // 32px between header, form, and nav
  <div>                             // Header group
    <h1>Step Title</h1>
    <p className="mt-2">Subtitle</p>  // 8px below title
  </div>

  <form className="space-y-8">     // 32px between form sections
    <div className="space-y-4">    // 16px between fields within section
      <h2>Section Heading</h2>
      <OnboardingField />
      <OnboardingField />
    </div>
  </form>

  <div className="pt-6">           // 24px above button nav
    <Button>Back</Button>
    <Button>Continue</Button>
  </div>
</div>
```

**Centered screen spacing (Welcome, Completion):**
```tsx
<div className="py-16 min-h-[calc(100vh-200px)]">
  <Icon />                          // Hero icon
  <h1 className="mt-8" />           // 32px below icon
  <p className="mt-3" />            // 12px below title (tight coupling)
  <div className="mt-6" />          // 24px below subtitle
  <div className="mt-10" />         // 40px before value props / summary
  <div className="mt-10" />         // 40px before CTA
</div>
```

**Title wrapping rule:** All `h1` and `h2` headings use `text-pretty` (CSS `text-wrap: pretty`) for balanced line breaks. Titles should not wrap unless screen width requires it — design copy to fit on one line at `max-w-2xl` (672px) container width.

### Application Layout

The application shell (`AppShell.tsx`) defines three layout modes:

**Desktop with sidebar only (chat closed):**
```
+----------+-------------------------------------+
| Sidebar  |  Content Area                       |
|  56px    |  (full remaining width)             |
|(hover:   |                                     |
|  180px)  |                                     |
+----------+-------------------------------------+
```

**Desktop with chat panel open:**
```
+----------+--------------+-----------------------+
| Sidebar  |  Chat Panel  |  Content Area         |
|  56px    |  (resizable) |    (resizable)        |
+----------+--------------+-----------------------+
```

**Mobile layout:**
```
+-------------------------------------------------+
| Mobile Header (56px)                            |
+-------------------------------------------------+
| Content Area                                    |
+-------------------------------------------------+
| Bottom Navigation (64px)                        |
+-------------------------------------------------+
```

Chat on mobile opens as a `Sheet` (bottom drawer) overlay.

### Sidebar Dimensions

The sidebar uses CSS custom properties for its width:

```css
--sidebar-expanded: 180px;
--sidebar-collapsed: 56px;
```

The sidebar is collapsed by default (icons only) and expands on hover to show labels. The `14` spacing token (`56px`) aligns with `--sidebar-collapsed`.

### Page Content Patterns

**Standard page layout:**
```tsx
<div className="flex flex-col gap-6 p-6">
  {/* Page header */}
  <div className="flex items-center justify-between">
    <h1 className="text-heading-lg font-semibold">Page Title</h1>
    <Button>Primary Action</Button>
  </div>

  {/* Content section */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Cards */}
  </div>
</div>
```

**Artifact editor (split view):**
```
Editor (60%) | Chat (40%)
```
This split is defined in `ArtifactEditor.tsx` and uses the `resizable-panels` library. On mobile, the chat collapses to a sheet.

### Responsive Breakpoints

NextUp uses Tailwind's default breakpoint system:

| Breakpoint | Min width | Behavior |
|---|---|---|
| Default | 0px | Single column, mobile nav |
| `sm` | 640px | Minor layout adjustments |
| `md` | 768px | Desktop layout activates; sidebar shown, mobile nav hidden |
| `lg` | 1024px | Three-column grids become available |
| `xl` | 1280px | Maximum content width applied |

**Grid patterns:**
```tsx
// Standard card grid
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

// Stats grid
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">

// Wide list (e.g., customer list)
<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
```

---

## 5. Surface and Elevation

### Elevation Through Layering

NextUp does not use dramatic box shadows to create elevation. Instead, elevation is communicated through:
1. Background color shifts (each level is slightly lighter/darker)
2. Border presence and opacity
3. Box shadows (subtle, only on cards and modals)

### The Four Elevation Levels

```
Level 0 — Canvas:         bg-background
Level 1 — Cards/Panels:   bg-card          (slightly elevated from background)
Level 2 — Popovers:       bg-popover       (modals, dropdowns, tooltips)
Level 3 — Surfaces:       bg-surface       (interactive rows, list items)
```

In dark mode, this creates a stacking of blues:
```
Background:  #030812  (deepest)
Card:        #0a1628  (slightly lighter)
Popover:     #122238  (lighter again)
Surface:     #0d1b2a  (between card and popover)
```

The result when squinting at the screen: you can perceive the hierarchy without any harsh lines or shadows.

### Border System

Borders should use the border opacity tokens, not the solid `--border` token, for nuanced layering:

```tsx
// Subtle card border (most common)
<div className="border border-border/50 bg-card">

// Default border
<div className="border border-border bg-card">

// Accent border (active/selected state)
<div className="border border-primary/30 bg-card">

// Strong border (important boundary)
<div className="border-2 border-border bg-card">
```

**The squint test:** Step back from the screen and squint. If you can still perceive the visual structure without seeing individual borders, the opacity levels are correct. If boundaries disappear entirely, increase opacity. If they look harsh, decrease it.

### Box Shadow Strategy

Three shadow values are defined:

| Shadow | Value | When to use |
|---|---|---|
| `shadow-card` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards at rest |
| `shadow-card-hover` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Cards on hover |
| `shadow-glow` | `0 0 8px rgba(14,204,237,0.4)` | Primary action elements in dark mode |
| `shadow-glow-lg` | `0 0 16px rgba(14,204,237,0.5)` | Large primary elements in dark mode |

```tsx
// Card at rest
<div className="shadow-card">

// Card hover (interactive cards)
<div className="transition-shadow hover:shadow-card-hover dark:hover:shadow-glow">

// Primary button glow (dark mode only)
<Button className="dark:shadow-glow">
```

**Rule:** Glow shadows are only appropriate in dark mode. In light mode, they look garish. The `.card-interactive` utility class handles this automatically:

```css
/* From index.css */
.card-interactive {
  transition: all 200ms;
  hover: -translate-y-0.5 shadow-card-hover;
  dark:hover: shadow-glow;
}
```

### Inputs as Inset Surfaces

Form inputs should feel slightly recessed relative to their container — they are destinations for content, not containers of content. The shadcn `Input` component uses `bg-transparent` by default, which reads as inset against a `bg-card` container without needing explicit darkening.

---

## 6. Component Patterns

### Buttons

Buttons use the `Button` component from `frontend/src/components/ui/button.tsx` which is built with `cva` (class-variance-authority).

**Base classes applied to all buttons:**
```
inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md
text-sm font-medium transition-all duration-100
focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
disabled:pointer-events-none disabled:opacity-50
active:scale-[0.98]
```

The `active:scale-[0.98]` provides a satisfying micro-press feedback on all buttons.

**Variant guide:**

| Variant | Visual | When to use |
|---|---|---|
| `default` | Filled primary color | The single most important action on a screen |
| `secondary` | Filled secondary (muted) | Supporting actions that are not the primary CTA |
| `outline` | Border with transparent bg, hover fills | Secondary actions, cancelation, "less than default" importance |
| `ghost` | No border, hover fills | Toolbar actions, icon-adjacent actions, nav items |
| `destructive` | Filled destructive (red) | Irreversible delete actions — require confirmation dialog |
| `link` | Text only with underline on hover | In-context links within body text |

**Size guide:**

| Size | Height | Padding | When to use |
|---|---|---|---|
| `sm` | `h-8` (32px) | `px-3` | Dense toolbars, inline actions, compact cards |
| `default` | `h-9` (36px) | `px-4` | Most buttons |
| `lg` | `h-10` (40px) | `px-8` | Primary CTAs, onboarding actions |
| `icon` | `h-9 w-9` | — | Icon-only buttons (must include `sr-only` label) |

```tsx
// Primary CTA
<Button variant="default" size="lg">Create Content</Button>

// Secondary / supporting
<Button variant="secondary" size="default">Save Draft</Button>

// Toolbar ghost button
<Button variant="ghost" size="icon" aria-label="More options">
  <MoreVertical className="h-4 w-4" />
</Button>

// Destructive
<Button variant="destructive" size="default">Delete Artifact</Button>
```

**Rule:** There should be at most ONE `default` variant button per screen region. If two buttons are equally important, one should be `default` and the other `outline`. Never render two filled primary buttons side by side.

### Cards

**Standard card anatomy:**

```tsx
<div
  className={cn(
    'rounded-lg border border-border/50 bg-card p-4',
    'transition-all duration-200 hover:border-primary/30 hover:shadow-md',
    'cursor-pointer'
  )}
>
  {/* Header row: type + status + actions */}
  <div className="flex items-start justify-between gap-2">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium">Type Label</span>
    </div>
    <StatusBadge status={status} size="sm" />
  </div>

  {/* Title */}
  <h3 className="mt-3 font-semibold text-foreground line-clamp-2">
    {title}
  </h3>

  {/* Body / preview */}
  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
    {preview}
  </p>

  {/* Footer: timestamp, metadata */}
  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
    <Clock className="h-3 w-3" />
    <span>{timestamp}</span>
  </div>
</div>
```

The `group` class on the card container enables child elements to respond to card hover:

```tsx
<div className="group relative ...">
  {/* This button only appears on card hover */}
  <Button className="opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

**Card spacing rules:**
- Internal padding: `p-4` (16px) for compact cards, `p-6` (24px) for spacious cards
- Gap between cards in a grid: `gap-4`
- Border radius: `rounded-lg` (`0.5rem`) — do not use `rounded-xl` for cards

### Form Controls

**Text inputs** use the shadcn `Input` component:

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-2">
  <Label htmlFor="company">Company name</Label>
  <Input
    id="company"
    placeholder="e.g. Acme Corp"
    value={value}
    onChange={(e) => setValue(e.target.value)}
  />
</div>
```

**Textarea** uses the shadcn `Textarea` component:

```tsx
import { Textarea } from '@/components/ui/textarea'

<Textarea
  placeholder="Describe your role..."
  rows={4}
  className="resize-none"
/>
```

**Select dropdowns** use the shadcn `Select` components with `data-portal-ignore-click-outside` on the `SelectContent`:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <span>{selectedLabel}</span>
  </SelectTrigger>
  <SelectContent data-portal-ignore-click-outside>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Label placement:** Always place labels above form controls, never beside them. Use `text-sm font-medium` for labels.

**Error states:** Display error messages below the input in `text-sm text-destructive`. Use the shadcn `Form` components for React Hook Form integration.

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    className={error ? "border-destructive" : ""}
    {...register('email')}
  />
  {error && (
    <p className="text-sm text-destructive">{error.message}</p>
  )}
</div>
```

### Navigation

**Sidebar nav items** use the `.nav-item` / `.nav-item-active` utilities from `index.css`:

```css
.nav-item {
  flex items-center gap-3 px-3 py-2 rounded-lg;
  text-muted-foreground transition-colors;
  hover:bg-surface-hover hover:text-foreground;
}

.nav-item-active {
  bg-surface-selected text-foreground;
  border-l-[3px] border-brand-300;
}
```

The active state uses a 3px left border in `brand-300` (cyan) as a clear indicator.

**Tabs** use the shadcn `Tabs` components for sub-navigation within a page:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="projects">Projects</TabsTrigger>
  </TabsList>
  <TabsContent value="overview"><OverviewTab /></TabsContent>
  <TabsContent value="projects"><ProjectsTab /></TabsContent>
</Tabs>
```

### Badges and Status Indicators

**Status badges** use the `StatusBadge` component for artifact workflow states. They follow the pattern: tinted background, matching text color, matching border — all at low opacity.

**Generic badges** use the shadcn `Badge` component:

```tsx
import { Badge } from '@/components/ui/badge'

<Badge>New</Badge>
<Badge variant="secondary">Beta</Badge>
<Badge variant="outline">Optional</Badge>
```

### Dialogs and Modals

Use the shadcn `Dialog` component for all modal interactions:

```tsx
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="destructive" onClick={handleConfirm}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Critical:** When creating custom portaled overlays (not using Radix), add `data-portal-ignore-click-outside` to the portal root element:

```tsx
import { createPortal } from 'react-dom'

return createPortal(
  <div data-portal-ignore-click-outside className="fixed inset-0 z-50 ...">
    {/* content */}
  </div>,
  document.body
)
```

### Dropdowns

Use the shadcn `DropdownMenu` for contextual action menus:

```tsx
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" data-portal-ignore-click-outside>
    <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
    <DropdownMenuItem onClick={onArchive}>Archive</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onDelete} className="text-destructive">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Empty States

Consistent pattern for zero-data states:

```tsx
<EmptyState
  icon={FileX}
  title="No artifacts yet"
  description="Create your first piece of content to get started."
  action={{
    label: 'Create Artifact',
    onClick: handleCreate,
  }}
/>
```

Anatomy:
- Rounded muted icon container (`rounded-full bg-muted p-4`)
- Icon at `h-8 w-8 text-muted-foreground`
- Title at `text-lg font-medium`
- Description at `text-sm text-muted-foreground max-w-sm`
- Primary action button below

### Loading and Skeleton States

Use `Skeleton` from shadcn for all loading placeholders. Skeleton components mirror the real component's structure exactly.

**When to use a spinner vs skeleton:**
- Skeleton: Initial page/section load, when the structure is known
- Spinner (`Loader2` icon): Button loading states, inline processing

```tsx
// Button loading state
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</Button>
```

### AI-Specific Indicators

**AI thinking indicator:**
```css
.ai-thinking {
  display: inline-block;
  width: 0.5rem; height: 0.5rem;
  border-radius: 9999px;
  background: #0ECCED;
  animation: pulse-glow 2s ease-in-out infinite;
}
```

**Streaming text cursor:**
```css
.streaming-cursor {
  display: inline-block;
  width: 0.125rem; height: 1rem;
  background: #0ECCED;
  margin-left: 0.125rem;
  animation: blink 1s step-end infinite;
}
```

These are cyan specifically because cyan = active AI intelligence in the NextUp visual language.

---

## 7. States and Interactions

### Interactive State Hierarchy

Every interactive element must communicate all of these states where relevant:

1. **Default** — Resting, no interaction
2. **Hover** — Pointer over element
3. **Focus** — Keyboard focus (must always be visible)
4. **Active** — Being pressed/clicked
5. **Disabled** — Not interactable
6. **Loading** — Async operation in progress
7. **Error** — Validation or operation failure
8. **Success** — Operation completed

### Hover States

**Cards:**
```tsx
'hover:border-primary/30 hover:shadow-md'
// Or using card-interactive utility
'card-interactive'
```

**Nav items:**
```tsx
'hover:bg-surface-hover hover:text-foreground'
```

**Ghost buttons revealed on card hover:**
```tsx
<Button className="opacity-0 group-hover:opacity-100 transition-opacity" />
```

### Focus States

All focusable elements use the global focus style:

```css
:focus-visible {
  outline: none;
  ring: 2px ring-ring offset 2px ring-offset-background;
}
```

The ring color resolves to `--ring` (cyan in dark mode, deep blue in light mode). **Never remove focus visibility.**

### Active States

Buttons include `active:scale-[0.98]` in their base classes, providing a subtle press effect. For other interactive elements:

```tsx
'active:scale-[0.98] transition-transform'
```

### Disabled States

```tsx
// Buttons — handled by Button component
<Button disabled>Cannot proceed</Button>
// Renders with: disabled:pointer-events-none disabled:opacity-50
```

Do not use a different color for disabled states — reduced opacity communicates "unavailable" without introducing a new color meaning.

### Loading States

**Button loading:**
```tsx
<Button disabled={isPending}>
  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
  {isPending ? 'Saving...' : 'Save'}
</Button>
```

**Section loading:**
```tsx
if (isLoading) return <GridSkeleton count={6} />
```

### Error States

**Form validation errors:**
```tsx
<p className="text-sm text-destructive mt-1">{error.message}</p>
```

**Toast notifications** for async failures:
```tsx
toast({
  title: "Failed to save",
  description: error.message || "An unexpected error occurred",
  variant: "destructive",
})
```

---

## 8. Animation and Motion

### Principles

**Animations serve the user, not the design.** Every transition should either:
- Orient the user (where did this element come from/go to?)
- Confirm an action (micro-feedback on press)
- Signal status change (AI is thinking, content is loading)

**Keep it fast.** Default duration: 150-200ms.

**Never animate content.** Only animate structural and state changes.

### Keyframe Definitions

| Animation | Effect | Duration | Easing | Usage |
|---|---|---|---|---|
| `animate-fade-in` | Opacity 0-1 | 200ms | `ease-out` | Content appearing |
| `animate-slide-up` | translateY(8px)+opacity 0-1 | 200ms | `ease-out` | Panels/cards entering |
| `animate-slide-in-right` | translateX(100%)+opacity 0-1 | 250ms | `ease-out` | Side panels, sheet drawers |
| `animate-blink` | Opacity 1-0-1 (step-end) | 1s | `step-end` | Streaming text cursor |
| `animate-pulse-glow` | Box shadow cycling cyan glow | 2s | `ease-in-out` | AI thinking indicator |

### Onboarding Animations

| Class | Effect | Duration | Easing |
|---|---|---|---|
| `onboarding-animate-fade-up` | Fade + translateY(8px)-0 | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `onboarding-animate-fade-in` | Opacity 0-1 | 200ms | `ease-out` |
| `onboarding-animate-scale-in` | Scale(0.85)+opacity 0-1 | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `onboarding-animate-badge-enter` | translateX(8px)+opacity 0-1 | 200ms | `ease-out` |

Step transitions use directional slides:
- Moving forward: `onboarding-step-enter-forward` — slides from right (24px)
- Moving backward: `onboarding-step-enter-backward` — slides from left (-24px)

### Transition Defaults

```tsx
'transition-all duration-200'        // Standard transition (most common)
'transition-colors duration-200'     // Color/background only (hover states)
'transition-opacity duration-200'    // Opacity (reveal patterns)
'transition-transform duration-100'  // Transform (scale, translate)
```

### Reduced Motion

All onboarding animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .onboarding-animate-fade-up,
  .onboarding-animate-fade-in,
  .onboarding-animate-scale-in,
  .onboarding-animate-badge-enter {
    animation: onboarding-fade-in 0ms both;
  }
}
```

When implementing new animations, always add a `prefers-reduced-motion` override.

---

## 9. Dark Mode

### How It Works

Dark mode uses Tailwind's `class` strategy (`darkMode: ["class"]`). The `dark` class on `<html>` activates `dark:` variant classes and the `.dark {}` CSS block overrides custom properties.

### The Dark Mode Color Shift

| Token | Light | Dark | Character shift |
|---|---|---|---|
| `--background` | Near-white (`210 20% 98%`) | Near-black blue (`220 60% 3%`) | Blank canvas - deep focus |
| `--primary` | Deep blue (`214 83% 39%`) | Bright cyan (`187 89% 49%`) | Authority - electric intelligence |
| `--card` | Pure white | Deep navy (`215 52% 10%`) | Elevated surface shift |

### Dark Mode Specific Patterns

**Glow effects are dark-mode only:**
```tsx
<div className="dark:shadow-glow">
<div className="dark:hover:shadow-glow">
```

**Surface elevation is more pronounced in dark mode.** Design for dark mode first when working on elevation decisions.

### Rules

1. Never hardcode hex values. Always use semantic tokens.
2. Use `brand-300` when you need explicit cyan in both themes.
3. Test contrast ratios in both themes.
4. Provide light-mode defaults first, then add `dark:` overrides.

---

## 10. Iconography

### Icon Library

NextUp uses **Lucide React** exclusively. Do not mix icon libraries.

### Icon Sizing Guide

| Size | Class | px | Use case |
|---|---|---|---|
| Micro | `h-3 w-3` | 12px | Inline metadata (clock, pin) |
| Small | `h-4 w-4` | 16px | Default for buttons, nav items |
| Medium | `h-5 w-5` | 20px | Section headers, form field prefix |
| Large | `h-6 w-6` | 24px | Feature highlights |
| Display | `h-8 w-8` | 32px | Empty state icons |
| Hero | `h-12 w-12` | 48px | Onboarding illustrations |

### Icon with Background Container

```tsx
// Muted container (standard)
<div className="rounded-full bg-muted p-4">
  <Icon className="h-8 w-8 text-muted-foreground" />
</div>

// Brand accent container
<div className="rounded-full bg-primary/10 p-4">
  <Icon className="h-8 w-8 text-primary" />
</div>
```

### Semantic Icon Assignments

| Icon | Meaning |
|---|---|
| `Sparkles` | AI, generate, intelligent feature |
| `FileText` | Blog post artifact |
| `MessageSquare` | Social post artifact |
| `Trophy` | Case study / showcase |
| `Clock` | Last updated, time-related |
| `MoreVertical` | Contextual actions menu |
| `Plus` | Create new item |
| `Search` | Search / research |
| `Loader2` | Async loading (spinner) |
| `CheckCircle` | Success, complete |
| `AlertCircle` | Error, warning |
| `Bot` | AI assistant identity |

### Icon Accessibility

```tsx
// Icon button — use aria-label
<Button variant="ghost" size="icon" aria-label="Delete artifact">
  <Trash2 className="h-4 w-4" />
</Button>

// Decorative icons — aria-hidden
<Sparkles className="h-4 w-4" aria-hidden="true" />
```

---

## 11. Accessibility

### WCAG 2.1 AA Compliance

- **Contrast Minimum:** 4.5:1 for text (3:1 for large text)
- **Keyboard:** All functionality operable by keyboard
- **Focus Visible:** Keyboard focus clearly visible at all times
- **Name, Role, Value:** All UI components have accessible names and roles

### Focus Management

```css
:focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--ring));
  ring-offset: 2px;
  ring-offset-color: hsl(var(--background));
}
```

### Keyboard Navigation

| Key | Standard behavior |
|---|---|
| `Tab` / `Shift+Tab` | Move focus forward/backward |
| `Enter` | Activate button, submit form, follow link |
| `Space` | Activate button, toggle checkbox |
| `Escape` | Close modal, dismiss dropdown |
| `Arrow keys` | Navigate within component (tabs, select, radio) |

### Touch Targets

Minimum 44x44px for mobile usability. When the visual element is smaller, use padding:

```tsx
<button className="p-2 -m-2">  // 8px padding, negative margin to maintain layout
  <X className="h-4 w-4" />
</button>
```

### Text Contrast with Opacity Modifiers

When using `text-muted-foreground` with Tailwind opacity modifiers (`/50`, `/60`, etc.), follow these rules to maintain WCAG AA compliance:

| Use Case | Minimum Opacity | Example |
|----------|----------------|---------|
| **Interactive text** (nav items, buttons, links) | No opacity — use `text-muted-foreground` | Sidebar nav items, theme toggle |
| **Readable secondary text** (labels, hints, descriptions) | `/70` | "(optional)" labels, hint text |
| **Metadata text** (timestamps, counts, slugs) | `/70` | Word counts, reference descriptions |
| **Decorative icons** (empty states, loaders, placeholders) | `/30`–`/50` acceptable | Empty state icons, loading spinners |

**Rules:**
- Never use `text-muted-foreground/50` or lower on text that must be read
- Interactive elements must use `text-muted-foreground` (no opacity reduction) — contrast ~5.5:1 dark, ~4.7:1 light
- Secondary readable text must use minimum `/70` — contrast ~3.5:1+
- Decorative elements (icons in empty states, loaders) may use `/30`–`/50`

```tsx
// CORRECT — interactive text, no opacity
<Link className="text-muted-foreground hover:text-foreground">Settings</Link>

// CORRECT — secondary hint text, /70 minimum
<span className="text-xs text-muted-foreground/70">(optional)</span>

// CORRECT — decorative empty state icon, /40 is fine
<FileSearch className="h-12 w-12 text-muted-foreground/40" />

// WRONG — readable text at /50, fails WCAG AA
<Link className="text-muted-foreground/50">Settings</Link>
```

### Color Independence

Never communicate information through color alone. Always pair color with text, icons, or patterns:

```tsx
// Wrong
<span className="h-2 w-2 rounded-full bg-green-500" />

// Correct
<span className="inline-flex items-center gap-1.5">
  <span className="h-2 w-2 rounded-full bg-status-published" />
  <span className="text-xs">Published</span>
</span>
```

---

## 12. Anti-Patterns

### Color Anti-Patterns

- **Do not use multiple accent colors.** Cyan is the single brand accent. No purple, orange, or additional hues.
- **Do not use high-saturation backgrounds.** Interface backgrounds should be near-neutral.
- **Do not use colors from outside the palette** for semantic purposes.

### Elevation Anti-Patterns

- **Do not use dramatic box shadows.** `shadow-2xl` is never appropriate.
- **Do not mix depth cues.** A card should not have both a shadow AND a colored border AND a background tint.
- **Do not create floating islands without purpose.**

### Typography Anti-Patterns

- **Do not use more than four typographic levels per screen.**
- **Do not use decorative letter-spacing on body text.**
- **Do not center-align paragraph text.** Center alignment for single-line labels/headings only.
- **Do not use `font-bold` (700) for body text.** Body: 400/500. Headings: 600. Display: 700.

### Layout Anti-Patterns

- **Do not use arbitrary pixel values outside the 8px grid.**
- **Do not use `max-w` constraints inside card bodies.**
- **Do not overlap multiple full-width banners.**

### Interaction Anti-Patterns

- **Do not use `onClick` on `div` without keyboard accessibility.** Use `<button>` instead.
- **Do not animate on every state change.** Reserve animations for meaningful transitions.
- **Do not show multiple simultaneous toasts.** One toast at a time.
- **Do not use a dialog for simple confirmations that can be done inline.**

### Component Anti-Patterns

- **Do not create custom inputs when `Input`, `Textarea`, or `Select` exists.**
- **Do not render a `Button` inside another `Button`.**
- **Do not build custom dropdowns when `DropdownMenu` or `Select` exists.**
- **Do not use `z-index: 9999`.** Use the Tailwind scale: `z-10` through `z-50`.

---

## 13. Decision Framework

When making a design decision, work through these questions in order.

### 1. What is the user trying to accomplish?

State the user's goal explicitly. For NextUp users: they want to create professional content quickly with minimal friction.

### 2. Is there an established pattern that fits?

Check the component library first. Do not create new components when existing ones can be extended.

### 3. Which semantic token should I use?

1. Semantic token if role is clear (`bg-card`, `text-muted-foreground`)
2. Surface token for interactive states (`bg-surface-hover`, `bg-surface-selected`)
3. `brand` scale only for explicit brand moments (`border-brand-300`)
4. Status color only for defined status meaning (`bg-status-ready`)
5. Never use raw Tailwind color (`bg-blue-700`) unless no token equivalent exists

### 4. What is the visual weight of this element?

Can it be lighter, smaller, or less saturated without losing usability? Hierarchy to reduce weight:
- Reduce opacity (muted text instead of full foreground)
- Reduce size (sm badge instead of md)
- Reduce saturation (border/50 instead of border)
- Remove entirely (reveal on hover instead of always visible)

### 5. What is the interaction feedback?

Every interactive element must communicate its interactivity:
- Hover change? (`hover:bg-surface-hover`)
- Correct cursor? (`cursor-pointer`)
- Press response? (`active:scale-[0.98]`)
- Focus visible? (do not remove `:focus-visible`)
- Loading state? (spinner or disabled state)

### 6. Does it work in both themes and at all breakpoints?

- Semantic tokens (respond to theme changes)?
- Contrast ratio in both themes?
- Layout reflow on mobile?
- Touch targets >= 44x44px?

### 7. Does it follow accessibility guidelines?

- Text at 4.5:1 minimum contrast?
- All interactive elements reachable by keyboard?
- Focus visible at all times?
- Icons have labels?
- Information communicated by more than color alone?

### Pattern Vocabulary Quick Reference

| Design intent | Pattern |
|---|---|
| "This is the primary action" | `Button variant="default"`, one per region |
| "This is important but secondary" | `Button variant="outline"` or `variant="secondary"` |
| "This belongs to the AI" | `brand-300` color, `Sparkles` icon |
| "This content is ready" | `StatusBadge status="ready"` (cyan) |
| "This is loading" | `Skeleton` component mirroring content structure |
| "There is nothing here yet" | `EmptyState` with action button |
| "This action is dangerous" | `Button variant="destructive"` in a `Dialog` |
| "This item is selected/active" | `bg-surface-selected`, `border-l-[3px] border-brand-300` |
| "This is ambient context" | `text-muted-foreground`, `text-xs` |
| "This is elevated above the surface" | `bg-card` or `bg-popover` with `border-border` |

---

## Appendix A: Complete CSS Custom Property Reference

### Light Mode (`:root`)

```css
:root {
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body:    'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  --background:         210 20% 98%;
  --foreground:         222 47% 11%;
  --card:               0 0% 100%;
  --card-foreground:    222 47% 11%;
  --popover:            0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --primary:            214 83% 39%;
  --primary-foreground: 210 20% 98%;

  --secondary:            210 16% 93%;
  --secondary-foreground: 222 47% 11%;
  --muted:                210 16% 93%;
  --muted-foreground:     215 16% 47%;
  --accent:               214 83% 39%;
  --accent-foreground:    210 20% 98%;

  --destructive:            340 100% 64%;
  --destructive-foreground: 0 0% 100%;

  --border: 214 32% 91%;
  --input:  214 32% 91%;
  --ring:   214 83% 39%;
  --radius: 0.5rem;

  --surface:          0 0% 100%;
  --surface-hover:    210 16% 96%;
  --surface-active:   210 16% 93%;
  --surface-selected: 214 83% 39% / 0.08;

  --border-subtle:  222 47% 11% / 0.05;
  --border-default: 222 47% 11% / 0.1;
  --border-strong:  222 47% 11% / 0.2;
  --border-accent:  214 83% 39% / 0.4;

  --sidebar-expanded:  180px;
  --sidebar-collapsed: 56px;
}
```

### Dark Mode (`.dark`)

```css
.dark {
  --background:         220 60% 3%;
  --foreground:         210 20% 95%;
  --card:               215 52% 10%;
  --card-foreground:    210 20% 95%;
  --popover:            215 47% 15%;
  --popover-foreground: 210 20% 95%;

  --primary:            187 89% 49%;
  --primary-foreground: 220 60% 3%;

  --secondary:            215 47% 15%;
  --secondary-foreground: 210 20% 95%;
  --muted:                215 47% 15%;
  --muted-foreground:     215 16% 57%;
  --accent:               187 89% 49%;
  --accent-foreground:    220 60% 3%;

  --destructive:            340 100% 64%;
  --destructive-foreground: 0 0% 100%;

  --border: 215 20% 25%;
  --input:  215 20% 25%;
  --ring:   187 89% 49%;

  --surface:          215 40% 12%;
  --surface-hover:    215 36% 22%;
  --surface-active:   215 36% 28%;
  --surface-selected: 187 89% 49% / 0.15;

  --border-subtle:  215 20% 57% / 0.1;
  --border-default: 215 20% 57% / 0.2;
  --border-strong:  215 20% 57% / 0.3;
  --border-accent:  187 89% 49% / 0.5;
}
```

---

## Appendix B: Component Utility Classes Reference

Defined in `frontend/src/index.css` under `@layer components`:

```css
.card-interactive       /* hover: -translate-y-0.5 shadow-card-hover; dark:hover: shadow-glow */
.bg-gradient-card       /* linear-gradient(135deg, card 0%, popover 100%) */
.bg-gradient-accent     /* linear-gradient(135deg, #025EC4 0%, #0ECCED 100%) */
.glow-accent            /* dark:shadow-glow */
.status-draft           /* bg-status-draft text-white */
.status-in-progress     /* bg-status-in-progress text-white */
.status-ready           /* bg-status-ready text-black */
.status-published       /* bg-status-published text-white */
.status-archived        /* bg-status-archived text-white */
.ai-thinking            /* cyan dot with pulse-glow animation */
.streaming-cursor       /* cyan cursor with blink animation */
.nav-item               /* sidebar nav item base styles */
.nav-item-active        /* bg-surface-selected + border-l-[3px] border-brand-300 */
```

---

## Appendix C: Brand Color Scale

```ts
brand: {
  900: '#020764',  // Deep indigo
  700: '#043780',  // Dark blue
  500: '#025EC4',  // Medium blue — primary in light mode
  300: '#0ECCED',  // Bright cyan — primary in dark mode, THE accent
  100: '#7DD3FC',  // Light cyan
}
```

---

## Appendix D: Status Color Reference

```ts
// Fixed values from tailwind.config.ts
status: {
  draft:        '#64748b',
  'in-progress':'#f59e0b',
  ready:        '#0ECCED',
  published:    '#10b981',
  archived:     '#475569',
}

// Full 11-status badge classes from stateMachine.ts
STATUS_COLORS: {
  draft:               'bg-gray-500/10 text-gray-400 border-gray-500/20',
  interviewing:        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  research:            'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations:         'bg-blue-500/10 text-blue-400 border-blue-500/20',
  skeleton:            'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations_approval:'bg-amber-500/10 text-amber-400 border-amber-500/20',
  writing:             'bg-blue-500/10 text-blue-400 border-blue-500/20',
  humanity_checking:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  creating_visuals:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ready:               'bg-green-500/10 text-green-400 border-green-500/20',
  published:           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}
```

---

## Appendix E: Related Files

| File | Purpose |
|---|---|
| `frontend/src/index.css` | CSS custom properties, component utilities, animations |
| `frontend/tailwind.config.ts` | Tailwind theme extension (colors, typography, spacing, shadows) |
| `frontend/src/components/ui/` | All shadcn/ui components |
| `frontend/src/components/layout/AppShell.tsx` | Application shell layout |
| `frontend/src/components/layout/Sidebar.tsx` | Collapsible sidebar navigation |
| `frontend/src/features/portfolio/components/shared/` | Shared UI patterns (cards, badges, empty states) |
| `frontend/src/features/onboarding/` | Onboarding wizard with animation system |
| `frontend/src/lib/color-palettes.ts` | Multi-palette color definitions |
| `docs/frontend/color-palettes/COLOR_PALETTE_GUIDE.md` | Color palette switching guide |
