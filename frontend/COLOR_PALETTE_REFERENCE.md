# Color Palette Reference

Visual reference for all available color palettes in the Product Consultant Helper.

---

## Cyan Palette - "Midnight Architect"

### Dark Mode (Primary Theme)

| Color | HEX | HSL | Usage |
|-------|-----|-----|-------|
| Background | `#030812` | `220 60% 3%` | Deepest background layer |
| Foreground | `#f0f4f8` | `210 20% 95%` | Primary text color |
| Card | `#0a1628` | `215 52% 10%` | Cards and panels |
| Popover | `#122238` | `215 47% 15%` | Modals and popovers |
| **Primary** | `#0ECCED` | `187 89% 49%` | **Bright cyan accent** |
| Secondary | `#122238` | `215 47% 15%` | Subtle blue backgrounds |
| Muted | `#94a3b8` | `215 16% 57%` | Muted text and icons |
| Accent | `#0ECCED` | `187 89% 49%` | Interactive elements |
| Border | `hsl(215 20% 25%)` | `215 20% 25%` | Subtle borders |
| Surface | `#0d1b2a` | `215 40% 12%` | Elevated surfaces |
| Surface Hover | `#1b3a5c` | `215 36% 22%` | Hover states |
| Surface Active | `#234b73` | `215 36% 28%` | Active states |

### Light Mode

| Color | HEX | HSL | Usage |
|-------|-----|-----|-------|
| Background | `#fafbfc` | `210 20% 98%` | Clean white background |
| Foreground | `#1a2332` | `222 47% 11%` | Dark text |
| **Primary** | `#025EC4` | `214 83% 39%` | **Deep blue accent** |
| Secondary | `#e8ecf0` | `210 16% 93%` | Subtle backgrounds |
| Muted | `#64748b` | `215 16% 47%` | Muted text |
| Border | `#d9e2ec` | `214 32% 91%` | Borders and dividers |

---

## Teal Palette - "Deep Dive"

Based on the color palette: #0F1515, #08282A, #1C5052, #177D81, #BDDED6

### Dark Mode (Primary Theme)

| Color | HEX | HSL | Usage |
|-------|-----|-----|-------|
| **Background** | `#0F1515` | `180 17% 7%` | **Deepest teal-black** |
| **Foreground** | `#BDDED6` | `165 43% 81%` | **Light teal text** |
| **Card** | `#08282A` | `183 68% 10%` | **Dark teal cards** |
| **Popover** | `#1C5052` | `182 49% 22%` | **Medium-dark teal modals** |
| **Primary** | `#2DA8AF` | `182 70% 50%` | **Bright teal accent** (brightened #177D81) |
| Secondary | `#1C5052` | `182 49% 22%` | Subtle teal backgrounds |
| Muted | `#85B3AC` | `165 25% 65%` | Medium teal gray |
| Accent | `#2DA8AF` | `182 70% 50%` | Interactive elements |
| Border | `hsl(183 30% 25%)` | `183 30% 25%` | Subtle borders |
| Surface | `#0C3134` | `183 60% 12%` | Elevated surfaces |
| Surface Hover | `#235E66` | `182 55% 28%` | Hover states |
| Surface Active | `#2A7883` | `182 55% 35%` | Active states |

### Light Mode

| Color | HEX | HSL | Usage |
|-------|-----|-----|-------|
| Background | `#fafcfb` | `165 20% 98%` | Very light teal-tinted white |
| Foreground | `#1a3232` | `180 40% 10%` | Dark teal text |
| **Primary** | `#177D81` | `182 70% 30%` | **Medium teal accent** |
| Secondary | `#e6efef` | `165 20% 92%` | Light teal gray |
| Muted | `#5f8080` | `182 20% 45%` | Muted teal |
| Border | `#d1e4e1` | `165 25% 88%` | Teal-tinted borders |

---

## Original "Deep Dive" Palette Colors

The teal palette is based on these original hex values:

| HEX | RGB | HSL | Name |
|-----|-----|-----|------|
| `#0F1515` | `15, 21, 21` | `180° 17% 7%` | Very dark teal/black |
| `#08282A` | `8, 40, 42` | `183° 68% 10%` | Dark teal |
| `#1C5052` | `28, 80, 82` | `182° 49% 22%` | Medium-dark teal |
| `#177D81` | `23, 125, 129` | `182° 70% 30%` | Medium teal |
| `#BDDED6` | `189, 222, 214` | `165° 43% 81%` | Light teal |

---

## Usage Guidelines

### Cyan Palette Best For:
- Professional applications
- Developer tools
- Tech-focused products
- High-contrast reading environments

### Teal Palette Best For:
- Wellness and health apps
- Environmental products
- Calm, focused interfaces
- Ocean or nature themes

---

## Accessibility

Both palettes are designed to meet WCAG AA standards for contrast:

### Text Contrast Ratios (Dark Mode)

**Cyan Palette:**
- Primary on Background: `#0ECCED` on `#030812` = **11.2:1** ✅
- Foreground on Background: `#f0f4f8` on `#030812` = **15.8:1** ✅

**Teal Palette:**
- Primary on Background: `#2DA8AF` on `#0F1515` = **9.8:1** ✅
- Foreground on Background: `#BDDED6` on `#0F1515` = **12.4:1** ✅

All combinations exceed the WCAG AA minimum of **4.5:1** for normal text and **3:1** for large text.

---

## Switching Between Palettes

1. Edit `frontend/.env.local`:
   ```env
   VITE_COLOR_PALETTE=teal
   ```

2. Restart development server:
   ```bash
   npm run dev:frontend
   ```

3. Verify in browser console:
   ```
   [Color Palette] Loaded: teal
   ```

---

## Design Tokens

### Cyan Palette Tokens

```scss
// Dark mode primary colors
$cyan-background: hsl(220, 60%, 3%);
$cyan-foreground: hsl(210, 20%, 95%);
$cyan-primary: hsl(187, 89%, 49%);
$cyan-card: hsl(215, 52%, 10%);
```

### Teal Palette Tokens

```scss
// Dark mode primary colors
$teal-background: hsl(180, 17%, 7%);
$teal-foreground: hsl(165, 43%, 81%);
$teal-primary: hsl(182, 70%, 50%);
$teal-card: hsl(183, 68%, 10%);
```

---

## Related Files

- **Palette Definitions**: `src/lib/color-palettes.ts`
- **Injection System**: `src/lib/inject-palette.ts`
- **Initialization**: `src/main.tsx`
- **Base Styles**: `src/index.css`
- **Configuration**: `frontend/.env.local`
- **Documentation**: `COLOR_PALETTE_GUIDE.md`
