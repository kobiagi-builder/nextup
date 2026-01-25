import type { Config } from 'tailwindcss'

/**
 * Tailwind CSS Configuration - "Midnight Architect" Design System
 *
 * Design Philosophy:
 * - Depth over Flatness: Layered surfaces with subtle gradients and shadows
 * - Luminous Accents: Cyan (#0ECCED) draws attention to actions
 * - Breathing Space: Generous whitespace for content to breathe
 * - Confident Typography: Bold headers paired with refined body text
 */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom font families
      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      // Extended color palette for portfolio design system
      colors: {
        // Base shadcn colors (CSS variables)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        // Brand colors - Direct access for custom components
        brand: {
          900: '#020764',  // Deep indigo
          700: '#043780',  // Dark blue
          500: '#025EC4',  // Medium blue
          300: '#0ECCED',  // Bright cyan - ACCENT
          100: '#7DD3FC',  // Light cyan
        },
        // Semantic surface colors (use CSS variables in components)
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          hover: 'hsl(var(--surface-hover))',
          active: 'hsl(var(--surface-active))',
          selected: 'hsl(var(--surface-selected))',
        },
        // Status colors
        status: {
          draft: '#64748b',
          'in-progress': '#f59e0b',
          ready: '#0ECCED',
          published: '#10b981',
          archived: '#475569',
        },
      },
      // Border radius (consistent with shadcn)
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      // Spacing scale (8px base)
      spacing: {
        '18': '4.5rem',  // 72px - sidebar expanded
        '14': '3.5rem',  // 56px - sidebar collapsed
      },
      // Typography scale
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15' }],
        'display-md': ['1.875rem', { lineHeight: '1.2' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3' }],
        'heading-md': ['1.25rem', { lineHeight: '1.35' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4' }],
      },
      // Custom animations
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(14, 204, 237, 0.4)' },
          '50%': { boxShadow: '0 0 16px rgba(14, 204, 237, 0.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-in-right': 'slide-in-right 250ms ease-out',
        'blink': 'blink 1s step-end infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      // Box shadows with brand accent
      boxShadow: {
        'glow': '0 0 8px rgba(14, 204, 237, 0.4)',
        'glow-lg': '0 0 16px rgba(14, 204, 237, 0.5)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config
