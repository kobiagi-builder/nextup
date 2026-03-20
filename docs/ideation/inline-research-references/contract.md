# Inline Research References Contract

**Created**: 2026-03-20
**Confidence Score**: 95/100
**Status**: Draft

## Problem Statement

NextUp's content pipeline generates artifact content (blog posts, social posts, showcases) that is deeply informed by research — the AI absorbs ideas, data points, reasoning, and conclusions from 10-25 research sources and weaves them into the skeleton and final content. However, users have zero visibility into which research informed which parts of their content.

This creates two problems:
1. **Trust gap**: Users can't verify whether research was actually used (the original complaint that triggered this work)
2. **Learning gap**: Users can't trace back from a compelling sentence to the original research that inspired it, missing an opportunity to deepen their understanding of their own content's foundations

The audience is advisors and consultants who care about credibility and want to understand the provenance of their AI-generated content.

## Goals

1. **Research provenance visibility**: Every sentence in the final artifact that was informed by research has a small, unobtrusive visual indicator showing which research source(s) contributed to it
2. **Zero-click source inspection**: Users can hover over an indicator to see source details (title, type, excerpt preview) without leaving the content view
3. **One-click source access**: Users can open the original research source URL in a new tab from the hover card
4. **Zero additional cost**: The research-to-sentence mapping is generated during the existing content-writing LLM call with no extra API calls, no extra latency
5. **Clean export**: Reference indicators are stripped when content is copied to clipboard, producing clean professional text for LinkedIn/email

## Success Criteria

- [ ] Inline reference indicators appear as small superscript badges after sentences informed by research
- [ ] Each indicator shows a number corresponding to the research source
- [ ] Hovering an indicator (200ms delay) shows a floating card with: source title, source type icon, first sentence of excerpt, "Open Source" button
- [ ] Clicking "Open Source" opens the source URL in a new tab
- [ ] Multiple research sources on one sentence show sequential badges (e.g. `[1][2]`)
- [ ] User can delete an indicator without deleting the sentence
- [ ] Deleting a sentence removes its indicators automatically
- [ ] Copying content to clipboard strips all indicators (clean text)
- [ ] Indicators survive the humanization pipeline step
- [ ] Indicators render correctly in both edit mode and read-only mode
- [ ] Mobile: tap shows the reference card (no hover on touch)
- [ ] No extra LLM calls are made — mapping happens during existing content writing
- [ ] Build passes with no TypeScript errors

## Scope Boundaries

### In Scope

- Backend: Modify content-writing prompt to output `{{ref:N}}` markers alongside content
- Backend: Post-processing to convert markers into HTML with data attributes linking to `artifact_research` IDs
- Backend: Ensure humanizer preserves reference markers through humanization
- Frontend: TipTap custom inline node for reference indicators
- Frontend: Hover card component (Radix HoverCard or Popover) with source details
- Frontend: Reference numbering system per artifact
- Frontend: InlineStyleCopy extension update to strip indicators on copy
- Frontend: Mobile touch support (tap to show card)
- Database: No schema changes needed — `artifact_research` already has all required fields

### Out of Scope

- Bidirectional navigation (clicking reference scrolls to research panel) — adds complexity, defer
- Reference panel/sidebar listing all sources — existing Research section already serves this purpose
- User-added manual reference indicators — focus on AI-generated only
- Reference indicators in skeleton view (foundations_approval stage) — only in final content
- Analytics on reference interactions (hover/click tracking) — premature
- Reference grouping or footnotes section at bottom of content — not needed for this model

### Future Considerations

- Allow users to manually add reference indicators to their own sentences
- "Show all references" toggle that highlights all referenced sentences
- Reference quality score (how closely the content matches the research)
- Export with footnotes option (for academic-style output)

---

*This contract was generated from brain dump input with competitive UX research from Perplexity AI, Wikipedia, Substack, ChatGPT Deep Research, and academic tools. Review and approve before proceeding to PRD generation.*
