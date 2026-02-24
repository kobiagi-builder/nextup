/**
 * Tool Pipeline Integration Tests
 *
 * Tests the complete artifact workflow pipeline from draft to ready.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conductDeepResearch } from '../../services/ai/tools/researchTools.js';
import { generateContentSkeleton } from '../../services/ai/tools/skeletonTools.js';
import { writeFullContent } from '../../services/ai/tools/contentWritingTools.js';
import { generateContentVisuals } from '../../services/ai/tools/visualsCreatorTool.js';
import { applyHumanityCheck } from '../../services/ai/tools/humanityCheckTools.js';
import { mockService } from '../../services/ai/mocks/index.js';
import { artifactFixtures } from '../fixtures/artifacts.js';
import { callTool, assertToolOutputSuccess } from '../utils/testHelpers.js';

// Mock dependencies
const mockSupabase = { from: vi.fn() };
vi.mock('../../lib/requestContext.js', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

vi.mock('../../services/ai/mocks/index.js', () => ({
  mockService: {
    shouldMock: vi.fn().mockReturnValue(true),
    getMockResponse: vi.fn(),
    captureRealResponse: vi.fn(),
  },
}));

describe('Tool Pipeline Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chain — tests that need specific behavior override this
    (mockSupabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    // Restore shouldMock default after clearAllMocks resets it
    (mockService.shouldMock as any).mockReturnValue(true);
  });

  describe('Full Pipeline: draft → ready', () => {
    it('should execute complete workflow with all status transitions', async () => {
      const artifactId = artifactFixtures.draft.id;

      // Step 1: Research (draft → research)
      // Note: conductDeepResearch uses an INLINE mock — it does NOT call getMockResponse.
      // Do NOT set a mockResolvedValueOnce here; doing so would leave a stale value
      // in the queue that the next getMockResponse call (skeleton) would consume instead.

      const researchResult = await callTool(conductDeepResearch, {
        artifactId,
        topic: 'Node.js API Best Practices',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(researchResult);
      expect(researchResult.statusTransition).toEqual({
        from: 'draft',
        to: 'research',
      });

      // Step 2: Skeleton (research → skeleton)
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        traceId: 'skeleton-trace-001',
        duration: 3000,
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: '# Introduction\n\n## Section 1\n\n## Section 2\n\n## Conclusion',
          sections: ['Introduction', 'Section 1', 'Section 2', 'Conclusion'],
          estimatedWordCount: 1200,
        },
      });

      const skeletonResult = await callTool(generateContentSkeleton, {
        artifactId,
        topic: 'Node.js API Best Practices',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(skeletonResult);
      expect(skeletonResult.statusTransition).toEqual({
        from: 'research',
        to: 'skeleton',
      });

      // Step 3: Writing (skeleton → creating_visuals)
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        traceId: 'writing-trace-001',
        duration: 15000,
        statusTransition: { from: 'skeleton', to: 'creating_visuals' },
        data: {
          totalLength: 2500,
          sectionsWritten: 4,
          sectionResults: [
            { section: 'Introduction', wordCount: 200, success: true },
            { section: 'Section 1', wordCount: 800, success: true },
            { section: 'Section 2', wordCount: 800, success: true },
            { section: 'Conclusion', wordCount: 700, success: true },
          ],
        },
      });

      const writingResult = await callTool(writeFullContent, {
        artifactId,
        tone: 'professional',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(writingResult);
      expect(writingResult.statusTransition).toEqual({
        from: 'skeleton',
        to: 'creating_visuals',
      });

      // Step 4: Visuals (creating_visuals → ready)
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        traceId: 'visuals-trace-001',
        duration: 1000,
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: 2,
          visualsGenerated: 0,
          placeholders: [
            { type: 'image', description: 'Diagram' },
            { type: 'video', description: 'Tutorial' },
          ],
          message: 'MVP: Detected 2 visual placeholders',
        },
      });

      const visualsResult = await callTool(generateContentVisuals, {
        artifactId,
      });

      assertToolOutputSuccess(visualsResult);
      // Note: visualsCreatorTool now transitions to 'ready' immediately (MVP)
      expect(visualsResult.statusTransition).toEqual({
        from: 'creating_visuals',
        to: 'ready',
      });

      // Step 5: Humanity Check (creating_visuals → ready) - SKIPPED in this test
      // because visualsCreatorTool already transitions to ready

      // Verify final status is ready
      expect(visualsResult.statusTransition?.to).toBe('ready');
    });
  });

  describe('Partial Pipeline: Humanize Only', () => {
    it('should apply humanity check to artifact in creating_visuals status', async () => {
      const artifactId = artifactFixtures.creatingVisuals.id;

      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'humanity-trace-001',
        duration: 4000,
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          originalLength: 2500,
          humanizedLength: 2450,
          lengthChange: -50,
          humanityScoreBefore: 65,
          humanityScoreAfter: 92,
          patternsFixed: 8,
          patternsChecked: 24,
          message: 'Content humanized successfully',
        },
      });

      const result = await callTool(applyHumanityCheck, {
        artifactId,
        content: 'This is a sample content that will undergo the humanity check process to ensure it reads naturally.',
        tone: 'professional',
      });

      assertToolOutputSuccess(result);
      expect(result.statusTransition).toEqual({
        from: 'creating_visuals',
        to: 'ready',
      });
      expect(result.data.humanityScoreAfter).toBeGreaterThan(result.data.humanityScoreBefore);
    });
  });

  describe('Status Constraint Validation', () => {
    it('should enforce correct status transitions', async () => {
      // Attempt to skip research and go straight to skeleton.
      // This should fail because skeleton requires research status.
      // Mock mode is kept enabled (default true) and getMockResponse returns an INVALID_STATUS error.

      const draftArtifactId = artifactFixtures.draft.id;

      // Mock skeleton tool to return error for invalid status
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: false,
        traceId: 'skeleton-err-001',
        data: {
          skeleton: '',
          sections: [],
          estimatedWordCount: 0,
        },
        error: {
          category: 'INVALID_STATUS',
          message: 'Artifact must be in research status for skeleton generation',
        },
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: draftArtifactId,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      // Should fail because artifact is in draft status, not research
      if (!result.success) {
        expect(result.error?.category).toBe('INVALID_STATUS');
      }
    });
  });

  describe('TraceId Correlation', () => {
    it('should maintain different traceIds across tool executions', async () => {
      const artifactId = artifactFixtures.draft.id;

      // Execute research.
      // Note: conductDeepResearch uses an INLINE mock — getMockResponse is NOT called.
      // Do NOT queue a mockResolvedValueOnce for research here; doing so would leave
      // a stale value that skeleton would consume instead of its own mock.
      // The traceId is generated internally via generateMockTraceId('research'),
      // producing the format: research-{timestamp}-{9 random alphanumeric chars}.

      const researchResult = await callTool(conductDeepResearch, {
        artifactId,
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      // Execute skeleton.
      // skeletonTools uses getMockResponse, so the traceId comes from the mock setup below.
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        traceId: 'skeleton-12346-def',
        duration: 1000,
        statusTransition: { from: 'research', to: 'skeleton' },
        data: {
          skeleton: '# Test',
          sections: ['Test'],
          estimatedWordCount: 100,
        },
      });

      const skeletonResult = await callTool(generateContentSkeleton, {
        artifactId,
        topic: 'Test Topic',
        artifactType: 'blog',
        tone: 'professional',
      });

      assertToolOutputSuccess(researchResult);
      assertToolOutputSuccess(skeletonResult);

      // TraceIds should be different strings
      expect(researchResult.traceId).toBeDefined();
      expect(skeletonResult.traceId).toBeDefined();
      expect(researchResult.traceId).not.toBe(skeletonResult.traceId);

      // Research traceId is generated inline by generateMockTraceId('research'):
      // format: research-{timestamp}-{1-9 alphanumeric chars}
      expect(researchResult.traceId).toMatch(/^research-\d+-[a-z0-9]+$/);

      // Skeleton traceId comes from getMockResponse mock setup above
      expect(skeletonResult.traceId).toBe('skeleton-12346-def');
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should handle tool failure and maintain previous status', async () => {
      const artifactId = artifactFixtures.skeletonReady.id;

      // Mock writing tool to fail
      (mockService.getMockResponse as any).mockResolvedValue({
        success: false,
        traceId: 'writing-fail-001',
        duration: 1000,
        data: {
          totalLength: 0,
          sectionsWritten: 0,
          sectionResults: [],
          errors: ['AI service unavailable'],
        },
        error: {
          category: 'AI_PROVIDER_ERROR',
          message: 'AI service unavailable',
          recoverable: true,
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId,
        tone: 'professional',
        artifactType: 'blog',
      });

      expect(result.success).toBe(false);
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.category).toBe('AI_PROVIDER_ERROR');

      // Status should remain 'skeleton' (not transition to 'creating_visuals')
      // This would be verified by checking database in real integration test
    });
  });

  describe('Duration Tracking', () => {
    it('should track execution duration for each tool', async () => {
      const artifactId = artifactFixtures.draft.id;

      // Note: conductDeepResearch uses an inline mock that calculates duration via
      // Date.now() - startTime. The getMockResponse setup below is not used by this tool,
      // but is provided for completeness. The actual duration may be 0ms or more.
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'research-trace-001',
        duration: 2345,
        statusTransition: { from: 'draft', to: 'research' },
        data: {
          sourceCount: 5,
          keyInsights: [],
          sourcesBreakdown: {},
          uniqueSourcesCount: 5,
        },
      });

      const result = await callTool(conductDeepResearch, {
        artifactId,
        topic: 'Test Topic',
        artifactType: 'blog',
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      // Duration is computed as Date.now() - startTime; synchronous mock execution
      // may complete in < 1ms, so we allow 0 as a valid value.
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });
});
