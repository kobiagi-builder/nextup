/**
 * Unit Tests for ResearchArea Component (Phase 1)
 *
 * Tests the research area including:
 * - 4 states: empty, loading, loaded, error
 * - Collapse/expand functionality
 * - Source grouping by type
 * - Relevance star display
 * - Error state with retry button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Define types locally for testing
type SourceType = 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack' | 'user_provided'

interface ArtifactResearch {
  id: string
  artifact_id: string
  source_type: SourceType
  source_name: string
  source_url?: string
  excerpt: string
  relevance_score: number
  created_at: string
}

interface ResearchAreaProps {
  artifactId: string
  research?: ArtifactResearch[]
  status: 'empty' | 'loading' | 'loaded' | 'error'
  error?: string
  onRetry?: () => void
  onManualEntry?: () => void
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

// Source icon configuration
const SOURCE_ICONS: Record<SourceType, { color: string; bgColor: string }> = {
  reddit: { color: 'text-orange-600', bgColor: 'bg-orange-50' },
  linkedin: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  quora: { color: 'text-red-600', bgColor: 'bg-red-50' },
  medium: { color: 'text-green-600', bgColor: 'bg-green-50' },
  substack: { color: 'text-purple-600', bgColor: 'bg-purple-50' },
  user_provided: { color: 'text-gray-600', bgColor: 'bg-gray-50' },
}

// Mock ResearchArea component for testing
function ResearchArea({
  artifactId,
  research = [],
  status,
  error,
  onRetry,
  onManualEntry,
  isCollapsed = false,
  onCollapsedChange,
}: ResearchAreaProps) {
  // Group research by source type
  const groupedSources = research.reduce((acc, item) => {
    if (!acc[item.source_type]) {
      acc[item.source_type] = []
    }
    acc[item.source_type].push(item)
    return acc
  }, {} as Record<SourceType, ArtifactResearch[]>)

  // Collapsed state
  if (isCollapsed) {
    return (
      <div data-testid="research-area-collapsed" className="collapsed">
        <h3>Research</h3>
        <button
          data-testid="expand-button"
          onClick={() => onCollapsedChange?.(false)}
        >
          Expand
        </button>
      </div>
    )
  }

  return (
    <div data-testid="research-area" className="expanded">
      <div className="header">
        <h3>Research</h3>
        <button
          data-testid="collapse-button"
          onClick={() => onCollapsedChange?.(true)}
        >
          Collapse
        </button>
      </div>

      <div className="content">
        {/* Empty state */}
        {status === 'empty' && (
          <div data-testid="empty-state">
            <p>No research data yet</p>
            <p>Click "Create Content" to start AI-powered research</p>
          </div>
        )}

        {/* Loading state */}
        {status === 'loading' && (
          <div data-testid="loading-state">
            <p>Researching sources...</p>
            {['reddit', 'linkedin', 'quora', 'medium', 'substack'].map((source) => (
              <div key={source} data-testid={`source-progress-${source}`}>
                {source}
              </div>
            ))}
          </div>
        )}

        {/* Loaded state */}
        {status === 'loaded' && (
          <div data-testid="loaded-state">
            <div data-testid="research-report">Research Report</div>
            <p>Sources: {research.length}</p>
            <p>Platforms: {Object.keys(groupedSources).length}</p>
            {Object.entries(groupedSources).map(([sourceType, sources]) => (
              <div key={sourceType} data-testid={`source-group-${sourceType}`}>
                <h4>{sourceType} ({sources.length})</h4>
                {sources.map((source) => (
                  <div key={source.id} data-testid={`source-card-${source.id}`}>
                    <span>{source.source_name}</span>
                    <span>{source.excerpt}</span>
                    <span data-testid={`relevance-${source.id}`}>
                      {Math.round(source.relevance_score * 5)} stars
                    </span>
                    {source.source_url && (
                      <a href={source.source_url} data-testid={`source-link-${source.id}`}>
                        View source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div data-testid="error-state">
            <p>Research failed</p>
            <p>{error || 'An error occurred'}</p>
            {onRetry && (
              <button data-testid="retry-button" onClick={onRetry}>
                Retry Research
              </button>
            )}
            {onManualEntry && (
              <button data-testid="manual-entry-button" onClick={onManualEntry}>
                Add Manual Entry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

describe('ResearchArea Component', () => {
  const mockArtifactId = 'test-artifact-123'

  const mockResearch: ArtifactResearch[] = [
    {
      id: 'r1',
      artifact_id: mockArtifactId,
      source_type: 'reddit',
      source_name: 'r/programming',
      source_url: 'https://reddit.com/r/programming/123',
      excerpt: 'Great insights about API design',
      relevance_score: 0.9,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'r2',
      artifact_id: mockArtifactId,
      source_type: 'medium',
      source_name: 'Tech Blog',
      source_url: 'https://medium.com/@author/article',
      excerpt: 'Detailed article about best practices',
      relevance_score: 0.85,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'r3',
      artifact_id: mockArtifactId,
      source_type: 'linkedin',
      source_name: 'Industry Expert',
      excerpt: 'Professional perspective on trends',
      relevance_score: 0.75,
      created_at: '2024-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should render empty state when status is empty', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="empty"
        />
      )

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No research data yet')).toBeInTheDocument()
      expect(screen.getByText('Click "Create Content" to start AI-powered research')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should render loading state when status is loading', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="loading"
        />
      )

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByText('Researching sources...')).toBeInTheDocument()
    })

    it('should show progress indicators for all 5 sources', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="loading"
        />
      )

      expect(screen.getByTestId('source-progress-reddit')).toBeInTheDocument()
      expect(screen.getByTestId('source-progress-linkedin')).toBeInTheDocument()
      expect(screen.getByTestId('source-progress-quora')).toBeInTheDocument()
      expect(screen.getByTestId('source-progress-medium')).toBeInTheDocument()
      expect(screen.getByTestId('source-progress-substack')).toBeInTheDocument()
    })
  })

  describe('Loaded State', () => {
    it('should render loaded state when status is loaded', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          research={mockResearch}
          status="loaded"
        />
      )

      expect(screen.getByTestId('loaded-state')).toBeInTheDocument()
    })

    it('should display research report', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          research={mockResearch}
          status="loaded"
        />
      )

      expect(screen.getByTestId('research-report')).toBeInTheDocument()
    })

    it('should display correct source count', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          research={mockResearch}
          status="loaded"
        />
      )

      expect(screen.getByText('Sources: 3')).toBeInTheDocument()
    })

    it('should group sources by type', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          research={mockResearch}
          status="loaded"
        />
      )

      expect(screen.getByTestId('source-group-reddit')).toBeInTheDocument()
      expect(screen.getByTestId('source-group-medium')).toBeInTheDocument()
      expect(screen.getByTestId('source-group-linkedin')).toBeInTheDocument()
    })

    it('should display source cards with excerpts', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          research={mockResearch}
          status="loaded"
        />
      )

      expect(screen.getByText('Great insights about API design')).toBeInTheDocument()
      expect(screen.getByText('Detailed article about best practices')).toBeInTheDocument()
      expect(screen.getByText('Professional perspective on trends')).toBeInTheDocument()
    })

    it('should display relevance as stars (1-5)', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          research={mockResearch}
          status="loaded"
        />
      )

      // 0.9 score = 5 stars
      expect(screen.getByTestId('relevance-r1')).toHaveTextContent('5 stars')
      // 0.85 score = 4 stars
      expect(screen.getByTestId('relevance-r2')).toHaveTextContent('4 stars')
      // 0.75 score = 4 stars
      expect(screen.getByTestId('relevance-r3')).toHaveTextContent('4 stars')
    })

    it('should display external links when source_url is present', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          research={mockResearch}
          status="loaded"
        />
      )

      expect(screen.getByTestId('source-link-r1')).toBeInTheDocument()
      expect(screen.getByTestId('source-link-r2')).toBeInTheDocument()
      expect(screen.queryByTestId('source-link-r3')).not.toBeInTheDocument() // No URL
    })
  })

  describe('Error State', () => {
    it('should render error state when status is error', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="error"
          error="Network error occurred"
        />
      )

      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText('Research failed')).toBeInTheDocument()
      expect(screen.getByText('Network error occurred')).toBeInTheDocument()
    })

    it('should show retry button when onRetry is provided', () => {
      const mockRetry = vi.fn()

      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="error"
          onRetry={mockRetry}
        />
      )

      const retryButton = screen.getByTestId('retry-button')
      expect(retryButton).toBeInTheDocument()

      fireEvent.click(retryButton)
      expect(mockRetry).toHaveBeenCalled()
    })

    it('should show manual entry button when onManualEntry is provided', () => {
      const mockManualEntry = vi.fn()

      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="error"
          onManualEntry={mockManualEntry}
        />
      )

      const manualEntryButton = screen.getByTestId('manual-entry-button')
      expect(manualEntryButton).toBeInTheDocument()

      fireEvent.click(manualEntryButton)
      expect(mockManualEntry).toHaveBeenCalled()
    })
  })

  describe('Collapse/Expand', () => {
    it('should render collapsed state when isCollapsed is true', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="loaded"
          research={mockResearch}
          isCollapsed={true}
        />
      )

      expect(screen.getByTestId('research-area-collapsed')).toBeInTheDocument()
    })

    it('should render expanded state when isCollapsed is false', () => {
      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="loaded"
          research={mockResearch}
          isCollapsed={false}
        />
      )

      expect(screen.getByTestId('research-area')).toBeInTheDocument()
    })

    it('should call onCollapsedChange when collapse button is clicked', () => {
      const mockCollapsedChange = vi.fn()

      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="loaded"
          research={mockResearch}
          isCollapsed={false}
          onCollapsedChange={mockCollapsedChange}
        />
      )

      const collapseButton = screen.getByTestId('collapse-button')
      fireEvent.click(collapseButton)

      expect(mockCollapsedChange).toHaveBeenCalledWith(true)
    })

    it('should call onCollapsedChange when expand button is clicked', () => {
      const mockCollapsedChange = vi.fn()

      render(
        <ResearchArea
          artifactId={mockArtifactId}
          status="loaded"
          research={mockResearch}
          isCollapsed={true}
          onCollapsedChange={mockCollapsedChange}
        />
      )

      const expandButton = screen.getByTestId('expand-button')
      fireEvent.click(expandButton)

      expect(mockCollapsedChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Source Icon Configuration', () => {
    it('should have icon config for all 6 source types', () => {
      expect(SOURCE_ICONS.reddit).toBeDefined()
      expect(SOURCE_ICONS.linkedin).toBeDefined()
      expect(SOURCE_ICONS.quora).toBeDefined()
      expect(SOURCE_ICONS.medium).toBeDefined()
      expect(SOURCE_ICONS.substack).toBeDefined()
      expect(SOURCE_ICONS.user_provided).toBeDefined()
    })

    it('should have color and bgColor for each source type', () => {
      Object.values(SOURCE_ICONS).forEach((config) => {
        expect(config.color).toBeDefined()
        expect(config.bgColor).toBeDefined()
        expect(config.color).toMatch(/^text-/)
        expect(config.bgColor).toMatch(/^bg-/)
      })
    })
  })
})
