# Context Tools Reference

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Complete

## Overview

Context tools are **ad-hoc fetcher tools** that provide information to the Content Agent without modifying system state. Unlike core content creation tools that transform artifact status, context tools are read-only operations that gather existing data from the database to inform decision-making and provide situational awareness.

### Ad-Hoc Fetcher Pattern

**Characteristics:**
- **Read-Only**: Execute SELECT queries only, never INSERT/UPDATE/DELETE
- **No Status Transitions**: Don't modify artifact status or trigger workflows
- **Immediate Response**: Return data synchronously without side effects
- **Contextual Awareness**: Provide information about existing content, research, and work-in-progress

**Use Cases:**
1. **Avoid Duplication**: Check existing artifact titles before creating new content
2. **Understand State**: Fetch current artifact details to inform next actions
3. **Review Research**: Examine gathered sources to assess research quality
4. **Track Progress**: List in-progress artifacts to understand workload

---

## Tool 1: fetchArtifactTopics

### Purpose

Retrieve existing artifact titles and metadata to avoid topic duplication and find inspiration for new content. Use this tool before topic generation or when checking if a topic has already been covered.

### When to Use

- **Before Topic Generation**: Check what topics already exist in the portfolio
- **Avoid Duplication**: Verify a proposed topic hasn't been created yet
- **Find Inspiration**: Browse recent artifacts to identify gaps or related topics
- **Content Planning**: Understand the existing content landscape

### Input Schema

```typescript
{
  limit?: number;        // Number of topics to fetch (1-50, default: 20)
  contentType?: 'social_post' | 'blog' | 'showcase' | 'all';  // Filter by type (default: 'all')
}
```

**Validation Rules:**
- `limit`: Must be between 1 and 50 (Zod: `z.number().min(1).max(50)`)
- `contentType`: Optional enum value (Zod: `z.enum(['social_post', 'blog', 'showcase', 'all'])`)

### Output Schema

```typescript
{
  success: boolean;      // Operation success flag
  topics: Array<{
    id: string;          // Artifact UUID
    title: string;       // Artifact title
    type: 'social_post' | 'blog' | 'showcase';  // Content type
    tags: string[];      // Topic tags for categorization
  }>;
  count: number;         // Number of topics returned
  error?: string;        // Error message if success is false
}
```

### Usage Examples

#### Example 1: Fetch Recent Blog Topics

```typescript
// Check recent blog topics to avoid duplication
const result = await fetchArtifactTopics.execute({
  limit: 10,
  contentType: 'blog'
});

console.log(`Found ${result.count} blog topics:`);
result.topics.forEach(topic => {
  console.log(`- ${topic.title} (${topic.tags.join(', ')})`);
});

// Output:
// Found 10 blog topics:
// - The Future of AI in Healthcare (AI, healthcare, technology)
// - Remote Work Best Practices (remote work, productivity, collaboration)
// - ...
```

#### Example 2: Check for Duplicate Topic

```typescript
// Before generating topics, check existing ones
const proposedTopic = "AI Ethics and Governance";
const existing = await fetchArtifactTopics.execute({ limit: 50 });

const isDuplicate = existing.topics.some(t =>
  t.title.toLowerCase().includes('ai ethics') ||
  t.title.toLowerCase().includes('ai governance')
);

if (isDuplicate) {
  console.log('⚠️ Similar topic already exists, consider a different angle');
} else {
  console.log('✅ Topic is unique, proceed with research');
}
```

#### Example 3: Browse All Recent Content

```typescript
// Get overview of all recent content
const allTopics = await fetchArtifactTopics.execute({
  limit: 30,
  contentType: 'all'
});

// Group by type for summary
const byType = allTopics.topics.reduce((acc, topic) => {
  acc[topic.type] = (acc[topic.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Content Distribution:', byType);
// Output: { blog: 15, social_post: 10, showcase: 5 }
```

### Integration with Core Tools

**Use Before:**
- `topicsResearch` (not yet documented) - Check existing topics to inform topic generation
- `conductDeepResearch` - Verify topic hasn't been covered recently

**Typical Workflow:**
```typescript
// 1. Check existing topics
const existing = await fetchArtifactTopics.execute({ limit: 20 });

// 2. User provides topic idea
const userTopic = "Blockchain in Supply Chain Management";

// 3. Validate uniqueness
const exists = existing.topics.some(t =>
  t.title.toLowerCase().includes('blockchain') &&
  t.title.toLowerCase().includes('supply chain')
);

// 4. Proceed or suggest alternatives
if (!exists) {
  // Create new artifact and start research
  await conductDeepResearch.execute({ artifactId, topic: userTopic, artifactType: 'blog' });
}
```

---

## Tool 2: fetchArtifact

### Purpose

Retrieve complete details of a specific artifact including content, status, metadata, and configuration. Use this tool when you need full context about an artifact before taking action.

### When to Use

- **Status Validation**: Check current artifact status before tool execution
- **Content Review**: Fetch existing content for editing or refinement
- **Context Gathering**: Understand artifact state before making decisions
- **Metadata Access**: Retrieve tone, tags, writing metadata for analysis

### Input Schema

```typescript
{
  artifactId: string;    // UUID of the artifact to fetch (required)
}
```

**Validation Rules:**
- `artifactId`: Must be valid UUID format (Zod: `z.string().uuid()`)

### Output Schema

```typescript
{
  success: boolean;      // Operation success flag
  artifact?: {
    id: string;          // Artifact UUID
    type: 'social_post' | 'blog' | 'showcase';  // Content type
    title: string;       // Artifact title
    content: string | null;  // Markdown content (null if not written yet)
    status: ArtifactStatus;  // Current status (draft, research, skeleton, etc.)
    tone: ToneOption;    // Selected tone (formal, casual, professional, etc.)
    tags: string[];      // Topic tags
    metadata: Record<string, any>;  // Custom metadata object
    writingMetadata: {
      wordCount?: number;
      sectionCount?: number;
      imageCount?: number;
      // ... other writing stats
    } | null;
    createdAt: string;   // ISO 8601 timestamp
    updatedAt: string;   // ISO 8601 timestamp
  };
  error?: string;        // Error message if success is false
}
```

### Usage Examples

#### Example 1: Validate Status Before Tool Execution

```typescript
// Before writing content, verify artifact is in correct status
const result = await fetchArtifact.execute({
  artifactId: 'abc-123-def-456'
});

if (!result.success) {
  console.error('❌ Artifact not found:', result.error);
  return;
}

if (result.artifact.status !== 'skeleton') {
  console.error(`❌ Invalid status: ${result.artifact.status}. Expected: skeleton`);
  console.log('💡 Suggestion: Run generateContentSkeleton first');
  return;
}

// Status is correct, proceed with content writing
await writeFullContent.execute({
  artifactId: result.artifact.id,
  tone: result.artifact.tone
});
```

#### Example 2: Review Content for Editing

```typescript
// Fetch artifact to review existing content
const result = await fetchArtifact.execute({ artifactId: 'xyz-789' });

if (result.artifact.content) {
  console.log('📄 Current Content Length:', result.artifact.content.length, 'chars');
  console.log('📊 Writing Stats:', result.artifact.writingMetadata);

  // Parse content sections
  const sections = result.artifact.content.split('\n## ').slice(1);
  console.log(`📝 Sections: ${sections.length}`);

  sections.forEach((section, idx) => {
    const heading = section.split('\n')[0];
    console.log(`  ${idx + 1}. ${heading}`);
  });
} else {
  console.log('⚠️ No content written yet (status:', result.artifact.status, ')');
}
```

#### Example 3: Understand Artifact Configuration

```typescript
// Fetch artifact to understand tone and type for proper tool execution
const result = await fetchArtifact.execute({ artifactId: 'blog-001' });

console.log('Artifact Configuration:');
console.log('- Type:', result.artifact.type);           // 'blog'
console.log('- Tone:', result.artifact.tone);           // 'professional'
console.log('- Status:', result.artifact.status);       // 'skeleton'
console.log('- Tags:', result.artifact.tags.join(', ')); // 'AI, technology, innovation'

// Use this context to make informed decisions
if (result.artifact.tone === 'humorous' && result.artifact.type === 'blog') {
  console.log('💡 Tip: Use casual language with jokes and anecdotes');
} else if (result.artifact.tone === 'formal' && result.artifact.type === 'blog') {
  console.log('💡 Tip: Use academic language with citations and data');
}
```

### Integration with Core Tools

**Use Before:**
- **All Core Tools** - Validate status and gather context before execution
- `generateContentSkeleton` - Check if artifact has research data
- `writeFullContent` - Verify skeleton exists and fetch tone
- `applyHumanityCheck` - Fetch content for humanization

**Typical Workflow:**
```typescript
// 1. User requests action
const userMessage = "Write content for artifact abc-123";

// 2. Fetch artifact to validate and gather context
const artifact = await fetchArtifact.execute({ artifactId: 'abc-123' });

// 3. Validate status allows requested action
if (artifact.artifact.status === 'draft') {
  return 'Cannot write content yet. Need to conduct research first.';
}

if (artifact.artifact.status === 'research') {
  return 'Cannot write content yet. Need to generate skeleton first.';
}

// 4. Execute appropriate tool with artifact context
if (artifact.artifact.status === 'skeleton') {
  await writeFullContent.execute({
    artifactId: artifact.artifact.id,
    tone: artifact.artifact.tone
  });
}
```

---

## Tool 3: fetchResearch

### Purpose

Retrieve research data gathered for an artifact from the `artifact_research` table. Use this tool to review research quality, understand source distribution, and verify minimum research requirements are met.

### When to Use

- **Quality Assessment**: Review research relevance scores and source diversity
- **Before Skeleton Generation**: Verify 5+ sources exist before creating structure
- **Research Review**: Examine gathered sources to inform content decisions
- **Debugging**: Investigate why skeleton generation might have failed

### Input Schema

```typescript
{
  artifactId: string;    // UUID of the artifact (required)
  limit?: number;        // Max research items to return (1-100, default: 20)
}
```

**Validation Rules:**
- `artifactId`: Must be valid UUID format (Zod: `z.string().uuid()`)
- `limit`: Must be between 1 and 100 (Zod: `z.number().min(1).max(100)`)

### Output Schema

```typescript
{
  success: boolean;      // Operation success flag
  research: Array<{
    id: string;          // Research record UUID
    sourceType: 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack' | 'user_provided';
    sourceName: string;  // Title or name of source
    sourceUrl: string | null;  // URL if available
    excerpt: string;     // Relevant excerpt from source
    relevanceScore: number;  // Relevance score (0-1, typically > 0.6)
    createdAt: string;   // ISO 8601 timestamp
  }>;
  count: number;         // Number of research items returned
  bySourceType: Record<string, number>;  // Count grouped by source type
  message?: string;      // Informational message (e.g., "No research found")
  error?: string;        // Error message if success is false
}
```

**Source Type Distribution Example:**
```typescript
{
  reddit: 4,
  linkedin: 5,
  medium: 4,
  quora: 3,
  substack: 2
}
// Total: 18 research items from 5 unique sources ✅
```

### Usage Examples

#### Example 1: Verify Research Quality Before Skeleton Generation

```typescript
// Before generating skeleton, check research quality
const research = await fetchResearch.execute({
  artifactId: 'abc-123',
  limit: 100  // Fetch all research
});

console.log(`📚 Total Research Items: ${research.count}`);
console.log('📊 Source Distribution:', research.bySourceType);

// Verify minimum 5 sources requirement
const uniqueSources = Object.keys(research.bySourceType).length;
if (uniqueSources < 5) {
  console.error(`❌ Insufficient sources: ${uniqueSources}/5`);
  console.log('💡 Need to conduct more research before skeleton generation');
  return;
}

// Check relevance scores
const avgRelevance = research.research.reduce((sum, r) => sum + r.relevanceScore, 0) / research.count;
console.log(`🎯 Average Relevance: ${(avgRelevance * 100).toFixed(1)}%`);

if (avgRelevance < 0.7) {
  console.warn('⚠️ Low average relevance. Consider refining topic or conducting new research.');
}

// Proceed with skeleton generation
console.log('✅ Research quality sufficient, generating skeleton...');
await generateContentSkeleton.execute({ artifactId: 'abc-123', tone: 'professional' });
```

#### Example 2: Review Research Sources

```typescript
// Examine research sources to understand gathered context
const research = await fetchResearch.execute({
  artifactId: 'blog-456',
  limit: 20  // Top 20 results
});

console.log('Top Research Sources:');
research.research.forEach((item, idx) => {
  console.log(`\n${idx + 1}. ${item.sourceName}`);
  console.log(`   Source: ${item.sourceType}`);
  console.log(`   Relevance: ${(item.relevanceScore * 100).toFixed(1)}%`);
  console.log(`   Excerpt: ${item.excerpt.substring(0, 100)}...`);
  if (item.sourceUrl) {
    console.log(`   URL: ${item.sourceUrl}`);
  }
});
```

#### Example 3: Analyze Source Diversity

```typescript
// Assess research source diversity and distribution
const research = await fetchResearch.execute({ artifactId: 'showcase-789' });

console.log('Source Analysis:');
console.log('─'.repeat(50));

Object.entries(research.bySourceType).forEach(([source, count]) => {
  const percentage = ((count / research.count) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count / 2));
  console.log(`${source.padEnd(15)} ${bar} ${count} (${percentage}%)`);
});

// Check for balanced distribution
const maxSourceCount = Math.max(...Object.values(research.bySourceType));
const minSourceCount = Math.min(...Object.values(research.bySourceType));

if (maxSourceCount / minSourceCount > 3) {
  console.warn('⚠️ Unbalanced source distribution. Consider more research from underrepresented sources.');
}
```

### Integration with Core Tools

**Use After:**
- `conductDeepResearch` - Verify research was gathered successfully

**Use Before:**
- `generateContentSkeleton` - Confirm 5+ sources exist and assess quality

**Typical Workflow:**
```typescript
// 1. Conduct research
const researchResult = await conductDeepResearch.execute({
  artifactId: 'abc-123',
  topic: 'AI in Healthcare',
  artifactType: 'blog'
});

// 2. Verify research was successful
if (!researchResult.success) {
  console.error('Research failed:', researchResult.error);
  return;
}

// 3. Fetch research to validate quality
const research = await fetchResearch.execute({ artifactId: 'abc-123' });

// 4. Check minimum requirements
const uniqueSources = Object.keys(research.bySourceType).length;
if (uniqueSources < 5) {
  console.error(`Only ${uniqueSources} sources found. Need at least 5.`);
  return;
}

// 5. Proceed with skeleton generation
console.log(`✅ Research complete with ${uniqueSources} sources. Generating skeleton...`);
await generateContentSkeleton.execute({ artifactId: 'abc-123', tone: 'professional' });
```

---

## Tool 4: listDraftArtifacts

### Purpose

List artifacts in draft or in-progress statuses to understand what content needs work. Use this tool to get an overview of pending tasks, prioritize work, or answer user questions about work-in-progress.

### When to Use

- **Portfolio Overview**: Show user what content is in progress
- **Prioritization**: Identify which artifacts need attention next
- **Status Tracking**: Monitor content pipeline health
- **User Questions**: Answer "What's in progress?" or "Show my drafts"

### Input Schema

```typescript
{
  limit?: number;        // Max drafts to return (1-50, default: 10)
  includeStatus?: Array<'draft' | 'research' | 'skeleton' | 'writing' | 'creating_visuals'>;
  // Default: all in-progress statuses
}
```

**Validation Rules:**
- `limit`: Must be between 1 and 50 (Zod: `z.number().min(1).max(50)`)
- `includeStatus`: Optional array of in-progress status values

### Output Schema

```typescript
{
  success: boolean;      // Operation success flag
  drafts: Array<{
    id: string;          // Artifact UUID
    type: 'social_post' | 'blog' | 'showcase';
    title: string;       // Artifact title
    status: ArtifactStatus;  // Current status
    tags: string[];      // Topic tags
    createdAt: string;   // ISO 8601 timestamp
    updatedAt: string;   // ISO 8601 timestamp (last activity)
  }>;
  count: number;         // Number of drafts returned
  byStatus: Record<string, number>;  // Count grouped by status
  message?: string;      // Informational message (e.g., "No drafts found")
  error?: string;        // Error message if success is false
}
```

**Status Distribution Example:**
```typescript
{
  draft: 5,
  research: 2,
  skeleton: 3,
  writing: 1,
  creating_visuals: 0
}
// Total: 11 in-progress artifacts
```

### Usage Examples

#### Example 1: Show User All In-Progress Content

```typescript
// User asks: "What's in progress?"
const drafts = await listDraftArtifacts.execute({
  limit: 20
});

if (drafts.count === 0) {
  console.log('✨ No drafts in progress. All content is complete!');
  return;
}

console.log(`📋 You have ${drafts.count} artifacts in progress:\n`);

// Group by status for organized display
Object.entries(drafts.byStatus).forEach(([status, count]) => {
  if (count > 0) {
    console.log(`\n${status.toUpperCase()} (${count}):`);
    const statusDrafts = drafts.drafts.filter(d => d.status === status);
    statusDrafts.forEach(draft => {
      console.log(`  • ${draft.title} (${draft.type})`);
    });
  }
});
```

#### Example 2: Identify Stale Drafts

```typescript
// Find drafts that haven't been updated recently
const drafts = await listDraftArtifacts.execute({ limit: 50 });

const now = new Date();
const staleDrafts = drafts.drafts.filter(draft => {
  const updated = new Date(draft.updatedAt);
  const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate > 7;  // Stale if > 7 days
});

if (staleDrafts.length > 0) {
  console.log(`⚠️ Found ${staleDrafts.length} stale drafts (no activity in 7+ days):`);
  staleDrafts.forEach(draft => {
    const daysSince = Math.floor((now.getTime() - new Date(draft.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  • ${draft.title} - ${daysSince} days ago (status: ${draft.status})`);
  });
}
```

#### Example 3: Filter by Specific Statuses

```typescript
// Show only drafts that need research or skeleton
const needsWork = await listDraftArtifacts.execute({
  limit: 20,
  includeStatus: ['draft', 'research']
});

console.log(`📝 ${needsWork.count} artifacts need research or skeleton generation:`);

needsWork.drafts.forEach(draft => {
  const nextStep = draft.status === 'draft' ? 'Conduct Research' : 'Generate Skeleton';
  console.log(`  • ${draft.title}`);
  console.log(`    Status: ${draft.status} → Next: ${nextStep}`);
});
```

### Integration with Core Tools

**Use For:**
- **Portfolio Context** - Understand what content is being worked on
- **Prioritization** - Identify which artifacts to work on next
- **User Communication** - Answer questions about in-progress content

**Typical Workflow:**
```typescript
// User asks: "What do I need to work on?"
const drafts = await listDraftArtifacts.execute({ limit: 20 });

// Prioritize by status
const priorities = {
  draft: 'Need research',
  research: 'Need skeleton',
  skeleton: 'Need content writing',
  writing: 'Need humanity check',
  creating_visuals: 'Need visual generation'
};

console.log('📋 Work Priority List:');
drafts.drafts.forEach((draft, idx) => {
  console.log(`${idx + 1}. ${draft.title}`);
  console.log(`   Current: ${draft.status} → Next: ${priorities[draft.status]}`);
});
```

---

## Decision Tree: When to Use Which Tool

```
User Request or Action
│
├─ "Show me existing topics" / "What have I written about?"
│  └─> fetchArtifactTopics (with contentType filter if specified)
│
├─ "Is there already content about [topic]?"
│  └─> fetchArtifactTopics (search for duplicates)
│
├─ Need full artifact details / Validate status before action
│  └─> fetchArtifact
│
├─ "How's the research quality?" / "What sources were used?"
│  └─> fetchResearch
│
├─ "What's in progress?" / "Show my drafts"
│  └─> listDraftArtifacts
│
└─ Before starting any core tool (conductDeepResearch, generateContentSkeleton, etc.)
   └─> fetchArtifact (validate status and gather context)
```

---

## Integration Patterns with Core Tools

### Pattern 1: Pre-Validation Before Tool Execution

**Problem**: Core tools require specific artifact statuses to execute successfully.

**Solution**: Use `fetchArtifact` to validate status before executing core tools.

```typescript
// Bad: Execute tool without validation
await writeFullContent.execute({ artifactId: 'abc-123', tone: 'professional' });
// ❌ Fails if artifact status is 'draft' or 'research'

// Good: Validate first
const artifact = await fetchArtifact.execute({ artifactId: 'abc-123' });

if (artifact.artifact.status !== 'skeleton') {
  return `Cannot write content. Artifact is in '${artifact.artifact.status}' status. Expected: 'skeleton'`;
}

await writeFullContent.execute({
  artifactId: artifact.artifact.id,
  tone: artifact.artifact.tone
});
// ✅ Executes only if status is correct
```

### Pattern 2: Duplication Prevention

**Problem**: Don't want to create content on topics already covered.

**Solution**: Use `fetchArtifactTopics` before starting research.

```typescript
// User provides topic
const userTopic = "The Future of Quantum Computing";

// Check existing topics
const existing = await fetchArtifactTopics.execute({ limit: 50 });

const isDuplicate = existing.topics.some(t =>
  t.title.toLowerCase().includes('quantum computing')
);

if (isDuplicate) {
  return '⚠️ You already have content about quantum computing. Would you like to:\n' +
         '1. Create content with a different angle (e.g., "Quantum Computing in Finance")\n' +
         '2. Update existing content\n' +
         '3. Choose a different topic';
}

// Proceed with research if unique
await conductDeepResearch.execute({ artifactId, topic: userTopic, artifactType: 'blog' });
```

### Pattern 3: Research Quality Validation

**Problem**: Skeleton generation requires 5+ research sources, but research might fail or gather insufficient sources.

**Solution**: Use `fetchResearch` to verify quality before skeleton generation.

```typescript
// After research completes
const researchResult = await conductDeepResearch.execute({
  artifactId: 'abc-123',
  topic: 'AI in Healthcare',
  artifactType: 'blog'
});

if (!researchResult.success) {
  return 'Research failed. Please try a different topic or check your API keys.';
}

// Verify research quality
const research = await fetchResearch.execute({ artifactId: 'abc-123' });

// Check source diversity (minimum 5 unique sources)
const uniqueSources = Object.keys(research.bySourceType).length;
if (uniqueSources < 5) {
  return `Research found only ${uniqueSources} sources. Need at least 5 different sources.`;
}

// Check average relevance (aim for > 0.7)
const avgRelevance = research.research.reduce((sum, r) => sum + r.relevanceScore, 0) / research.count;
if (avgRelevance < 0.6) {
  return `Research relevance too low (${(avgRelevance * 100).toFixed(1)}%). Consider refining topic.`;
}

// Proceed with skeleton generation
await generateContentSkeleton.execute({ artifactId: 'abc-123', tone: 'professional' });
```

### Pattern 4: Portfolio Context for User Questions

**Problem**: User asks about in-progress work, but agent doesn't know what's pending.

**Solution**: Use `listDraftArtifacts` to provide contextual answers.

```typescript
// User asks: "What should I work on next?"
const drafts = await listDraftArtifacts.execute({ limit: 20 });

if (drafts.count === 0) {
  return '✨ All your content is complete! Would you like to create something new?';
}

// Identify next actionable items
const nextActions = drafts.drafts.map(draft => {
  const actions = {
    draft: { tool: 'conductDeepResearch', desc: 'Conduct research' },
    research: { tool: 'generateContentSkeleton', desc: 'Generate skeleton' },
    skeleton: { tool: 'writeFullContent', desc: 'Write content' },
    writing: { tool: 'applyHumanityCheck', desc: 'Humanize content' },
    creating_visuals: { tool: 'generateContentVisuals', desc: 'Generate visuals' }
  };

  return {
    title: draft.title,
    status: draft.status,
    nextAction: actions[draft.status]
  };
});

// Present organized recommendations
return `You have ${drafts.count} artifacts in progress. Recommended next actions:\n\n` +
  nextActions.map((item, idx) =>
    `${idx + 1}. **${item.title}** (${item.status})\n   → ${item.nextAction.desc}`
  ).join('\n\n');
```

---

## Common Usage Scenarios

### Scenario 1: Starting Full Pipeline

```typescript
// User: "Create a blog post about AI in education"

// Step 1: Check for duplicates
const existing = await fetchArtifactTopics.execute({
  limit: 50,
  contentType: 'blog'
});

const hasSimilar = existing.topics.some(t =>
  t.title.toLowerCase().includes('ai') &&
  t.title.toLowerCase().includes('education')
);

if (hasSimilar) {
  return 'Found existing content about AI in education. Create with different angle?';
}

// Step 2: Create artifact and start research (not shown)
const artifactId = createArtifact({ title: 'AI in Education', type: 'blog' });

// Step 3: Conduct research
await conductDeepResearch.execute({
  artifactId,
  topic: 'AI in Education',
  artifactType: 'blog'
});

// Step 4: Verify research quality
const research = await fetchResearch.execute({ artifactId });
if (Object.keys(research.bySourceType).length < 5) {
  return 'Research insufficient. Need more sources.';
}

// Step 5: Continue pipeline...
await generateContentSkeleton.execute({ artifactId, tone: 'professional' });
```

### Scenario 2: Resuming Work on Existing Draft

```typescript
// User: "Continue working on my AI ethics draft"

// Step 1: Find the draft
const drafts = await listDraftArtifacts.execute({ limit: 50 });
const aiEthicsDraft = drafts.drafts.find(d =>
  d.title.toLowerCase().includes('ai ethics')
);

if (!aiEthicsDraft) {
  return 'No draft found with title matching "AI ethics". Create new artifact?';
}

// Step 2: Fetch full artifact details
const artifact = await fetchArtifact.execute({ artifactId: aiEthicsDraft.id });

// Step 3: Determine next action based on status
const nextSteps = {
  draft: 'conduct research',
  research: 'generate skeleton',
  skeleton: 'write content',
  writing: 'apply humanity check',
  creating_visuals: 'generate visuals'
};

return `Found: "${artifact.artifact.title}" (status: ${artifact.artifact.status})\n` +
       `Next step: ${nextSteps[artifact.artifact.status]}`;
```

### Scenario 3: Quality Audit Before Publishing

```typescript
// User: "Is my blog post ready to publish?"

// Step 1: Fetch artifact
const artifact = await fetchArtifact.execute({ artifactId });

// Step 2: Check status
if (artifact.artifact.status !== 'ready') {
  return `Not ready yet. Current status: ${artifact.artifact.status}`;
}

// Step 3: Fetch research to verify quality
const research = await fetchResearch.execute({ artifactId });

// Step 4: Audit checklist
const audit = {
  hasContent: !!artifact.artifact.content,
  contentLength: artifact.artifact.content?.length || 0,
  hasResearch: research.count > 0,
  researchSources: Object.keys(research.bySourceType).length,
  writingStats: artifact.artifact.writingMetadata
};

// Step 5: Present audit results
return `📊 Content Audit:\n` +
  `✅ Status: ${artifact.artifact.status}\n` +
  `✅ Content: ${audit.contentLength} characters\n` +
  `✅ Research: ${audit.researchSources} sources, ${research.count} items\n` +
  `✅ Writing: ${audit.writingStats?.wordCount || 0} words, ${audit.writingStats?.sectionCount || 0} sections\n\n` +
  `Ready to publish! 🚀`;
```

---

## Error Handling

All context tools return a `success: boolean` flag. Always check this before accessing data:

```typescript
const result = await fetchArtifact.execute({ artifactId: 'invalid-id' });

if (!result.success) {
  console.error('Error:', result.error);
  // Handle error (e.g., "Artifact not found")
  return;
}

// Safe to access result.artifact
console.log('Title:', result.artifact.title);
```

**Common Errors:**
- `"Artifact not found"` - Invalid artifactId or artifact deleted
- `"No research data found"` - Research hasn't been conducted yet
- `"No draft artifacts found"` - All artifacts are complete (not an error, informational)
- Database connection errors - Supabase unavailable

---

## Performance Considerations

**Default Limits:**
- `fetchArtifactTopics`: 20 topics (max: 50)
- `fetchResearch`: 20 results (max: 100)
- `listDraftArtifacts`: 10 drafts (max: 50)

**Best Practices:**
- Use appropriate limits based on use case (don't fetch 100 items if you only need 10)
- Cache results when appropriate (e.g., existing topics rarely change within a session)
- Fetch full artifact details (`fetchArtifact`) only when needed, not speculatively

---

## Related Documentation

### Core Content Creation Tools
- [core-tools-reference.md](./core-tools-reference.md) - 6 core tools (research, skeleton, writing, humanity, visuals)

### System Architecture
- [content-agent-overview.md](./content-agent-overview.md) - Content Agent architecture and session management
- [system-prompt-specification.md](./system-prompt-specification.md) - System prompt with tool usage guidelines

### Workflow Guides
- [intent-detection-guide.md](./intent-detection-guide.md) - How agent detects when to use context tools
- [pipeline-execution-flow.md](./pipeline-execution-flow.md) - Full pipeline with context tool integration

### API Documentation
- [content-agent-endpoints.md](../api/content-agent-endpoints.md) - REST API endpoints
- [screen-context-specification.md](../api/screen-context-specification.md) - Screen context for artifact inference

### Database Schema
- [database/artifact-schema-and-workflow.md](../Architecture/database/artifact-schema-and-workflow.md) - Database tables queried by context tools

---

**Version History:**
- **1.0.0** (2026-01-26) - Initial documentation with all 4 context tools
