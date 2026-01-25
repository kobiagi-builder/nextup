/**
 * Color Palette Injection Utility
 *
 * Dynamically injects CSS custom properties based on the active color palette.
 * This allows runtime color theme switching via environment variables.
 */

import { getActivePalette } from './color-palettes';

/**
 * Inject color palette CSS variables into the document root
 */
export function injectColorPalette(): void {
  const palette = getActivePalette();

  // Remove existing palette styles
  const existingStyle = document.getElementById('dynamic-palette');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create a new style tag for both light and dark mode
  const styleTag = document.createElement('style');
  styleTag.id = 'dynamic-palette';

  // Generate light mode CSS
  const lightModeCSS = Object.entries(palette.light)
    .map(([key, value]) => {
      const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      return `  ${cssVarName}: ${value};`;
    })
    .join('\n');

  // Generate dark mode CSS
  const darkModeCSS = Object.entries(palette.dark)
    .map(([key, value]) => {
      const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      return `  ${cssVarName}: ${value};`;
    })
    .join('\n');

  // Inject both as CSS rules (not inline styles to preserve specificity)
  styleTag.textContent = `
:root {
${lightModeCSS}
}

.dark {
${darkModeCSS}
}
`;

  document.head.appendChild(styleTag);

  // Log the active palette
  console.log(`[Color Palette] Loaded: ${palette.name}`);
}

/**
 * Initialize color palette on app load
 * Call this in your main.tsx or App.tsx
 */
export function initializeColorPalette(): void {
  // Inject palette CSS on load
  // The CSS rules will automatically apply when .dark class is toggled
  injectColorPalette();
}
