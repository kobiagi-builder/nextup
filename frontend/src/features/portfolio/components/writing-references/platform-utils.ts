/**
 * Platform detection utilities for publication URLs.
 * Used by both PublicationUrlInput and ReferenceCard for icon/label display.
 */

import type { PublicationPlatform } from '../../types/portfolio'

const PLATFORM_PATTERNS: { platform: PublicationPlatform; patterns: RegExp[] }[] = [
  {
    platform: 'linkedin',
    patterns: [
      /linkedin\.com\/posts\//,
      /linkedin\.com\/pulse\//,
      /linkedin\.com\/feed\/update\//,
    ],
  },
  {
    platform: 'medium',
    patterns: [/medium\.com\//, /\.medium\.com\//],
  },
  {
    platform: 'substack',
    patterns: [/\.substack\.com\/p\//],
  },
  {
    platform: 'reddit',
    patterns: [/reddit\.com\/r\/.*\/comments\//, /old\.reddit\.com\/r\/.*\/comments\//],
  },
  {
    platform: 'google_docs',
    patterns: [/docs\.google\.com\/document\/d\//],
  },
]

export function detectPlatform(url: string): PublicationPlatform {
  for (const { platform, patterns } of PLATFORM_PATTERNS) {
    if (patterns.some((p) => p.test(url))) return platform
  }
  return 'generic'
}

export const PLATFORM_META: Record<
  PublicationPlatform,
  { label: string; color: string }
> = {
  linkedin: { label: 'LinkedIn', color: 'text-[#0A66C2]' },
  medium: { label: 'Medium', color: 'text-foreground' },
  substack: { label: 'Substack', color: 'text-[#FF6719]' },
  reddit: { label: 'Reddit', color: 'text-[#FF4500]' },
  google_docs: { label: 'Google Docs', color: 'text-[#4285F4]' },
  generic: { label: 'Website', color: 'text-muted-foreground' },
}
