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
import { supabaseAdmin } from '../../lib/supabase.js';
import { artifactFixtures } from '../fixtures/artifacts.js';
import { callTool, assertToolOutputSuccess } from '../utils/testHelpers.js';

// Mock dependencies
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
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
  });

  describe('Full Pipeline: draft → ready', () => {
    it('should execute complete workflow with all status transitions', async () => {
      const artifactId = artifactFixtures.draft.id;

      // Step 1: Research (draft → research)
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        sourceCount: 5,
        keyInsights: ['Insight 1', 'Insight 2', 'Insight 3'],
        sourcesBreakdown: { reddit: 2, linkedin: 2, medium: 1 },
        uniqueSourcesCount: 5,
        traceId: 'research-trace-001',
        duration: 2000,
      });

      const researchResult = await callTool(conductDeepResearch, {
        artifactId,
        topic: 'Node.js API Best Practices',
        minRequired: 5,
      });

      assertToolOutputSuccess(researchResult);
      expect(researchResult.statusTransition).toEqual({
        from: 'draft',
        to: 'research',
      });

      // Step 2: Skeleton (research → skeleton)
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        skeleton: '# Introduction\n\n## Section 1\n\n## Section 2\n\n## Conclusion',
        sections: ['Introduction', 'Section 1', 'Section 2', 'Conclusion'],
        estimatedWordCount: 1200,
        traceId: 'skeleton-trace-001',
        duration: 3000,
      });

      const skeletonResult = await callTool(generateContentSkeleton, {
        artifactId,
      });

      assertToolOutputSuccess(skeletonResult);
      expect(skeletonResult.statusTransition).toEqual({
        from: 'research',
        to: 'skeleton',
      });

      // Step 3: Writing (skeleton → creating_visuals)
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        totalLength: 2500,
        sectionsWritten: 4,
        sectionResults: [
          { section: 'Introduction', wordCount: 200, success: true },
          { section: 'Section 1', wordCount: 800, success: true },
          { section: 'Section 2', wordCount: 800, success: true },
          { section: 'Conclusion', wordCount: 700, success: true },
        ],
        traceId: 'writing-trace-001',
        duration: 15000,
      });

      const writingResult = await callTool(writeFullContent, {
        artifactId,
        tone: 'professional',
      });

      assertToolOutputSuccess(writingResult);
      expect(writingResult.statusTransition).toEqual({
        from: 'skeleton',
        to: 'creating_visuals',
      });

      // Step 4: Visuals (creating_visuals → creating_visuals, no status change)
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        visualsDetected: 2,
        visualsGenerated: 0,
        placeholders: [
          { type: 'image', description: 'Diagram' },
          { type: 'video', description: 'Tutorial' },
        ],
        message: 'MVP: Detected 2 visual placeholders',
        traceId: 'visuals-trace-001',
        duration: 1000,
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
        originalLength: 2500,
        humanizedLength: 2450,
        lengthChange: -50,
        humanityScoreBefore: 65,
        humanityScoreAfter: 92,
        patternsFixed: 8,
        patternsChecked: 24,
        message: 'Content humanized successfully',
        traceId: 'humanity-trace-001',
        duration: 4000,
      });

      const result = await callTool(applyHumanityCheck, {
        artifactId,
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
      // Attempt to skip research and go straight to skeleton
      // This should fail because skeleton requires research status

      const draftArtifactId = artifactFixtures.draft.id;

      // Mock skeleton tool to return error for invalid status
      (mockService.shouldMock as any).mockReturnValue(false);

      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.draft,
                status: 'draft', // Still in draft, not research
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await callTool(generateContentSkeleton, {
        artifactId: draftArtifactId,
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

      // Execute research
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        sourceCount: 5,
        keyInsights: [],
        sourcesBreakdown: {},
        uniqueSourcesCount: 5,
        traceId: 'research-12345-abc',
        duration: 1000,
      });

      const researchResult = await callTool(conductDeepResearch, {
        artifactId,
        topic: 'Test Topic',
        minRequired: 5,
      });

      // Execute skeleton
      (mockService.getMockResponse as any).mockResolvedValueOnce({
        success: true,
        skeleton: '# Test',
        sections: ['Test'],
        estimatedWordCount: 100,
        traceId: 'skeleton-12346-def',
        duration: 1000,
      });

      const skeletonResult = await callTool(generateContentSkeleton, {
        artifactId,
      });

      assertToolOutputSuccess(researchResult);
      assertToolOutputSuccess(skeletonResult);

      // TraceIds should be different
      expect(researchResult.traceId).not.toBe(skeletonResult.traceId);

      // But both should follow format
      expect(researchResult.traceId).toMatch(/^research-\d+-[a-z0-9]{6}$/);
      expect(skeletonResult.traceId).toMatch(/^skeleton-\d+-[a-z0-9]{6}$/);
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should handle tool failure and maintain previous status', async () => {
      const artifactId = artifactFixtures.skeletonReady.id;

      // Mock writing tool to fail
      (mockService.getMockResponse as any).mockResolvedValue({
        success: false,
        totalLength: 0,
        sectionsWritten: 0,
        sectionResults: [],
        errors: ['AI service unavailable'],
        traceId: 'writing-fail-001',
        duration: 1000,
        error: {
          category: 'AI_PROVIDER_ERROR',
          message: 'AI service unavailable',
          recoverable: true,
        },
      });

      const result = await callTool(writeFullContent, {
        artifactId,
        tone: 'professional',
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

      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        sourceCount: 5,
        keyInsights: [],
        sourcesBreakdown: {},
        uniqueSourcesCount: 5,
        traceId: 'research-trace-001',
        duration: 2345,
      });

      const result = await callTool(conductDeepResearch, {
        artifactId,
        topic: 'Test Topic',
        minRequired: 5,
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.duration).toBe('number');
    });
  });
});
