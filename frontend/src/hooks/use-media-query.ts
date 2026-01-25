/**
 * Media Query Hooks
 *
 * Responsive hooks for detecting viewport size and adapting UI.
 * Uses standard Tailwind CSS breakpoints.
 *
 * Breakpoints:
 * - sm: 640px (Mobile landscape)
 * - md: 768px (Tablet)
 * - lg: 1024px (Small desktop)
 * - xl: 1280px (Desktop)
 * - 2xl: 1536px (Large desktop)
 */

import { useState, useEffect } from 'react'

/**
 * Generic media query hook
 *
 * @param query - CSS media query string
 * @returns boolean indicating if query matches
 *
 * Usage:
 * ```tsx
 * const isWideScreen = useMediaQuery('(min-width: 1280px)')
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Handler for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern event listener
    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

/**
 * Check if viewport is mobile (< 640px)
 *
 * Usage:
 * ```tsx
 * const isMobile = useIsMobile()
 * if (isMobile) return <MobileView />
 * ```
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)')
}

/**
 * Check if viewport is tablet (640px - 1023px)
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
}

/**
 * Check if viewport is desktop (>= 1024px)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

/**
 * Get current breakpoint name
 *
 * Returns: 'mobile' | 'tablet' | 'desktop' | 'wide'
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' | 'wide' {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)')

  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  if (isDesktop) return 'desktop'
  return 'wide'
}
