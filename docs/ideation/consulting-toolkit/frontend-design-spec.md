# Frontend Design Specification: Consulting Toolkit - Portfolio MVP

**Created**: 2026-01-22
**PRD**: ./prd-portfolio-mvp.md
**Spec**: ./spec-portfolio-mvp.md

---

## Design Philosophy

### Aesthetic Direction: **"Midnight Architect"**

A sophisticated, depth-layered interface that feels like working in a premium creative studio at night. Deep blue foundations with luminous cyan accents create a focused, professional atmosphere that elevates the consultant's work.

**Core Principles**:
- **Depth over Flatness**: Layered surfaces with subtle gradients and shadows create hierarchy
- **Luminous Accents**: Cyan (#0ECCED) draws attention to actions and live elements
- **Breathing Space**: Generous whitespace (or "darkspace") allows content to breathe
- **Confident Typography**: Bold headers paired with refined body text
- **Purposeful Motion**: Animations communicate state, not decorate

---

## Color System

### Dark Theme (Primary)

```css
:root[data-theme="dark"] {
  /* Foundations - Layered depths */
  --color-bg-base: #030812;           /* Deepest background */
  --color-bg-raised: #0a1628;         /* Cards, panels */
  --color-bg-elevated: #122238;       /* Modals, popovers */
  --color-bg-overlay: rgba(3, 8, 18, 0.85); /* Overlays */

  /* Brand Blues - Semantic */
  --color-primary-900: #020764;       /* Deep indigo */
  --color-primary-700: #043780;       /* Dark blue */
  --color-primary-500: #025EC4;       /* Medium blue */
  --color-primary-300: #0ECCED;       /* Bright cyan - ACCENT */
  --color-primary-100: #7DD3FC;       /* Light cyan */

  /* Surfaces */
  --color-surface-default: #0d1b2a;
  --color-surface-hover: #1b3a5c;
  --color-surface-active: #234b73;
  --color-surface-selected: rgba(14, 204, 237, 0.15);

  /* Text */
  --color-text-primary: #f0f4f8;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-text-inverse: #030812;

  /* Borders */
  --color-border-subtle: rgba(148, 163, 184, 0.1);
  --color-border-default: rgba(148, 163, 184, 0.2);
  --color-border-strong: rgba(148, 163, 184, 0.3);
  --color-border-accent: rgba(14, 204, 237, 0.5);

  /* Status */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #0ECCED;

  /* Gradients */
  --gradient-card: linear-gradient(135deg, #0d1b2a 0%, #122238 100%);
  --gradient-accent: linear-gradient(135deg, #025EC4 0%, #0ECCED 100%);
  --gradient-glow: radial-gradient(circle at 50% 0%, rgba(14, 204, 237, 0.15) 0%, transparent 50%);
}
```

### Light Theme

```css
:root[data-theme="light"] {
  /* Foundations */
  --color-bg-base: #f8fafc;
  --color-bg-raised: #ffffff;
  --color-bg-elevated: #ffffff;
  --color-bg-overlay: rgba(248, 250, 252, 0.9);

  /* Brand Blues */
  --color-primary-900: #020764;
  --color-primary-700: #043780;
  --color-primary-500: #025EC4;
  --color-primary-300: #0ECCED;
  --color-primary-100: #e0f7fa;

  /* Surfaces */
  --color-surface-default: #ffffff;
  --color-surface-hover: #f1f5f9;
  --color-surface-active: #e2e8f0;
  --color-surface-selected: rgba(2, 94, 196, 0.08);

  /* Text */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-text-inverse: #f0f4f8;

  /* Borders */
  --color-border-subtle: rgba(15, 23, 42, 0.05);
  --color-border-default: rgba(15, 23, 42, 0.1);
  --color-border-strong: rgba(15, 23, 42, 0.2);
  --color-border-accent: rgba(2, 94, 196, 0.4);

  /* Accents for light mode - use deeper blue for contrast */
  --color-accent-primary: #025EC4;
  --color-accent-hover: #043780;
}
```

### Color Usage Guidelines

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Page background | `--color-bg-base` | `--color-bg-base` |
| Cards/panels | `--color-bg-raised` | `--color-bg-raised` |
| Primary buttons | `--gradient-accent` | `--color-primary-500` |
| Interactive highlights | `--color-primary-300` (cyan) | `--color-primary-500` |
| Active states | Cyan glow | Blue border |
| Success indicators | `--color-success` | `--color-success` |

---

## Typography

### Font Stack

```css
:root {
  /* Display - For headlines and feature text */
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;

  /* Body - For readable content */
  --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;

  /* Mono - For code and data */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

**Plus Jakarta Sans**: A geometric sans-serif with distinctive character - more personality than Inter, but equally readable. The slightly higher x-height improves legibility in dense UIs.

### Type Scale

```css
/* Display */
--text-display-xl: 3rem / 1.1;      /* 48px - Hero headlines */
--text-display-lg: 2.25rem / 1.15;  /* 36px - Page titles */
--text-display-md: 1.875rem / 1.2;  /* 30px - Section headers */

/* Headings */
--text-heading-lg: 1.5rem / 1.3;    /* 24px - Card titles */
--text-heading-md: 1.25rem / 1.35;  /* 20px - Subsections */
--text-heading-sm: 1.125rem / 1.4;  /* 18px - List headers */

/* Body */
--text-body-lg: 1rem / 1.6;         /* 16px - Primary content */
--text-body-md: 0.875rem / 1.5;     /* 14px - Secondary content */
--text-body-sm: 0.75rem / 1.5;      /* 12px - Captions, labels */

/* Special */
--text-overline: 0.625rem / 1.2;    /* 10px - Overlines, badges */
```

### Font Weights

```css
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

---

## Spacing System

8px base unit with intentional gaps:

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

---

## Layout System

### App Shell

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (72px)  │              MAIN CONTENT                            │
│                  │                                                      │
│  ┌────────────┐  │  ┌──────────────────────────────────────────────┐   │
│  │   Logo     │  │  │  HEADER BAR (64px)                           │   │
│  │            │  │  │  Page Title | Breadcrumb | Actions | Search  │   │
│  ├────────────┤  │  └──────────────────────────────────────────────┘   │
│  │            │  │                                                      │
│  │  NAV       │  │  ┌──────────────────────────────────────────────┐   │
│  │  ITEMS     │  │  │                                              │   │
│  │            │  │  │           PAGE CONTENT                       │   │
│  │  Home      │  │  │                                              │   │
│  │  Content   │  │  │  (varies by page)                            │   │
│  │  Topics    │  │  │                                              │   │
│  │  Skills    │  │  │                                              │   │
│  │            │  │  │                                              │   │
│  ├────────────┤  │  └──────────────────────────────────────────────┘   │
│  │            │  │                                                      │
│  │  FOOTER    │  │                                                      │
│  │  Settings  │  │                                                      │
│  │  Theme     │  │                                                      │
│  │  Profile   │  │                                                      │
│  └────────────┘  │                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Small desktop */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */
```

### Layout Patterns

| Viewport | Sidebar | Content Width | Chat Panel |
|----------|---------|---------------|------------|
| < 768px | Hidden (drawer) | Full | Overlay modal |
| 768-1024px | Collapsed (icons) | Full - 56px | Overlay |
| 1024-1280px | Expanded (72px) | 100% - 72px | Side panel (320px) |
| > 1280px | Expanded (72px) | Max 1200px centered | Side panel (400px) |

---

## Mobile Responsiveness

### Design Philosophy for Mobile

While MVP is desktop-first, the application should be **usable** on tablet and **functional** on mobile. The approach is progressive enhancement - core functionality works everywhere, advanced features shine on desktop.

**Priority Levels**:
- **P0 (Must Work)**: View content, basic navigation, theme toggle
- **P1 (Should Work)**: Create/edit artifacts, topic management, AI chat
- **P2 (Nice to Have)**: Kanban drag-drop, split-view editor, inline suggestions

### Mobile Layout (< 640px)

```
┌─────────────────────────────────┐
│  ☰  Consulting Toolkit    [👤]  │  ← Header with hamburger menu
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │  Good morning, Kobi!      │  │
│  │  Let's create something.  │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │  ← Full-width cards
│  │  📝 Create Content        │  │
│  │  [Start Creating →]       │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  💡 Explore Topics        │  │
│  │  [Find Topics →]          │  │
│  └───────────────────────────┘  │
│                                 │
│  RECENT                         │
│  ┌─────────┐ ┌─────────┐       │  ← Horizontal scroll
│  │ Post #1 │ │ Blog #1 │ →     │
│  └─────────┘ └─────────┘       │
│                                 │
├─────────────────────────────────┤
│  🏠    📝    💡    👤    ⚙️    │  ← Bottom navigation
└─────────────────────────────────┘
```

### Tablet Layout (768px - 1024px)

```
┌─────────────────────────────────────────────────────┐
│  [≡]  │  Consulting Toolkit              [🔍] [👤]  │
├───────┼─────────────────────────────────────────────┤
│  🏠   │  Good morning, Kobi!                        │
│  📝   │  Let's create something today.              │
│  💡   │                                             │
│  📊   │  ┌─────────────────┐ ┌─────────────────┐   │
│       │  │  📝 Create      │ │  💡 Topics      │   │
│  ───  │  │  Content        │ │  [Find →]       │   │
│  ⚙️   │  │  [Start →]      │ └─────────────────┘   │
│  🌙   │  └─────────────────┘                        │
└───────┴─────────────────────────────────────────────┘
   56px              Remaining width
```

### Mobile-Specific Components

#### 1. Mobile Navigation Drawer

```tsx
// Triggered by hamburger menu
// Slides in from left, covers 80% of screen
// Backdrop closes drawer on tap

interface MobileNavDrawer {
  isOpen: boolean;
  onClose: () => void;
}

// Visual treatment:
// - Full height overlay
// - Background: --color-bg-raised
// - Backdrop: rgba(0,0,0,0.5) with blur
// - Slide animation: 250ms ease-out
// - Close button (X) top-right
// - Nav items: 48px touch target height
```

**CSS**:
```css
.mobile-drawer {
  position: fixed;
  inset: 0;
  z-index: 50;
  transform: translateX(-100%);
  transition: transform 250ms ease-out;
}

.mobile-drawer[data-open="true"] {
  transform: translateX(0);
}

.mobile-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
```

#### 2. Bottom Navigation Bar

```tsx
// Fixed bottom bar for primary navigation on mobile
// 5 items max, icon + label

const bottomNavItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: FileText, label: 'Content', href: '/content' },
  { icon: Lightbulb, label: 'Topics', href: '/topics' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];
```

**Visual Treatment**:
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--color-bg-raised);
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom); /* iOS safe area */
  z-index: 40;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  min-width: 64px;
  color: var(--color-text-muted);
}

.bottom-nav-item[data-active="true"] {
  color: var(--color-primary-300);
}
```

#### 3. Mobile AI Chat Modal

```
┌─────────────────────────────────┐
│  AI Assistant           [×]     │  ← Fixed header
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │  ✨ How can I help you    │  │
│  │  create content today?    │  │
│  └───────────────────────────┘  │
│                                 │
│            ┌─────────────────┐  │
│            │  Help me write  │  │
│            │  a LinkedIn post│  │
│            └─────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Great! What topic would  │  │
│  │  you like to write about? │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  [Ask me anything...]      [↑]  │  ← Sticky input
│  ─────────────────────────────  │
│  Enter send                     │
└─────────────────────────────────┘
```

**Implementation**:
```css
.mobile-chat-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: var(--color-bg-base);
  display: flex;
  flex-direction: column;
}

.mobile-chat-header {
  position: sticky;
  top: 0;
  height: 56px;
  background: var(--color-bg-raised);
  border-bottom: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.mobile-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px; /* Space for input */
}

.mobile-chat-input {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: var(--color-bg-raised);
  border-top: 1px solid var(--color-border-subtle);
}
```

#### 4. Mobile Artifact Editor

On mobile, the editor becomes full-screen with AI as a floating action button:

```
┌─────────────────────────────────┐
│  ← Back    LinkedIn Post  [💾]  │
├─────────────────────────────────┤
│  Title                          │
│  ┌───────────────────────────┐  │
│  │ 5 Things I Learned...     │  │
│  └───────────────────────────┘  │
│                                 │
│  Content                        │
│  ┌───────────────────────────┐  │
│  │ [B I U] [H1] [•] [🔗]     │  │  ← Simplified toolbar
│  ├───────────────────────────┤  │
│  │                           │  │
│  │ After a year of building  │  │
│  │ AI products, I've         │  │
│  │ learned that...           │  │
│  │                           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│  1,234 / 3,000                  │
│                                 │
│  ▼ Metadata                     │  ← Collapsible
│                                 │
│                          [✨]   │  ← FAB for AI
└─────────────────────────────────┘
```

**AI Floating Action Button**:
```css
.ai-fab {
  position: fixed;
  bottom: 80px; /* Above bottom nav or input */
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--gradient-accent);
  box-shadow: 0 4px 12px rgba(14, 204, 237, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.ai-fab:active {
  transform: scale(0.95);
}
```

#### 5. Mobile Topic Cards (Swipeable)

On mobile, kanban becomes a swipeable list view:

```
┌─────────────────────────────────┐
│  Topics                [+ Add]  │
├─────────────────────────────────┤
│  ┌─ Ideas ─┬─ Research ─┬─ Ready ─┬─ Done ─┐
│  │    ●    │     ○      │    ○    │   ○    │  ← Tab pills
│  └─────────┴────────────┴─────────┴────────┘
│                                 │
│  ┌───────────────────────────┐  │
│  │  ✨ AI Product Management │  │
│  │  📱 Social Post           │  │
│  │  ──────────────────────── │  │
│  │  [Move →]           [⋮]   │  │  ← Swipe or button
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Building Trust in Remote │  │
│  │  📰 Blog                  │  │
│  │  ──────────────────────── │  │
│  │  [Move →]           [⋮]   │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Swipe Actions**:
```tsx
// Swipe right: Move to next status
// Swipe left: Delete/archive
// Long press: Context menu

interface SwipeableCard {
  onSwipeRight: () => void; // Next status
  onSwipeLeft: () => void;  // Archive
  onLongPress: () => void;  // Context menu
}
```

### Touch Interaction Guidelines

#### Touch Target Sizes

| Element | Minimum Size | Recommended |
|---------|--------------|-------------|
| Buttons | 44px × 44px | 48px × 48px |
| Nav items | 44px × 44px | 48px × 48px |
| List items | 44px height | 56px height |
| Icons (tappable) | 44px × 44px | 48px × 48px |
| Form inputs | 44px height | 48px height |

#### Touch Spacing

```css
/* Minimum space between touch targets */
--touch-spacing: 8px;

/* Safe tap areas - no adjacent targets within */
.touch-safe {
  margin: 8px;
}
```

#### Gesture Support

| Gesture | Action | Usage |
|---------|--------|-------|
| Tap | Primary action | Buttons, links, cards |
| Long press | Context menu | Cards, list items |
| Swipe left | Destructive action | Cards, list items |
| Swipe right | Positive action | Topic status change |
| Pull down | Refresh | Lists, feeds |
| Pinch | N/A (disabled) | Not used in MVP |

### Mobile Typography Adjustments

```css
@media (max-width: 640px) {
  :root {
    --text-display-lg: 1.75rem;  /* 28px - reduced from 36px */
    --text-display-md: 1.5rem;   /* 24px - reduced from 30px */
    --text-heading-lg: 1.25rem;  /* 20px - reduced from 24px */
    --text-heading-md: 1.125rem; /* 18px - reduced from 20px */
    --text-body-lg: 1rem;        /* 16px - unchanged */
    --text-body-md: 0.875rem;    /* 14px - unchanged */
  }
}
```

### Mobile Spacing Adjustments

```css
@media (max-width: 640px) {
  :root {
    --page-padding: 16px;        /* Reduced from 24px */
    --card-padding: 12px;        /* Reduced from 16px */
    --section-gap: 24px;         /* Reduced from 32px */
  }
}
```

### Safe Area Handling (iOS)

```css
/* Account for notch and home indicator */
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Bottom nav needs extra padding */
.bottom-nav {
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

/* Fixed inputs need safe area */
.fixed-input {
  bottom: env(safe-area-inset-bottom);
}
```

### Mobile Performance Considerations

1. **Image Optimization**:
   - Use `srcset` for responsive images
   - Lazy load images below the fold
   - Max illustration size: 120px on mobile

2. **Animation Performance**:
   - Use `transform` and `opacity` only
   - Reduce animation duration on mobile (150ms vs 200ms)
   - Disable complex animations on low-end devices

3. **Bundle Size**:
   - Lazy load AI chat component
   - Code-split by route
   - Defer non-critical CSS

### Responsive Component Variants

```tsx
// Hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

// Responsive component example
function ArtifactEditor({ artifactId }: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileArtifactEditor artifactId={artifactId} />;
  }

  return <DesktopArtifactEditor artifactId={artifactId} />;
}
```

### Testing Checklist - Mobile

- [ ] Navigation drawer opens/closes smoothly
- [ ] Bottom navigation highlights active route
- [ ] All touch targets are at least 44px
- [ ] Forms are usable with on-screen keyboard
- [ ] AI chat modal is full-screen and functional
- [ ] Safe areas respected on iOS devices
- [ ] Horizontal scroll doesn't break layout
- [ ] Text is readable without zooming
- [ ] Buttons are reachable with one thumb
- [ ] Loading states display correctly
- [ ] Error messages are visible and actionable

---

## Component Library

### 1. Navigation Sidebar

```tsx
// Collapsed state: 56px with icon-only navigation
// Expanded state: 72px with icon + text

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
  isActive?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: FileText, label: 'Content', href: '/content' },
  { icon: Lightbulb, label: 'Topics', href: '/topics' },
  { icon: BarChart3, label: 'Skills', href: '/skills' },
  { icon: User, label: 'Profile', href: '/profile' },
];
```

**Visual Treatment**:
- Dark mode: Subtle gradient background (`linear-gradient(180deg, #0a1628 0%, #030812 100%)`)
- Active item: Cyan left border (3px) + background highlight
- Hover: Surface elevation with cyan glow

### 2. Domain Cards (Thinkup-inspired)

Feature cards with illustration and guidance text:

```tsx
interface DomainCard {
  title: string;
  description: string;
  illustration: React.ReactNode; // SVG illustration
  action: {
    label: string;
    href: string;
  };
  category: string;
  categoryColor: string;
}
```

**Visual Treatment**:
- Large card (full width on mobile, 1/2 or 1/3 on desktop)
- Left section: Title, description, CTA button
- Right section: Hand-drawn style illustration (SVG)
- Subtle border with category color accent
- Hover: Lift with shadow, border intensifies

**Illustration Style**:
- Thin line drawings with slight imperfection
- Blue/cyan color palette
- Simple, iconic representations
- ~120x120px optimal size

### 3. Artifact Cards

```tsx
interface ArtifactCard {
  id: string;
  type: 'social_post' | 'blog' | 'showcase';
  title: string;
  excerpt: string;
  status: Status;
  updatedAt: Date;
  metadata: {
    platform?: string;
    wordCount?: number;
    readTime?: string;
  };
}
```

**Visual Treatment**:
- Compact card with type icon badge (top-left)
- Status pill (top-right): color-coded
- Title (semibold, 16px)
- Excerpt (2 lines, muted text)
- Footer: metadata + action menu

**Status Colors**:
```css
--status-draft: #64748b;        /* Gray */
--status-in-progress: #f59e0b;  /* Amber */
--status-ready: #0ECCED;        /* Cyan */
--status-published: #10b981;    /* Green */
--status-archived: #475569;     /* Dark gray */
```

### 4. Topic Cards (Kanban)

```tsx
interface TopicCard {
  id: string;
  title: string;
  description?: string;
  source: 'manual' | 'ai_suggested';
  targetType?: ArtifactType;
  priority: number;
}
```

**Visual Treatment**:
- Compact, draggable card
- AI-suggested badge (sparkle icon + cyan tint)
- Target type icon (if set)
- Drag handle (dots icon, left side)
- Quick action menu on hover

### 5. AI Chat Panel

**Layout**:
```
┌─────────────────────────────────────┐
│  AI Assistant            [−] [×]   │  ← Header with controls
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │  ← AI Message
│  │  ✨ I found 5 topic ideas   │   │
│  │  for your expertise...      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐  │  ← Tool Result Card
│  │  📋 Topic Suggestions        │  │
│  │  ├─ Building AI Products...  │  │
│  │  ├─ PM Career Transitions... │  │
│  │  └─ [Add to Backlog]        │  │
│  └──────────────────────────────┘  │
│                                     │
│            ┌────────────────────┐  │  ← User Message
│            │  Expand on the     │  │
│            │  first one         │  │
│            └────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│  [Ask me anything...]          [↑] │  ← Input
│  Enter send · Shift+Enter newline  │  ← Hints
└─────────────────────────────────────┘
```

**Visual Treatment**:
- Panel background: `--color-bg-raised`
- AI messages: Left-aligned, subtle cyan accent
- User messages: Right-aligned, `--color-primary-700` background
- Tool results: Interactive cards with borders
- Input: Dark field with glowing border on focus
- Streaming indicator: Pulsing cyan dot

### 6. Rich Text Editor

Based on Tiptap with custom styling:

**Toolbar**:
```
┌────────────────────────────────────────────────────────────────┐
│ B  I  U  S  │ H1 H2 H3 │ • │ " │ — │ 🔗 │ 📷 │ ⋮ │ AI ✨    │
└────────────────────────────────────────────────────────────────┘
```

**Visual Treatment**:
- Floating toolbar (appears on text selection)
- Clean monochrome icons
- AI button (cyan accent) for inline AI assistance
- Character/word count in footer

### 7. Form Components

**Text Fields**:
```tsx
// Uses BaseTextField pattern from existing codebase
<BaseTextField
  label="Post Title"
  placeholder="Enter a compelling title..."
  value={title}
  onChange={setTitle}
  error={errors.title}
  maxLength={100}
  showCount
/>
```

**Visual Treatment**:
- Label above field (12px, medium weight, muted color)
- Field: Dark surface with subtle border
- Focus: Cyan border glow
- Error: Red border + error message below
- Character count: Right-aligned, muted

**Text Areas**:
```tsx
<BaseTextArea
  label="Description"
  placeholder="Describe your idea..."
  value={description}
  onChange={setDescription}
  rows={4}
  autoGrow
/>
```

### 8. Buttons

**Variants**:

| Variant | Usage | Style |
|---------|-------|-------|
| `primary` | Main actions | Gradient background, white text |
| `secondary` | Secondary actions | Border, no fill |
| `ghost` | Tertiary actions | No border, hover fill |
| `danger` | Destructive actions | Red background |
| `icon` | Icon-only buttons | Circular, subtle |

**Sizes**:
- `sm`: 32px height, 12px padding
- `md`: 40px height, 16px padding (default)
- `lg`: 48px height, 24px padding

### 9. Status Badges

```tsx
<Badge status="in_progress">In Progress</Badge>
<Badge variant="ai">AI Generated</Badge>
<Badge variant="count">4</Badge>
```

**Visual Treatment**:
- Pill shape (full rounded)
- Status-based colors (see status colors above)
- AI badge: Sparkle icon + cyan background
- Count badge: Circular, primary color

### 10. Modal/Dialog

**Portal Pattern** (per codebase standards):
```tsx
return createPortal(
  <div data-portal-ignore-click-outside className="modal-overlay">
    <div className="modal-container">
      {/* Modal content */}
    </div>
  </div>,
  document.body
);
```

**Visual Treatment**:
- Overlay: `--color-bg-overlay` with blur
- Container: `--color-bg-elevated` with shadow
- Header: Title + close button
- Body: Scrollable if needed
- Footer: Action buttons, right-aligned

---

## Page Designs

### 1. Home / Dashboard

**Purpose**: Welcome users and surface actionable items

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Good morning, [Name]! Let's create something today. ☀️         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───── FOR YOU ─────┬──── TO DO ────┬─── RECENT ───┬──── MAP ────┐   │
│  │                   │               │              │             │   │
│  └───────────────────┴───────────────┴──────────────┴─────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  📝 Create Content              │  │  💡 Explore Topics          │  │
│  │                                 │  │                             │  │
│  │  Turn your expertise into       │  │  Discover what to write     │  │
│  │  LinkedIn posts, blogs, and     │  │  about with AI-powered      │  │
│  │  case studies.                  │  │  research.                  │  │
│  │                                 │  │                             │  │
│  │  [Start Creating →]        🖊️   │  │  [Find Topics →]       💡   │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  🎯 Build Your Profile          │  │  📊 Track Skills            │  │
│  │                                 │  │                             │  │
│  │  Help AI understand your        │  │  Document your expertise    │  │
│  │  background and writing style.  │  │  for smarter content.       │  │
│  │                                 │  │                             │  │
│  │  [Set Up Profile →]        👤   │  │  [Add Skills →]        📊   │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  RECENT CONTENT                                            [View All]   │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ Post #1  │ │ Blog #1  │ │ Showcase │ │ Post #2  │                   │
│  │ Draft    │ │ Ready    │ │ Pubshd   │ │ Draft    │                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Welcome banner with time-aware greeting
- Tab navigation: For You | To Do | Recent | Map
- Domain cards with illustrations (Thinkup-inspired)
- Recent content horizontal scroll

### 2. Content Hub

**Purpose**: Manage all artifacts (Social Posts, Blogs, Showcases)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MY CONTENT                                    [+ New] [Filter ▼] 🔍   │
│                                                                         │
│  ┌─── ALL ───┬── POSTS ──┬── BLOGS ──┬── SHOWCASES ──┐                 │
│  │   (12)    │    (5)    │    (4)    │     (3)       │                 │
│  └───────────┴───────────┴───────────┴───────────────┘                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📱 LinkedIn Post                              ● In Progress     │   │
│  │  "5 Things I Learned Building AI Products"                       │   │
│  │  A reflection on the past year of shipping AI features...       │   │
│  │  ──────────────────────────────────────────────────────         │   │
│  │  Updated 2 hours ago · 1,234 chars                    [⋮]       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📰 Blog Post                                      ○ Draft       │   │
│  │  "The Future of Product Management in 2026"                      │   │
│  │  Exploring how AI is reshaping the PM role...                   │   │
│  │  ──────────────────────────────────────────────────────         │   │
│  │  Updated yesterday · 2,500 words · 10 min read        [⋮]       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🏆 Case Study                                   ✓ Published     │   │
│  │  "Product Strategy at Scale: TechCorp"                          │   │
│  │  How we increased conversion by 40% through...                  │   │
│  │  ──────────────────────────────────────────────────────         │   │
│  │  Published Dec 15 · 3 metrics                         [⋮]       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Type filter tabs with counts
- Status filter dropdown
- Search input
- List view with rich artifact cards
- Quick actions menu per card

### 3. Artifact Editor (with AI Chat)

**Purpose**: Create/edit content with AI assistance

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Content    LinkedIn Post                    [💾 Save] [⋮]   │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌───────────────────────────────────────────┐  ┌─────────────────────┐│
│  │  EDITOR (60%)                             │  │  AI ASSISTANT       ││
│  │                                           │  │  ─────────────────  ││
│  │  ┌─────────────────────────────────────┐  │  │                     ││
│  │  │  Title                              │  │  │  💬 How can I help? ││
│  │  │  [5 Things I Learned Building AI... ]│  │  │                     ││
│  │  └─────────────────────────────────────┘  │  │  ┌─────────────────┐││
│  │                                           │  │  │ ✨ I can help   │││
│  │  ┌─────────────────────────────────────┐  │  │  │ you with:       │││
│  │  │  Content                            │  │  │  │                 │││
│  │  │  ┌─────────────────────────────────┐│  │  │  │ • Research      │││
│  │  │  │ B I U │ H1 H2 │ • │ " │ 🔗 │ AI ││  │  │  │ • Draft         │││
│  │  │  └─────────────────────────────────┘│  │  │  │ • Polish        │││
│  │  │                                     │  │  │  │ • Hashtags      │││
│  │  │  After a year of building AI       │  │  │  └─────────────────┘││
│  │  │  products, I've learned that...    │  │  │                     ││
│  │  │                                     │  │  │  ───────────────── ││
│  │  │  1. **Start with the problem**     │  │  │                     ││
│  │  │  Not the technology. The best AI   │  │  │  🗣️ "Help me write ││
│  │  │  features solve real pain points.  │  │  │   a hook for this  ││
│  │  │                                     │  │  │   post"            ││
│  │  │  2. **Measure what matters**       │  │  │                     ││
│  │  │  _                                 │  │  │  ✨ Here's a hook   ││
│  │  │                                     │  │  │  that emphasizes   ││
│  │  └─────────────────────────────────────┘  │  │  your experience:  ││
│  │                                           │  │                     ││
│  │  ─────────────────────────────────────   │  │  "One year. 47      ││
│  │  1,234 / 3,000 characters                │  │  features. Here's   ││
│  │                                           │  │  what I wish I     ││
│  │  ┌─────────────────────────────────────┐  │  │  knew on day 1."   ││
│  │  │  METADATA                           │  │  │                     ││
│  │  │  Platform: LinkedIn  Status: Draft  │  │  │  [Insert ↑] [Edit] ││
│  │  │  Target: Product Managers           │  │  │                     ││
│  │  │  Hashtags: #ProductManagement #AI   │  │  ├─────────────────────┤│
│  │  └─────────────────────────────────────┘  │  │ [Ask me anything...││
│  │                                           │  │  Enter send         ││
│  └───────────────────────────────────────────┘  └─────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Split view: Editor (60%) + Chat (40%)
- Floating rich text toolbar
- Character count with limit
- Metadata panel (collapsible)
- AI suggestions with insert action
- Chat history with tool results

### 4. Topics Backlog (Kanban)

**Purpose**: Manage content ideas through stages

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPIC BACKLOG                              [+ New Topic] [AI Research] │
│                                                                         │
│  ┌────────────────┬────────────────┬────────────────┬────────────────┐ │
│  │    IDEAS       │  RESEARCHING   │     READY      │   EXECUTED     │ │
│  │    (8)         │     (2)        │      (3)       │      (5)       │ │
│  ├────────────────┼────────────────┼────────────────┼────────────────┤ │
│  │                │                │                │                │ │
│  │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ │
│  │ │ ✨ AI Gen  │ │ │ PM Career  │ │ │ LinkedIn   │ │ │ ✓ 5 Things │ │ │
│  │ │ AI Product │ │ │ Transitions│ │ │ Algorithm  │ │ │   I Learned │ │ │
│  │ │ Management │ │ │            │ │ │ Tips       │ │ │            │ │ │
│  │ │ 📱 Post    │ │ │ 📰 Blog    │ │ │ 📱 Post    │ │ │ → Post #1  │ │ │
│  │ └────────────┘ │ └────────────┘ │ └────────────┘ │ └────────────┘ │ │
│  │                │                │                │                │ │
│  │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ │
│  │ │ Building   │ │ │ Remote     │ │ │ Case Study │ │ │ ✓ Remote   │ │ │
│  │ │ Trust in   │ │ │ Product    │ │ │ Framework  │ │ │   Work     │ │ │
│  │ │ Remote... │ │ │ Teams      │ │ │            │ │ │            │ │ │
│  │ │ 📰 Blog    │ │ └────────────┘ │ │ 🏆 Case    │ │ │ → Blog #3  │ │ │
│  │ └────────────┘ │                │ └────────────┘ │ └────────────┘ │ │
│  │                │                │                │                │ │
│  │ ┌────────────┐ │                │ ┌────────────┐ │                │ │
│  │ │ Metrics    │ │                │ │ Strategy   │ │                │ │
│  │ │ That       │ │                │ │ Document   │ │                │ │
│  │ │ Matter     │ │                │ │ Template   │ │                │ │
│  │ │ 📱 Post    │ │                │ │ 📰 Blog    │ │                │ │
│  │ └────────────┘ │                │ └────────────┘ │                │ │
│  │                │                │                │                │ │
│  │ [+ Add idea]   │                │                │                │ │
│  │                │                │                │                │ │
│  └────────────────┴────────────────┴────────────────┴────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- 4-column kanban layout
- Draggable topic cards
- AI-suggested badge (sparkle)
- Target artifact type indicator
- Link to executed artifact in final column
- "AI Research" button triggers topic suggestions

### 5. User Profile / Context

**Purpose**: Set up user information for AI personalization

```
┌─────────────────────────────────────────────────────────────────────────┐
│  YOUR PROFILE                                               [Save All] │
│                                                                         │
│  Help the AI understand you better to create personalized content.      │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  👤 ABOUT ME                                          [Edit]    │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  Bio           Senior Product Manager with 10+ years...        │   │
│  │  Background    Started in engineering, moved to product...      │   │
│  │  Value Prop    I help companies ship AI products that users... │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  💼 PROFESSION                                        [Edit]    │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  Expertise     AI/ML Products, Platform Strategy, B2B SaaS     │   │
│  │  Industries    FinTech, HealthTech, Enterprise Software        │   │
│  │  Methods       Design Sprints, Jobs-to-be-Done, OKRs           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎯 CUSTOMERS                                         [Edit]    │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  Target        Series A-C startups, Enterprise product teams   │   │
│  │  Ideal Client  VP Product seeking strategic guidance on AI...  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ⭐ GOALS                                             [Edit]    │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  Content       Build thought leadership, 2 posts/week          │   │
│  │  Business      Land 3 consulting clients this quarter          │   │
│  │  Priorities    Showcase expertise in AI products               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Section-based layout
- Inline editing (click to expand form)
- Progress indicator showing profile completeness
- Context cards with icons

### 6. Writing Style Examples

**Purpose**: Store writing samples for AI style mimicking

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WRITING STYLE                                        [+ Add Example]   │
│                                                                         │
│  Teach the AI your voice by providing 4-5 writing samples.             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Progress: ████████░░ 4/5 examples                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📝 "LinkedIn Professional"                           [⋮]       │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  "After 10 years in product, I've learned that the best PMs    │   │
│  │  aren't the ones with the most features shipped. They're the   │   │
│  │  ones who know which features NOT to build..."                  │   │
│  │                                                                 │   │
│  │  ┌─ STYLE ANALYSIS ────────────────────────────────────────┐   │   │
│  │  │  Tone: Professional, Reflective                          │   │   │
│  │  │  Structure: Hook → Story → Insight                       │   │   │
│  │  │  Vocabulary: Industry terms, accessible                  │   │   │
│  │  │  Length: Medium (150-250 words)                          │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📝 "Technical Blog"                                  [⋮]       │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  "Let's break down how we implemented real-time analytics      │   │
│  │  at scale. First, some context: we were processing 10M        │   │
│  │  events per second..."                                          │   │
│  │                                                                 │   │
│  │  ┌─ STYLE ANALYSIS ────────────────────────────────────────┐   │   │
│  │  │  Tone: Technical, Educational                            │   │   │
│  │  │  Structure: Context → Problem → Solution → Results       │   │   │
│  │  │  Vocabulary: Technical jargon, code examples             │   │   │
│  │  │  Length: Long (800-1500 words)                           │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Progress indicator (4-5 examples target)
- Example cards with content preview
- AI-generated style analysis (collapsible)
- Label/category for each example

### 7. Skills Matrix

**Purpose**: Track competencies for content angle suggestions

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SKILLS MATRIX                                            [+ Add Skill] │
│                                                                         │
│  ┌─── PRODUCT ───┬── TECHNICAL ──┬── LEADERSHIP ──┬── INDUSTRY ───┐    │
│  │               │               │                │               │    │
│  └───────────────┴───────────────┴────────────────┴───────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        PRODUCT STRATEGY                          │   │
│  │  ═══════════════════════════════════════════════════════════════│   │
│  │                                                                  │   │
│  │  Strategy           ████████████████████  ★★★★★  8 yrs         │   │
│  │  Roadmapping        ████████████████░░░░  ★★★★☆  6 yrs         │   │
│  │  User Research      ████████████░░░░░░░░  ★★★☆☆  5 yrs         │   │
│  │  Data Analysis      ████████████████░░░░  ★★★★☆  7 yrs         │   │
│  │  AI/ML Products     ████████░░░░░░░░░░░░  ★★★☆☆  3 yrs         │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                           TECHNICAL                              │   │
│  │  ═══════════════════════════════════════════════════════════════│   │
│  │                                                                  │   │
│  │  System Design      ████████████░░░░░░░░  ★★★☆☆  4 yrs         │   │
│  │  APIs               ████████████████░░░░  ★★★★☆  6 yrs         │   │
│  │  SQL                ████████████████████  ★★★★★  10 yrs        │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Category tabs
- Visual proficiency bars
- Star rating (1-5)
- Years of experience
- Hover for edit/delete actions

---

## Animation & Interaction Patterns

### Page Transitions

```css
/* Fade + slight slide for page changes */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
```

### Micro-interactions

| Element | Interaction | Animation |
|---------|-------------|-----------|
| Buttons | Hover | Scale 1.02, shadow increase |
| Cards | Hover | Lift (translateY -2px), border glow |
| Inputs | Focus | Border color + glow animation |
| Chat messages | Appear | Fade in + slide from direction |
| Streaming text | Typing | Character-by-character with cursor |
| Drag items | Drag | Slight rotation, shadow |
| Modals | Open | Scale from 0.95, fade in |
| Toasts | Show | Slide in from right |

### Loading States

```tsx
// Skeleton for cards
<div className="animate-pulse">
  <div className="h-4 bg-surface-hover rounded w-3/4 mb-2" />
  <div className="h-3 bg-surface-hover rounded w-1/2" />
</div>

// AI thinking indicator
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-primary-300 animate-pulse" />
  <span className="text-muted">AI is thinking...</span>
</div>
```

### Chat Streaming Effect

```tsx
// Streaming text with cursor
function StreamingText({ text, isStreaming }) {
  return (
    <span>
      {text}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary-300 ml-0.5 animate-blink" />
      )}
    </span>
  );
}
```

---

## Illustrations Style Guide

Inspired by Thinkup's hand-drawn aesthetic:

### Characteristics

- **Line weight**: 1.5-2px strokes
- **Style**: Slightly imperfect, human-drawn feel
- **Colors**:
  - Primary: `#025EC4` (medium blue)
  - Accent: `#0ECCED` (cyan)
  - Fill: `rgba(14, 204, 237, 0.1)` (cyan wash)
- **Size**: 100-150px square
- **Content**: Abstract representations of concepts

### Illustration Set Needed

| Illustration | Usage | Description |
|--------------|-------|-------------|
| `create-content` | Home card | Pen writing on paper |
| `explore-topics` | Home card | Lightbulb with rays |
| `build-profile` | Home card | Person silhouette with notes |
| `track-skills` | Home card | Bar chart trending up |
| `ai-assistant` | Chat empty state | Friendly robot/sparkle |
| `empty-content` | Empty states | Open box/folder |
| `success` | Completion states | Checkmark with confetti |

### SVG Template

```svg
<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background shape -->
  <rect x="20" y="20" width="80" height="80" rx="12"
        fill="rgba(14, 204, 237, 0.1)"
        stroke="#025EC4"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-dasharray="0 0" />

  <!-- Icon elements with hand-drawn feel -->
  <path d="M40 60 C45 55, 55 65, 60 60 C65 55, 75 65, 80 60"
        stroke="#0ECCED"
        stroke-width="2"
        stroke-linecap="round"
        fill="none" />
</svg>
```

---

## Accessibility Requirements

### Color Contrast

| Element | Foreground | Background | Ratio |
|---------|------------|------------|-------|
| Primary text | `#f0f4f8` | `#030812` | 16.5:1 |
| Secondary text | `#94a3b8` | `#030812` | 7.1:1 |
| Muted text | `#64748b` | `#030812` | 4.6:1 |
| Primary button | `#030812` | `#0ECCED` | 8.9:1 |
| Error text | `#ef4444` | `#030812` | 5.2:1 |

### Keyboard Navigation

- All interactive elements focusable via Tab
- Visible focus indicators (cyan outline)
- Escape closes modals/dropdowns
- Enter/Space activates buttons
- Arrow keys navigate dropdowns/kanban

### ARIA Labels

```tsx
// Buttons with icons only
<button aria-label="Create new content">
  <PlusIcon />
</button>

// Status indicators
<span role="status" aria-live="polite">
  {isLoading ? 'Loading...' : 'Content loaded'}
</span>

// Kanban columns
<div role="list" aria-label="Topic ideas column">
  <div role="listitem">Topic card</div>
</div>
```

### Screen Reader Considerations

- Meaningful heading hierarchy (h1 → h2 → h3)
- Alt text for illustrations
- Form labels associated with inputs
- Error messages linked to fields
- Skip-to-content link

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Install Plus Jakarta Sans font
- [ ] Set up CSS variables for colors, spacing, typography
- [ ] Create ThemeProvider with dark/light mode
- [ ] Build app shell with sidebar navigation
- [ ] Create base Button, Input, Card components

### Phase 2: Core Pages
- [ ] Home dashboard with domain cards
- [ ] Content hub with artifact list
- [ ] Topic backlog kanban
- [ ] User profile form

### Phase 3: AI Integration
- [ ] Chat panel component
- [ ] Streaming message display
- [ ] Tool result renderers
- [ ] Editor with AI sidebar

### Phase 4: Polish
- [ ] Add illustrations
- [ ] Implement animations
- [ ] Loading states and skeletons
- [ ] Empty states
- [ ] Error states
- [ ] Responsive adjustments

---

## File Artifacts to Create

```
frontend/src/
├── styles/
│   ├── globals.css          # CSS variables, base styles
│   └── animations.css       # Keyframe animations
├── components/
│   ├── ui/                  # shadcn + custom
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── illustrations/
│       ├── CreateContent.tsx
│       ├── ExploreTopics.tsx
│       └── ...
├── features/portfolio/
│   └── components/
│       ├── DomainCard.tsx
│       ├── ArtifactCard.tsx
│       ├── TopicCard.tsx
│       └── AIChat/
│           ├── ChatPanel.tsx
│           ├── ChatMessage.tsx
│           └── StreamingText.tsx
└── providers/
    └── ThemeProvider.tsx
```

---

*This specification provides the complete visual language for the Consulting Toolkit Portfolio MVP. Implementation should follow the component hierarchy and respect the design system for consistency.*
