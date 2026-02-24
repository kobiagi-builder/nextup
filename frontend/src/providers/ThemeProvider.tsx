/**
 * ThemeProvider - Manages light/dark/system theme preferences
 *
 * Features:
 * - System preference detection via prefers-color-scheme
 * - Persists user preference to localStorage
 * - Applies theme via 'dark' class on <html> element
 * - Syncs with Zustand store for global access
 *
 * Usage:
 * ```tsx
 * import { ThemeProvider } from '@/providers/ThemeProvider'
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourApp />
 *     </ThemeProvider>
 *   )
 * }
 * ```
 */

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'

// Theme options
type Theme = 'dark' | 'light' | 'system'

// Context value type
interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'dark' | 'light' // The actual applied theme
}

// Create context with default values
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

// Storage key for localStorage
const STORAGE_KEY = 'nextup-theme'

// Props for ThemeProvider
interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/**
 * Get system theme preference from media query
 */
function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * ThemeProvider Component
 *
 * Wraps the app and provides theme context with persistence.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  // Initialize theme from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme
    const stored = localStorage.getItem(storageKey)
    return (stored as Theme) || defaultTheme
  })

  // Compute the resolved theme (actual dark/light value)
  const resolvedTheme = useMemo<'dark' | 'light'>(() => {
    if (theme === 'system') return getSystemTheme()
    return theme
  }, [theme])

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement

    // Remove both classes first
    root.classList.remove('light', 'dark')

    // Apply the theme class
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  // Listen for system theme changes when using 'system' preference
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'

      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Persist theme to localStorage and update state
  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
  }

  // Context value
  const value: ThemeContextValue = {
    theme,
    setTheme,
    resolvedTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access theme context
 *
 * @throws Error if used outside ThemeProvider
 *
 * Usage:
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme()
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
