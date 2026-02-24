/**
 * PublicationUrlInput — URL input with automatic platform detection.
 *
 * Shows detected platform badge in real-time as user types/pastes.
 * Supported platform chips displayed below.
 */

import { useState, useMemo } from 'react'
import { Globe, Link2, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { detectPlatform, PLATFORM_META } from './platform-utils'
import type { PublicationPlatform } from '../../types/portfolio'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublicationUrlInputProps {
  url: string
  onUrlChange: (url: string) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Platform icon SVGs (inline for independence from icon library)
// ---------------------------------------------------------------------------

function PlatformBadge({ platform }: { platform: PublicationPlatform }) {
  const meta = PLATFORM_META[platform]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-brand-300/10 text-brand-300',
        'text-xs font-medium animate-in fade-in-0 zoom-in-95 duration-200'
      )}
    >
      <CheckCircle2 className="h-3 w-3" />
      <span>{meta.label} detected</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicationUrlInput({
  url,
  onUrlChange,
  className,
}: PublicationUrlInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const detectedPlatform = useMemo(() => {
    if (!url || url.length < 12) return null
    try {
      new URL(url) // validate URL
      return detectPlatform(url)
    } catch {
      return null
    }
  }, [url])

  const supportedPlatforms: { platform: PublicationPlatform; label: string }[] = [
    { platform: 'linkedin', label: 'LinkedIn' },
    { platform: 'medium', label: 'Medium' },
    { platform: 'substack', label: 'Substack' },
    { platform: 'reddit', label: 'Reddit' },
    { platform: 'google_docs', label: 'Google Docs' },
  ]

  return (
    <div className={cn('space-y-3', className)}>
      {/* URL input with icon */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Publication URL</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {detectedPlatform && detectedPlatform !== 'generic' ? (
              <Link2 className="h-4 w-4 text-brand-300" />
            ) : (
              <Globe
                className={cn(
                  'h-4 w-4 transition-colors',
                  isFocused ? 'text-foreground' : 'text-muted-foreground'
                )}
              />
            )}
          </div>
          <Input
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="https://linkedin.com/posts/..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Platform detection badge */}
      {detectedPlatform && detectedPlatform !== 'generic' && (
        <PlatformBadge platform={detectedPlatform} />
      )}

      {/* Supported platforms */}
      {!detectedPlatform && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Supported platforms
          </p>
          <div className="flex flex-wrap gap-1.5">
            {supportedPlatforms.map(({ platform, label }) => (
              <span
                key={platform}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md',
                  'text-[11px] font-medium',
                  'bg-secondary text-muted-foreground'
                )}
              >
                {label}
              </span>
            ))}
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md',
                'text-[11px] font-medium',
                'bg-secondary/50 text-muted-foreground/60'
              )}
            >
              + any URL
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
