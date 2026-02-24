/**
 * Test Helpers
 *
 * Factory functions and utilities for creating test data.
 */

import type { ArtifactStatus, ArtifactType, StorytellingGuidance } from '../../types/portfolio.js';
import { ErrorCategory } from '../../services/ai/types/contentAgent.js';
import type { ScreenContext, ToolOutput } from '../../services/ai/types/contentAgent.js';
import type { ToolExecutionOptions } from 'ai';

// =============================================================================
// Test Artifact Factory
// =============================================================================

export interface MockArtifact {
  id: string;
  user_id: string;
  product_id: string;
  title: string;
  type: ArtifactType;
  status: ArtifactStatus;
  content?: string;
  skeleton?: string;
  created_at: string;
  updated_at: string;
}

export function createMockArtifact(overrides?: Partial<MockArtifact>): MockArtifact {
  const now = new Date().toISOString();
  return {
    id: 'test-artifact-' + Math.random().toString(36).substr(2, 9),
    user_id: 'test-user-123',
    product_id: 'test-product-456',
    title: 'Test Artifact',
    type: 'blog',
    status: 'draft',
    content: undefined,
    skeleton: undefined,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// =============================================================================
// Mock Screen Context Factory
// =============================================================================

export function createMockScreenContext(overrides?: Partial<ScreenContext>): ScreenContext {
  return {
    currentPage: 'artifact',
    artifactId: 'test-artifact-789',
    artifactType: 'blog',
    artifactTitle: 'Test Blog Post',
    artifactStatus: 'draft',
    ...overrides,
  };
}

// =============================================================================
// Mock Research Results Factory
// =============================================================================

export interface MockResearchResult {
  artifact_id: string;
  source_type: 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack' | 'user_provided';
  source_name: string;
  source_url: string;
  excerpt: string;
  relevance_score: number;
  created_at: string;
}

export function createMockResearchResult(overrides?: Partial<MockResearchResult>): MockResearchResult {
  return {
    artifact_id: 'test-artifact-789',
    source_type: 'reddit',
    source_name: 'Test Source',
    source_url: 'https://example.com/source',
    excerpt: 'This is a test excerpt with relevant information about the topic.',
    relevance_score: 0.85,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockResearchResults(count: number): MockResearchResult[] {
  const sources: Array<MockResearchResult['source_type']> = ['reddit', 'linkedin', 'quora', 'medium', 'substack'];
  return Array.from({ length: count }, (_, i) =>
    createMockResearchResult({
      source_type: sources[i % sources.length],
      source_name: `Test Source ${i + 1}`,
      source_url: `https://example.com/source-${i + 1}`,
      relevance_score: 0.9 - (i * 0.05),
    })
  );
}

// =============================================================================
// Mock User Factory
// =============================================================================

export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: 'test-user-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: undefined,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// Mock Skeleton Content
// =============================================================================

export function createMockSkeleton(artifactType: ArtifactType): string {
  switch (artifactType) {
    case 'blog':
      return `# Introduction
Hook that grabs attention
Brief overview of topic

## Section 1: Main Point
- Key point 1
- Key point 2
- Key point 3

## Section 2: Supporting Details
- Detail 1
- Detail 2

## Conclusion
Summary and call to action`;

    case 'social_post':
      return `Hook: Attention-grabbing opening
Key Points: 2-3 main ideas
Call to Action: What should readers do next`;

    case 'showcase':
      return `# Project Overview
Brief description of the project

## Challenge
What problem did this solve?

## Solution
How was it approached?

## Results
What was achieved?`;

    default:
      return '# Test Skeleton\n\n## Section 1\n\nContent here';
  }
}

// =============================================================================
// Mock Content
// =============================================================================

export function createMockContent(artifactType: ArtifactType, includeAIPatterns = false): string {
  const baseContent = {
    blog: `Introduction paragraph with engaging hook.

Main section exploring the topic in depth. ${includeAIPatterns ? 'This is a multifaceted approach that delves into the nuanced landscape of the subject.' : 'This covers the key points clearly.'}

Supporting section with details and examples. ${includeAIPatterns ? 'The vibrant tapestry of ideas showcases the pivotal nature of this crucial topic.' : 'Examples help illustrate the concepts.'}

Conclusion with key takeaways and call to action.`,

    social_post: `Attention-grabbing hook that stops the scroll.

Key insights:
• Point 1
• Point 2
• Point 3

Call to action: What should you do next?`,

    showcase: `Project Overview: Brief description of what was built.

Challenge: The problem that needed solving.

Solution: How we approached it with specific strategies.

Results: Measurable outcomes and impact.`,
  };

  return baseContent[artifactType] || baseContent.blog;
}

// =============================================================================
// Mock Storytelling Guidance Factory
// =============================================================================

export function createMockStorytellingGuidance(artifactType: ArtifactType = 'blog'): StorytellingGuidance {
  if (artifactType === 'showcase') {
    return {
      narrative_framework: { name: 'star', description: 'STAR method for case study', confidence: 0.85 },
      story_arc: {
        beginning: 'Set the scene with the professional context',
        middle: 'Walk through the methodology and key decisions',
        end: 'Reveal transformation and measurable outcomes',
        section_mapping: [
          { section_role: 'context', guidance: 'Establish situation and stakes', emotional_target: 'empathy' },
          { section_role: 'challenge', guidance: 'Present core constraint', emotional_target: 'tension' },
          { section_role: 'journey', guidance: 'Detail the approach taken', emotional_target: 'engagement' },
          { section_role: 'transformation', guidance: 'Show measurable change', emotional_target: 'satisfaction' },
          { section_role: 'framework', guidance: 'Distill reusable framework', emotional_target: 'empowerment' },
        ],
      },
      emotional_journey: [
        { stage: 'opening', emotion: 'empathy', intensity: 6, technique: 'Relatable scenario' },
        { stage: 'challenge', emotion: 'tension', intensity: 7, technique: 'Stakes and constraints' },
        { stage: 'insight', emotion: 'aha', intensity: 8, technique: 'Counter-intuitive approach' },
        { stage: 'resolution', emotion: 'empowerment', intensity: 8, technique: 'Applicable framework' },
      ],
      hook_strategy: { type: 'in_medias_res', guidance: 'Start at key decision moment' },
      protagonist: { type: 'customer_as_hero', guidance: 'Customer overcame challenge' },
      tension_points: [
        { location: 'after_setup', type: 'stakes_raise', description: 'Risk of failure' },
      ],
      resolution_strategy: { type: 'transformation_reveal', guidance: 'Before/after with metrics' },
      _summary: 'Mock STAR storytelling for showcase.',
      _recommendations: 'Focus on transformation narrative.',
    };
  }

  if (artifactType === 'social_post') {
    return {
      narrative_framework: { name: 'bab', description: 'BAB micro for social post', confidence: 0.8 },
      story_arc: {
        beginning: 'Hook with surprising insight',
        middle: 'Deliver core value',
        end: 'Close with call-to-action',
        section_mapping: [
          { section_role: 'hook', guidance: 'Grab attention first line', emotional_target: 'curiosity' },
          { section_role: 'tension', guidance: 'Create curiosity gap', emotional_target: 'recognition' },
          { section_role: 'payoff', guidance: 'Deliver insight', emotional_target: 'empowerment' },
        ],
      },
      emotional_journey: [
        { stage: 'opening', emotion: 'curiosity', intensity: 8, technique: 'Surprising statement' },
        { stage: 'middle', emotion: 'recognition', intensity: 7, technique: 'Relatable scenario' },
        { stage: 'close', emotion: 'empowerment', intensity: 7, technique: 'Actionable takeaway' },
      ],
      hook_strategy: { type: 'startling_statistic', guidance: 'Open with surprising number' },
      protagonist: { type: 'reader_as_hero', guidance: 'Address reader directly' },
      tension_points: [],
      resolution_strategy: { type: 'call_to_action', guidance: 'End with engagement prompt' },
      _summary: 'Mock BAB micro-storytelling for social post.',
      _recommendations: 'Hook-first, one insight.',
    };
  }

  // Blog default
  return {
    narrative_framework: { name: 'bab', description: 'BAB for argument-driven blog', confidence: 0.85 },
    story_arc: {
      beginning: 'Establish status quo being challenged',
      middle: 'Develop argument through examples',
      end: 'Bridge to transformed understanding',
      section_mapping: [
        { section_role: 'setup', guidance: 'Challenge common belief', emotional_target: 'curiosity' },
        { section_role: 'rising_action', guidance: 'Build case with named example', emotional_target: 'tension' },
        { section_role: 'climax', guidance: 'Deliver core insight', emotional_target: 'aha' },
        { section_role: 'resolution', guidance: 'Actionable takeaway', emotional_target: 'empowerment' },
      ],
    },
    emotional_journey: [
      { stage: 'opening', emotion: 'curiosity', intensity: 7, technique: 'Bold claim' },
      { stage: 'problem', emotion: 'recognition', intensity: 6, technique: 'Relatable scenario' },
      { stage: 'insight', emotion: 'aha', intensity: 9, technique: 'Counter-intuitive finding' },
      { stage: 'resolution', emotion: 'empowerment', intensity: 8, technique: 'Diagnostic questions' },
    ],
    hook_strategy: { type: 'provocative_question', guidance: 'Question challenging conventional wisdom' },
    protagonist: { type: 'reader_as_hero', guidance: 'Reader gaining important insight' },
    tension_points: [
      { location: 'after_setup', type: 'counter_argument', description: 'Why common approach seems reasonable' },
      { location: 'mid_argument', type: 'stakes_raise', description: 'What is at stake' },
    ],
    resolution_strategy: { type: 'diagnostic_questions', guidance: 'Self-application questions' },
    _summary: 'Mock BAB storytelling for blog.',
    _recommendations: 'Provocative opening, examples, diagnostic questions.',
  };
}

// =============================================================================
// Cleanup Utilities
// =============================================================================

export async function cleanupTestData(userId: string): Promise<void> {
  // This would clean up test data in a real database
  // For unit tests with mocks, this is mostly a no-op
  console.log(`Cleanup test data for user: ${userId}`);
}

// =============================================================================
// Tool Test Execution Helper
// =============================================================================

/** Mock ToolExecutionOptions for tests */
const testToolOptions: ToolExecutionOptions = {
  toolCallId: 'test-call-id',
  messages: [],
};

/**
 * Execute a tool in test context with proper typing.
 * Validates input against the tool's Zod schema first (simulating AI SDK behavior),
 * then calls execute with validated data.
 */
export async function callTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolDef: { execute?: (...args: any[]) => any; inputSchema?: any },
  input: Record<string, unknown>,
): Promise<ToolOutput<any>> {
  if (!toolDef.execute) {
    throw new Error('Tool does not have an execute function');
  }

  // Validate input against tool's Zod schema (if available)
  if (toolDef.inputSchema && typeof toolDef.inputSchema.safeParse === 'function') {
    const parseResult = toolDef.inputSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      const field = firstError?.path?.[0] as string;

      // Map field names to specific error categories
      const categoryMap: Record<string, ErrorCategory> = {
        artifactId: ErrorCategory.INVALID_ARTIFACT_ID,
        tone: ErrorCategory.INVALID_TONE,
        numTopics: ErrorCategory.TOOL_EXECUTION_FAILED,
        topic: ErrorCategory.TOOL_EXECUTION_FAILED,
      };

      return {
        success: false,
        traceId: 'validation-error',
        data: null,
        error: {
          message: firstError?.message || 'Validation failed',
          category: categoryMap[field] || ErrorCategory.TOOL_EXECUTION_FAILED,
          recoverable: false,
        },
      };
    }

    // Use validated/coerced data
    return toolDef.execute(parseResult.data, testToolOptions) as Promise<ToolOutput<any>>;
  }

  return toolDef.execute(input, testToolOptions) as Promise<ToolOutput<any>>;
}

// =============================================================================
// Assertion Helpers
// =============================================================================

export function assertToolOutputSuccess(result: ToolOutput<any>): asserts result is ToolOutput<any> & { success: true } {
  if (typeof result !== 'object' || result === null) {
    throw new Error('Expected result to be an object');
  }
  if (!('success' in result) || result.success !== true) {
    throw new Error('Expected result.success to be true');
  }
  if (!('data' in result)) {
    throw new Error('Expected result to have data property');
  }
}

export function assertToolOutputError(result: ToolOutput<any>): asserts result is ToolOutput<any> & { success: false; error: { message: string; category: string } } {
  if (typeof result !== 'object' || result === null) {
    throw new Error('Expected result to be an object');
  }
  if (!('success' in result) || result.success !== false) {
    throw new Error('Expected result.success to be false');
  }
  if (!('error' in result)) {
    throw new Error('Expected result to have error property');
  }
}
