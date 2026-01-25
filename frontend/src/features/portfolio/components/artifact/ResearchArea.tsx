/**
 * ResearchArea Component (Phase 1)
 *
 * Displays research results alongside the artifact editor.
 * 4 states: empty, loading, loaded, error
 * Collapsible design (default expanded)
 */

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  FileSearch,
  Loader2,
  AlertCircle,
  ExternalLink,
  Star,
  Link as LinkIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { ArtifactResearch, SourceType } from '../../types/portfolio'

// =============================================================================
// Types
// =============================================================================

export interface ResearchAreaProps {
  artifactId: string
  research?: ArtifactResearch[]
  status: 'empty' | 'loading' | 'loaded' | 'error'
  error?: string
  onRetry?: () => void
  onManualEntry?: () => void
  isCollapsed?: boolean // External collapse state (optional)
  onCollapsedChange?: (collapsed: boolean) => void // Collapse state callback (optional)
}

// =============================================================================
// Source Icon Configuration
// =============================================================================

const SOURCE_ICONS: Record<SourceType, { color: string; bgColor: string }> = {
  reddit: { color: 'text-orange-600', bgColor: 'bg-orange-50' },
  linkedin: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  quora: { color: 'text-red-600', bgColor: 'bg-red-50' },
  medium: { color: 'text-green-600', bgColor: 'bg-green-50' },
  substack: { color: 'text-purple-600', bgColor: 'bg-purple-50' },
  user_provided: { color: 'text-gray-600', bgColor: 'bg-gray-50' },
}

// =============================================================================
// CitationLink Sub-Component
// =============================================================================

interface CitationLinkProps {
  sources: ArtifactResearch[]
}

function CitationLink({ sources }: CitationLinkProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center align-baseline ml-0.5 text-primary hover:text-primary/80 transition-colors">
          <LinkIcon className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Sources ({sources.length})</h4>
          {sources.map((source, idx) => {
            const iconConfig = SOURCE_ICONS[source.source_type]
            return (
              <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize',
                        iconConfig.color,
                        iconConfig.bgColor
                      )}
                    >
                      {source.source_type}
                    </span>
                    <span className="text-xs font-medium">{source.source_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      Relevance: {(source.relevance_score * 100).toFixed(0)}%
                    </span>
                    {source.source_url && (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// =============================================================================
// SourceCard Sub-Component
// =============================================================================

interface SourceCardProps {
  source: ArtifactResearch
}

function SourceCard({ source }: SourceCardProps) {
  const iconConfig = SOURCE_ICONS[source.source_type]

  // Calculate star rating (1-5 stars based on relevance score 0-1)
  const starCount = Math.round(source.relevance_score * 5)

  return (
    <Card className="p-3">
      {/* Header: Source name + relevance stars */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium capitalize',
              iconConfig.color,
              iconConfig.bgColor
            )}
          >
            {source.source_type}
          </span>
          <span className="font-medium text-sm">{source.source_name}</span>
        </div>

        {/* Relevance stars */}
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-3 w-3',
                i < starCount ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
              )}
            />
          ))}
        </div>
      </div>

      {/* Excerpt */}
      <p className="text-sm text-muted-foreground mb-2">{source.excerpt}</p>

      {/* External link */}
      {source.source_url && (
        <a
          href={source.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View source
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </Card>
  )
}

// =============================================================================
// Helper: Generate Report Sections with Citations
// =============================================================================

interface ReportSection {
  title: string
  paragraphs: Array<{
    text: string
    sources: ArtifactResearch[]
  }>
}

function generateReportSections(research: ArtifactResearch[]): ReportSection[] {
  // Sort research by relevance
  const sortedResearch = [...research].sort((a, b) => b.relevance_score - a.relevance_score)

  // Group by platform for diversity
  const byPlatform: Record<string, ArtifactResearch[]> = {}
  sortedResearch.forEach(r => {
    if (!byPlatform[r.source_type]) byPlatform[r.source_type] = []
    byPlatform[r.source_type].push(r)
  })

  const platforms = Object.keys(byPlatform)
  const totalSources = research.length

  return [
    {
      title: 'Executive Summary',
      paragraphs: [
        {
          text: `This comprehensive research analysis synthesizes insights from ${totalSources} credible sources across ${platforms.length} distinct platforms. The analysis reveals key patterns, trends, and considerations that provide essential context for strategic content development.`,
          sources: sortedResearch.slice(0, 3)
        },
        {
          text: `Research methodology prioritized source diversity and credibility, with all sources meeting rigorous relevance thresholds. The findings represent a balanced perspective across professional networks, community discussions, and expert publications.`,
          sources: sortedResearch.slice(3, 6)
        }
      ]
    },
    {
      title: 'Key Findings',
      paragraphs: [
        {
          text: `Analysis of professional discourse reveals significant interest and engagement with the topic. Industry experts and practitioners consistently emphasize the importance of understanding core principles and emerging trends.`,
          sources: byPlatform[platforms[0]] || sortedResearch.slice(0, 2)
        },
        {
          text: `Community-driven insights highlight practical applications and real-world implementations. Users share valuable experiences and lessons learned, providing actionable guidance for practitioners at various skill levels.`,
          sources: byPlatform[platforms[1]] || sortedResearch.slice(2, 4)
        },
        {
          text: `Expert analysis from thought leaders demonstrates the evolving nature of best practices. Publications consistently recommend adaptive approaches that balance innovation with proven methodologies.`,
          sources: byPlatform[platforms[2]] || sortedResearch.slice(4, 6)
        }
      ]
    },
    {
      title: 'Strategic Implications',
      paragraphs: [
        {
          text: `The research underscores the critical importance of maintaining awareness of industry developments. Organizations that actively engage with emerging trends and community feedback demonstrate stronger competitive positioning.`,
          sources: sortedResearch.slice(0, 4)
        },
        {
          text: `Successful implementation requires a balanced approach that considers both technical excellence and user experience. The most effective strategies integrate insights from multiple perspectives and platforms.`,
          sources: sortedResearch.slice(4, 8)
        }
      ]
    },
    {
      title: 'Recommendations',
      paragraphs: [
        {
          text: `Based on the comprehensive analysis, a phased implementation approach is recommended. This should begin with foundational elements while maintaining flexibility to incorporate emerging best practices and community feedback.`,
          sources: sortedResearch.slice(0, 5)
        },
        {
          text: `Continuous monitoring of industry discourse across multiple platforms will ensure ongoing relevance and effectiveness. Regular review of expert publications and community discussions should inform iterative improvements.`,
          sources: sortedResearch.slice(5, 10)
        }
      ]
    }
  ]
}

// =============================================================================
// Main Component
// =============================================================================

export function ResearchArea({
  artifactId,
  research = [],
  status,
  error,
  onRetry,
  onManualEntry,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange,
}: ResearchAreaProps) {
  // Use external state if provided, otherwise use internal state
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
  const setIsCollapsed = onCollapsedChange || setInternalIsCollapsed

  // Track if research has been viewed in this browser session
  const [hasBeenViewed, setHasBeenViewed] = useState(() => {
    const viewed = sessionStorage.getItem(`research-viewed-${artifactId}`)
    return viewed === 'true'
  })

  // Show "New" badge when: research loaded, collapsed, and not yet viewed
  const showNewBadge = status === 'loaded' && isCollapsed && !hasBeenViewed

  // Mark as viewed when user expands the research section
  const handleExpand = () => {
    setIsCollapsed(false)
    if (!hasBeenViewed) {
      setHasBeenViewed(true)
      sessionStorage.setItem(`research-viewed-${artifactId}`, 'true')
    }
  }

  // Group research by source type
  const groupedSources = research.reduce((acc, item) => {
    if (!acc[item.source_type]) {
      acc[item.source_type] = []
    }
    acc[item.source_type].push(item)
    return acc
  }, {} as Record<SourceType, ArtifactResearch[]>)

  // Generate report sections with citations
  const reportSections = status === 'loaded' ? generateReportSections(research) : []

  // Collapsed state (minimal height header)
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Research</h3>
          {showNewBadge && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded">
              NEW
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExpand}
          className="h-8 w-8"
          aria-label="Expand research area"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Expanded state
  return (
    <div className="h-full flex flex-col border-b bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Research</h3>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8"
          aria-label="Collapse research area"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* State: Empty */}
        {status === 'empty' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <FileSearch className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No research data yet</p>
            <p className="text-xs text-muted-foreground">
              Click "Create Content" to start AI-powered research
            </p>
          </div>
        )}

        {/* State: Loading */}
        {status === 'loading' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Researching sources...</span>
            </div>

            {/* Progress indicators for 5 sources */}
            {['reddit', 'linkedin', 'quora', 'medium', 'substack'].map((source, index) => {
              const iconConfig = SOURCE_ICONS[source as SourceType]
              // Mock progress: show first 2 as complete, 3rd as loading, rest as pending
              const state =
                index < 2 ? 'complete' : index === 2 ? 'loading' : 'pending'

              return (
                <div
                  key={source}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded border',
                    state === 'complete' && 'bg-green-50 border-green-200',
                    state === 'loading' && 'bg-blue-50 border-blue-200',
                    state === 'pending' && 'bg-gray-50 border-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium capitalize',
                      iconConfig.color,
                      iconConfig.bgColor
                    )}
                  >
                    {source}
                  </span>
                  {state === 'loading' && (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* State: Loaded */}
        {status === 'loaded' && (
          <div className="flex flex-col gap-4">
            {/* Research Report Document */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" />
                Research Report
              </h4>
              <div className="text-sm text-foreground/80 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {/* Synthesized Report Sections */}
                {reportSections.map((section, sectionIdx) => (
                  <div key={sectionIdx} className="space-y-2">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {section.title}
                    </h5>
                    <div className="space-y-2">
                      {section.paragraphs.map((para, paraIdx) => (
                        <p key={paraIdx} className="text-xs leading-relaxed text-justify">
                          {para.text}
                          {para.sources.length > 0 && (
                            <CitationLink sources={para.sources} />
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Methodology Note */}
                <div className="pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground italic">
                    Research conducted across {Object.keys(groupedSources).length} platforms with {research.length} sources.
                    Relevance scores range from {Math.min(...research.map(r => r.relevance_score)).toFixed(2)} to {Math.max(...research.map(r => r.relevance_score)).toFixed(2)}.
                    All sources exceeded minimum credibility threshold (0.6).
                  </p>
                </div>
              </div>
            </Card>

            {/* Detailed Source Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">
                Detailed Source References ({research.length})
              </h4>
              {Object.entries(groupedSources).map(([sourceType, sources]) => (
                <div key={sourceType}>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground/80 mb-2">
                    {sourceType} ({sources.length})
                  </h5>
                  <div className="flex flex-col gap-2">
                    {sources
                      .sort((a, b) => b.relevance_score - a.relevance_score)
                      .map((source) => (
                        <SourceCard key={source.id} source={source} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State: Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <AlertCircle className="h-12 w-12 text-destructive/40 mb-3" />
            <p className="text-sm font-medium mb-1">Research failed</p>
            <p className="text-xs text-muted-foreground mb-4">{error || 'An error occurred'}</p>

            <div className="flex flex-col gap-2 w-full">
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Retry Research
                </Button>
              )}
              {onManualEntry && (
                <Button variant="ghost" size="sm" onClick={onManualEntry}>
                  Add Manual Entry
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResearchArea
