/**
 * useExtractionWaterfall
 *
 * Coordinates per-field reveal timing when extraction completes.
 * Each field gets a staggered delay between reveals.
 */

import { useState, useEffect } from 'react'

export interface WaterfallEntry {
  fieldKey: string
  visible: boolean
  animationClass: string
}

export interface UseExtractionWaterfallReturn {
  entries: WaterfallEntry[]
  allRevealed: boolean
}

export function useExtractionWaterfall(
  fieldKeys: string[],
  trigger: boolean,
  delayBetween = 200,
  reducedMotion = false,
): UseExtractionWaterfallReturn {
  const [revealedCount, setRevealedCount] = useState(
    reducedMotion && trigger ? fieldKeys.length : 0
  )

  useEffect(() => {
    if (!trigger) {
      setRevealedCount(0)
      return
    }
    if (reducedMotion) {
      setRevealedCount(fieldKeys.length)
      return
    }

    let count = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    fieldKeys.forEach((_, i) => {
      const t = setTimeout(() => {
        count += 1
        setRevealedCount(count)
      }, i * delayBetween)
      timers.push(t)
    })

    return () => timers.forEach(clearTimeout)
  }, [trigger, fieldKeys.length, delayBetween, reducedMotion])

  const entries: WaterfallEntry[] = fieldKeys.map((key, i) => ({
    fieldKey: key,
    visible: i < revealedCount,
    animationClass: 'onboarding-animate-fade-up',
  }))

  return {
    entries,
    allRevealed: revealedCount >= fieldKeys.length,
  }
}
