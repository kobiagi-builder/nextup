import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import type { ToolOutput } from '../types/contentAgent.js';
import { mockService } from '../mocks/index.js';

/**
 * Visuals Creator Tool for Content Creation Agent
 *
 * Generates images/videos for content placeholders (future functionality).
 * Currently MVP stub: Detects placeholders, logs them, updates status to ready.
 *
 * Future: Integrate with image/video generation APIs (DALL-E, Midjourney, etc.)
 */

/**
 * Placeholder pattern detection
 * Matches: [IMAGE: description], [VIDEO: description], [GRAPHIC: description]
 */
function detectVisualPlaceholders(content: string): Array<{ type: string; description: string }> {
  const placeholders: Array<{ type: string; description: string }> = [];

  // Match [IMAGE: ...], [VIDEO: ...], [GRAPHIC: ...]
  const pattern = /\[(IMAGE|VIDEO|GRAPHIC):\s*([^\]]+)\]/gi;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    placeholders.push({
      type: match[1].toLowerCase(),
      description: match[2].trim(),
    });
  }

  return placeholders;
}

/**
 * Mock response interface for visuals creator
 */
interface VisualsCreatorResponse {
  success: boolean;
  visualsGenerated?: number;
  visualsDetected?: number;
  placeholders?: Array<{ type: string; description: string }>;
  message?: string;
  traceId: string;
  duration?: number;
  error?: string;
}

/**
 * Generate Content Visuals Tool
 *
 * MVP Implementation: Detects visual placeholders, logs them, updates status.
 * This tool is called after content writing completes (status: creating_visuals).
 *
 * Flow:
 * 1. Parse content for visual placeholders ([IMAGE: ...], [VIDEO: ...], etc.)
 * 2. Log detected placeholders
 * 3. (Future) Generate visuals for each placeholder via API
 * 4. (Future) Upload to storage and replace placeholders with URLs
 * 5. Update artifact status to 'ready'
 *
 * Returns ToolOutput with:
 * - visualsDetected: number of placeholders found
 * - visualsGenerated: number of visuals generated (0 for MVP)
 * - placeholders: array of detected placeholders
 * - statusTransition: creating_visuals → ready
 */
export const generateContentVisuals = tool({
  description: `Generate images/videos for content visual placeholders. MVP: Detects placeholders like [IMAGE: description] and logs them, then sets status to ready. Future: Will generate actual visuals via API.`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact to generate visuals for'),
  }),

  execute: async ({ artifactId }) => {
    const traceId = generateMockTraceId('visuals-creator');
    const startTime = Date.now();

    try {
      logger.info('GenerateContentVisuals', 'Starting visual generation (MVP stub)', {
        traceId,
        artifactId,
      });

      // =========================================================================
      // MOCK CHECK: Return mock response if mocking is enabled
      // =========================================================================
      if (mockService.shouldMock('visualsCreatorTools')) {
        logger.info('GenerateContentVisuals', 'Using mock response', {
          traceId,
          artifactId,
        });

        const mockResponse = await mockService.getMockResponse<VisualsCreatorResponse>(
          'generateContentVisuals',
          'default',
          { artifactId, traceId }
        );

        // Update database to maintain workflow
        if (mockResponse.success) {
          await supabaseAdmin
            .from('artifacts')
            .update({
              status: 'ready',
              updated_at: new Date().toISOString()
            })
            .eq('id', artifactId);
        }

        return mockResponse;
      }

      // 1. Fetch artifact content
      const { data: artifact, error: fetchError } = await supabaseAdmin
        .from('artifacts')
        .select('content')
        .eq('id', artifactId)
        .single();

      if (fetchError || !artifact) {
        const duration = Date.now() - startTime;
        logger.error('GenerateContentVisuals', fetchError || new Error('Artifact not found'), {
          traceId,
          artifactId,
          stage: 'fetch_artifact',
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            visualsDetected: 0,
            visualsGenerated: 0,
            placeholders: [],
            message: '',
          },
          error: {
            category: 'ARTIFACT_NOT_FOUND' as const,
            message: `Failed to fetch artifact: ${fetchError?.message || 'Not found'}`,
            recoverable: false,
          },
        };
      }

      // 2. Detect visual placeholders in content
      const placeholders = detectVisualPlaceholders(artifact.content || '');

      logger.debug('GenerateContentVisuals', 'Visual placeholders detected', {
        traceId,
        artifactId,
        visualsDetected: placeholders.length,
        placeholderTypes: placeholders.map(p => p.type),
      });

      // MVP: Log placeholders (future: generate actual visuals)
      placeholders.forEach((placeholder, index) => {
        logger.debug('GenerateContentVisuals', `Placeholder ${index + 1}`, {
          traceId,
          type: placeholder.type,
          description: placeholder.description.substring(0, 100),
        });
      });

      // 3. Update artifact status to 'ready'
      const { error: updateError } = await supabaseAdmin
        .from('artifacts')
        .update({
          status: 'ready',
          visuals_metadata: {
            traceId,
            visualsDetected: placeholders.length,
            visualsGenerated: 0, // MVP: no actual generation yet
            placeholders: placeholders.map(p => ({ type: p.type, description: p.description.substring(0, 200) })),
            mvpStub: true,
            completedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', artifactId);

      if (updateError) {
        const duration = Date.now() - startTime;
        logger.error('GenerateContentVisuals', updateError, {
          traceId,
          artifactId,
          stage: 'update_status',
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            visualsDetected: placeholders.length,
            visualsGenerated: 0,
            placeholders,
            message: '',
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Failed to update artifact status: ${updateError.message}`,
            recoverable: false,
          },
        };
      }

      const duration = Date.now() - startTime;

      logger.info('GenerateContentVisuals', 'Visual generation completed (MVP stub)', {
        traceId,
        artifactId,
        visualsDetected: placeholders.length,
        visualsGenerated: 0,
        status: 'ready',
        duration,
      });

      const response: ToolOutput<{
        visualsDetected: number;
        visualsGenerated: number;
        placeholders: Array<{ type: string; description: string }>;
        message: string;
      }> = {
        success: true,
        traceId,
        duration,
        statusTransition: { from: 'creating_visuals', to: 'ready' },
        data: {
          visualsDetected: placeholders.length,
          visualsGenerated: 0,
          placeholders,
          message: placeholders.length > 0
            ? `MVP: Detected ${placeholders.length} visual placeholder(s). Image generation skipped, status set to ready.`
            : 'MVP: No visual placeholders detected. Status set to ready.',
        },
      };

      // Capture response for mock generation
      await mockService.captureRealResponse(
        'generateContentVisuals',
        'default',
        { artifactId },
        response
      );

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('GenerateContentVisuals', error instanceof Error ? error : new Error(String(error)), {
        traceId,
        artifactId,
      });

      return {
        success: false,
        traceId,
        duration,
        data: {
          visualsDetected: 0,
          visualsGenerated: 0,
          placeholders: [],
          message: '',
        },
        error: {
          category: 'TOOL_EXECUTION_FAILED' as const,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          recoverable: true,
        },
      };
    }
  },
});
