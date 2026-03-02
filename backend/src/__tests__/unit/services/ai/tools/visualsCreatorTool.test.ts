/**
 * Visuals Creator Tool Unit Tests
 *
 * Tests for generateContentVisuals tool.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateContentVisuals } from '../../../../../services/ai/agents/portfolio/tools/visualsCreatorTool.js';
import { mockService } from '../../../../../services/ai/mocks/index.js';
import { artifactFixtures } from '../../../../fixtures/artifacts.js';
import { callTool, assertToolOutputSuccess, assertToolOutputError } from '../../../../utils/testHelpers.js';

// Mock dependencies
const mockSupabase = { from: vi.fn() };
vi.mock('../../../../../lib/requestContext.js', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

vi.mock('../../../../../services/ai/mocks/index.js', () => ({
  mockService: {
    shouldMock: vi.fn(),
    getMockResponse: vi.fn(),
    captureRealResponse: vi.fn(),
  },
}));

describe('generateContentVisuals', () => {
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
  });

  describe('Input Validation', () => {
    it('should reject invalid artifactId format', async () => {
      const result = await callTool(generateContentVisuals, {
        artifactId: 'invalid-uuid',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('INVALID_ARTIFACT_ID');
    });

    it('should accept valid artifactId', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: 3,
          visualsGenerated: 0,
          placeholders: [
            { type: 'image', description: 'Test diagram' },
            { type: 'video', description: 'Demo video' },
            { type: 'graphic', description: 'Chart' },
          ],
          message: 'MVP: Detected 3 visual placeholders',
        },
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
    });
  });

  describe('Mock Response Handling', () => {
    it('should return mock response when mocking is enabled', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: 2,
          visualsGenerated: 0,
          placeholders: [
            { type: 'image', description: 'Architecture diagram' },
            { type: 'video', description: 'Tutorial video' },
          ],
          message: 'MVP: Detected 2 visual placeholders',
        },
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.visualsDetected).toBe(2);
      expect(result.data.placeholders.length).toBe(2);
    });
  });

  describe('Status Transitions', () => {
    it('should transition from creating_visuals to ready status', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: 1,
          visualsGenerated: 0,
          placeholders: [{ type: 'image', description: 'Test image' }],
          message: 'MVP: Detected 1 visual placeholder',
        },
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.statusTransition).toEqual({
        from: 'creating_visuals',
        to: 'ready',
      });
    });
  });

  describe('Placeholder Detection', () => {
    it('should detect [IMAGE: ...] placeholders', async () => {
      const contentWithImagePlaceholder = 'Here is a diagram [IMAGE: System architecture diagram] showing the design.';

      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.creatingVisuals,
                content: contentWithImagePlaceholder,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.creatingVisuals.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.visualsDetected).toBe(1);
      expect(result.data.placeholders).toHaveLength(1);
      expect(result.data.placeholders[0].type).toBe('image');
      expect(result.data.placeholders[0].description).toContain('architecture');
    });

    it('should detect [VIDEO: ...] placeholders', async () => {
      const contentWithVideoPlaceholder = 'Watch this tutorial [VIDEO: How to set up the environment] for step-by-step guidance.';

      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.creatingVisuals,
                content: contentWithVideoPlaceholder,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.creatingVisuals.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.visualsDetected).toBe(1);
      expect(result.data.placeholders[0].type).toBe('video');
    });

    it('should detect [GRAPHIC: ...] placeholders', async () => {
      const contentWithGraphicPlaceholder = 'The data shows [GRAPHIC: Bar chart of monthly sales] a clear trend.';

      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.creatingVisuals,
                content: contentWithGraphicPlaceholder,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.creatingVisuals.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.visualsDetected).toBe(1);
      expect(result.data.placeholders[0].type).toBe('graphic');
    });

    it('should detect multiple placeholders', async () => {
      const contentWithMultiplePlaceholders = `
        Introduction paragraph.
        [IMAGE: System diagram]
        Middle section.
        [VIDEO: Tutorial walkthrough]
        More content.
        [GRAPHIC: Performance metrics chart]
        Conclusion.
      `;

      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.creatingVisuals,
                content: contentWithMultiplePlaceholders,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.creatingVisuals.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.visualsDetected).toBe(3);
      expect(result.data.placeholders).toHaveLength(3);

      const types = result.data.placeholders.map((p: any) => p.type);
      expect(types).toContain('image');
      expect(types).toContain('video');
      expect(types).toContain('graphic');
    });

    it('should handle content with no placeholders', async () => {
      const contentWithoutPlaceholders = 'This is plain content without any visual placeholders.';

      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...artifactFixtures.creatingVisuals,
                content: contentWithoutPlaceholders,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: artifactFixtures.creatingVisuals.id },
            error: null,
          }),
        }),
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.visualsDetected).toBe(0);
      expect(result.data.placeholders).toHaveLength(0);
      expect(result.data.message).toContain('No visual placeholders detected');
    });
  });

  describe('MVP Stub Behavior', () => {
    it('should set visualsGenerated to 0 (MVP stub)', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: 3,
          visualsGenerated: 0,
          placeholders: [
            { type: 'image', description: 'Test' },
            { type: 'video', description: 'Test' },
            { type: 'graphic', description: 'Test' },
          ],
          message: 'MVP: Detected 3 visual placeholders',
        },
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.data.visualsGenerated).toBe(0);
      expect(result.data.message).toContain('MVP');
    });
  });

  describe('Error Handling', () => {
    it('should handle artifact not found error', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Artifact not found' },
            }),
          }),
        }),
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: '00000000-0000-4000-a000-ffffffffffff',
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('ARTIFACT_NOT_FOUND');
    });

    it('should handle database update error', async () => {
      (mockService.shouldMock as any).mockReturnValue(false);

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: artifactFixtures.creatingVisuals,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        }),
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputError(result);
      expect(result.error?.category).toBe('TOOL_EXECUTION_FAILED');
    });
  });

  describe('TraceId and Duration', () => {
    it('should include traceId in response', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'visuals-creator-123456-abc123',
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: 1,
          visualsGenerated: 0,
          placeholders: [{ type: 'image', description: 'Test' }],
          message: 'MVP: Detected 1 visual placeholder',
        },
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.traceId).toBeDefined();
      expect(result.traceId).toMatch(/^visuals-creator-\d+-[a-z0-9]{6}$/);
    });

    it('should track execution duration', async () => {
      (mockService.shouldMock as any).mockReturnValue(true);
      (mockService.getMockResponse as any).mockResolvedValue({
        success: true,
        traceId: 'mock-trace-001',
        duration: 234,
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: 1,
          visualsGenerated: 0,
          placeholders: [{ type: 'image', description: 'Test' }],
          message: 'MVP: Detected 1 visual placeholder',
        },
      });

      const result = await callTool(generateContentVisuals, {
        artifactId: artifactFixtures.creatingVisuals.id,
      });

      assertToolOutputSuccess(result);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
