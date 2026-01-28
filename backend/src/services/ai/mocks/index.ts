/**
 * Mock Service
 *
 * Singleton service for managing AI tool mocking.
 * Provides environment-based toggle between real API calls and mock responses.
 *
 * Features:
 * - Environment variable configuration (MOCK_ALL_AI_TOOLS, MOCK_*_TOOLS)
 * - Dynamic variable replacement in mock data
 * - Realistic latency simulation
 * - Response capture for mock data generation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../../lib/logger.js';
import { applyDynamicReplacements, validateContext } from './utils/dynamicReplacer.js';
import { simulateDelay } from './utils/responseDelay.js';
import { captureResponse } from './utils/responseCapture.js';
import type {
  MockConfig,
  MockMode,
  MasterToggleMode,
  MockCategory,
  DynamicContext,
  SkeletonToolResponse,
  ContentSectionResponse,
  FullContentResponse,
  HumanityCheckResponse,
  ContentAnalysisResponse,
  ResearchToolResponse,
  AIServiceResponse,
} from './types.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// MockService Class
// =============================================================================

class MockService {
  private static instance: MockService;
  private config: MockConfig;
  private mockDataCache: Map<string, unknown> = new Map();
  private initialized: boolean = false;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MockService {
    if (!MockService.instance) {
      MockService.instance = new MockService();
    }
    return MockService.instance;
  }

  /**
   * Initialize the service (log config on first use)
   */
  private initialize(): void {
    if (this.initialized) return;

    logger.info('MockService', 'Initialized', {
      masterToggle: this.config.masterToggle,
      aiService: this.config.aiService,
      researchTools: this.config.researchTools,
      skeletonTools: this.config.skeletonTools,
      contentWritingTools: this.config.contentWritingTools,
      humanityCheckTools: this.config.humanityCheckTools,
      topicsResearchTools: this.config.topicsResearchTools,
      visualsCreatorTools: this.config.visualsCreatorTools,
      imageGenerationTools: this.config.imageGenerationTools,
      captureEnabled: this.config.captureResponses,
    });

    this.initialized = true;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): MockConfig {
    return {
      masterToggle: (process.env.MOCK_ALL_AI_TOOLS as MasterToggleMode) || 'API',
      aiService: (process.env.MOCK_AI_SERVICE as MockMode) || 'API',
      researchTools: (process.env.MOCK_RESEARCH_TOOLS as MockMode) || 'API',
      skeletonTools: (process.env.MOCK_SKELETON_TOOLS as MockMode) || 'API',
      contentWritingTools: (process.env.MOCK_CONTENT_WRITING_TOOLS as MockMode) || 'API',
      humanityCheckTools: (process.env.MOCK_HUMANITY_CHECK_TOOLS as MockMode) || 'API',
      topicsResearchTools: (process.env.MOCK_TOPICS_RESEARCH_TOOLS as MockMode) || 'API',
      visualsCreatorTools: (process.env.MOCK_VISUALS_CREATOR_TOOLS as MockMode) || 'API',
      imageGenerationTools: (process.env.MOCK_IMAGE_GENERATION_TOOLS as MockMode) || 'API',
      delayMinMs: parseInt(process.env.MOCK_DELAY_MIN_MS || '500', 10),
      delayMaxMs: parseInt(process.env.MOCK_DELAY_MAX_MS || '2000', 10),
      captureResponses: process.env.MOCK_CAPTURE_RESPONSES === 'true',
      captureDir: process.env.MOCK_CAPTURE_DIR || './logs/captured-responses',
    };
  }

  /**
   * Check if mocking is enabled for a tool category
   *
   * Master toggle behavior:
   * - 'API' = Force all to use real API (ignore individual toggles)
   * - 'MOCK' = Force all to use mocks (ignore individual toggles)
   * - 'PER_TOGGLE' = Respect individual toggle settings
   */
  shouldMock(category: MockCategory): boolean {
    this.initialize();

    // Master toggle takes precedence over individual toggles
    if (this.config.masterToggle === 'API') {
      return false; // Force all to use real API
    }

    if (this.config.masterToggle === 'MOCK') {
      return true; // Force all to use mocks
    }

    // PER_TOGGLE mode: respect individual category toggles
    return this.config[category] === 'MOCK';
  }

  /**
   * Get mock response for a tool
   *
   * @param toolName - Name of the tool (e.g., 'generateContentSkeleton')
   * @param variant - Variant identifier (e.g., 'blog', 'professional')
   * @param context - Dynamic context for variable replacement
   */
  async getMockResponse<T>(
    toolName: string,
    variant: string,
    context: DynamicContext
  ): Promise<T> {
    this.initialize();

    const cacheKey = `${toolName}.${variant}`;

    // Check cache first
    if (!this.mockDataCache.has(cacheKey)) {
      const mockData = await this.loadMockData(toolName, variant);
      this.mockDataCache.set(cacheKey, mockData);
    }

    const rawMockData = this.mockDataCache.get(cacheKey);

    // Validate context has required values
    const validation = validateContext(rawMockData, context);
    if (!validation.valid) {
      logger.warn('MockService', 'Missing context values for mock', {
        toolName,
        variant,
        missing: validation.missing,
      });
    }

    // Apply dynamic replacements
    const processedData = applyDynamicReplacements(rawMockData, context);

    // Simulate realistic delay
    const delay = await simulateDelay(this.config.delayMinMs, this.config.delayMaxMs);

    logger.debug('MockService', 'Returning mock response', {
      toolName,
      variant,
      delay,
      contextKeys: Object.keys(context),
    });

    return processedData as T;
  }

  /**
   * Capture a real API response for mock data generation
   */
  async captureRealResponse(
    toolName: string,
    variant: string,
    input: Record<string, unknown>,
    response: unknown
  ): Promise<void> {
    if (!this.config.captureResponses) {
      return;
    }

    await captureResponse(
      this.config.captureDir,
      toolName,
      variant,
      input,
      response
    );
  }

  /**
   * Load mock data from JSON file
   */
  private async loadMockData(toolName: string, variant: string): Promise<unknown> {
    // Determine subdirectory based on tool name
    const subDir = this.getSubDirectory(toolName);
    const filename = `${toolName}.${variant}.json`;
    const filePath = path.join(__dirname, 'data', subDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn('MockService', 'Mock data file not found, using default', {
        toolName,
        variant,
        filePath,
      });
      return this.getDefaultMock(toolName);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('MockService', error instanceof Error ? error : new Error(String(error)), {
        toolName,
        variant,
        filePath,
      });
      return this.getDefaultMock(toolName);
    }
  }

  /**
   * Get subdirectory for a tool
   */
  private getSubDirectory(toolName: string): string {
    const toolToDir: Record<string, string> = {
      // AI Service (main chat)
      streamChat: 'aiService',
      generateResponse: 'aiService',
      // Research tools
      conductDeepResearch: 'researchTools',
      // Topics research tools
      topicsResearch: 'topicsResearchTools',
      // Skeleton tools
      generateContentSkeleton: 'skeletonTools',
      // Content writing tools
      writeContentSection: 'contentWritingTools',
      writeFullContent: 'contentWritingTools',
      // Humanity check tools
      applyHumanityCheck: 'humanityCheckTools',
      checkContentHumanity: 'humanityCheckTools',
      // Visuals creator tools (Phase 2 MVP)
      generateContentVisuals: 'visualsCreatorTools',
      // Image generation tools (Phase 3)
      identifyImageNeeds: 'imageGenerationTools',
      updateImageApproval: 'imageGenerationTools',
      generateFinalImages: 'imageGenerationTools',
      regenerateImage: 'imageGenerationTools',
    };

    return toolToDir[toolName] || 'other';
  }

  /**
   * Get default mock response when no mock data file exists
   */
  private getDefaultMock(toolName: string): unknown {
    const defaults: Record<string, unknown> = {
      generateContentSkeleton: {
        success: true,
        skeleton: `# Mock Content Skeleton

## Hook
[Write an engaging hook here - 2-3 sentences to grab attention]

[IMAGE: Featured image - describe what would visually represent the topic]

## Main Point 1
[Expand on your first key point here]
[IMAGE: Visual supporting this section]

## Main Point 2
[Expand on your second key point here]
[IMAGE: Visual supporting this section]

## Main Point 3
[Expand on your third key point here]
[IMAGE: Visual supporting this section]

## Conclusion
[Summarize key takeaways]

## Call to Action
[What should the reader do next?]`,
      } satisfies SkeletonToolResponse,

      writeContentSection: {
        success: true,
        sectionHeading: '{{sectionHeading}}',
        content: `This is mock content for the section. It demonstrates the structure and format of generated content without making actual API calls.

The content maintains the tone and style requested, incorporating relevant research findings naturally. It provides specific details and examples while staying focused on the section topic.

This mock response helps with frontend development and testing without incurring API costs.`,
        researchSourcesUsed: 3,
        tone: '{{tone}}',
        traceId: '{{traceId}}',
      } satisfies ContentSectionResponse,

      writeFullContent: {
        success: true,
        sectionsWritten: 3,
        totalLength: 1500,
        status: 'humanity_checking',
        traceId: '{{traceId}}',
        duration: 2500,
      } satisfies FullContentResponse,

      applyHumanityCheck: {
        success: true,
        originalLength: 1500,
        humanizedLength: 1450,
        lengthChange: -50,
        patternsChecked: 24,
        status: 'ready',
        message: 'Content humanized successfully. Removed AI patterns and added natural voice.',
        traceId: '{{traceId}}',
        duration: 1800,
      } satisfies HumanityCheckResponse,

      checkContentHumanity: {
        success: true,
        detectedPatterns: [
          { category: 'AI Vocabulary', example: 'delve', fix: 'explore' },
          { category: 'Promotional Language', example: 'vibrant', fix: 'active' },
          { category: 'Copula Avoidance', example: 'serves as', fix: 'is' },
        ],
        patternCount: 3,
        humanityScore: 72,
        topIssues: [
          'Overuse of AI vocabulary words',
          'Promotional language patterns',
          'Copula avoidance patterns',
        ],
        suggestions: [
          'Replace "delve" with simpler alternatives like "explore" or "examine"',
          'Reduce promotional adjectives like "vibrant", "stunning", "groundbreaking"',
          'Use simple "is/are" instead of "serves as" or "stands as"',
        ],
        contentLength: 1500,
        verdict: 'Content has noticeable AI patterns',
        traceId: '{{traceId}}',
        duration: 1200,
      } satisfies ContentAnalysisResponse,

      conductDeepResearch: {
        success: true,
        sourceCount: 15,
      } as ResearchToolResponse,

      // AI Service mock responses
      streamChat: {
        text: `I understand you'd like help with content creation. Based on your profile and context, I can suggest several approaches:

1. **Topic Ideas** - I can generate topic suggestions based on your expertise
2. **Content Drafts** - I can create initial drafts for blog posts or social content
3. **Research** - I can conduct research to gather relevant insights

What would you like to focus on?`,
        toolCalls: [],
        toolResults: [],
        usage: {
          promptTokens: 150,
          completionTokens: 100,
          totalTokens: 250,
        },
        finishReason: 'stop',
      } as AIServiceResponse,

      generateResponse: {
        text: `Here's a structured response based on your request. I've analyzed the context and prepared actionable suggestions for your content strategy.`,
        toolCalls: [],
        toolResults: [],
        usage: {
          promptTokens: 200,
          completionTokens: 150,
          totalTokens: 350,
        },
        finishReason: 'stop',
      } as AIServiceResponse,

      // Phase 3: Image generation mock responses
      identifyImageNeeds: {
        success: true,
        imageNeeds: [
          {
            id: 'mock-image-1',
            placement_after: 'Introduction',
            description: 'A professional hero image showing a modern workspace with a laptop displaying data analytics',
            purpose: 'photo' as const,
            style: 'professional' as const,
            approved: false,
          },
          {
            id: 'mock-image-2',
            placement_after: 'Main Benefits',
            description: 'An infographic diagram illustrating the key benefits with icons and connecting lines',
            purpose: 'diagram' as const,
            style: 'modern' as const,
            approved: false,
          },
          {
            id: 'mock-image-3',
            placement_after: 'How It Works',
            description: 'A step-by-step process illustration showing the workflow from start to finish',
            purpose: 'illustration' as const,
            style: 'professional' as const,
            approved: false,
          },
        ],
        count: 3,
        message: 'Identified 3 image placements. Ready for user approval.',
      },

      updateImageApproval: {
        success: true,
        approved: 2,
        rejected: 1,
        remaining: 2,
      },

      generateFinalImages: {
        success: true,
        finals_generated: 2,
        failures: 0,
        message: 'Generated 2 of 2 images successfully',
      },

      regenerateImage: {
        success: true,
        url: 'https://mock-cdn.example.com/images/mock-regenerated-image.png',
        attempts: 2,
      },
    };

    return defaults[toolName] || { success: true, mock: true, traceId: '{{traceId}}' };
  }

  /**
   * Get current configuration (for debugging/logging)
   */
  getConfig(): MockConfig {
    return { ...this.config };
  }

  /**
   * Check if any mocking is enabled
   */
  isAnyMockEnabled(): boolean {
    return (
      this.config.masterToggle === 'MOCK' ||
      this.config.aiService === 'MOCK' ||
      this.config.researchTools === 'MOCK' ||
      this.config.skeletonTools === 'MOCK' ||
      this.config.contentWritingTools === 'MOCK' ||
      this.config.humanityCheckTools === 'MOCK' ||
      this.config.topicsResearchTools === 'MOCK' ||
      this.config.visualsCreatorTools === 'MOCK' ||
      this.config.imageGenerationTools === 'MOCK'
    );
  }

  /**
   * Clear the mock data cache (useful for testing)
   */
  clearCache(): void {
    this.mockDataCache.clear();
  }

  /**
   * Reload configuration from environment (useful for testing)
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
    this.clearCache();
  }
}

// Export singleton instance
export const mockService = MockService.getInstance();

// Re-export types for convenience
export type {
  MockConfig,
  MockMode,
  MasterToggleMode,
  MockCategory,
  DynamicContext,
  SkeletonToolResponse,
  ContentSectionResponse,
  FullContentResponse,
  HumanityCheckResponse,
  ContentAnalysisResponse,
  ResearchToolResponse,
  AIServiceResponse,
} from './types.js';

// Also export as aliased names for backwards compatibility
export type { HumanityCheckResponse as HumanityApplyResponse } from './types.js';
