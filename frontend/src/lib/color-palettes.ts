/**
 * Color Palette Configuration System
 *
 * Defines color palettes that can be switched via VITE_COLOR_PALETTE env variable.
 * Each palette provides light and dark mode color values in HSL format.
 */

export interface ColorPalette {
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
}

/**
 * Cyan Palette - "Midnight Architect"
 * Deep blue foundations with luminous cyan accents
 */
const cyanPalette: ColorPalette = {
  name: 'cyan',
  light: {
    // Foundations - Light mode
    background: '210 20% 98%',
    foreground: '222 47% 11%',
    card: '0 0% 100%',
    cardForeground: '222 47% 11%',
    popover: '0 0% 100%',
    popoverForeground: '222 47% 11%',

    // Brand Blues - Light mode uses deeper tones
    primary: '214 83% 39%',
    primaryForeground: '210 20% 98%',

    // Secondary and Muted
    secondary: '210 16% 93%',
    secondaryForeground: '222 47% 11%',
    muted: '210 16% 93%',
    mutedForeground: '215 16% 47%',

    // Accent - Blue for light mode
    accent: '214 83% 39%',
    accentForeground: '210 20% 98%',

    // Destructive - Light red
    destructive: '339 100% 94%',
    destructiveForeground: '340 100% 30%',

    // Borders and inputs
    border: '214 32% 91%',
    input: '214 32% 91%',
    ring: '214 83% 39%',

    // Surface colors - Light mode
    surface: '0 0% 100%',
    surfaceHover: '210 16% 96%',
    surfaceActive: '210 16% 93%',
    surfaceSelected: '214 83% 39% / 0.08',

    // Border opacity variants
    borderSubtle: '222 47% 11% / 0.05',
    borderDefault: '222 47% 11% / 0.1',
    borderStrong: '222 47% 11% / 0.2',
    borderAccent: '214 83% 39% / 0.4',
  },
  dark: {
    // Foundations - Deep blue layered backgrounds
    background: '220 60% 3%',        // #030812 - Deepest background
    foreground: '210 20% 95%',       // #f0f4f8 - Primary text
    card: '215 52% 10%',             // #0a1628 - Cards, panels
    cardForeground: '210 20% 95%',
    popover: '215 47% 15%',          // #122238 - Modals, popovers
    popoverForeground: '210 20% 95%',

    // Brand Blues - Cyan accent for dark mode
    primary: '187 89% 49%',          // #0ECCED - Bright cyan
    primaryForeground: '220 60% 3%', // Dark text on cyan

    // Secondary - Subtle blue
    secondary: '215 47% 15%',        // #122238
    secondaryForeground: '210 20% 95%',

    // Muted
    muted: '215 47% 15%',
    mutedForeground: '215 16% 57%',  // #94a3b8

    // Accent - Cyan for dark mode interactions
    accent: '187 89% 49%',           // #0ECCED
    accentForeground: '220 60% 3%',

    // Destructive - Dark red
    destructive: '340 100% 64%',
    destructiveForeground: '0 0% 100%',

    // Borders - Subtle for dark backgrounds
    border: '215 20% 25%',
    input: '215 20% 25%',
    ring: '187 89% 49%',             // Cyan focus ring

    // Surface colors - Dark mode elevation
    surface: '215 40% 12%',          // #0d1b2a
    surfaceHover: '215 36% 22%',     // #1b3a5c
    surfaceActive: '215 36% 28%',    // #234b73
    surfaceSelected: '187 89% 49% / 0.15',

    // Border opacity variants - For dark backgrounds
    borderSubtle: '215 20% 57% / 0.1',
    borderDefault: '215 20% 57% / 0.2',
    borderStrong: '215 20% 57% / 0.3',
    borderAccent: '187 89% 49% / 0.5',
  },
};

/**
 * Teal Palette - "Deep Dive"
 * Rich teal foundations with aqua accents
 * Based on: #0F1515, #08282A, #1C5052, #177D81, #BDDED6
 */
const tealPalette: ColorPalette = {
  name: 'teal',
  light: {
    // Foundations - Light mode with soft teals
    background: '165 20% 98%',       // Very light teal-tinted white
    foreground: '180 40% 10%',       // Dark teal for text
    card: '165 30% 100%',            // Pure white with teal hint
    cardForeground: '180 40% 10%',
    popover: '165 30% 100%',
    popoverForeground: '180 40% 10%',

    // Primary - Medium teal
    primary: '182 70% 30%',          // #177D81 - Medium teal
    primaryForeground: '165 20% 98%',

    // Secondary and Muted
    secondary: '165 20% 92%',        // Light teal gray
    secondaryForeground: '180 40% 10%',
    muted: '165 20% 92%',
    mutedForeground: '182 20% 45%',

    // Accent - Bright teal
    accent: '182 70% 30%',           // #177D81
    accentForeground: '165 20% 98%',

    // Destructive - Light red
    destructive: '339 100% 94%',
    destructiveForeground: '340 100% 30%',

    // Borders and inputs
    border: '165 25% 88%',
    input: '165 25% 88%',
    ring: '182 70% 30%',

    // Surface colors - Light mode
    surface: '165 30% 100%',
    surfaceHover: '165 20% 95%',
    surfaceActive: '165 20% 90%',
    surfaceSelected: '182 70% 30% / 0.08',

    // Border opacity variants
    borderSubtle: '180 40% 10% / 0.05',
    borderDefault: '180 40% 10% / 0.1',
    borderStrong: '180 40% 10% / 0.2',
    borderAccent: '182 70% 30% / 0.4',
  },
  dark: {
    // Foundations - Deep teal layered backgrounds
    background: '180 17% 7%',        // #0F1515 - Deepest teal-black
    foreground: '165 43% 81%',       // #BDDED6 - Light teal text
    card: '183 68% 10%',             // #08282A - Dark teal cards
    cardForeground: '165 43% 81%',
    popover: '182 49% 22%',          // #1C5052 - Medium-dark teal modals
    popoverForeground: '165 43% 81%',

    // Primary - Bright teal accent
    primary: '182 70% 50%',          // Brightened #177D81 for better contrast
    primaryForeground: '180 17% 7%', // Dark text on teal

    // Secondary - Subtle teal
    secondary: '182 49% 22%',        // #1C5052
    secondaryForeground: '165 43% 81%',

    // Muted
    muted: '182 49% 22%',
    mutedForeground: '165 25% 65%',  // Medium teal gray

    // Accent - Bright teal for interactions
    accent: '182 70% 50%',           // Brightened teal
    accentForeground: '180 17% 7%',

    // Destructive - Dark red
    destructive: '340 100% 64%',
    destructiveForeground: '0 0% 100%',

    // Borders - Subtle for dark backgrounds
    border: '183 30% 25%',
    input: '183 30% 25%',
    ring: '182 70% 50%',             // Bright teal focus ring

    // Surface colors - Dark mode elevation
    surface: '183 60% 12%',          // Slightly lighter than card
    surfaceHover: '182 55% 28%',     // Hover state
    surfaceActive: '182 55% 35%',    // Active state
    surfaceSelected: '182 70% 50% / 0.15',

    // Border opacity variants
    borderSubtle: '165 43% 81% / 0.1',
    borderDefault: '165 43% 81% / 0.2',
    borderStrong: '165 43% 81% / 0.3',
    borderAccent: '182 70% 50% / 0.5',
  },
};

/**
 * Available color palettes
 */
export const colorPalettes: Record<string, ColorPalette> = {
  cyan: cyanPalette,
  teal: tealPalette,
};

/**
 * Get the active color palette based on environment variable
 */
export function getActivePalette(): ColorPalette {
  const paletteName = import.meta.env.VITE_COLOR_PALETTE || 'cyan';
  return colorPalettes[paletteName] || colorPalettes.cyan;
}
