# Core Tools Reference

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Phase 1 MVP

---

## Introduction

This document provides complete reference documentation for the **6 core content creation tools** used by the Content Agent to orchestrate the 7-status workflow. Each tool performs a specific step in the content creation pipeline, from research gathering to visual generation.

**Core Tools Overview:**
1. **conductDeepResearch** - Gather research from 5+ sources (draft → research)
2. **generateContentSkeleton** - Create structured outline (research → skeleton)
3. **writeContentSection** - Write single section content (skeleton → skeleton)
4. **writeFullContent** - Write all sections at once (skeleton → writing)
5. **applyHumanityCheck** - Remove AI patterns (writing → creating_visuals)
6. **generateContentVisuals** - Generate/detect visual placeholders (creating_visuals → ready)

**What this document covers:**
- ToolOutput<T> interface specification
- Complete input/output schemas for each tool
- Status transition rules and constraints
- AI provider specifications (Claude, Gemini, Tavily)
- Error scenarios and recovery strategies
- Usage examples with code
- Tool chaining and integration patterns

---

## ToolOutput<T> Interface

All core tools return a standardized `ToolOutput<T>` interface for consistent result handling and observability.

### Interface Specification

```typescript
interface ToolOutput<T> {
  /** Whether tool execution succeeded */
  success: boolean;

  /** Unique trace ID for distributed tracing */
  traceId: string;

  /** Execution duration in milliseconds */
  duration?: number;

  /** Status transition that occurred (if any) */
  statusTransition?: {
    from: ArtifactStatus;
    to: ArtifactStatus;
  };

  /** Tool-specific result data */
  data: T;

  /** Error information (if success = false) */
  error?: {
    category: ErrorCategory;
    message: string;
    recoverable: boolean;
  };
}
```

### Trace ID Format

**Pattern**: `ca-{timestamp}-{random6}` or `{tool}-{timestamp}-{random6}`

**Examples**:
- `ca-1706284532000-a3b4c5` (Content Agent general)
- `research-1706284532000-x9y8z7` (Research tool)
- `skeleton-1706284532000-m1n2o3` (Skeleton tool)

**Purpose**: Distributed tracing across backend, AI providers, and database operations.

### Status Transitions

| From Status | To Status | Tool |
|-------------|-----------|------|
| `draft` | `research` | conductDeepResearch |
| `research` | `skeleton` | generateContentSkeleton |
| `skeleton` | `writing` | writeFullContent |
| `skeleton` | `skeleton` | writeContentSection (no status change) |
| `writing` | `creating_visuals` | applyHumanityCheck |
| `creating_visuals` | `ready` | generateContentVisuals |

---

## 1. conductDeepResearch

**Purpose**: Conduct deep research using multiple sources (Reddit, LinkedIn, Quora, Medium, Substack) to gather context for content creation.

**AI Provider**: Tavily API (web search with domain filtering)

**Status Transition**: `draft` → `research`

### Input Schema

```typescript
{
  artifactId: string;      // UUID format
  topic: string;           // Min 3 characters
  artifactType: 'blog' | 'social_post' | 'showcase';
}
```

**Zod Validation**:
```typescript
z.object({
  artifactId: z.string().uuid().describe('ID of the artifact to research for'),
  topic: z.string().min(3).describe('Research topic or content subject'),
  artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact being created'),
})
```

### Output Schema

```typescript
ToolOutput<{
  sourceCount: number;              // Total research results stored
  keyInsights: Array<{
    sourceType: SourceType;
    sourceName: string;
    excerpt: string;                // Truncated to 150 chars
    relevanceScore: number;         // 0.0 - 1.0
  }>;
  sourcesBreakdown: Record<SourceType, number>;  // Count per source
  uniqueSourcesCount: number;       // Number of unique source types (must be 5+)
}>
```

### Research Flow

**1. Source Priority Determination**
- **Technical topics** → Medium, Substack, LinkedIn, Reddit, Quora
- **Business topics** → LinkedIn, Medium, Substack, Reddit, Quora
- **Community topics** → Reddit, Quora, Medium, LinkedIn, Substack

**2. Parallel Query Execution**
- Query top 5 sources simultaneously (4 results per source = 20 potential)
- Tavily API with domain filters:
  - Reddit: `['reddit.com']`
  - LinkedIn: `['linkedin.com']`
  - Quora: `['quora.com']`
  - Medium: `['medium.com']`
  - Substack: `['substack.com']`

**3. Result Filtering**
- Filter by relevance score > 0.6
- Sort by relevance (highest first)
- Take top 20 results

**4. Source Validation**
- Require minimum 5 unique source types
- If < 5 sources, return `RESEARCH_NOT_FOUND` error

**5. Database Storage**
- Store filtered results in `artifact_research` table
- Update artifact status to `research`

### Error Scenarios

| Error Category | Condition | Recoverable | Recovery Strategy |
|----------------|-----------|-------------|-------------------|
| `RESEARCH_NOT_FOUND` | < 5 unique sources found | Yes | Retry with broader topic, adjust Tavily search params |
| `TOOL_EXECUTION_FAILED` | Database insert fails | No | Check database connectivity, validate artifact ID |
| `TOOL_TIMEOUT` | Tavily API timeout | Yes | Retry with exponential backoff (3 attempts) |
| `AI_PROVIDER_ERROR` | Tavily API error (503) | Yes | Retry after delay (30 seconds) |
| `INVALID_STATUS` | Artifact not in `draft` | Yes | Execute prerequisite tools to reach `draft` |

### Usage Example

```typescript
// Execute research tool
const result = await conductDeepResearch.execute({
  artifactId: 'abc-123-def-456',
  topic: 'AI in Healthcare: Diagnostic Applications',
  artifactType: 'blog'
});

// Result (success case)
{
  success: true,
  traceId: 'research-1706284532000-x9y8z7',
  duration: 8542,  // milliseconds
  statusTransition: { from: 'draft', to: 'research' },
  data: {
    sourceCount: 18,
    keyInsights: [
      {
        sourceType: 'medium',
        sourceName: 'AI-Powered Diagnostics: A Healthcare Revolution',
        excerpt: 'Recent studies show AI diagnostic systems achieve 94% accuracy in detecting early-stage diseases, outperforming traditional methods...',
        relevanceScore: 0.92
      },
      {
        sourceType: 'linkedin',
        sourceName: 'Healthcare AI Adoption Trends 2026',
        excerpt: 'Major hospitals report 40% reduction in diagnostic errors after implementing AI-assisted workflows...',
        relevanceScore: 0.88
      },
      // ... 3 more insights
    ],
    sourcesBreakdown: {
      'reddit': 4,
      'linkedin': 5,
      'medium': 4,
      'quora': 3,
      'substack': 2
    },
    uniqueSourcesCount: 5
  }
}

// Error case (insufficient sources)
{
  success: false,
  traceId: 'research-1706284532000-x9y8z7',
  duration: 6234,
  data: {
    sourceCount: 0,
    keyInsights: [],
    sourcesBreakdown: {},
    uniqueSourcesCount: 3  // Only 3 sources found
  },
  error: {
    category: 'RESEARCH_NOT_FOUND',
    message: 'Insufficient sources found. Need at least 5 different sources, found 3.',
    recoverable: true
  }
}
```

### Validation Requirements

**Pre-execution**:
- Artifact must exist in database
- Artifact status must be `draft`
- Topic must be non-empty (min 3 characters)
- Artifact ID must be valid UUID

**Post-execution**:
- Minimum 5 unique source types required
- Each result must have relevance score > 0.6
- Maximum 20 results stored (top-ranked)

### Related Tools

- **Next Tool**: `generateContentSkeleton` (uses research data)
- **Context Tool**: `fetchResearch` (retrieve stored research)
- **Alternative**: Manual research upload (user-provided sources)

---

## 2. generateContentSkeleton

**Purpose**: Create structured content outline/skeleton based on research findings and user-selected tone.

**AI Provider**: Claude (Anthropic API)

**Status Transition**: `research` → `skeleton`

### Input Schema

```typescript
{
  artifactId: string;      // UUID format
  tone?: ToneOption;       // Optional, defaults to 'professional'
}
```

**Zod Validation**:
```typescript
z.object({
  artifactId: z.string().uuid().describe('ID of the artifact to create skeleton for'),
  tone: z.enum([
    'formal', 'casual', 'professional', 'conversational',
    'technical', 'friendly', 'authoritative', 'humorous'
  ]).optional().describe('Tone for the content (default: professional)'),
})
```

### Tone Options

| Tone | Characteristics | Temperature | Use Case |
|------|-----------------|-------------|----------|
| `formal` | Academic language, passive voice, complex sentences | 0.5 | Research papers, formal reports |
| `casual` | Contractions, everyday language, short sentences | 0.7 | Personal blogs, friendly content |
| `professional` | Clear and direct, industry terminology, balanced | 0.6 | Business content, professional articles |
| `conversational` | First-person, rhetorical questions, engaging | 0.7 | Social posts, interactive content |
| `technical` | Precise terminology, detailed explanations, evidence-based | 0.4 | Technical documentation, guides |
| `friendly` | Warm and supportive, personal anecdotes, encouraging | 0.7 | Community content, how-to guides |
| `authoritative` | Strong statements, expert positioning, confident | 0.5 | Thought leadership, industry analysis |
| `humorous` | Light jokes, wordplay, entertaining examples | 0.8 | Engaging content, viral posts |

### Output Schema

```typescript
ToolOutput<{
  skeleton: string;              // Markdown skeleton with H1/H2 structure
  sections: number;              // Number of sections (H2 headings)
  imagePlaceholders: number;     // Number of [IMAGE: ...] placeholders
  estimatedWordCount: number;    // Estimated final content length
  sectionsBreakdown: Array<{
    heading: string;
    placeholder: string;         // Section notes/guidance
    estimatedWords: number;
  }>;
}>
```

### Skeleton Structure by Artifact Type

**Blog**:
```markdown
# [Title]

[Hook/Introduction]

[IMAGE: Featured image - description]

## Section 1 (H2)
[Placeholder: Main point 1]
[IMAGE: Supporting visual]

## Section 2 (H2)
[Placeholder: Main point 2]
[IMAGE: Supporting visual]

## Section 3 (H2)
[Placeholder: Main point 3]
[IMAGE: Supporting visual]

## Conclusion
[Placeholder: Key takeaways]

Call to Action: [Next steps]
```

**Social Post**:
```markdown
Hook: [Attention-grabbing first line]

Point 1: [Key insight]
- [Supporting detail]

Point 2: [Key insight]
- [Supporting detail]

Call to Action: [Engagement prompt]

[IMAGE: Post visual description]

#hashtag1 #hashtag2 #hashtag3
```

**Showcase**:
```markdown
# [Project Title]

[IMAGE: Hero image - project screenshot]

## Overview
[Placeholder: Project summary]

## Problem Statement
[Placeholder: Challenge addressed]
[IMAGE: Problem visualization]

## Solution Approach
[Placeholder: How it works]
[IMAGE: Solution diagram]

## Results/Impact
[Placeholder: Outcomes achieved]
[IMAGE: Results visualization]

## Key Learnings
[Placeholder: Insights gained]
```

### Research Integration

The tool fetches research data from `artifact_research` table and builds context string:

```typescript
// Research context format
const researchContext = `
Research Insights (18 sources):

Reddit (4 sources):
- "Community experiences with AI diagnostics show 40% faster detection..."
- "Users report concerns about data privacy in AI-powered healthcare..."

LinkedIn (5 sources):
- "Industry trends indicate 85% of hospitals adopting AI by 2027..."
- "Professional perspectives on AI integration challenges..."

Medium (4 sources):
- "In-depth analysis of AI diagnostic accuracy rates..."
- "Case studies from leading healthcare institutions..."

[... etc ...]
`;
```

### Error Scenarios

| Error Category | Condition | Recoverable | Recovery Strategy |
|----------------|-----------|-------------|-------------------|
| `INVALID_STATUS` | Artifact not in `research` | Yes | Execute `conductDeepResearch` first |
| `RESEARCH_NOT_FOUND` | < 5 research sources found | Yes | Execute `conductDeepResearch` to gather sources |
| `TOOL_EXECUTION_FAILED` | Database update fails | No | Check database connectivity |
| `AI_PROVIDER_ERROR` | Claude API error (503) | Yes | Retry with exponential backoff (3 attempts) |
| `AI_RATE_LIMIT` | Claude rate limit exceeded | Yes | Wait + retry (backoff with jitter) |
| `AI_CONTENT_FILTER` | Content filtered by Claude | No | Rephrase topic, adjust research context |

### Usage Example

```typescript
// Execute skeleton generation
const result = await generateContentSkeleton.execute({
  artifactId: 'abc-123-def-456',
  tone: 'professional'
});

// Result (success case)
{
  success: true,
  traceId: 'skeleton-1706284532000-m1n2o3',
  duration: 12453,
  statusTransition: { from: 'research', to: 'skeleton' },
  data: {
    skeleton: `# AI in Healthcare: Transforming Diagnostic Accuracy

[Write engaging hook here - introduce the revolution in AI diagnostics]

[IMAGE: Featured image - AI-powered diagnostic system in hospital setting]

## Current State of AI Diagnostics
[Expand on research findings about current adoption rates and accuracy improvements]
[IMAGE: Infographic showing 94% accuracy rates vs traditional methods]

## Key Technologies Driving Change
[Discuss machine learning models, computer vision, and deep learning applications]
[IMAGE: Technology stack diagram]

## Impact on Patient Outcomes
[Present data on reduced diagnostic errors and faster treatment initiation]
[IMAGE: Patient outcome comparison chart]

## Challenges and Ethical Considerations
[Address privacy concerns, bias in training data, and regulatory hurdles]
[IMAGE: Ethics framework visualization]

## Future Outlook
[Summarize trends and predictions for AI in healthcare through 2030]

Call to Action: [Encourage readers to explore AI solutions for their practice]`,
    sections: 5,
    imagePlaceholders: 6,
    estimatedWordCount: 2150,
    sectionsBreakdown: [
      {
        heading: 'Current State of AI Diagnostics',
        placeholder: 'Expand on research findings about current adoption rates',
        estimatedWords: 400
      },
      {
        heading: 'Key Technologies Driving Change',
        placeholder: 'Discuss machine learning models, computer vision',
        estimatedWords: 400
      },
      // ... 3 more sections
    ]
  }
}
```

### Validation Requirements

**Pre-execution**:
- Artifact must exist in database
- Artifact status must be `research`
- Minimum 5 research sources required
- Research data must be accessible from `artifact_research` table

**Post-execution**:
- Skeleton must contain H1 title
- Minimum 3 H2 sections (for blog/showcase)
- At least 1 image placeholder
- Skeleton stored in `artifact.content` field
- Artifact status updated to `skeleton`

### Related Tools

- **Previous Tool**: `conductDeepResearch` (provides research data)
- **Next Tool**: `writeFullContent` or `writeContentSection` (uses skeleton)
- **Context Tool**: `fetchArtifact` (retrieve skeleton for review)

---

## 3. writeContentSection

**Purpose**: Write content for a single skeleton section using Gemini AI. Used for granular, section-by-section content creation.

**AI Provider**: Gemini 2.0 Flash (Google)

**Status Transition**: `skeleton` → `skeleton` (no status change)

### Input Schema

```typescript
{
  artifactId: string;          // UUID format
  sectionHeading: string;      // Exact H2 heading from skeleton
  tone?: ToneOption;           // Optional, defaults to 'professional'
}
```

**Zod Validation**:
```typescript
z.object({
  artifactId: z.string().uuid().describe('ID of the artifact to write content for'),
  sectionHeading: z.string().min(3).describe('Exact H2 heading from skeleton'),
  tone: z.enum([
    'formal', 'casual', 'professional', 'conversational',
    'technical', 'friendly', 'authoritative', 'humorous'
  ]).optional().describe('Tone for the content (default: professional)'),
})
```

### Output Schema

```typescript
ToolOutput<{
  sectionContent: string;        // Written content for the section
  wordCount: number;             // Actual word count
  researchCitationsUsed: number; // Number of research insights incorporated
  sectionHeading: string;        // Echo back the section heading
}>
```

### Content Generation Process

**1. Extract Section Details**
```typescript
// Parse skeleton to find section
const skeletonPattern = /## ${sectionHeading}\n([\s\S]*?)(?=\n##|\n\[IMAGE:|\Z)/;
const [, sectionPlaceholder] = skeleton.match(skeletonPattern) || [];
```

**2. Fetch Research Context**
```typescript
// Get relevant research for section topic
const research = await fetchResearch({ artifactId, limit: 20 });
// Filter by relevance to section heading
const relevantResearch = research.filter(r =>
  r.relevance_score > 0.6 &&
  r.excerpt.toLowerCase().includes(keywordsFromHeading)
);
```

**3. Build Content Prompt**
```typescript
const prompt = `You are a professional content writer creating ${artifactType} content.

## Your Task
Write compelling content for this section of a ${artifactType}.

## Section to Write
Heading: ${sectionHeading}
Placeholder/Notes: ${sectionPlaceholder}

## Research Context (incorporate naturally)
${researchContext}

## Tone Requirements
${toneModifiers[tone]}

## Writing Guidelines
- Write engaging, well-researched content
- Reference research findings naturally (don't cite sources explicitly)
- Use specific details, not vague claims
- Vary sentence structure for readability
- Stay focused on the section topic
- Match the tone consistently throughout
- Aim for 200-400 words per section

## Output
Write ONLY the content for this section. Do not include headings, markdown formatting, or meta-commentary.`;
```

**4. Generate with Gemini**
```typescript
const { text } = await generateText({
  model: google('gemini-2.0-flash-exp'),
  prompt,
  maxTokens: tokenLimits[artifactType],  // 2000 for blog
  temperature: toneTemperatures[tone],   // 0.4-0.8 based on tone
});
```

**5. Update Skeleton**
- Replace section placeholder with generated content
- Preserve other sections (unchanged)
- Update artifact in database

### Temperature Mapping

| Tone | Temperature | Rationale |
|------|-------------|-----------|
| `technical` | 0.4 | Deterministic, precise language |
| `formal` | 0.5 | Professional, consistent terminology |
| `authoritative` | 0.5 | Confident, evidence-based statements |
| `professional` | 0.6 | Balanced creativity and consistency |
| `casual` | 0.7 | Natural, conversational variation |
| `conversational` | 0.7 | Engaging, varied phrasing |
| `friendly` | 0.7 | Warm, personal touch |
| `humorous` | 0.8 | Creative, entertaining language |

### Error Scenarios

| Error Category | Condition | Recoverable | Recovery Strategy |
|----------------|-----------|-------------|-------------------|
| `INVALID_STATUS` | Artifact not in `skeleton` | Yes | Execute `generateContentSkeleton` first |
| `MISSING_CONTEXT` | Section heading not found in skeleton | No | Verify section heading matches H2 in skeleton |
| `TOOL_EXECUTION_FAILED` | Database update fails | No | Check database connectivity |
| `AI_PROVIDER_ERROR` | Gemini API error (503) | Yes | Retry with exponential backoff (3 attempts) |
| `AI_RATE_LIMIT` | Gemini rate limit exceeded | Yes | Wait + retry (backoff with jitter) |
| `AI_CONTENT_FILTER` | Content filtered by Gemini | No | Rephrase section heading, adjust research context |

### Usage Example

```typescript
// Execute section writing
const result = await writeContentSection.execute({
  artifactId: 'abc-123-def-456',
  sectionHeading: 'Current State of AI Diagnostics',
  tone: 'professional'
});

// Result (success case)
{
  success: true,
  traceId: 'ca-1706284532000-p7q8r9',
  duration: 8234,
  // No status transition for section writing
  data: {
    sectionContent: `The landscape of AI diagnostics has evolved dramatically over the past five years, with major healthcare institutions reporting significant improvements in diagnostic accuracy and efficiency. Recent studies demonstrate that AI-powered diagnostic systems achieve 94% accuracy in detecting early-stage diseases, substantially outperforming traditional diagnostic methods.

Healthcare providers are increasingly adopting AI-assisted workflows, with industry data indicating that 85% of hospitals plan to implement AI diagnostic tools by 2027. This rapid adoption is driven by compelling evidence of improved patient outcomes, including a 40% reduction in diagnostic errors and faster treatment initiation times.

The technology leverages advanced machine learning models trained on millions of medical images and patient records, enabling healthcare professionals to identify patterns and anomalies that might otherwise go undetected. While challenges remain around data privacy and regulatory compliance, the trajectory clearly points toward AI becoming an integral component of modern diagnostic medicine.`,
    wordCount: 187,
    researchCitationsUsed: 4,
    sectionHeading: 'Current State of AI Diagnostics'
  }
}
```

### Validation Requirements

**Pre-execution**:
- Artifact must exist in database
- Artifact status must be `skeleton`
- Section heading must match an H2 heading in skeleton exactly
- Research data must be available (5+ sources)

**Post-execution**:
- Content must be 100-500 words
- Content replaces placeholder in skeleton
- Artifact updated in database (no status change)

### Related Tools

- **Previous Tool**: `generateContentSkeleton` (creates section structure)
- **Alternative**: `writeFullContent` (write all sections at once)
- **Context Tool**: `fetchArtifact` (retrieve current skeleton state)

---

## 4. writeFullContent

**Purpose**: Write complete content for all skeleton sections in one pass using Gemini AI. Used for full automation of content writing.

**AI Provider**: Gemini 2.0 Flash (Google)

**Status Transition**: `skeleton` → `writing`

### Input Schema

```typescript
{
  artifactId: string;      // UUID format
  tone?: ToneOption;       // Optional, defaults to 'professional'
}
```

**Zod Validation**:
```typescript
z.object({
  artifactId: z.string().uuid().describe('ID of the artifact to write content for'),
  tone: z.enum([
    'formal', 'casual', 'professional', 'conversational',
    'technical', 'friendly', 'authoritative', 'humorous'
  ]).optional().describe('Tone for the content (default: professional)'),
})
```

### Output Schema

```typescript
ToolOutput<{
  totalWordCount: number;           // Total words written across all sections
  sectionsWritten: number;          // Number of sections completed
  researchCitationsUsed: number;    // Total research insights incorporated
  duration: number;                 // Execution time in milliseconds
}>
```

### Content Generation Process

**1. Parse Skeleton Sections**
```typescript
// Extract all H2 sections from skeleton
const sections = parseSectionsFromSkeleton(skeleton, artifactType);
// Example: ['Current State', 'Key Technologies', 'Impact on Patients', ...]
```

**2. Sequential Section Writing**
```typescript
for (const section of sections) {
  // Extract section placeholder/notes
  const sectionPattern = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n##|\\n\\[IMAGE:|\\Z)`);
  const [, placeholder] = skeleton.match(sectionPattern) || [];

  // Generate content for section
  const content = await generateSectionContent(section, placeholder, tone, research);

  // Replace placeholder with content
  skeleton = skeleton.replace(sectionPattern, `## ${section}\n${content}`);
}
```

**3. Update Artifact**
```typescript
// Update artifact with full content
await supabaseAdmin
  .from('artifacts')
  .update({
    content: skeleton,
    status: 'writing',
    updated_at: new Date().toISOString()
  })
  .eq('id', artifactId);
```

### Token Limits by Artifact Type

| Artifact Type | Max Tokens | Approx Words | Rationale |
|---------------|------------|--------------|-----------|
| `blog` | 2000 | ~1500 per section | Long-form content, detailed sections |
| `social_post` | 500 | ~375 entire post | Short, punchy content for social media |
| `showcase` | 1500 | ~1125 per section | Balanced detail and accessibility |

### Error Scenarios

| Error Category | Condition | Recoverable | Recovery Strategy |
|----------------|-----------|-------------|-------------------|
| `INVALID_STATUS` | Artifact not in `skeleton` | Yes | Execute `generateContentSkeleton` first |
| `TOOL_EXECUTION_FAILED` | Database update fails | No | Check database connectivity |
| `TOOL_TIMEOUT` | Writing exceeds 120 seconds | Yes | Use `writeContentSection` for partial workflow |
| `AI_PROVIDER_ERROR` | Gemini API error (503) | Yes | Retry with exponential backoff (3 attempts) |
| `AI_RATE_LIMIT` | Gemini rate limit exceeded | Yes | Wait + retry (backoff with jitter) |
| `AI_CONTENT_FILTER` | Content filtered by Gemini | No | Adjust topic, research context, or tone |

### Usage Example

```typescript
// Execute full content writing
const result = await writeFullContent.execute({
  artifactId: 'abc-123-def-456',
  tone: 'conversational'
});

// Result (success case)
{
  success: true,
  traceId: 'ca-1706284532000-s4t5u6',
  duration: 45678,
  statusTransition: { from: 'skeleton', to: 'writing' },
  data: {
    totalWordCount: 2384,
    sectionsWritten: 5,
    researchCitationsUsed: 18,
    duration: 45678
  }
}

// Artifact now contains full content:
// - All sections written (placeholders replaced)
// - Status updated to 'writing'
// - Ready for humanity check
```

### Validation Requirements

**Pre-execution**:
- Artifact must exist in database
- Artifact status must be `skeleton`
- Skeleton must have 3+ H2 sections (for blog/showcase)
- Research data must be available (5+ sources)

**Post-execution**:
- All section placeholders replaced with content
- Total word count within expected range:
  - Blog: 1500-3000 words
  - Social Post: 150-400 words
  - Showcase: 1000-2000 words
- Artifact status updated to `writing`
- Content stored in `artifact.content` field

### Related Tools

- **Previous Tool**: `generateContentSkeleton` (creates section structure)
- **Alternative**: `writeContentSection` (granular, section-by-section)
- **Next Tool**: `applyHumanityCheck` (remove AI patterns)

---

## 5. applyHumanityCheck

**Purpose**: Remove AI-detectable writing patterns from content using Claude AI. Applies 24 known AI patterns based on Wikipedia's "Signs of AI writing" guide.

**AI Provider**: Claude (Anthropic API)

**Status Transition**: `writing` → `creating_visuals`

### Input Schema

```typescript
{
  artifactId: string;      // UUID format
  content: string;         // Content to humanize (min 10 chars)
  tone: ToneOption;        // Tone to maintain during humanization
}
```

**Zod Validation**:
```typescript
z.object({
  artifactId: z.string().uuid().describe('ID of the artifact to humanize'),
  content: z.string().min(10).describe('Content to humanize'),
  tone: z.enum([
    'formal', 'casual', 'professional', 'conversational',
    'technical', 'friendly', 'authoritative', 'humorous'
  ]).describe('Tone to maintain during humanization'),
})
```

### Output Schema

```typescript
ToolOutput<{
  patternsFixed: number;           // Number of AI patterns removed
  lengthBefore: number;            // Original character count
  lengthAfter: number;             // Humanized character count
  percentageChange: number;        // % length change (negative = shorter)
  humanityScore: number;           // 0-100 (higher = more human-like)
  patternsDetected: Array<{
    pattern: string;               // Pattern name
    count: number;                 // Occurrences found
    examples: string[];            // Sample occurrences
  }>;
}>
```

### AI Writing Patterns (24 Total)

Based on Wikipedia's ["Signs of AI writing" guide](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing):

**Vocabulary Patterns (8)**:
1. Inflated symbolism ("tapestry", "mosaic", "beacon")
2. AI-specific phrases ("delve into", "it's important to note")
3. Promotional language ("very", "extremely", "absolutely")
4. Superficial -ing analyses ("expanding", "exploring", "examining")
5. Vague attributions ("some argue", "experts say")
6. Em dash overuse (—) in mid-sentence
7. Rule of three repetition
8. Negative parallelisms ("not just X, but Y")

**Structure Patterns (8)**:
9. Long, winding sentences (>40 words)
10. Excessive use of transitional phrases
11. Paragraph-initial conjunctions
12. Overuse of semicolons
13. Unnatural phrase ordering
14. Repetitive sentence structures
15. Lack of sentence variety
16. Overly formal academic structure

**Style Patterns (4)**:
17. Passive voice overuse
18. Nominalizations ("utilization" vs "use")
19. Hedging language ("perhaps", "somewhat")
20. Redundant modifiers ("various different")

**Tone Patterns (4)**:
21. Overly enthusiastic endings
22. Artificial enthusiasm markers
23. Lack of personality or voice
24. Generic concluding statements

### Humanization Process

**1. Pattern Detection**
```typescript
// Detect all 24 patterns in content
const detectedPatterns = await detectAIPatterns(content);

// Example output:
[
  { pattern: 'Inflated symbolism', count: 7, examples: ['tapestry of solutions', 'beacon of hope'] },
  { pattern: 'Em dash overuse', count: 12, examples: ['challenges—and opportunities—that'] },
  { pattern: 'Long sentences', count: 5, examples: ['With the rapid advancement...'] }
]
```

**2. Generate Humanization Prompt**
```typescript
const prompt = `You are a professional editor improving content to sound more human and natural.

## Content to Humanize
${content}

## Detected AI Patterns (remove these)
${detectedPatterns.map(p => `- ${p.pattern}: ${p.count} occurrences`).join('\n')}

## Tone to Maintain
${toneModifiers[tone]}

## Guidelines
1. Remove inflated language ("tapestry", "delve", "beacon")
2. Reduce em dash usage (—) - use commas or periods instead
3. Break long sentences (>40 words) into shorter ones
4. Vary sentence structures for natural rhythm
5. Replace passive voice with active voice where possible
6. Remove hedging language ("perhaps", "somewhat")
7. Make conclusions specific, not generic
8. Maintain the tone: ${tone}

## Output
Return ONLY the humanized content. Maintain all section structure, headings, and image placeholders.`;
```

**3. Apply Humanization with Claude**
```typescript
const { text: humanizedContent } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt,
  maxTokens: 4000,
  temperature: 0.3,  // Low temperature for consistency
});
```

**4. Calculate Metrics**
```typescript
const metrics = {
  patternsFixed: detectedPatterns.reduce((sum, p) => sum + p.count, 0),
  lengthBefore: content.length,
  lengthAfter: humanizedContent.length,
  percentageChange: ((humanizedContent.length - content.length) / content.length) * 100,
  humanityScore: calculateHumanityScore(humanizedContent),  // 0-100
};
```

**5. Update Artifact**
```typescript
await supabaseAdmin
  .from('artifacts')
  .update({
    content: humanizedContent,
    status: 'creating_visuals',
    updated_at: new Date().toISOString()
  })
  .eq('id', artifactId);
```

### Error Scenarios

| Error Category | Condition | Recoverable | Recovery Strategy |
|----------------|-----------|-------------|-------------------|
| `INVALID_STATUS` | Artifact not in `writing` | Yes | Execute `writeFullContent` first |
| `TOOL_EXECUTION_FAILED` | Database update fails | No | Check database connectivity |
| `AI_PROVIDER_ERROR` | Claude API error (503) | Yes | Retry with exponential backoff (3 attempts) |
| `AI_RATE_LIMIT` | Claude rate limit exceeded | Yes | Wait + retry (backoff with jitter) |
| `AI_CONTENT_FILTER` | Content filtered by Claude | No | Review content for policy violations |

### Usage Example

```typescript
// Execute humanity check
const result = await applyHumanityCheck.execute({
  artifactId: 'abc-123-def-456',
  content: artifactContent,  // From database
  tone: 'professional'
});

// Result (success case)
{
  success: true,
  traceId: 'ca-1706284532000-v7w8x9',
  duration: 15234,
  statusTransition: { from: 'writing', to: 'creating_visuals' },
  data: {
    patternsFixed: 23,
    lengthBefore: 2384,
    lengthAfter: 2201,
    percentageChange: -7.7,  // Content became 7.7% shorter
    humanityScore: 87,       // 87/100 humanity score
    patternsDetected: [
      {
        pattern: 'Inflated symbolism',
        count: 7,
        examples: [
          'tapestry of healthcare solutions',
          'beacon of hope for patients',
          'mosaic of AI technologies'
        ]
      },
      {
        pattern: 'Em dash overuse',
        count: 12,
        examples: [
          'challenges—and opportunities—that arise',
          'AI diagnostics—including machine learning—have'
        ]
      },
      {
        pattern: 'Long sentences (>40 words)',
        count: 4,
        examples: [
          'With the rapid advancement of artificial intelligence in healthcare...'
        ]
      }
    ]
  }
}
```

### Validation Requirements

**Pre-execution**:
- Artifact must exist in database
- Artifact status must be `writing`
- Content must be min 10 characters
- Valid tone option provided

**Post-execution**:
- Humanized content stored in `artifact.content`
- Artifact status updated to `creating_visuals`
- Length change typically -5% to -15% (shorter, more concise)
- Humanity score typically 75-95 (higher = more human)

### Related Tools

- **Previous Tool**: `writeFullContent` (generates content to humanize)
- **Alternative**: `checkContentHumanity` (analysis only, no changes)
- **Next Tool**: `generateContentVisuals` (add visual placeholders)

---

## 6. generateContentVisuals (identifyImageNeeds)

**Purpose**: Generate visual images for content by identifying `[IMAGE: description]` placeholders, generating images using AI, and embedding them into the artifact content.

**AI Provider**: DALL-E 3 (primary) / Gemini Imagen 4 (fallback)

**Status Transition**: `creating_visuals` → `ready`

### Input Schema

```typescript
{
  artifactId: string;      // UUID format
  artifactType: 'blog' | 'social_post' | 'showcase';
  content: string;         // Full content with [IMAGE: ...] placeholders
}
```

**Zod Validation**:
```typescript
z.object({
  artifactId: z.string().uuid().describe('ID of the artifact to analyze'),
  artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of the artifact'),
  content: z.string().describe('The full content to analyze for image placements'),
})
```

### Output Schema

```typescript
ToolOutput<{
  success: boolean;
  imageNeeds: ImageNeed[];              // Identified image placements
  count: number;                        // Total image needs
  imagesGenerated: number;              // Successfully generated
  imagesFailed: number;                 // Failed generations
  message: string;                      // Status message
}>
```

**ImageNeed Schema**:
```typescript
interface ImageNeed {
  id: string;                    // UUID
  placement_after: string;       // Placeholder text or position
  description: string;           // Enhanced description with context
  purpose: 'hero' | 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart';
  style: 'professional' | 'modern' | 'abstract' | 'realistic';
  approved: boolean;             // Auto-approved in current workflow
}
```

**FinalImage Schema** (stored in visuals_metadata):
```typescript
interface FinalImage {
  id: string;
  image_need_id: string;
  url: string;                   // Supabase storage URL
  storage_path: string;          // Path in artifacts bucket
  resolution: { width: number; height: number };
  file_size_kb: number;
  generated_at: string;          // ISO timestamp
  generation_attempts: number;
}
```

### Image Generation Flow

**1. Extract Image Placeholders**
```typescript
// Match [IMAGE: description] patterns (case insensitive)
const imagePattern = /\[IMAGE:\s*([^\]]+)\]/gi;

function extractImagePlaceholders(content: string): Array<{
  fullMatch: string;
  description: string;
  index: number;
  purpose: 'hero' | 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart';
}> {
  const placeholders = [];
  let match;

  while ((match = imagePattern.exec(content)) !== null) {
    const description = match[1].trim();

    // Determine purpose from description keywords
    let purpose = 'illustration';
    if (description.includes('hero') || description.includes('featured')) purpose = 'hero';
    else if (description.includes('diagram') || description.includes('workflow')) purpose = 'diagram';
    else if (description.includes('photo') || description.includes('real')) purpose = 'photo';
    else if (description.includes('chart') || description.includes('graph')) purpose = 'chart';

    placeholders.push({
      fullMatch: match[0],
      description,
      index: match.index,
      purpose
    });
  }

  return placeholders;
}
```

**2. Generate Image Needs with Context Enhancement**
```typescript
// Extract surrounding context for better image prompts
function getPlaceholderContext(content: string, placeholderIndex: number): string {
  const contentBefore = content.substring(0, placeholderIndex);
  const headingMatch = contentBefore.match(/^##?\s+(.+)$/gm);
  const nearestHeading = headingMatch ? headingMatch[headingMatch.length - 1] : '';
  return nearestHeading;
}

// Build ImageNeed array from placeholders
const imageNeeds = placeholders.map((placeholder, i) => ({
  id: randomUUID(),
  placement_after: placeholder.fullMatch,  // Store full placeholder for replacement
  description: `${placeholder.description}. Context: ${context}`,
  purpose: i === 0 ? 'hero' : placeholder.purpose,
  style: artifactType === 'social_post' ? 'modern' : 'professional',
  approved: true  // Auto-approved in current workflow
}));
```

**3. Update Status and Initialize Metadata**
```typescript
await supabaseAdmin.from('artifacts').update({
  status: 'creating_visuals',
  visuals_metadata: {
    phase: { phase: 'generating_images', completed: 0, total: imageNeeds.length },
    needs: imageNeeds,
    finals: [],
    generation_stats: {
      total_needed: imageNeeds.length,
      finals_generated: 0,
      failures: 0,
    },
  },
}).eq('id', artifactId);
```

**4. Generate Images with DALL-E 3 / Gemini Imagen**
```typescript
for (let i = 0; i < imageNeeds.length; i++) {
  const need = imageNeeds[i];
  const resolution = getResolutionForType(artifactType, need.purpose);

  try {
    // Generate with retry and fallback (DALL-E 3 primary, Gemini fallback)
    const imageBuffer = await generateWithRetry({
      prompt: need.description,
      style: need.style,
      resolution,
      quality: 'standard',
      purpose: need.purpose,
      artifactContext: title,
      mood: analyzeMood(content, artifactType),
      contentThemes: extractContentThemes(content, title),
    }, 2);

    // Upload to Supabase storage
    const { url, path } = await uploadFinalImage(artifactId, need.id, imageBuffer);

    finals.push({
      id: need.id,
      image_need_id: need.id,
      url,
      storage_path: path,
      resolution,
      file_size_kb: Math.round(imageBuffer.length / 1024),
      generated_at: new Date().toISOString(),
      generation_attempts: 1,
    });

    // Update progress in visuals_metadata
    await supabaseAdmin.from('artifacts').update({
      visuals_metadata: {
        phase: { phase: 'generating_images', completed: i + 1, total: imageNeeds.length },
        needs: imageNeeds,
        finals,
        generation_stats: {
          total_needed: imageNeeds.length,
          finals_generated: finals.length,
          failures
        },
      },
    }).eq('id', artifactId);

  } catch (error) {
    failures++;
  }
}
```

**5. Insert Images Into Content**
```typescript
function insertImagesIntoContent(
  content: string,
  needs: ImageNeed[],
  finals: Array<{ id: string; url: string; image_need_id: string }>
): string {
  let updatedContent = content;

  // Create map of need ID to URL
  const imageUrlMap = new Map();
  for (const final of finals) {
    imageUrlMap.set(final.image_need_id, final.url);
  }

  // Replace each placeholder with actual image
  for (const need of needs) {
    const imageUrl = imageUrlMap.get(need.id);
    if (!imageUrl) continue;

    // Create markdown image
    const altText = need.description.substring(0, 100);
    const imageMarkdown = `![${altText}](${imageUrl})`;

    // Replace [IMAGE: ...] placeholder with actual image
    if (need.placement_after.startsWith('[IMAGE:')) {
      updatedContent = updatedContent.replace(need.placement_after, imageMarkdown);
    }
  }

  return updatedContent;
}
```

**6. Complete and Update Artifact**
```typescript
await supabaseAdmin.from('artifacts').update({
  content: updatedContent,  // Content with embedded images
  visuals_metadata: {
    phase: { phase: 'complete', finals },
    needs: imageNeeds,
    finals,
    generation_stats: {
      total_needed: imageNeeds.length,
      finals_generated: finals.length,
      failures,
    },
  },
  status: 'ready',
}).eq('id', artifactId);
```

### Image Generation Service

**Service Selection** (via `IMAGE_GENERATION_SERVICE` env var):

| Service | API Key Required | Cost | Quality |
|---------|------------------|------|---------|
| **DALL-E 3** (default) | `OPENAI_API_KEY` | ~$0.040/image | High |
| **Gemini Imagen 4** | `GOOGLE_GENERATIVE_AI_API_KEY` + billing | ~$0.039/image | High |

**Fallback Behavior**:
1. Try primary service (configured via env)
2. On failure (billing, auth, rate limit), fall back to other service
3. Retry each service up to 2 times with exponential backoff

**Resolution by Purpose**:

| Purpose | Resolution | Aspect Ratio |
|---------|------------|--------------|
| `hero` | 1792x1024 | 16:9 (landscape) |
| `illustration` (blog) | 1792x1024 | 16:9 |
| `illustration` (other) | 1024x1024 | 1:1 (square) |
| `diagram` | 1792x1024 | 16:9 |
| `photo` (social) | 1024x1024 | 1:1 |
| `photo` (blog) | 1792x1024 | 16:9 |

### Enhanced Prompt Engineering

**Prompt Structure**:
```
[Subject + Details] [Setting/Environment] [Style/Medium]
[Lighting] [Composition] [Mood] [Quality Modifiers]
```

**Purpose-Specific Prompts**:

- **Hero Images**: Wide landscape with visual impact, sets article tone
- **Illustrations**: Clean vector-style, focused concept visualization
- **Diagrams**: Minimal flat design, 2-3 colors, no text labels
- **Photos**: Editorial photography, shallow depth of field, natural lighting

**Automatic Enhancements**:
- Mood analysis from content (inspiring, professional, dynamic, etc.)
- Theme extraction from headings and bold text
- Style adaptation based on artifact type
- Negative prompts (no text, no watermarks, no logos)

### Error Scenarios

| Error Category | Condition | Recoverable | Recovery Strategy |
|----------------|-----------|-------------|-------------------|
| `INVALID_STATUS` | Artifact not in `creating_visuals` | Yes | Execute `applyHumanityCheck` first |
| `TOOL_EXECUTION_FAILED` | Database update fails | No | Check database connectivity |
| `AI_PROVIDER_ERROR` | Image API error (503) | Yes | Retry with exponential backoff, fall back to other service |
| `AI_RATE_LIMIT` | Rate limit exceeded | Yes | Wait 60s + retry, fall back to other service |
| `CONTENT_POLICY` | Prompt violates content policy | No | Modify prompt, remove problematic content |
| `AUTHENTICATION_REQUIRED` | Missing API key | No | Configure `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` |
| `BILLING_REQUIRED` | Gemini requires billing | No | Enable billing or fall back to DALL-E 3 |

### Usage Example

```typescript
// Execute visual generation (via identifyImageNeeds tool)
const result = await identifyImageNeeds.execute({
  artifactId: 'abc-123-def-456',
  artifactType: 'blog',
  content: artifactContent
});

// Result (success case)
{
  success: true,
  imageNeeds: [
    {
      id: 'img-001-uuid',
      placement_after: '[IMAGE: Featured hero image showing AI healthcare dashboard]',
      description: 'Featured hero image showing AI healthcare dashboard. Context: AI in Healthcare',
      purpose: 'hero',
      style: 'professional',
      approved: true
    },
    {
      id: 'img-002-uuid',
      placement_after: '[IMAGE: Infographic showing 94% accuracy rates]',
      description: 'Infographic showing 94% accuracy rates. Context: Current State of AI Diagnostics',
      purpose: 'illustration',
      style: 'professional',
      approved: true
    },
    // ... more image needs
  ],
  count: 6,
  imagesGenerated: 6,
  imagesFailed: 0,
  message: 'Generated 6/6 images. Artifact is now ready.'
}

// Artifact content now contains embedded images:
// Before: [IMAGE: Featured hero image showing AI healthcare dashboard]
// After:  ![Featured hero image](https://xxx.supabase.co/storage/v1/.../img-001.png)

// visuals_metadata updated:
{
  phase: { phase: 'complete', finals: [...] },
  needs: [...],
  finals: [
    {
      id: 'img-001-uuid',
      image_need_id: 'img-001-uuid',
      url: 'https://xxx.supabase.co/storage/v1/object/public/...',
      storage_path: 'abc-123/images/final/img-001-uuid.png',
      resolution: { width: 1792, height: 1024 },
      file_size_kb: 342,
      generated_at: '2026-01-28T10:30:00Z',
      generation_attempts: 1
    }
  ],
  generation_stats: {
    total_needed: 6,
    finals_generated: 6,
    failures: 0
  }
}
```

### Validation Requirements

**Pre-execution**:
- Artifact must exist in database
- Artifact status must be `creating_visuals`
- Content should contain `[IMAGE: ...]` placeholders (falls back to basic needs if none)
- At least one API key configured (`OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`)

**Post-execution**:
- All `[IMAGE: ...]` placeholders replaced with actual image markdown
- Images uploaded to Supabase storage (`artifacts/{artifact_id}/images/final/`)
- `visuals_metadata` updated with phase, needs, finals, and generation_stats
- Artifact status updated to `ready`
- Content field contains embedded image URLs

### Supabase Storage Structure

```
artifacts/                           # Bucket (public, CDN-enabled)
  {artifact_id}/
    images/
      final/
        {image_id}.png               # Generated images (permanent)
      rejected/                      # Failed generations (7-day TTL)
        {image_id}.png
```

### Related Tools

- **Previous Tool**: `applyHumanityCheck` (provides content with placeholders)
- **Status**: Artifact now in `ready` state (complete, editable, can publish)
- **Supplementary Tool**: `updateImageApproval` (approve/reject specific images)

---

## Error Handling Patterns

All core tools implement consistent error handling with retry strategies and recovery patterns.

### Error Categories Summary

| Category | HTTP | Recoverable | Max Retries | Backoff Strategy |
|----------|------|-------------|-------------|------------------|
| `TOOL_EXECUTION_FAILED` | 500 | Yes | 3 | Exponential (1s base) |
| `TOOL_TIMEOUT` | 504 | Yes | 3 | Exponential (1s base) |
| `AI_PROVIDER_ERROR` | 502 | Yes | 3 | Exponential (1s base) |
| `AI_RATE_LIMIT` | 429 | Yes | 3 | Wait + retry (jitter) |
| `AI_CONTENT_FILTER` | 400 | No | 0 | User modification required |
| `ARTIFACT_NOT_FOUND` | 404 | No | 0 | Provide valid artifact ID |
| `INVALID_STATUS` | 400 | Yes | 0 | Execute prerequisite tool |
| `RESEARCH_NOT_FOUND` | 404 | Yes | 0 | Execute conductDeepResearch |

### Retry Strategy

**Exponential Backoff with Jitter**:
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  category: ErrorCategory,
  maxRetries: number = 3
): Promise<T> {
  let attempt = 0;
  const baseDelay = 1000;  // 1 second

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;

      if (attempt >= maxRetries || !isRecoverableError(error, category)) {
        throw error;
      }

      // Calculate delay with jitter: baseDelay * 2^attempt + random(0, baseDelay)
      const delay = (baseDelay * Math.pow(2, attempt)) + Math.random() * baseDelay;
      await sleep(delay);
    }
  }
}
```

### Circuit Breaker Pattern

**Purpose**: Prevent cascading failures by failing fast after repeated errors.

**States**:
- **Closed**: Normal operation, requests pass through
- **Open**: Repeated failures detected, requests fail immediately
- **Half-Open**: Testing if service recovered

```typescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private threshold = 5;  // Open after 5 consecutive failures
  private timeout = 60000;  // 60 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      setTimeout(() => {
        this.state = 'half-open';
      }, this.timeout);
    }
  }
}
```

---

## Tool Integration Patterns

### Full Pipeline Execution

**Sequence**: `conductDeepResearch` → `generateContentSkeleton` → `writeFullContent` → `applyHumanityCheck` → `generateContentVisuals`

```typescript
async function executeFullPipeline(artifactId: string, topic: string, tone: ToneOption) {
  // Step 1: Research (draft → research)
  const researchResult = await conductDeepResearch.execute({
    artifactId,
    topic,
    artifactType: 'blog'
  });

  if (!researchResult.success) {
    throw new Error(`Research failed: ${researchResult.error?.message}`);
  }

  // Step 2: Skeleton (research → skeleton)
  const skeletonResult = await generateContentSkeleton.execute({
    artifactId,
    tone
  });

  if (!skeletonResult.success) {
    throw new Error(`Skeleton generation failed: ${skeletonResult.error?.message}`);
  }

  // Step 3: Write content (skeleton → writing)
  const writingResult = await writeFullContent.execute({
    artifactId,
    tone
  });

  if (!writingResult.success) {
    throw new Error(`Content writing failed: ${writingResult.error?.message}`);
  }

  // Step 4: Humanize (writing → creating_visuals)
  const { data: artifact } = await supabaseAdmin
    .from('artifacts')
    .select('content')
    .eq('id', artifactId)
    .single();

  const humanityResult = await applyHumanityCheck.execute({
    artifactId,
    content: artifact.content,
    tone
  });

  if (!humanityResult.success) {
    throw new Error(`Humanity check failed: ${humanityResult.error?.message}`);
  }

  // Step 5: Visuals (creating_visuals → ready)
  const visualsResult = await generateContentVisuals.execute({
    artifactId
  });

  if (!visualsResult.success) {
    throw new Error(`Visual generation failed: ${visualsResult.error?.message}`);
  }

  return {
    totalDuration:
      researchResult.duration! +
      skeletonResult.duration! +
      writingResult.duration! +
      humanityResult.duration! +
      visualsResult.duration!,
    finalStatus: 'ready'
  };
}
```

### Partial Workflow Execution

**Example: Research + Skeleton Only**

```typescript
async function researchAndSkeletonOnly(artifactId: string, topic: string, tone: ToneOption) {
  // Execute only first 2 steps
  await conductDeepResearch.execute({ artifactId, topic, artifactType: 'blog' });
  await generateContentSkeleton.execute({ artifactId, tone });

  // Artifact now in 'skeleton' status
  // User can review skeleton before content writing
}
```

### Section-by-Section Workflow

**Example: Granular Control Over Content Writing**

```typescript
async function writeSectionBySection(artifactId: string, sections: string[], tone: ToneOption) {
  // Fetch skeleton
  const { data: artifact } = await supabaseAdmin
    .from('artifacts')
    .select('content')
    .eq('id', artifactId)
    .single();

  // Write each section individually
  for (const sectionHeading of sections) {
    const result = await writeContentSection.execute({
      artifactId,
      sectionHeading,
      tone
    });

    if (!result.success) {
      console.error(`Failed to write section: ${sectionHeading}`);
      // Continue with next section or stop based on requirements
    }
  }

  // After all sections written, update status manually
  await supabaseAdmin
    .from('artifacts')
    .update({ status: 'writing' })
    .eq('id', artifactId);
}
```

---

## Related Documentation

**Core Architecture**:
- [Content Agent Overview](./content-agent-overview.md) - Architecture, session management, token budget
- [System Prompt Specification](./system-prompt-specification.md) - Agent behavior and constraints

**Context Tools**:
- [Context Tools Reference](./context-tools-reference.md) - All 4 ad-hoc fetcher tools

**API Documentation**:
- [Content Agent Endpoints](../api/content-agent-endpoints.md) - REST API for tool execution
- [Error Handling Reference](../api/error-handling-reference.md) - All 13 error categories

**Architecture**:
- [Content Agent Architecture](../Architecture/backend/content-agent-architecture.md) - System design
- [Security Architecture](../Architecture/backend/security-architecture.md) - Input validation, privacy
- [Observability Architecture](../Architecture/backend/observability-architecture.md) - Tracing, metrics

**Workflow**:
- [Pipeline Execution Flow](./pipeline-execution-flow.md) - Complete 4-step pipeline with checkpoints
- [Intent Detection Guide](./intent-detection-guide.md) - How intent maps to tools

---

## Version History

### v1.0.0 (2026-01-26) - Phase 1 MVP

**Tools Implemented**:
- ✅ conductDeepResearch (Tavily API, 5+ sources)
- ✅ generateContentSkeleton (Claude, tone-aware)
- ✅ writeContentSection (Gemini, granular control)
- ✅ writeFullContent (Gemini, full automation)
- ✅ applyHumanityCheck (Claude, 24 AI patterns)
- ✅ generateContentVisuals (MVP stub, placeholder detection)

**ToolOutput<T> Interface**:
- Standardized response format
- TraceId for distributed tracing
- Status transitions tracked
- Error categorization (13 categories)

**Error Handling**:
- Exponential backoff with jitter
- Circuit breaker pattern
- Retry strategies (3 attempts)
- Recoverable vs non-recoverable errors

**Future Enhancements** (Phase 2+):
- Real-time progress updates during tool execution
- Parallel section writing for faster content generation
- Advanced research source prioritization (ML-based)
- Actual visual generation (DALL-E, Midjourney, Stable Diffusion)
- Content caching for repeated operations
- Multi-language support for content generation
