# LLM Cost Reduction Analysis

**Date:** 2026-03-06
**Status:** Analysis Complete

---

## 1. Model Registry

Defined in `backend/src/services/ai/AIService.ts:91-96`:

| Alias | Actual Model ID | Provider |
|-------|----------------|----------|
| `claude-sonnet` | `claude-sonnet-4-20250514` | Anthropic |
| `claude-haiku` | `claude-haiku-4-5-20251001` | Anthropic |
| `gpt-4o` | `gpt-4o` | OpenAI |
| `gpt-4o-mini` | `gpt-4o-mini` | OpenAI |

---

## 2. Current Model Pricing (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| **Claude Sonnet 4** | $3 | $15 |
| **Claude Haiku 4.5** | $1 | $5 |
| **Gemini 2.0 Flash** | $0.10 | $0.40 |
| **GPT-4o** | $2.50 | $10 |
| **GPT-4o-mini** | $0.15 | $0.60 |
| **DALL-E 3** | ~$0.04/image (1024x1024) | -- |
| **Imagen 4.0 Fast** | ~$0.02/image | -- |
| **GPT-Image-1** | ~$0.02-0.08/image (edit) | -- |

---

## 3. All LLM Actions Inventory

### Core Chat

| # | Action | File | Model | Cost (In/Out per 1M) |
|---|--------|------|-------|----------------------|
| 1 | AI Chat (streaming) -- main agent chat with tools | `AIService.ts:441` | Claude Sonnet 4 (default) | $3/$15 |
| 2 | AI Generate (non-streaming) -- generate response | `AIService.ts:550` | Claude Sonnet 4 (default) | $3/$15 |
| 3 | Quick Content (social_post) | `AIService.ts:696` | Claude Haiku 4.5 | $1/$5 |
| 4 | Quick Content (blog/showcase/research) | `AIService.ts:696` | Claude Sonnet 4 | $3/$15 |
| 5 | Customer AI Chat -- product mgmt chat | `customer-ai.controller.ts:288` | Claude Sonnet 4 | $3/$15 |

### Portfolio Pipeline Tools

| # | Action | File | Model | Cost (In/Out per 1M) |
|---|--------|------|-------|----------------------|
| 6 | Skeleton Generation -- article outline | `skeletonTools.ts:646` | Claude Sonnet 4 | $3/$15 |
| 7 | Storytelling Analysis -- narrative structure | `storytellingTools.ts:522` | Claude Sonnet 4 | $3/$15 |
| 8 | Content Writing (draft) -- Gemini generates | `contentWritingTools.ts:725` | Gemini 2.0 Flash | $0.10/$0.40 |
| 9 | Content Writing (humanize pass) | `contentWritingTools.ts:1274` | Claude Sonnet 4 | $3/$15 |
| 10 | Content Improvement -- surgical edits | `contentImprovementTools.ts:83` | Claude Sonnet 4 | $3/$15 |
| 11 | Image Description Refinement | `contentImprovementTools.ts:362` | Claude Haiku 4.5 | $1/$5 |
| 12 | Social Post Generation | `socialPostTools.ts:157` | Claude Sonnet 4 | $3/$15 |
| 13 | Social Post Humanize | `socialPostTools.ts:171` | Claude Sonnet 4 | $3/$15 |
| 14 | Humanity Check / Humanize | `humanityCheckTools.ts:479` | Claude Sonnet 4 | $3/$15 |
| 15 | Humanity Analysis | `humanityCheckTools.ts:866` | Claude Sonnet 4 | $3/$15 |
| 16 | Writing Characteristics | `writingCharacteristicsTools.ts:523` | Claude Sonnet 4 | $3/$15 |
| 17 | Research Query Generation | `researchTools.ts:49` | Claude Haiku 4.5 | $1/$5 |
| 18 | Follow-Up Topics | `followUpTopicsTools.ts:95` | Claude Haiku 4.5 | $1/$5 |

### Data Processing Services

| # | Action | File | Model | Cost (In/Out per 1M) |
|---|--------|------|-------|----------------------|
| 19 | Enrichment -- LinkedIn extraction | `EnrichmentService.ts:362` | Claude Haiku 4.5 | $1/$5 |
| 20 | Enrichment -- Website extraction | `EnrichmentService.ts:447` | Claude Haiku 4.5 | $1/$5 |
| 21 | Enrichment -- People extraction | `EnrichmentService.ts:623` | Claude Haiku 4.5 | $1/$5 |
| 22 | Enrichment -- Role filtering | `EnrichmentService.ts:688` | Claude Haiku 4.5 | $1/$5 |
| 23 | Enrichment -- Company (grounded) | `EnrichmentService.ts:872` | Claude Haiku 4.5 | $1/$5 |
| 24 | Enrichment -- Company (memory) | `EnrichmentService.ts:901` | Claude Haiku 4.5 | $1/$5 |
| 25 | Enrichment -- Merge fields | `EnrichmentService.ts:939` | Claude Haiku 4.5 | $1/$5 |
| 26 | Profile Extraction | `ProfileExtractionService.ts:266` | Claude Haiku 4.5 | $1/$5 |
| 27 | ICP Scoring | `IcpScoringService.ts:285` | Claude Haiku 4.5 | $1/$5 |
| 28 | Company Classification | `CompanyClassificationService.ts:334` | Claude Haiku 4.5 | $1/$5 |

### Image Generation

| # | Action | File | Model | Cost |
|---|--------|------|-------|------|
| 29 | Image Generation (DALL-E) | `imageGeneration.ts:115` | DALL-E 3 | ~$0.04/img |
| 30 | Image Generation (Imagen) | `imageGeneration.ts:182` | Imagen 4.0 Fast | ~$0.02/img |
| 31 | Image Editing | `imageGeneration.ts:271` | GPT-Image-1 | ~$0.02-0.08/img |

---

## 4. Alternative Models

### Alternatives for Claude Sonnet 4 Actions (#1-2, 4-7, 9-10, 12-16)

Currently $3/$15 per 1M tokens.

| Alternative | Input | Output | Savings vs Sonnet | Quality Trade-off |
|------------|-------|--------|-------------------|-------------------|
| **Gemini 2.5 Flash** | $0.15 | $0.60 | 95% cheaper | Very good for structured tasks, fast. Weak on nuanced writing style. |
| **GPT-4o-mini** | $0.15 | $0.60 | 95% cheaper | Good for simpler tasks. Less creative writing ability. |
| **Claude Haiku 4.5** | $1 | $5 | 67% cheaper | Already in our stack. Good for tool calls, weaker on long-form quality. |
| **Gemini 2.0 Flash** | $0.10 | $0.40 | 97% cheaper | Already used for content writing drafts. Fast but less nuanced. |
| **GPT-4.1-mini** | $0.40 | $1.60 | 87% cheaper | Strong instruction following, good coding. |
| **Claude Sonnet 4.6** | $3 | $15 | Same price | Newer, potentially better quality (upgrade, not savings). |
| **DeepSeek V3** | $0.27 | $1.10 | 91% cheaper | Strong reasoning, but self-hosted/API availability varies. |
| **Llama 4 Maverick (via Groq)** | ~$0.20 | ~$0.80 | 93% cheaper | Open-source, fast on Groq. Quality gap on creative tasks. |

### Alternatives for Claude Haiku 4.5 Actions (#3, 11, 17-28)

Currently $1/$5 per 1M tokens. Already cost-effective but can go cheaper.

| Alternative | Input | Output | Savings vs Haiku | Quality Trade-off |
|------------|-------|--------|------------------|-------------------|
| **Gemini 2.0 Flash** | $0.10 | $0.40 | 90% cheaper | Excellent for classification, extraction, structured JSON. |
| **Gemini 2.5 Flash** | $0.15 | $0.60 | 85% cheaper | Better reasoning than 2.0, still very cheap. |
| **GPT-4o-mini** | $0.15 | $0.60 | 85% cheaper | Great for structured output, JSON generation. |
| **GPT-4.1-nano** | $0.10 | $0.40 | 90% cheaper | Cheapest OpenAI option, good for simple classification. |
| **Llama 4 Scout (via Groq)** | ~$0.11 | ~$0.34 | 90% cheaper | Fast inference, good for extraction tasks. |

### Alternatives for Gemini 2.0 Flash (#8)

Currently $0.10/$0.40 per 1M tokens. Already the cheapest text model in use.

| Alternative | Input | Output | Notes |
|------------|-------|--------|-------|
| **GPT-4.1-nano** | $0.10 | $0.40 | Same price, different strengths |
| **Gemini 2.5 Flash** | $0.15 | $0.60 | Slightly more expensive but better quality |
| **Llama 4 Scout (via Groq)** | ~$0.11 | ~$0.34 | Similar tier |

---

## 5. Recommended Cost Reduction Strategy

### Priority changes (by action frequency x cost impact):

| Priority | Change | Actions Affected | Est. Savings |
|----------|--------|-----------------|-------------|
| 1 | **Keep Sonnet for Main Chat** (#1, 2, 5) | Core UX -- no downgrade | -- |
| 2 | **Social Posts: Sonnet -> Haiku 4.5 or Gemini 2.5 Flash** | #12, #13 | ~67-95% on these calls |
| 3 | **Humanize passes: Sonnet -> Haiku 4.5** | #9, #14 | ~67% |
| 4 | **Humanity Analysis: Sonnet -> Haiku 4.5** | #15 | ~67% |
| 5 | **Skeleton: Sonnet -> Gemini 2.5 Flash** | #6 | ~95% |
| 6 | **Enrichment: Haiku -> Gemini 2.0 Flash** | #19-25 | ~90% |
| 7 | **ICP Scoring: Haiku -> Gemini 2.0 Flash** | #27 | ~90% |
| 8 | **Company Classification: Haiku -> Gemini 2.0 Flash** | #28 | ~90% |

### Summary by Category

| Category | Current Model | Recommended Model | Savings |
|----------|--------------|-------------------|---------|
| Core chat + content improvement | Claude Sonnet 4 | **Keep Sonnet** (quality-critical) | -- |
| Writing characteristics | Claude Sonnet 4 | **Keep Sonnet** (style analysis needs quality) | -- |
| Storytelling analysis | Claude Sonnet 4 | **Keep Sonnet** (narrative nuance) | -- |
| Social posts | Claude Sonnet 4 | **Haiku 4.5** or **Gemini 2.5 Flash** | 67-95% |
| Humanize passes | Claude Sonnet 4 | **Haiku 4.5** | 67% |
| Skeleton generation | Claude Sonnet 4 | **Gemini 2.5 Flash** | 95% |
| Humanity analysis | Claude Sonnet 4 | **Haiku 4.5** | 67% |
| All enrichment calls | Claude Haiku 4.5 | **Gemini 2.0 Flash** | 90% |
| Profile extraction | Claude Haiku 4.5 | **Gemini 2.0 Flash** | 90% |
| ICP scoring | Claude Haiku 4.5 | **Gemini 2.0 Flash** | 90% |
| Company classification | Claude Haiku 4.5 | **Gemini 2.0 Flash** | 90% |
| Content draft writing | Gemini 2.0 Flash | **Keep Gemini Flash** (already cheapest) | -- |
| Research queries | Claude Haiku 4.5 | **Gemini 2.0 Flash** | 90% |
| Follow-up topics | Claude Haiku 4.5 | **Gemini 2.0 Flash** | 90% |

### Implementation Notes

- Gemini 2.0 Flash is already integrated via `@ai-sdk/google` in `contentWritingTools.ts`
- `GOOGLE_GENERATIVE_AI_API_KEY` is already configured in the environment
- Model config in `AIService.ts:91-96` can be extended to include Gemini models
- Each change should be tested for output quality regression before shipping
- Consider A/B testing critical creative tasks (humanize, social posts) before full migration
