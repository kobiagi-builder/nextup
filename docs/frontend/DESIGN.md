# NextUp Design System

## Overview

NextUp uses a dynamic color palette system built on CSS custom properties with Tailwind CSS and shadcn/ui (New York style). The system supports multiple themes via runtime palette injection.

**Active Palette**: Cyan ("Midnight Architect") — Deep blue foundations with luminous cyan accents.

---

## Color Tokens

### Light Mode (`:root`)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--background` | 210 20% 98% | #f8fafc | Page background |
| `--foreground` | 222 47% 11% | #0f172a | Primary text |
| `--card` | 0 0% 100% | #ffffff | Cards, panels |
| `--card-foreground` | 222 47% 11% | #0f172a | Card text |
| `--popover` | 0 0% 100% | #ffffff | Modals, popovers |
| `--popover-foreground` | 222 47% 11% | #0f172a | Popover text |
| `--primary` | 214 83% 39% | #025EC4 | Brand primary, CTAs |
| `--primary-foreground` | 210 20% 98% | #f8fafc | Text on primary |
| `--secondary` | 210 16% 93% | #e8ecf0 | Secondary surfaces |
| `--secondary-foreground` | 222 47% 11% | #0f172a | Text on secondary |
| `--muted` | 210 16% 93% | #e8ecf0 | Muted backgrounds |
| `--muted-foreground` | 215 16% 47% | #64748b | Muted/placeholder text |
| `--accent` | 214 83% 39% | #025EC4 | Accent highlights |
| `--accent-foreground` | 210 20% 98% | #f8fafc | Text on accent |
| `--destructive` | 340 100% 64% | #FF4785 | Error, delete actions |
| `--destructive-foreground` | 0 0% 100% | #ffffff | Text on destructive |
| `--border` | 214 32% 91% | #d4dbe6 | Default borders |
| `--input` | 214 32% 91% | #d4dbe6 | Input borders |
| `--ring` | 214 83% 39% | #025EC4 | Focus ring |

**Surfaces (Light):**

| Token | Value | Usage |
|-------|-------|-------|
| `--surface` | 0 0% 100% | Base surface |
| `--surface-hover` | 210 16% 96% | Hovered surface |
| `--surface-active` | 210 16% 93% | Active/pressed surface |
| `--surface-selected` | 214 83% 39% / 0.08 | Selected item background |

**Border Variants (Light):**

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | 222 47% 11% / 0.05 | Very subtle dividers |
| `--border-default` | 222 47% 11% / 0.1 | Standard borders |
| `--border-strong` | 222 47% 11% / 0.2 | Emphasized borders |
| `--border-accent` | 214 83% 39% / 0.4 | Accent-colored borders |

**Charts (Light):**

| Token | HSL | Usage |
|-------|-----|-------|
| `--chart-1` | 12 76% 61% | Orange |
| `--chart-2` | 173 58% 39% | Teal |
| `--chart-3` | 197 37% 24% | Dark blue |
| `--chart-4` | 43 74% 66% | Yellow-green |
| `--chart-5` | 27 87% 67% | Orange-red |

---

### Dark Mode (`.dark`)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--background` | 220 60% 3% | #030812 | Page background |
| `--foreground` | 210 20% 95% | #f0f4f8 | Primary text |
| `--card` | 215 52% 10% | #0a1628 | Cards, panels |
| `--card-foreground` | 210 20% 95% | #f0f4f8 | Card text |
| `--popover` | 215 47% 15% | #122238 | Modals, popovers |
| `--popover-foreground` | 210 20% 95% | #f0f4f8 | Popover text |
| `--primary` | 187 89% 49% | #0ECCED | Brand primary, CTAs |
| `--primary-foreground` | 220 60% 3% | #030812 | Text on primary |
| `--secondary` | 215 47% 15% | #122238 | Secondary surfaces |
| `--secondary-foreground` | 210 20% 95% | #f0f4f8 | Text on secondary |
| `--muted` | 215 47% 15% | #122238 | Muted backgrounds |
| `--muted-foreground` | 215 16% 57% | #94a3b8 | Muted/placeholder text |
| `--accent` | 187 89% 49% | #0ECCED | Accent highlights |
| `--accent-foreground` | 220 60% 3% | #030812 | Text on accent |
| `--destructive` | 340 100% 64% | #FF4785 | Error, delete actions |
| `--destructive-foreground` | 0 0% 100% | #ffffff | Text on destructive |
| `--border` | 215 20% 25% | #2d3f54 | Default borders |
| `--input` | 215 20% 25% | #2d3f54 | Input borders |
| `--ring` | 187 89% 49% | #0ECCED | Focus ring |

**Surfaces (Dark):**

| Token | Value | Usage |
|-------|-------|-------|
| `--surface` | 215 40% 12% | #0d1b2a | Base surface |
| `--surface-hover` | 215 36% 22% | #1b3a5c | Hovered surface |
| `--surface-active` | 215 36% 28% | #234b73 | Active/pressed surface |
| `--surface-selected` | 187 89% 49% / 0.15 | Selected item (cyan glow) |

**Border Variants (Dark):**

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | 215 20% 57% / 0.1 | Very subtle dividers |
| `--border-default` | 215 20% 57% / 0.2 | Standard borders |
| `--border-strong` | 215 20% 57% / 0.3 | Emphasized borders |
| `--border-accent` | 187 89% 49% / 0.5 | Cyan accent borders |

**Charts (Dark):**

| Token | HSL | Usage |
|-------|-----|-------|
| `--chart-1` | 220 70% 50% | Blue |
| `--chart-2` | 160 60% 45% | Cyan-green |
| `--chart-3` | 30 80% 55% | Orange |
| `--chart-4` | 280 65% 60% | Purple |
| `--chart-5` | 340 75% 55% | Red-pink |

---

## Brand Colors

Direct-access brand palette for gradient and accent use:

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-900` | #020764 | Deep indigo |
| `brand-700` | #043780 | Dark blue |
| `brand-500` | #025EC4 | Medium blue (light mode primary) |
| `brand-300` | #0ECCED | Bright cyan (dark mode primary) |
| `brand-100` | #7DD3FC | Light cyan |

---

## Status Colors

| Status | Hex | Usage |
|--------|-----|-------|
| `status-draft` | #64748b | Gray — draft items |
| `status-in-progress` | #f59e0b | Amber — active work |
| `status-ready` | #0ECCED | Cyan — ready for review |
| `status-published` | #10b981 | Green — live/published |
| `status-archived` | #475569 | Dark gray — archived |

---

## Typography

### Font Families

| Role | Stack |
|------|-------|
| Display | `Plus Jakarta Sans`, `Heebo`, system-ui, sans-serif |
| Body | `Plus Jakarta Sans`, `Heebo`, system-ui, sans-serif |
| Monospace | `JetBrains Mono`, `Fira Code`, monospace |

### Font Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `display-xl` | 3rem (48px) | 1.1 | Hero headings |
| `display-lg` | 2.25rem (36px) | 1.15 | Page titles |
| `display-md` | 1.875rem (30px) | 1.2 | Section titles |
| `heading-lg` | 1.5rem (24px) | 1.3 | Card titles |
| `heading-md` | 1.25rem (20px) | 1.35 | Subheadings |
| `heading-sm` | 1.125rem (18px) | 1.4 | Small headings |
| Body (default) | 0.875rem (14px) | 1.5 | Body text |
| `text-xs` | 0.75rem (12px) | 1.5 | Captions, labels |

### Font Weights

- **Headings**: `font-semibold` (600), `tracking-tight`
- **Body**: `font-normal` (400)
- **Emphasis**: `font-medium` (500)

---

## Spacing & Sizing

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` (base) | 0.5rem (8px) | Default radius |
| `rounded-lg` | 0.5rem (8px) | Cards, large elements |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-sm` | 4px | Small elements, tags |
| `rounded-xl` | 12px | Cards (shadcn default) |

### Sidebar

| Property | Value |
|----------|-------|
| `--sidebar-expanded` | 180px |
| `--sidebar-collapsed` | 56px |

### Custom Spacing

| Token | Value |
|-------|-------|
| `14` | 3.5rem (56px) |
| `18` | 4.5rem (72px) |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-glow` | `0 0 8px rgba(14, 204, 237, 0.4)` | Cyan glow (dark mode) |
| `shadow-glow-lg` | `0 0 16px rgba(14, 204, 237, 0.5)` | Large cyan glow |
| `shadow-card` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` | Card elevation |
| `shadow-card-hover` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | Card hover elevation |

---

## Component Patterns

### Button Variants

| Variant | Style |
|---------|-------|
| `default` | `bg-primary text-primary-foreground shadow hover:bg-primary/90` |
| `destructive` | `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90` |
| `outline` | `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

### Button Sizes

| Size | Style |
|------|-------|
| `default` | `h-9 px-4 py-2` |
| `sm` | `h-8 rounded-md px-3 text-xs` |
| `lg` | `h-10 rounded-md px-8` |
| `icon` | `h-9 w-9` |

### Card

```
Base:      rounded-xl border bg-card text-card-foreground shadow
Header:    flex flex-col space-y-1.5 p-6
Title:     font-semibold leading-none tracking-tight
Desc:      text-sm text-muted-foreground
Content:   p-6 pt-0
Footer:    flex items-center p-6 pt-0
```

### Input

```
Base:      h-9 w-full rounded-md border border-input bg-transparent px-3 py-1
Focus:     focus-visible:ring-1 focus-visible:ring-ring
Disabled:  disabled:opacity-50 disabled:cursor-not-allowed
```

### Navigation Item

```
Base:      flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground transition-colors
Hover:     hover:bg-surface-hover hover:text-foreground
Active:    bg-surface-selected text-foreground border-l-[3px] border-brand-300
```

---

## Animations

| Name | Duration | Easing | Description |
|------|----------|--------|-------------|
| `fade-in` | 200ms | ease-out | Opacity 0 to 1 |
| `slide-up` | 200ms | ease-out | Translate Y 8px + fade in |
| `slide-in-right` | 250ms | ease-out | Translate X 100% + fade in |
| `blink` | 1s | step-end | Cursor blink effect |
| `pulse-glow` | 2s | ease-in-out | Cyan glow pulse (infinite) |

---

## Utility Classes

| Class | Effect |
|-------|--------|
| `.card-interactive` | Hover lift (-0.5px Y) + shadow transition |
| `.bg-gradient-card` | 135deg gradient from card to popover |
| `.bg-gradient-accent` | 135deg gradient from #025EC4 to #0ECCED |
| `.glow-accent` | Cyan glow shadow (dark mode) |
| `.text-gradient` | Clip text with accent gradient |
| `.ai-thinking` | Pulsing cyan dot indicator |
| `.streaming-cursor` | Blinking cursor for AI streaming |
| `.scrollbar-hide` | Hidden scrollbar with scroll |
| `.scrollbar-custom` | Thin custom-colored scrollbar |

---

## Interaction States

| State | Pattern |
|-------|---------|
| Focus | `focus-visible:outline-none ring-2 ring-ring ring-offset-2 ring-offset-background` |
| Hover | `transition-colors duration-200` |
| Active | `active:scale-[0.98]` |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |
| Selection | `::selection { bg-primary/20 text-foreground }` |

---

## Icons

- **Library**: Lucide React (`lucide-react`)
- **Default size**: 16px (`h-4 w-4`)
- **Nav icons**: 20px (`h-5 w-5`)

---

## shadcn/ui Config

- **Style**: New York
- **Base Color**: Neutral
- **CSS Variables**: Enabled
- **Icon Library**: Lucide React
- **Import Aliases**: `@/components`, `@/components/ui`, `@/lib`, `@/hooks`
