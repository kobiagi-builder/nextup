/**
 * Artifact Test Fixtures
 *
 * Pre-built artifacts for various test scenarios.
 */

import type { MockArtifact } from '../utils/testHelpers.js';

// =============================================================================
// Draft Artifact (Minimal Data)
// =============================================================================

export const draftArtifact: MockArtifact = {
  id: 'artifact-draft-001',
  user_id: 'user-123',
  product_id: 'product-456',
  title: 'Getting Started with React Testing',
  type: 'blog',
  status: 'draft',
  content: null,
  skeleton: null,
  created_at: '2026-01-20T10:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
};

// =============================================================================
// Research-Complete Artifact
// =============================================================================

export const researchCompleteArtifact: MockArtifact = {
  id: 'artifact-research-complete-001',
  user_id: 'user-123',
  product_id: 'product-456',
  title: 'Building Scalable Node.js APIs',
  type: 'blog',
  status: 'research',
  content: null,
  skeleton: null,
  created_at: '2026-01-19T10:00:00Z',
  updated_at: '2026-01-20T15:30:00Z',
};

// =============================================================================
// Skeleton-Ready Artifact
// =============================================================================

export const skeletonReadyArtifact: MockArtifact = {
  id: 'artifact-skeleton-ready-001',
  user_id: 'user-123',
  product_id: 'product-456',
  title: 'Microservices Architecture Best Practices',
  type: 'blog',
  status: 'skeleton',
  content: null,
  skeleton: `# Introduction
Hook that grabs attention about microservices
Brief overview of why architecture matters

## Understanding Microservices
- Definition and core concepts
- When to use microservices vs monoliths
- Key benefits and trade-offs

## Design Principles
- Service boundaries and domain modeling
- Communication patterns (sync vs async)
- Data management strategies

## Implementation Best Practices
- API gateway patterns
- Service discovery and load balancing
- Monitoring and observability

## Common Pitfalls
- Overengineering early
- Ignoring operational complexity
- Poor service boundaries

## Conclusion
Summary of key takeaways
Call to action for readers`,
  created_at: '2026-01-18T10:00:00Z',
  updated_at: '2026-01-20T16:45:00Z',
};

// =============================================================================
// Writing-In-Progress Artifact
// =============================================================================

export const writingArtifact: MockArtifact = {
  id: 'artifact-writing-001',
  user_id: 'user-123',
  product_id: 'product-456',
  title: 'GraphQL vs REST: Choosing the Right API',
  type: 'blog',
  status: 'writing',
  content: `# Introduction

When building modern web applications, one of the most critical decisions is choosing the right API architecture. While REST has been the industry standard for years, GraphQL has emerged as a powerful alternative. This guide will help you understand when to use each approach.

## Understanding REST

REST (Representational State Transfer) is an architectural style that uses standard HTTP methods (GET, POST, PUT, DELETE) to interact with resources. Each endpoint typically returns a fixed data structure.

Key characteristics:
- Multiple endpoints for different resources
- Over-fetching or under-fetching data
- Simple caching with HTTP headers
- Well-established tooling and patterns`,
  skeleton: `# Introduction
Hook about API architecture decisions
Brief overview of REST vs GraphQL

## Understanding REST
- Definition and HTTP methods
- Resource-based endpoints
- Pros and cons

## Understanding GraphQL
- Query language for APIs
- Single endpoint with flexible queries
- Pros and cons

## When to Use REST
- Use cases and scenarios

## When to Use GraphQL
- Use cases and scenarios

## Conclusion
Summary and recommendations`,
  created_at: '2026-01-17T10:00:00Z',
  updated_at: '2026-01-21T09:15:00Z',
};

// =============================================================================
// Creating-Visuals Artifact
// =============================================================================

export const creatingVisualsArtifact: MockArtifact = {
  id: 'artifact-visuals-001',
  user_id: 'user-123',
  product_id: 'product-456',
  title: 'Docker Container Security Guide',
  type: 'showcase',
  status: 'creating_visuals',
  content: `# Project Overview

Comprehensive guide to securing Docker containers in production environments. [IMAGE: Docker security layers diagram]

## Challenge

Container security is often overlooked until it's too late. Teams need practical guidance on hardening Docker deployments against common attack vectors.

[IMAGE: Common Docker vulnerabilities infographic]

## Solution

Implemented a layered security approach covering image scanning, runtime protection, and network isolation.

Key strategies:
- Base image selection and scanning
- Least privilege principles
- Network segmentation
- Secret management

[VIDEO: Demonstration of vulnerability scanning]

## Results

Reduced security vulnerabilities by 85% and achieved compliance with industry standards.

[IMAGE: Before/after security metrics dashboard]`,
  skeleton: `# Project Overview
Description with visual placeholder

## Challenge
Problem statement with supporting visual

## Solution
Approach with demonstration video

## Results
Outcomes with metrics visual`,
  created_at: '2026-01-16T10:00:00Z',
  updated_at: '2026-01-21T14:20:00Z',
};

// =============================================================================
// Ready Artifact (Complete)
// =============================================================================

export const readyArtifact: MockArtifact = {
  id: 'artifact-ready-001',
  user_id: 'user-123',
  product_id: 'product-456',
  title: 'Kubernetes Production Readiness Checklist',
  type: 'blog',
  status: 'ready',
  content: `# Introduction

Deploying Kubernetes to production requires careful planning and attention to detail. This checklist will guide you through the essential steps to ensure your cluster is production-ready.

## Cluster Architecture

Start with a solid foundation. Your cluster should have:

- Multiple control plane nodes for high availability
- Separate node pools for different workload types
- Properly sized nodes based on workload requirements
- Network policies to enforce segmentation

High availability isn't optional in production. Plan for failures at every level.

## Security Hardening

Security should be baked in from day one:

- Enable RBAC and follow least privilege principles
- Use Pod Security Standards to prevent privileged containers
- Implement network policies to control traffic flow
- Regularly scan images for vulnerabilities
- Rotate credentials and certificates automatically

## Monitoring and Observability

You can't manage what you can't measure:

- Deploy Prometheus and Grafana for metrics
- Set up centralized logging with ELK or Loki
- Implement distributed tracing
- Create runbooks for common issues
- Set up alerts for critical conditions

## Backup and Disaster Recovery

Hope for the best, plan for the worst:

- Regular etcd backups
- Test restore procedures
- Document recovery steps
- Multi-region deployment for critical workloads

## Conclusion

Production readiness is an ongoing process, not a one-time checklist. Regular reviews and updates ensure your cluster remains secure and reliable.

Start with these foundations and iterate based on your specific needs and lessons learned.`,
  skeleton: `# Introduction
Hook about K8s production deployment
Overview of checklist

## Cluster Architecture
- HA requirements
- Node configuration
- Network setup

## Security Hardening
- RBAC
- Pod security
- Network policies

## Monitoring and Observability
- Metrics
- Logging
- Tracing

## Backup and Disaster Recovery
- Backup strategies
- Testing

## Conclusion
Summary and next steps`,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-22T11:00:00Z',
};

// =============================================================================
// Social Post Artifact
// =============================================================================

export const socialPostArtifact: MockArtifact = {
  id: 'artifact-social-001',
  user_id: 'user-123',
  product_id: 'product-456',
  title: 'LinkedIn Post: Remote Work Productivity',
  type: 'social_post',
  status: 'ready',
  content: `Working remotely for 3 years taught me this:

Productivity isn't about working more hours.

It's about working smarter:

• Block deep work time (no meetings, no Slack)
• Use async communication by default
• Take real breaks (not scroll breaks)
• Set clear boundaries between work and life
• Invest in your home office setup

The biggest shift? Trusting yourself to manage your time.

What's your #1 remote work productivity tip?`,
  skeleton: `Hook: Attention-grabbing statement about remote work

Key Points: 5 productivity strategies

Call to Action: Question to drive engagement`,
  created_at: '2026-01-22T08:00:00Z',
  updated_at: '2026-01-22T08:30:00Z',
};

// =============================================================================
// Export All Fixtures
// =============================================================================

export const artifactFixtures = {
  draft: draftArtifact,
  researchComplete: researchCompleteArtifact,
  skeletonReady: skeletonReadyArtifact,
  writing: writingArtifact,
  creatingVisuals: creatingVisualsArtifact,
  ready: readyArtifact,
  socialPost: socialPostArtifact,
};
