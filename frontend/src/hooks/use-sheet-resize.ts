/**
 * useSheetResize
 *
 * Adds drag-to-resize behavior to a right-side Sheet panel.
 * Returns the current width and a ref callback for the drag handle.
 * Persists width to localStorage.
 */

import { useState, useCallback, useEffect, useRef } from 'react'

interface UseSheetResizeOptions {
  storageKey?: string
  defaultWidth?: number
  minWidth?: number
  maxWidthPercent?: number // max as % of viewport width
}

export function useSheetResize({
  storageKey = 'sheet-panel-width',
  defaultWidth = 768, // ~3xl (48rem)
  minWidth = 400,
  maxWidthPercent = 85,
}: UseSheetResizeOptions = {}) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed)) {
        const maxPx = window.innerWidth * (maxWidthPercent / 100)
        return Math.min(maxPx, Math.max(minWidth, parsed))
      }
    }
    return defaultWidth
  })

  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const clamp = useCallback(
    (w: number) => {
      const maxPx = window.innerWidth * (maxWidthPercent / 100)
      return Math.min(maxPx, Math.max(minWidth, w))
    },
    [minWidth, maxWidthPercent]
  )

  // Persist on change
  useEffect(() => {
    localStorage.setItem(storageKey, String(Math.round(width)))
  }, [width, storageKey])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      // Sheet is on the right, so dragging left increases width
      const delta = startX.current - e.clientX
      setWidth(clamp(startWidth.current + delta))
    }

    const onMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [clamp])

  return { width, onHandleMouseDown: onMouseDown }
}
