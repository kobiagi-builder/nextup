/**
 * useIsMobile Hook
 *
 * Detects if the viewport is mobile-sized.
 * Uses a media query listener for responsive behavior.
 */

import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    // Set initial value
    setIsMobile(mql.matches)

    // Listen for changes
    mql.addEventListener('change', handleChange)

    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [])

  return isMobile
}

export default useIsMobile
