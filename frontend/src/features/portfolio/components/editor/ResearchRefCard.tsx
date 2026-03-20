/**
 * ResearchRefCard
 *
 * Hover card showing research source details for an inline reference indicator.
 * Renders as a superscript pill badge that shows a floating card on hover.
 *
 * Design: gradient header zone per source type, opacity-based text hierarchy,
 * favicon + domain row, Radix arrow pointer.
 */

import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card'
import * as HoverCardPrimitive from '@radix-ui/react-hover-card'
import {
  MessageCircle,
  Linkedin,
  BookOpen,
  Mail,
  HelpCircle,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useResearchContext } from '../../contexts/ResearchContext'
import type { SourceType } from '../../types/portfolio'

interface ResearchRefCardProps {
  refId: string
  refIndex: string
}

// ---------------------------------------------------------------------------
// Source type visual config — gradient header + icon + label
// ---------------------------------------------------------------------------

interface SourceTypeConfig {
  icon: typeof MessageCircle
  label: string
  headerGradient: string
  labelColor: string
}

const SOURCE_TYPE_CONFIG: Record<SourceType, SourceTypeConfig> = {
  reddit: {
    icon: MessageCircle,
    label: 'Reddit',
    headerGradient: 'from-orange-500/12 via-orange-500/5 to-transparent',
    labelColor: 'text-orange-400',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    headerGradient: 'from-[#0A66C2]/12 via-[#0A66C2]/5 to-transparent',
    labelColor: 'text-[#4D9FDB]',
  },
  medium: {
    icon: BookOpen,
    label: 'Medium',
    headerGradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    labelColor: 'text-emerald-400',
  },
  substack: {
    icon: Mail,
    label: 'Substack',
    headerGradient: 'from-[#FF6719]/10 via-[#FF6719]/5 to-transparent',
    labelColor: 'text-[#FF8A50]',
  },
  quora: {
    icon: HelpCircle,
    label: 'Quora',
    headerGradient: 'from-red-500/10 via-red-500/5 to-transparent',
    labelColor: 'text-red-400',
  },
  user_provided: {
    icon: User,
    label: 'Provided',
    headerGradient: 'from-primary/8 via-primary/4 to-transparent',
    labelColor: 'text-muted-foreground',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExcerptPreview(text: string, maxLen = 150): string {
  if (text.length <= maxLen) return text
  const truncated = text.substring(0, maxLen)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated) + '…'
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Favicon with letter fallback
// ---------------------------------------------------------------------------

function SourceFavicon({ domain }: { domain: string }) {
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      aria-hidden="true"
      className="h-3.5 w-3.5 rounded-[2px] object-cover"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Header content — shared between clickable and static variants
// ---------------------------------------------------------------------------

function HeaderContent({
  icon: Icon,
  config,
  sourceName,
  domain,
  clickable,
}: {
  icon: typeof MessageCircle
  config: SourceTypeConfig
  sourceName: string
  domain: string | null
  clickable?: boolean
}) {
  return (
    <>
      {/* Source type row */}
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3 w-3 shrink-0', config.labelColor)} />
        <span className={cn('text-[10px] font-medium tracking-wide uppercase', config.labelColor)}>
          {config.label}
        </span>
      </div>

      {/* Title — font-weight shifts on hover when clickable */}
      <p className={cn(
        'mt-1.5 text-[13px] leading-snug text-foreground line-clamp-2 transition-all duration-150',
        clickable
          ? 'font-semibold group-hover/header:font-bold group-hover/header:text-primary'
          : 'font-semibold',
      )}>
        {sourceName}
      </p>

      {/* Domain row — favicon + hostname */}
      {domain && (
        <div className="mt-2 flex items-center gap-1.5">
          <SourceFavicon domain={domain} />
          <span className="text-[11px] text-muted-foreground/70 truncate">
            {domain}
          </span>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ResearchRefCard({ refId, refIndex }: ResearchRefCardProps) {
  const research = useResearchContext()
  const source = research.find(r => r.id === refId)

  const config = source
    ? SOURCE_TYPE_CONFIG[source.source_type] || SOURCE_TYPE_CONFIG.user_provided
    : SOURCE_TYPE_CONFIG.user_provided

  const Icon = config.icon
  const domain = source?.source_url ? extractDomain(source.source_url) : null

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            'ref-indicator inline-flex items-center justify-center',
            'h-[14px] min-w-[14px] px-[3px]',
            'rounded-full bg-primary/15',
            'text-[9px] font-semibold leading-none text-primary',
            'cursor-pointer select-none',
            'transition-colors duration-150',
            'hover:bg-primary/25',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:rounded-full',
          )}
          style={{ verticalAlign: 'super', lineHeight: 0, marginLeft: '2px', marginRight: '1px' }}
          role="button"
          tabIndex={0}
          aria-label={`Reference ${refIndex}`}
        >
          {refIndex}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        sideOffset={8}
        align="start"
        className="w-auto p-0 border-0 bg-transparent shadow-none"
        data-portal-ignore-click-outside
      >
        <HoverCardPrimitive.Arrow
          className="fill-popover"
          width={12}
          height={6}
        />
        <div
          className={cn(
            'w-[320px] overflow-hidden rounded-xl',
            'bg-popover border border-border/80',
            'shadow-[0_4px_20px_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.3)]',
          )}
        >
          {source ? (
            <>
              {/* Header zone — gradient background, clickable when URL exists */}
              {source.source_url ? (
                <button
                  type="button"
                  className={cn(
                    'w-full text-left px-4 pt-3.5 pb-3 bg-gradient-to-b group/header',
                    'cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-inset',
                    'rounded-t-xl',
                    config.headerGradient,
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    window.open(source.source_url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <HeaderContent
                    icon={Icon}
                    config={config}
                    sourceName={source.source_name}
                    domain={domain}
                    clickable
                  />
                </button>
              ) : (
                <div className={cn('px-4 pt-3.5 pb-3 bg-gradient-to-b', config.headerGradient)}>
                  <HeaderContent
                    icon={Icon}
                    config={config}
                    sourceName={source.source_name}
                    domain={domain}
                  />
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-border/40 mx-4" />

              {/* Excerpt */}
              <div className="px-4 pt-2.5 pb-3">
                <p className="text-[12px] leading-relaxed text-foreground/55 line-clamp-3">
                  &ldquo;{getExcerptPreview(source.excerpt)}&rdquo;
                </p>
              </div>
            </>
          ) : (
            <div className="px-4 py-4">
              <p className="text-xs text-muted-foreground/60 italic">Source unavailable</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
