/**
 * ConfettiCelebration
 *
 * Fires confetti from canvas-confetti on mount when `active` is true.
 * Lazy-loaded via React.lazy() in CompletionStep.
 * canvas-confetti manages its own canvas lifecycle.
 */

import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiCelebrationProps {
  active: boolean
}

export default function ConfettiCelebration({ active }: ConfettiCelebrationProps) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!active || firedRef.current) return
    firedRef.current = true

    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#0ECCED', '#025EC4', '#10b981', '#f59e0b', '#f0f4f8'],
        gravity: 1.2,
        drift: 0,
        ticks: 200,
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [active])

  return null
}
