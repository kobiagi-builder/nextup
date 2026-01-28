/**
 * Research Test Fixtures
 *
 * Pre-built research results for various test scenarios.
 */

import type { MockResearchResult } from '../utils/testHelpers.js';

// =============================================================================
// High-Quality Research Results (Mixed Sources)
// =============================================================================

export const highQualityResearch: MockResearchResult[] = [
  {
    artifact_id: 'artifact-research-complete-001',
    source_type: 'reddit',
    source_name: 'r/node - Best practices for Node.js API architecture',
    source_url: 'https://reddit.com/r/node/comments/abc123',
    excerpt: 'After building APIs for 5 years, I learned that proper error handling and validation middleware are crucial. Use express-validator for input validation and create custom error classes for different error types. Always use async/await with try-catch blocks.',
    relevance_score: 0.92,
    created_at: '2026-01-20T14:00:00Z',
  },
  {
    artifact_id: 'artifact-research-complete-001',
    source_type: 'linkedin',
    source_name: 'Building Scalable APIs at Netflix',
    source_url: 'https://linkedin.com/pulse/scalable-apis-netflix',
    excerpt: 'At Netflix scale, we learned that caching is essential. Implement Redis for frequently accessed data, use CDNs for static content, and design for horizontal scalability from day one. Rate limiting and circuit breakers prevent cascading failures.',
    relevance_score: 0.95,
    created_at: '2026-01-20T14:15:00Z',
  },
  {
    artifact_id: 'artifact-research-complete-001',
    source_type: 'medium',
    source_name: 'Node.js Performance Optimization Guide',
    source_url: 'https://medium.com/@author/node-performance',
    excerpt: 'Performance tuning starts with profiling. Use clinic.js to identify bottlenecks. Common wins include: using connection pooling for databases, implementing proper indexing, and avoiding synchronous operations in request handlers.',
    relevance_score: 0.88,
    created_at: '2026-01-20T14:30:00Z',
  },
  {
    artifact_id: 'artifact-research-complete-001',
    source_type: 'substack',
    source_name: 'API Security Newsletter - Authentication Best Practices',
    source_url: 'https://newsletter.substack.com/p/auth-best-practices',
    excerpt: 'JWT tokens should include minimal claims and have short expiration times. Always validate tokens on the server side, never trust client-provided data. Implement refresh token rotation and store sensitive tokens in httpOnly cookies.',
    relevance_score: 0.90,
    created_at: '2026-01-20T14:45:00Z',
  },
  {
    artifact_id: 'artifact-research-complete-001',
    source_type: 'quora',
    source_name: 'What are the biggest mistakes in API design?',
    source_url: 'https://quora.com/API-design-mistakes',
    excerpt: 'Top mistakes: inconsistent naming conventions, poor versioning strategy, missing documentation, and over-complicated response structures. Keep it simple, follow REST principles, and always document your endpoints with examples.',
    relevance_score: 0.85,
    created_at: '2026-01-20T15:00:00Z',
  },
];

// =============================================================================
// Varied Relevance Research (For Testing Filtering)
// =============================================================================

export const variedRelevanceResearch: MockResearchResult[] = [
  {
    artifact_id: 'artifact-test-001',
    source_type: 'reddit',
    source_name: 'Highly relevant source',
    source_url: 'https://example.com/high',
    excerpt: 'This is highly relevant content with specific insights about the topic.',
    relevance_score: 0.95,
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    artifact_id: 'artifact-test-001',
    source_type: 'linkedin',
    source_name: 'Medium relevance source',
    source_url: 'https://example.com/medium',
    excerpt: 'This content is somewhat related but not directly on topic.',
    relevance_score: 0.70,
    created_at: '2026-01-20T10:15:00Z',
  },
  {
    artifact_id: 'artifact-test-001',
    source_type: 'medium',
    source_name: 'Low relevance source',
    source_url: 'https://example.com/low',
    excerpt: 'This is tangentially related but not very useful.',
    relevance_score: 0.45,
    created_at: '2026-01-20T10:30:00Z',
  },
  {
    artifact_id: 'artifact-test-001',
    source_type: 'quora',
    source_name: 'Very high relevance source',
    source_url: 'https://example.com/very-high',
    excerpt: 'Extremely relevant with actionable insights and specific examples.',
    relevance_score: 0.98,
    created_at: '2026-01-20T10:45:00Z',
  },
];

// =============================================================================
// Minimal Research (Edge Case)
// =============================================================================

export const minimalResearch: MockResearchResult[] = [
  {
    artifact_id: 'artifact-minimal-001',
    source_type: 'reddit',
    source_name: 'Single source',
    source_url: 'https://example.com/single',
    excerpt: 'Only one research result available.',
    relevance_score: 0.80,
    created_at: '2026-01-20T12:00:00Z',
  },
];

// =============================================================================
// Empty Research (Error Case)
// =============================================================================

export const emptyResearch: MockResearchResult[] = [];

// =============================================================================
// Source-Specific Research (For Testing Source Types)
// =============================================================================

export const redditOnlyResearch: MockResearchResult[] = [
  {
    artifact_id: 'artifact-reddit-001',
    source_type: 'reddit',
    source_name: 'r/programming - Discussion 1',
    source_url: 'https://reddit.com/r/programming/1',
    excerpt: 'Reddit discussion about topic',
    relevance_score: 0.85,
    created_at: '2026-01-20T13:00:00Z',
  },
  {
    artifact_id: 'artifact-reddit-001',
    source_type: 'reddit',
    source_name: 'r/programming - Discussion 2',
    source_url: 'https://reddit.com/r/programming/2',
    excerpt: 'Another Reddit thread with insights',
    relevance_score: 0.82,
    created_at: '2026-01-20T13:15:00Z',
  },
];

export const linkedinOnlyResearch: MockResearchResult[] = [
  {
    artifact_id: 'artifact-linkedin-001',
    source_type: 'linkedin',
    source_name: 'Professional Article 1',
    source_url: 'https://linkedin.com/pulse/article-1',
    excerpt: 'Professional insights from industry expert',
    relevance_score: 0.90,
    created_at: '2026-01-20T13:30:00Z',
  },
];

// =============================================================================
// Export All Fixtures
// =============================================================================

export const researchFixtures = {
  highQuality: highQualityResearch,
  variedRelevance: variedRelevanceResearch,
  minimal: minimalResearch,
  empty: emptyResearch,
  redditOnly: redditOnlyResearch,
  linkedinOnly: linkedinOnlyResearch,
};
