# Content Creation Agent

**Created:** 2026-02-19
**Last Updated:** 2026-02-20
**Version:** 2.0.0
**Status:** Complete

## Overview

The Content Creation Agent is the core AI feature that powers the automated content pipeline. It orchestrates multi-tool execution to transform a topic into polished, publish-ready content with matching writing style and generated images.

---

## What It Does (User Perspective)

1. **Researches** your topic from 6 web sources (Reddit, LinkedIn, Quora, Medium, Substack)
2. **Analyzes** your writing style from uploaded examples (20+ characteristics)
3. **Designs** a storytelling structure — narrative framework, story arc, emotional journey, hook strategy
4. **Generates** a content skeleton (H1 title + H2 sections) shaped by the storytelling arc
5. **Pauses** for your approval — you can edit the skeleton and review style analysis
6. **Writes** full content section-by-section in your voice, with section-aware storytelling guidance
7. **Humanizes** the content by removing 24+ AI writing patterns
8. **Creates** images for `[IMAGE: description]` placeholders
9. Delivers **publish-ready** content

---

## How It Works (Technical Perspective)

### Architecture

```
Content Agent (ContentAgent.ts)
├── PipelineExecutor.ts — Orchestrates step-by-step tool execution
├── AIService.ts — Anthropic Claude / Google Gemini / DALL-E 3 API calls
├── Tools (19 tool files, 40+ tools)
│   ├── Research: conductDeepResearch
│   ├── Characteristics: analyzeWritingCharacteristics
│   ├── Storytelling: analyzeStorytellingStructure
│   ├── Skeleton: generateSkeleton (uses storytelling arc)
│   ├── Writing: writeContentSections (uses section-aware storytelling)
│   ├── Humanity: checkHumanity
│   ├── Images: identifyImageNeeds, generateFinalImages
│   └── Interview: startShowcaseInterview, saveInterviewAnswer, completeShowcaseInterview
└── Prompts (systemPrompts.ts, contentAgentPrompt.ts)
```

### Pipeline Steps

| # | Tool | Status Before → After | AI Provider | Duration |
|---|------|----------------------|-------------|----------|
| 1 | `conductDeepResearch` | draft → research | Tavily API | 10-30s |
| 2 | `analyzeWritingCharacteristics` | research → foundations | Claude | 5-15s |
| 3 | `analyzeStorytellingStructure` | foundations → foundations | Claude | 5-10s |
| 4 | `generateSkeleton` | foundations → skeleton | Claude | 5-10s |
| — | **PAUSE** (user approval) | skeleton → foundations_approval | — | User-dependent |
| 5 | `writeContentSections` | foundations_approval → writing | Gemini | 30-60s |
| 6 | `checkHumanity` | writing → humanity_checking | Claude | 10-20s |
| 7 | `identifyImageNeeds` + `generateFinalImages` | humanity_checking → creating_visuals | DALL-E 3 / Gemini Imagen | 20-60s |
| 8 | Complete | creating_visuals → ready | — | — |

### Showcase Interview Pipeline

For `showcase` type artifacts, an interview phase is prepended:

| # | Tool | Status Before → After |
|---|------|----------------------|
| 0a | `startShowcaseInterview` | draft → interviewing |
| 0b | `saveInterviewAnswer` (x6) | interviewing (iterative) |
| 0c | `completeShowcaseInterview` | interviewing → research |
| 1+ | Standard pipeline continues | research → ... → ready |

---

## Configuration

### AI Providers

| Operation | Provider | Model |
|-----------|----------|-------|
| Research | Tavily API | Web search |
| Writing characteristics | Anthropic | Claude Sonnet 4.5 |
| Storytelling analysis | Anthropic | Claude Sonnet 4.5 |
| Skeleton generation | Anthropic | Claude Sonnet 4.5 |
| Content writing | Google | Gemini 2.5 Flash |
| Humanity check | Anthropic | Claude Sonnet 4.5 |
| Image generation | OpenAI / Google | DALL-E 3 / Gemini Imagen 4 |

### Screen Context

The frontend passes screen context to the Content Agent via chat configuration:

```typescript
interface ScreenContext {
  currentPage: string        // e.g., "artifact-editor"
  artifactId?: string
  artifactType?: ArtifactType
  artifactTitle?: string
  artifactStatus?: ArtifactStatus
}
```

This enables the agent to provide contextually relevant responses and tool executions.

---

## Tools Reference

### Pipeline Tools (executed in order)

| Tool | File | Description |
|------|------|-------------|
| `conductDeepResearch` | researchTools.ts | Multi-source research via Tavily API |
| `analyzeWritingCharacteristics` | writingCharacteristicsTools.ts | Analyze writing style from examples |
| `analyzeStorytellingStructure` | storytellingTools.ts | Narrative framework, story arc, emotional journey |
| `generateSkeleton` | skeletonTools.ts | Generate H1 + H2 content skeleton (storytelling-shaped) |
| `writeContentSections` | contentWritingTools.ts | Write full content per section (section-aware storytelling) |
| `checkHumanity` | humanityCheckTools.ts | Remove AI writing patterns |
| `identifyImageNeeds` | imageNeedsTools.ts | Find `[IMAGE:]` placeholders |
| `generateFinalImages` | finalImageTools.ts | Generate images with DALL-E 3 |

### Interview Tools (showcase only)

| Tool | File | Description |
|------|------|-------------|
| `startShowcaseInterview` | interviewTools.ts | Initialize interview, validate artifact |
| `saveInterviewAnswer` | interviewTools.ts | Save Q&A pair with coverage scores |
| `completeShowcaseInterview` | interviewTools.ts | Synthesize brief from all answers |

### Content Improvement Tools (user-triggered)

| Tool | File | Description |
|------|------|-------------|
| `improveTextContent` | contentImprovementTools.ts | Improve selected text based on feedback |
| `improveImageContent` | contentImprovementTools.ts | Improve selected image |

### Social Post Tool

| Tool | File | Description |
|------|------|-------------|
| `writeSocialPostContent` | socialPostTools.ts | Generate social post from source artifact |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/content-agent/execute` | Execute content agent with message + screenContext |
| `POST` | `/api/content-agent/clear-session` | Clear conversation session |
| `GET` | `/api/content-agent/history` | Get conversation history |
| `POST` | `/api/artifacts/:id/approve-foundations` | Approve foundations, resume pipeline |
| `GET` | `/api/artifacts/:id/writing-characteristics` | Get writing characteristics |
| `GET` | `/api/artifacts/:id/research` | Get research data |

---

## Known Limitations

- Research is limited to Tavily API sources (no direct scraping)
- Writing characteristics require at least 1 writing example (better with 3+)
- Image generation may fail; content is still usable without images
- Humanity check uses a fixed pattern list (24+ patterns from Wikipedia guide)
- Pipeline cannot be partially re-run; must restart from foundations_approval at earliest

---

## Related Documentation

- [artifact-creation-flow.md](../flows/artifact-creation-flow.md) - User flow
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - Pipeline details
- [content-agent-architecture.md](../Architecture/backend/content-agent-architecture.md) - Architecture
- [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md) - Tool reference
- [storytelling-analysis.md](./storytelling-analysis.md) - Storytelling frameworks and tool details

---

**Version History:**
- **2.0.0** (2026-02-20) — Added storytelling analysis step (step 3) to pipeline, updated tools and architecture
- **1.0.0** (2026-02-19) — Initial content creation agent documentation
