# Color Palette System Guide

## Overview

The Product Consultant Helper now supports multiple color palettes that can be switched via an environment variable. The system dynamically injects CSS custom properties based on the selected palette.

## Available Palettes

### Cyan (Default) - "Midnight Architect"
A sophisticated, depth-layered interface with deep blue foundations and luminous cyan accents.

**Light Mode:**
- Background: Clean white with subtle blue tints
- Primary: Deep blue (#025EC4)
- Accent: Blue (#025EC4)

**Dark Mode:**
- Background: Deep blue-black (#030812)
- Primary: Bright cyan (#0ECCED)
- Accent: Bright cyan (#0ECCED)

### Teal - "Deep Dive"
Rich teal foundations with aqua accents, inspired by deep ocean colors.

**Light Mode:**
- Background: Very light teal-tinted white
- Primary: Medium teal (#177D81)
- Accent: Medium teal (#177D81)

**Dark Mode:**
- Background: Deep teal-black (#0F1515)
- Primary: Bright teal (brightened #177D81)
- Card: Dark teal (#08282A)
- Popover: Medium-dark teal (#1C5052)
- Accent: Light teal (#BDDED6)

## How to Switch Palettes

### 1. Update Environment Variable

Edit `frontend/.env.local`:

```env
# Options: cyan | teal
VITE_COLOR_PALETTE=teal
```

### 2. Restart Development Server

Since environment variables are loaded at build time, you need to restart:

```bash
npm run dev:frontend
```

### 3. Verify in Browser

Open the browser console. You should see:
```
[Color Palette] Loaded: teal
```

## Architecture

### Files

| File | Purpose |
|------|---------|
| `src/lib/color-palettes.ts` | Defines all available color palettes with HSL values |
| `src/lib/inject-palette.ts` | Runtime injection utility that applies palette to DOM |
| `src/main.tsx` | Initializes palette on app load |
| `src/index.css` | Contains fallback CSS custom properties |
| `.env.local` | Configuration for active palette |

### How It Works

1. **Build Time**: Vite reads `VITE_COLOR_PALETTE` from `.env.local`
2. **Runtime**: `initializeColorPalette()` runs before React mounts
3. **Injection**: Palette CSS variables are injected into `:root` and `.dark`
4. **Live Updates**: MutationObserver re-injects when theme class changes

### CSS Variable Mapping

The system maps palette color definitions to CSS custom properties:

```typescript
// Palette definition (HSL format)
primary: '182 70% 30%'

// Injected as CSS variable
--primary: 182 70% 30%;

// Used in Tailwind/CSS
background-color: hsl(var(--primary));
```

## Adding New Palettes

### 1. Define Palette in `color-palettes.ts`

```typescript
const purplePalette: ColorPalette = {
  name: 'purple',
  light: {
    background: '270 20% 98%',
    primary: '270 70% 50%',
    // ... other colors
  },
  dark: {
    background: '270 60% 5%',
    primary: '270 80% 60%',
    // ... other colors
  },
};

// Register it
export const colorPalettes: Record<string, ColorPalette> = {
  cyan: cyanPalette,
  teal: tealPalette,
  purple: purplePalette, // Add here
};
```

### 2. Use It

```env
VITE_COLOR_PALETTE=purple
```

## Color Palette Interface

Each palette must implement the `ColorPalette` interface with both light and dark mode values:

```typescript
interface ColorPalette {
  name: string;
  light: {
    // Foundations
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;

    // Brand/Primary
    primary: string;
    primaryForeground: string;

    // Secondary and Muted
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;

    // Accent
    accent: string;
    accentForeground: string;

    // Destructive
    destructive: string;
    destructiveForeground: string;

    // Borders and inputs
    border: string;
    input: string;
    ring: string;

    // Surface colors
    surface: string;
    surfaceHover: string;
    surfaceActive: string;
    surfaceSelected: string;

    // Border opacity variants
    borderSubtle: string;
    borderDefault: string;
    borderStrong: string;
    borderAccent: string;
  };
  dark: {
    // Same structure as light
  };
}
```

## Color Format

All colors are defined in **HSL format without the `hsl()` wrapper**:

```typescript
// Correct
primary: '182 70% 30%'

// Wrong
primary: 'hsl(182, 70%, 30%)'
```

This allows Tailwind and CSS to use them with opacity:

```css
/* Works with opacity */
background-color: hsl(var(--primary) / 0.5);
```

## Converting HEX to HSL

Use online tools or this formula:

```
HEX: #177D81
RGB: (23, 125, 129)
HSL: hsl(182, 70%, 30%)
     -> Store as: '182 70% 30%'
```

## Troubleshooting

### Colors Don't Change After Updating .env.local

**Solution**: Restart the development server. Vite reads env variables at build time.

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev:frontend
```

### Palette Not Found Error

**Solution**: Check the palette name in `.env.local` matches a key in `colorPalettes`:

```typescript
// Valid names
VITE_COLOR_PALETTE=cyan   ✅
VITE_COLOR_PALETTE=teal   ✅
VITE_COLOR_PALETTE=blue   ❌ Not defined
```

### Colors Look Wrong

**Solution**: Check browser console for errors. Verify HSL values are correct:

```typescript
// HSL format (no hsl() wrapper)
primary: '182 70% 30%'  ✅
primary: 'hsl(182, 70%, 30%)'  ❌
```

## Best Practices

1. **Always provide both light and dark mode values** for every color
2. **Maintain consistent contrast ratios** (WCAG AA minimum: 4.5:1 for text)
3. **Test both themes** after defining a new palette
4. **Use semantic color names** (primary, accent, muted) not literal names (blue, red)
5. **Keep opacity variants consistent** across palettes for predictable UI behavior

## Future Enhancements

Potential additions to this system:

- [ ] Runtime palette switching (without restart)
- [ ] User-selectable palettes in settings
- [ ] Palette preview component
- [ ] Custom palette builder UI
- [ ] Palette validation and contrast checking
- [ ] Auto-generated gradients from palette
- [ ] Palette export/import (JSON)

## Examples

### Using Palette Colors in Components

```tsx
// Tailwind classes (automatic)
<div className="bg-primary text-primary-foreground">
  Primary Background
</div>

<div className="border-accent hover:bg-surface-hover">
  Interactive Element
</div>

// Direct CSS custom properties
<div style={{ backgroundColor: 'hsl(var(--primary))' }}>
  Custom Styled
</div>
```

### Accessing Active Palette in Code

```typescript
import { getActivePalette } from '@/lib/color-palettes';

const palette = getActivePalette();
console.log(`Current palette: ${palette.name}`);
```

## Related Documentation

- Tailwind CSS Documentation: https://tailwindcss.com/docs/customizing-colors
- HSL Color Format: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl
- WCAG Contrast Guidelines: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
