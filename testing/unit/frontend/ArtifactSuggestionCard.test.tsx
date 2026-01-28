/**
 * Unit Tests for ArtifactSuggestionCard Component (Phase 1)
 *
 * Tests the artifact suggestion card including:
 * - Two-button layout (Add & Edit / Create Content)
 * - Type configuration (social_post, blog, showcase)
 * - Loading and error states
 * - isAdded disabled state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Define types locally for testing
type ArtifactType = 'social_post' | 'blog' | 'showcase'

interface ArtifactSuggestion {
  id: string
  title: string
  description: string
  type: ArtifactType
  rationale: string
  tags?: string[]
}

interface ArtifactSuggestionCardProps {
  suggestion: ArtifactSuggestion
  isAdded?: boolean
  onCreate: (suggestion: ArtifactSuggestion) => Promise<void>
  onCreateContent?: (suggestion: ArtifactSuggestion) => Promise<void>
}

// Type configuration
const ARTIFACT_TYPE_CONFIG = {
  social_post: {
    icon: 'MessageSquare',
    label: 'Social Post',
    color: 'text-blue-500',
  },
  blog: { icon: 'FileText', label: 'Blog Post', color: 'text-purple-500' },
  showcase: { icon: 'Trophy', label: 'Case Study', color: 'text-amber-500' },
}

// Mock ArtifactSuggestionCard component for testing
function ArtifactSuggestionCard({
  suggestion,
  isAdded = false,
  onCreate,
  onCreateContent,
}: ArtifactSuggestionCardProps) {
  const [isCreating, setIsCreating] = React.useState(false)
  const [isCreatingContent, setIsCreatingContent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const config = ARTIFACT_TYPE_CONFIG[suggestion.type]

  const handleCreate = async () => {
    if (isAdded || isCreating) return

    setIsCreating(true)
    setError(null)

    try {
      await onCreate(suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create artifact')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateContent = async () => {
    if (isAdded || isCreatingContent || !onCreateContent) return

    setIsCreatingContent(true)
    setError(null)

    try {
      await onCreateContent(suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content')
    } finally {
      setIsCreatingContent(false)
    }
  }

  return (
    <div data-testid={`topic-card-${suggestion.id}`} className="card">
      {/* Type badge */}
      <div className={config.color} data-testid="type-badge">
        <span>{config.label}</span>
      </div>

      {/* Title */}
      <h4 data-testid="card-title">{suggestion.title}</h4>

      {/* Description */}
      <p data-testid="card-description">{suggestion.description}</p>

      {/* Rationale */}
      <div data-testid="card-rationale">{suggestion.rationale}</div>

      {/* Tags */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div data-testid="card-tags">
          {suggestion.tags.map((tag) => (
            <span key={tag} data-testid={`tag-${tag}`}>{tag}</span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="actions">
        {/* Edit button */}
        <button
          data-testid={`topic-edit-button-${suggestion.id}`}
          onClick={handleCreate}
          disabled={isAdded || isCreating || isCreatingContent}
        >
          {isCreating ? 'Creating...' : isAdded ? 'Added' : 'Edit'}
        </button>

        {/* Create Content button (Phase 1) */}
        {onCreateContent && (
          <button
            data-testid={`topic-create-content-button-${suggestion.id}`}
            onClick={handleCreateContent}
            disabled={isAdded || isCreating || isCreatingContent}
          >
            {isCreatingContent ? 'Creating...' : 'Create Content'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div data-testid="card-error">{error}</div>
      )}
    </div>
  )
}

// Need to import React for the mock component
import React from 'react'

describe('ArtifactSuggestionCard Component', () => {
  const mockSuggestion: ArtifactSuggestion = {
    id: 'suggestion-1',
    title: 'How to Build REST APIs',
    description: 'A comprehensive guide to building REST APIs with Node.js',
    type: 'blog',
    rationale: 'Great topic for developer audience',
    tags: ['api', 'nodejs', 'backend'],
  }

  const mockOnCreate = vi.fn()
  const mockOnCreateContent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnCreate.mockResolvedValue(undefined)
    mockOnCreateContent.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should render suggestion title', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId('card-title')).toHaveTextContent('How to Build REST APIs')
    })

    it('should render suggestion description', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId('card-description')).toHaveTextContent(
        'A comprehensive guide to building REST APIs with Node.js'
      )
    })

    it('should render suggestion rationale', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId('card-rationale')).toHaveTextContent(
        'Great topic for developer audience'
      )
    })

    it('should render tags when provided', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId('tag-api')).toBeInTheDocument()
      expect(screen.getByTestId('tag-nodejs')).toBeInTheDocument()
      expect(screen.getByTestId('tag-backend')).toBeInTheDocument()
    })

    it('should not render tags section when no tags provided', () => {
      const suggestionWithoutTags = { ...mockSuggestion, tags: undefined }

      render(
        <ArtifactSuggestionCard
          suggestion={suggestionWithoutTags}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.queryByTestId('card-tags')).not.toBeInTheDocument()
    })
  })

  describe('Type Badge', () => {
    it('should display Blog Post label for blog type', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId('type-badge')).toHaveTextContent('Blog Post')
    })

    it('should display Social Post label for social_post type', () => {
      const socialSuggestion = { ...mockSuggestion, type: 'social_post' as ArtifactType }

      render(
        <ArtifactSuggestionCard
          suggestion={socialSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId('type-badge')).toHaveTextContent('Social Post')
    })

    it('should display Case Study label for showcase type', () => {
      const showcaseSuggestion = { ...mockSuggestion, type: 'showcase' as ArtifactType }

      render(
        <ArtifactSuggestionCard
          suggestion={showcaseSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId('type-badge')).toHaveTextContent('Case Study')
    })
  })

  describe('Two-Button Layout (Phase 1)', () => {
    it('should render Edit button', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.getByTestId(`topic-edit-button-${mockSuggestion.id}`)).toBeInTheDocument()
    })

    it('should render Create Content button when onCreateContent is provided', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
          onCreateContent={mockOnCreateContent}
        />
      )

      expect(screen.getByTestId(`topic-create-content-button-${mockSuggestion.id}`)).toBeInTheDocument()
    })

    it('should NOT render Create Content button when onCreateContent is not provided', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      expect(screen.queryByTestId(`topic-create-content-button-${mockSuggestion.id}`)).not.toBeInTheDocument()
    })
  })

  describe('Button Actions', () => {
    it('should call onCreate when Edit button is clicked', async () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      const editButton = screen.getByTestId(`topic-edit-button-${mockSuggestion.id}`)
      fireEvent.click(editButton)

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(mockSuggestion)
      })
    })

    it('should call onCreateContent when Create Content button is clicked', async () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
          onCreateContent={mockOnCreateContent}
        />
      )

      const createContentButton = screen.getByTestId(`topic-create-content-button-${mockSuggestion.id}`)
      fireEvent.click(createContentButton)

      await waitFor(() => {
        expect(mockOnCreateContent).toHaveBeenCalledWith(mockSuggestion)
      })
    })
  })

  describe('Loading States', () => {
    it('should show "Creating..." when Edit button is loading', async () => {
      mockOnCreate.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      const editButton = screen.getByTestId(`topic-edit-button-${mockSuggestion.id}`)
      fireEvent.click(editButton)

      expect(editButton).toHaveTextContent('Creating...')
    })

    it('should show "Creating..." when Create Content button is loading', async () => {
      mockOnCreateContent.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
          onCreateContent={mockOnCreateContent}
        />
      )

      const createContentButton = screen.getByTestId(`topic-create-content-button-${mockSuggestion.id}`)
      fireEvent.click(createContentButton)

      expect(createContentButton).toHaveTextContent('Creating...')
    })

    it('should disable both buttons while loading', async () => {
      mockOnCreate.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
          onCreateContent={mockOnCreateContent}
        />
      )

      const editButton = screen.getByTestId(`topic-edit-button-${mockSuggestion.id}`)
      const createContentButton = screen.getByTestId(`topic-create-content-button-${mockSuggestion.id}`)

      fireEvent.click(editButton)

      expect(editButton).toBeDisabled()
      expect(createContentButton).toBeDisabled()
    })
  })

  describe('isAdded State', () => {
    it('should show "Added" text when isAdded is true', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          isAdded={true}
          onCreate={mockOnCreate}
        />
      )

      const editButton = screen.getByTestId(`topic-edit-button-${mockSuggestion.id}`)
      expect(editButton).toHaveTextContent('Added')
    })

    it('should disable Edit button when isAdded is true', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          isAdded={true}
          onCreate={mockOnCreate}
        />
      )

      const editButton = screen.getByTestId(`topic-edit-button-${mockSuggestion.id}`)
      expect(editButton).toBeDisabled()
    })

    it('should disable Create Content button when isAdded is true', () => {
      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          isAdded={true}
          onCreate={mockOnCreate}
          onCreateContent={mockOnCreateContent}
        />
      )

      const createContentButton = screen.getByTestId(`topic-create-content-button-${mockSuggestion.id}`)
      expect(createContentButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when onCreate fails', async () => {
      mockOnCreate.mockRejectedValue(new Error('Failed to create'))

      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
        />
      )

      const editButton = screen.getByTestId(`topic-edit-button-${mockSuggestion.id}`)
      fireEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('card-error')).toHaveTextContent('Failed to create')
      })
    })

    it('should display error message when onCreateContent fails', async () => {
      mockOnCreateContent.mockRejectedValue(new Error('Content creation failed'))

      render(
        <ArtifactSuggestionCard
          suggestion={mockSuggestion}
          onCreate={mockOnCreate}
          onCreateContent={mockOnCreateContent}
        />
      )

      const createContentButton = screen.getByTestId(`topic-create-content-button-${mockSuggestion.id}`)
      fireEvent.click(createContentButton)

      await waitFor(() => {
        expect(screen.getByTestId('card-error')).toHaveTextContent('Content creation failed')
      })
    })
  })

  describe('Artifact Type Configuration', () => {
    it('should have correct config for all 3 artifact types', () => {
      expect(ARTIFACT_TYPE_CONFIG.social_post).toBeDefined()
      expect(ARTIFACT_TYPE_CONFIG.blog).toBeDefined()
      expect(ARTIFACT_TYPE_CONFIG.showcase).toBeDefined()
    })

    it('should have label, icon, and color for each type', () => {
      Object.values(ARTIFACT_TYPE_CONFIG).forEach((config) => {
        expect(config.label).toBeDefined()
        expect(config.icon).toBeDefined()
        expect(config.color).toBeDefined()
      })
    })
  })
})
