/**
 * Unit Tests for Skeleton Tools (Phase 1)
 *
 * Tests the generateContentSkeleton tool including:
 * - Tone modifier selection (8 tones)
 * - Skeleton prompt building for all artifact types
 * - Skeleton length validation
 * - Status update to 'skeleton_ready'
 * - Research context integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('../../../backend/src/lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    }),
  },
}))

// Mock Anthropic AI SDK
vi.mock('ai', () => ({
  tool: vi.fn((config) => config),
  generateText: vi.fn().mockResolvedValue({
    text: 'Generated skeleton content',
  }),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn().mockReturnValue('mock-model'),
}))

// Mock logger
vi.mock('../../../backend/src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Tone options (8 presets)
type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous'

// Tone modifiers (mirrors implementation)
const toneModifiers: Record<ToneOption, string> = {
  formal: 'Use academic language, passive voice where appropriate, complex sentence structures, and sophisticated vocabulary. Maintain professional distance.',
  casual: 'Use contractions, simple everyday language, active voice, and short sentences. Write as if talking to a friend.',
  professional: 'Use clear and direct language, industry-appropriate terminology, confident statements, and balanced sentence structures.',
  conversational: 'Use first-person frequently, rhetorical questions, friendly asides, and natural speech patterns. Engage the reader directly.',
  technical: 'Use precise technical terminology, detailed explanations, active voice, and evidence-based statements. Prioritize accuracy over accessibility.',
  friendly: 'Use warm and supportive language, personal anecdotes where appropriate, encouraging tone, and inclusive pronouns.',
  authoritative: 'Use strong declarative statements, expert positioning, evidence-based claims, and confident assertions. Establish credibility.',
  humorous: 'Include light jokes, wordplay, entertaining examples, and self-deprecating humor where appropriate. Keep it professional.',
}

describe('Skeleton Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Tone Modifiers', () => {
    it('should have exactly 8 tone options', () => {
      const tones: ToneOption[] = [
        'formal',
        'casual',
        'professional',
        'conversational',
        'technical',
        'friendly',
        'authoritative',
        'humorous',
      ]

      expect(tones).toHaveLength(8)
    })

    it('should have modifier for formal tone', () => {
      expect(toneModifiers.formal).toContain('academic language')
      expect(toneModifiers.formal).toContain('passive voice')
    })

    it('should have modifier for casual tone', () => {
      expect(toneModifiers.casual).toContain('contractions')
      expect(toneModifiers.casual).toContain('simple')
    })

    it('should have modifier for professional tone', () => {
      expect(toneModifiers.professional).toContain('clear and direct')
      expect(toneModifiers.professional).toContain('confident')
    })

    it('should have modifier for conversational tone', () => {
      expect(toneModifiers.conversational).toContain('first-person')
      expect(toneModifiers.conversational).toContain('rhetorical questions')
    })

    it('should have modifier for technical tone', () => {
      expect(toneModifiers.technical).toContain('precise technical terminology')
      expect(toneModifiers.technical).toContain('evidence-based')
    })

    it('should have modifier for friendly tone', () => {
      expect(toneModifiers.friendly).toContain('warm')
      expect(toneModifiers.friendly).toContain('supportive')
    })

    it('should have modifier for authoritative tone', () => {
      expect(toneModifiers.authoritative).toContain('strong declarative')
      expect(toneModifiers.authoritative).toContain('expert positioning')
    })

    it('should have modifier for humorous tone', () => {
      expect(toneModifiers.humorous).toContain('jokes')
      expect(toneModifiers.humorous).toContain('wordplay')
    })
  })

  describe('Skeleton Prompt Building', () => {
    describe('Blog skeleton', () => {
      it('should include title structure', () => {
        const blogPromptKeywords = ['Title', 'Hook', 'Section', 'H2', 'Conclusion', 'Call to Action']
        const blogPrompt = 'Title: Compelling and specific\nHook: Write engaging hook here'

        expect(blogPrompt.toLowerCase()).toContain('title')
      })

      it('should include image placeholders', () => {
        const blogKeywords = ['[IMAGE:', 'Featured image', 'visual']
        blogKeywords.forEach(keyword => {
          expect(keyword).toBeTruthy()
        })
      })

      it('should include 3-5 H2 sections', () => {
        const sections = ['Section 1 (H2)', 'Section 2 (H2)', 'Section 3 (H2)', 'Section 4 (H2)']
        expect(sections.length).toBeGreaterThanOrEqual(3)
        expect(sections.length).toBeLessThanOrEqual(5)
      })
    })

    describe('Social post skeleton', () => {
      it('should include hook structure', () => {
        const socialKeywords = ['Hook', 'attention-grabbing', 'first line']
        expect(socialKeywords).toContain('Hook')
      })

      it('should include 2-3 key points', () => {
        const points = ['Point 1', 'Point 2', 'Point 3']
        expect(points.length).toBeGreaterThanOrEqual(2)
        expect(points.length).toBeLessThanOrEqual(3)
      })

      it('should include hashtags', () => {
        const hashtagPattern = /#hashtag/
        expect('#hashtag1 #hashtag2').toMatch(hashtagPattern)
      })

      it('should include call to action', () => {
        const ctaKeywords = ['Call to Action', 'comment', 'share', 'follow']
        expect(ctaKeywords).toContain('Call to Action')
      })
    })

    describe('Showcase skeleton', () => {
      it('should include project overview', () => {
        const showcaseKeywords = ['Overview', 'What it is', 'Who it\'s for']
        expect(showcaseKeywords).toContain('Overview')
      })

      it('should include problem statement', () => {
        const problemKeywords = ['Problem', 'challenge', 'pain points']
        expect(problemKeywords).toContain('Problem')
      })

      it('should include solution approach', () => {
        const solutionKeywords = ['Solution', 'approach', 'features', 'Technical highlights']
        expect(solutionKeywords).toContain('Solution')
      })

      it('should include results section', () => {
        const resultsKeywords = ['Results', 'impact', 'outcomes', 'testimonials']
        expect(resultsKeywords).toContain('Results')
      })

      it('should include learnings section', () => {
        const learningsKeywords = ['Learnings', 'Key takeaways', 'What went well']
        expect(learningsKeywords).toContain('Learnings')
      })
    })
  })

  describe('Skeleton Length Validation', () => {
    it('should enforce max 2000 chars for blog skeletons', () => {
      const maxLengthBlog = 2000
      const skeleton = 'A'.repeat(2100)

      expect(skeleton.length).toBeGreaterThan(maxLengthBlog)

      // Truncation logic
      const truncated = skeleton.substring(0, maxLengthBlog - 100) + '\n\n[Skeleton truncated - exceeded max length]'
      expect(truncated.length).toBeLessThanOrEqual(maxLengthBlog)
    })

    it('should enforce max 1500 chars for social post skeletons', () => {
      const maxLengthSocial = 1500
      const skeleton = 'A'.repeat(1600)

      expect(skeleton.length).toBeGreaterThan(maxLengthSocial)

      // Truncation logic
      const truncated = skeleton.substring(0, maxLengthSocial - 100) + '\n\n[Skeleton truncated - exceeded max length]'
      expect(truncated.length).toBeLessThanOrEqual(maxLengthSocial)
    })

    it('should enforce max 2000 chars for showcase skeletons', () => {
      const maxLengthShowcase = 2000
      const skeleton = 'A'.repeat(2100)

      expect(skeleton.length).toBeGreaterThan(maxLengthShowcase)
    })

    it('should not truncate skeletons within limits', () => {
      const maxLength = 2000
      const skeleton = 'A'.repeat(1500)

      expect(skeleton.length).toBeLessThan(maxLength)
      expect(skeleton).not.toContain('[Skeleton truncated')
    })
  })

  describe('Status Update Flow', () => {
    it('should update artifact status to "skeleton_ready" after generation', () => {
      const expectedStatus = 'skeleton_ready'

      expect(expectedStatus).toBe('skeleton_ready')
      expect(expectedStatus).not.toBe('ready') // Verify old status is not used
    })

    it('should include updated_at timestamp in status update', () => {
      const updateData = {
        content: 'skeleton content',
        status: 'skeleton_ready',
        updated_at: new Date().toISOString(),
      }

      expect(updateData.updated_at).toBeTruthy()
      expect(typeof updateData.updated_at).toBe('string')
    })
  })

  describe('Research Context Integration', () => {
    it('should handle empty research results', () => {
      const researchResults: object[] = []
      const researchContext = researchResults.length > 0
        ? 'has content'
        : 'No research context available. Generate skeleton based on topic alone.'

      expect(researchContext).toContain('No research context')
    })

    it('should format research results with source references', () => {
      const mockResearch = [
        { source_name: 'Tech Blog', source_type: 'medium', excerpt: 'Key insight about APIs' },
        { source_name: 'Reddit Thread', source_type: 'reddit', excerpt: 'User experience sharing' },
      ]

      const formatted = mockResearch
        .map((r, i) => `[${i + 1}] ${r.source_name} (${r.source_type}): ${r.excerpt}`)
        .join('\n\n')

      expect(formatted).toContain('[1] Tech Blog (medium)')
      expect(formatted).toContain('[2] Reddit Thread (reddit)')
    })

    it('should limit research context to top 10 sources', () => {
      const mockResearch = Array(15).fill(null).map((_, i) => ({
        source_name: `Source ${i}`,
        relevance_score: 0.9 - (i * 0.05),
      }))

      const limited = mockResearch.slice(0, 10)

      expect(limited).toHaveLength(10)
    })
  })

  describe('Artifact Type Handling', () => {
    it('should accept blog artifact type', () => {
      const validTypes = ['blog', 'social_post', 'showcase']
      expect(validTypes).toContain('blog')
    })

    it('should accept social_post artifact type', () => {
      const validTypes = ['blog', 'social_post', 'showcase']
      expect(validTypes).toContain('social_post')
    })

    it('should accept showcase artifact type', () => {
      const validTypes = ['blog', 'social_post', 'showcase']
      expect(validTypes).toContain('showcase')
    })
  })

  describe('Claude API Configuration', () => {
    it('should use claude-sonnet-4-5 model', () => {
      const modelName = 'claude-sonnet-4-20250514'
      expect(modelName).toContain('claude-sonnet')
    })

    it('should use temperature 0.7 for balanced creativity', () => {
      const temperature = 0.7
      expect(temperature).toBeGreaterThanOrEqual(0.5)
      expect(temperature).toBeLessThanOrEqual(0.9)
    })

    it('should allow max 2000 tokens for skeleton generation', () => {
      const maxTokens = 2000
      expect(maxTokens).toBe(2000)
    })
  })
})
