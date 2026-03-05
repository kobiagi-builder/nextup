/**
 * ShowMoreText
 *
 * Truncated text with "Show more" toggle for long extracted content.
 */

import { useState } from 'react'

interface ShowMoreTextProps {
  text: string
  maxChars?: number
  className?: string
}

export function ShowMoreText({ text, maxChars = 300, className }: ShowMoreTextProps) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncation = text.length > maxChars

  const displayText =
    needsTruncation && !expanded ? `${text.slice(0, maxChars)}\u2026` : text

  return (
    <span className={className}>
      {displayText}
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="ml-1 text-xs text-primary hover:underline focus-visible:ring-1 focus-visible:ring-ring rounded"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </span>
  )
}
