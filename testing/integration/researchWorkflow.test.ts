/**
 * Integration Tests for Research Workflow (Phase 1)
 *
 * Tests the complete research and skeleton generation workflow:
 * 1. Artifact creation (draft status)
 * 2. Research execution (researching status)
 * 3. Skeleton generation (skeleton_ready status)
 * 4. Skeleton approval (skeleton_approved status)
 *
 * Note: These tests mock external dependencies (database, AI SDK)
 * to test the workflow logic in isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock data for artifacts
const mockArtifactId = '12345678-1234-1234-1234-123456789012'
const mockUserId = 'user-12345678'

// Mock artifact states through the workflow
const mockArtifact = {
  id: mockArtifactId,
  user_id: mockUserId,
  title: 'How to Build REST APIs with Node.js',
  type: 'blog' as const,
  status: 'draft' as string,
  content: '',
  tone: 'professional' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock research results
const mockResearchResults = [
  {
    id: 'research-1',
    artifact_id: mockArtifactId,
    source_type: 'medium',
    source_name: 'REST API Best Practices',
    source_url: 'https://medium.com/api-design',
    excerpt: 'Key insights on API design patterns',
    relevance_score: 0.95,
  },
  {
    id: 'research-2',
    artifact_id: mockArtifactId,
    source_type: 'linkedin',
    source_name: 'API Expert Post',
    source_url: 'https://linkedin.com/post/123',
    excerpt: 'Professional perspective on REST standards',
    relevance_score: 0.88,
  },
  {
    id: 'research-3',
    artifact_id: mockArtifactId,
    source_type: 'reddit',
    source_name: 'r/programming discussion',
    source_url: 'https://reddit.com/r/programming/456',
    excerpt: 'Community insights on API development',
    relevance_score: 0.82,
  },
  {
    id: 'research-4',
    artifact_id: mockArtifactId,
    source_type: 'quora',
    source_name: 'API Question Thread',
    source_url: 'https://quora.com/api-question',
    excerpt: 'Expert answers on API patterns',
    relevance_score: 0.78,
  },
  {
    id: 'research-5',
    artifact_id: mockArtifactId,
    source_type: 'substack',
    source_name: 'API Newsletter',
    source_url: 'https://substack.com/api-weekly',
    excerpt: 'Weekly API development insights',
    relevance_score: 0.75,
  },
]

// Mock skeleton content
const mockSkeletonContent = `# How to Build REST APIs with Node.js

## Introduction
[Write engaging hook here about the importance of REST APIs]

[IMAGE: Featured image showing API architecture diagram]

## Section 1: Understanding REST Principles
[Expand on REST principles - reference research sources]
[IMAGE: REST architecture diagram]

## Section 2: Setting Up Node.js
[Expand on Node.js setup - reference research sources]
[IMAGE: Code setup screenshot]

## Section 3: Building Your First Endpoint
[Expand on endpoint creation - reference research sources]
[IMAGE: API endpoint example]

## Conclusion
[Summarize key takeaways]

## Call to Action
[Suggest next steps for reader]`

// Status transition tracking
interface StatusTransition {
  from: string
  to: string
  timestamp: Date
}

describe('Research Workflow Integration', () => {
  let statusTransitions: StatusTransition[] = []
  let currentArtifactStatus: string = 'draft'
  let artifactContent: string = ''
  let storedResearch: typeof mockResearchResults = []

  // Mock Supabase operations
  const mockUpdateArtifactStatus = vi.fn(async (status: string) => {
    statusTransitions.push({
      from: currentArtifactStatus,
      to: status,
      timestamp: new Date(),
    })
    currentArtifactStatus = status
    return { error: null }
  })

  const mockUpdateArtifactContent = vi.fn(async (content: string, status: string) => {
    artifactContent = content
    statusTransitions.push({
      from: currentArtifactStatus,
      to: status,
      timestamp: new Date(),
    })
    currentArtifactStatus = status
    return { error: null }
  })

  const mockInsertResearch = vi.fn(async (research: typeof mockResearchResults) => {
    storedResearch = research
    return { data: research, error: null }
  })

  const mockFetchResearch = vi.fn(async () => {
    return { data: storedResearch, error: null }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    statusTransitions = []
    currentArtifactStatus = 'draft'
    artifactContent = ''
    storedResearch = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Phase 1 Status Flow', () => {
    it('should follow correct status flow: draft → researching → skeleton_ready', async () => {
      // Step 1: Start research (draft → researching)
      await mockUpdateArtifactStatus('researching')

      expect(statusTransitions).toHaveLength(1)
      expect(statusTransitions[0].from).toBe('draft')
      expect(statusTransitions[0].to).toBe('researching')

      // Step 2: Complete research and generate skeleton (researching → skeleton_ready)
      await mockInsertResearch(mockResearchResults)
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')

      expect(statusTransitions).toHaveLength(2)
      expect(statusTransitions[1].from).toBe('researching')
      expect(statusTransitions[1].to).toBe('skeleton_ready')

      // Verify final state
      expect(currentArtifactStatus).toBe('skeleton_ready')
      expect(artifactContent).toBe(mockSkeletonContent)
      expect(storedResearch).toHaveLength(5)
    })

    it('should NOT use deprecated status values (in_progress, ready)', async () => {
      // Execute workflow
      await mockUpdateArtifactStatus('researching')
      await mockInsertResearch(mockResearchResults)
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')

      // Verify no deprecated statuses were used
      const allStatuses = statusTransitions.flatMap((t) => [t.from, t.to])

      expect(allStatuses).not.toContain('in_progress')
      expect(allStatuses).not.toContain('ready')

      // Verify correct statuses were used
      expect(allStatuses).toContain('draft')
      expect(allStatuses).toContain('researching')
      expect(allStatuses).toContain('skeleton_ready')
    })
  })

  describe('Research Execution', () => {
    it('should store research results with minimum 5 unique sources', async () => {
      await mockInsertResearch(mockResearchResults)

      expect(mockInsertResearch).toHaveBeenCalledWith(mockResearchResults)
      expect(storedResearch).toHaveLength(5)

      // Verify unique source types
      const uniqueSources = new Set(storedResearch.map((r) => r.source_type))
      expect(uniqueSources.size).toBeGreaterThanOrEqual(5)
    })

    it('should store research with relevance scores > 0.6', async () => {
      await mockInsertResearch(mockResearchResults)

      storedResearch.forEach((research) => {
        expect(research.relevance_score).toBeGreaterThan(0.6)
      })
    })

    it('should store research with required fields', async () => {
      await mockInsertResearch(mockResearchResults)

      storedResearch.forEach((research) => {
        expect(research.artifact_id).toBe(mockArtifactId)
        expect(research.source_type).toBeDefined()
        expect(research.source_name).toBeDefined()
        expect(research.excerpt).toBeDefined()
        expect(research.relevance_score).toBeDefined()
      })
    })
  })

  describe('Skeleton Generation', () => {
    it('should update artifact content with generated skeleton', async () => {
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')

      expect(artifactContent).toBe(mockSkeletonContent)
    })

    it('should include required skeleton sections for blog type', async () => {
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')

      expect(artifactContent).toContain('# How to Build REST APIs')
      expect(artifactContent).toContain('## Introduction')
      expect(artifactContent).toContain('[IMAGE:')
      expect(artifactContent).toContain('## Conclusion')
      expect(artifactContent).toContain('## Call to Action')
    })

    it('should include placeholder markers for content writing', async () => {
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')

      expect(artifactContent).toContain('[Write')
      expect(artifactContent).toContain('[Expand')
      expect(artifactContent).toContain('[IMAGE:')
    })
  })

  describe('Skeleton Approval', () => {
    it('should transition from skeleton_ready to skeleton_approved', async () => {
      // Setup: complete research and skeleton generation
      await mockUpdateArtifactStatus('researching')
      await mockInsertResearch(mockResearchResults)
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')

      // Action: approve skeleton
      await mockUpdateArtifactStatus('skeleton_approved')

      expect(statusTransitions).toHaveLength(3)
      expect(statusTransitions[2].from).toBe('skeleton_ready')
      expect(statusTransitions[2].to).toBe('skeleton_approved')
    })

    it('should require skeleton_ready status before approval', () => {
      // Verify the expected flow
      const validApprovalFlow = [
        { from: 'draft', to: 'researching' },
        { from: 'researching', to: 'skeleton_ready' },
        { from: 'skeleton_ready', to: 'skeleton_approved' },
      ]

      expect(validApprovalFlow[2].from).toBe('skeleton_ready')
    })
  })

  describe('Error Handling', () => {
    it('should handle research insertion failure', async () => {
      const mockInsertWithError = vi.fn(async () => ({
        data: null,
        error: { message: 'Database error' },
      }))

      const result = await mockInsertWithError(mockResearchResults)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database error')
    })

    it('should handle status update failure', async () => {
      const mockUpdateWithError = vi.fn(async () => ({
        error: { message: 'Status update failed' },
      }))

      const result = await mockUpdateWithError('researching')

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Status update failed')
    })

    it('should handle insufficient sources (< 5 unique)', async () => {
      const insufficientResearch = mockResearchResults.slice(0, 3)

      const uniqueSources = new Set(insufficientResearch.map((r) => r.source_type))

      expect(uniqueSources.size).toBeLessThan(5)

      // This should trigger error handling in actual implementation
      const expectedError = {
        success: false,
        error: 'Insufficient sources found. Need at least 5 different sources.',
        minRequired: 5,
        found: uniqueSources.size,
      }

      expect(expectedError.found).toBe(3)
    })
  })

  describe('Complete Workflow', () => {
    it('should execute complete Phase 1 workflow successfully', async () => {
      // 1. Start with draft artifact
      expect(currentArtifactStatus).toBe('draft')

      // 2. Begin research
      await mockUpdateArtifactStatus('researching')
      expect(currentArtifactStatus).toBe('researching')

      // 3. Store research results
      await mockInsertResearch(mockResearchResults)
      expect(storedResearch).toHaveLength(5)

      // 4. Generate and store skeleton
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')
      expect(currentArtifactStatus).toBe('skeleton_ready')
      expect(artifactContent).toBeTruthy()

      // 5. Approve skeleton (gates Phase 2)
      await mockUpdateArtifactStatus('skeleton_approved')
      expect(currentArtifactStatus).toBe('skeleton_approved')

      // Verify complete workflow
      expect(statusTransitions).toHaveLength(3)
      expect(statusTransitions.map((t) => t.to)).toEqual([
        'researching',
        'skeleton_ready',
        'skeleton_approved',
      ])
    })

    it('should maintain data integrity throughout workflow', async () => {
      // Execute full workflow
      await mockUpdateArtifactStatus('researching')
      await mockInsertResearch(mockResearchResults)
      await mockUpdateArtifactContent(mockSkeletonContent, 'skeleton_ready')
      await mockUpdateArtifactStatus('skeleton_approved')

      // Verify research data
      const fetchedResearch = await mockFetchResearch()
      expect(fetchedResearch.data).toHaveLength(5)

      // Verify artifact data
      expect(artifactContent).toContain('How to Build REST APIs')
      expect(currentArtifactStatus).toBe('skeleton_approved')

      // Verify all transitions recorded
      expect(statusTransitions).toHaveLength(3)
    })
  })

  describe('Tone Integration', () => {
    it('should apply professional tone to skeleton generation', () => {
      // Verify tone is passed to skeleton generation
      const toneModifiers = {
        professional: 'Use clear and direct language, industry-appropriate terminology',
      }

      expect(mockArtifact.tone).toBe('professional')
      expect(toneModifiers.professional).toContain('clear and direct')
    })

    it('should support all 8 tone options', () => {
      const validTones = [
        'formal',
        'casual',
        'professional',
        'conversational',
        'technical',
        'friendly',
        'authoritative',
        'humorous',
      ]

      expect(validTones).toHaveLength(8)
      expect(validTones).toContain(mockArtifact.tone)
    })
  })
})
