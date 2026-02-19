/**
 * Test Helpers
 *
 * Factory functions and utilities for creating test data.
 */

import type { ArtifactStatus, ArtifactType } from '../../types/portfolio.js';
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
 * Handles the ToolExecutionOptions requirement and type narrowing.
 */
export async function callTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolDef: { execute?: (...args: any[]) => any },
  input: Record<string, unknown>,
): Promise<ToolOutput<any>> {
  if (!toolDef.execute) {
    throw new Error('Tool does not have an execute function');
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
