# Topic Creation Flow Improvement - Contract

**Created**: 2026-02-22
**Confidence Score**: 95/100
**Status**: Approved

## Problem Statement

The current topic creation flow in the content agent is one-dimensional. It fetches the user's profile context, skills, and recent artifacts, then generates 5 generic personalized topic suggestions. This approach has three key limitations:

1. **No timely/trending content**: Suggestions are based solely on user profile + Claude's training data. There's no awareness of what's currently trending, upcoming industry events, or timely opportunities.
2. **No follow-up intelligence**: The agent doesn't analyze existing content to suggest meaningful sequels, different angles, or updated versions. `listRecentArtifacts` is used only for deduplication, not inspiration.
3. **No intent clarification**: The agent doesn't confirm what type of suggestions the user wants before generating them, leading to mismatched expectations.

## Goals

1. **Three distinct topic types** with dedicated generation strategies: Personalized (user context), Trending (web research), and Continue a Series (follow-up on existing content).
2. **Intent clarification gate**: The agent must know the expected content type (blog, social post, showcase) AND which topic type(s) the user wants before generating suggestions.
3. **Web research integration for trending topics**: Tavily Enhanced + Hacker News API for discovering trending PM topics, upcoming events, and rising discussion trends. PM default domain with user override.
4. **Grouped suggestion output**: 3 suggestions per type, grouped by type with section headers. Friendly names: "Personalized", "Trending", "Continue a Series".
5. **Clean up dead code**: Remove unused `topicTools.ts`.

## Success Criteria

- [ ] Agent identifies user intent (content type + topic type) before generating suggestions
- [ ] Agent asks clarifying questions via chat when intent is ambiguous
- [ ] "Personalized" topics use user context/skills, `listRecentArtifacts` for dedup only
- [ ] "Trending" topics return current/trending PM content via web research
- [ ] "Continue a Series" topics suggest sequels, different angles, updated versions
- [ ] User can select multiple types, receives 3 suggestions per selected type
- [ ] Suggestions grouped by type with section headers in the UI
- [ ] Domain defaults to PM for Trending, with user override
- [ ] `topicTools.ts` deleted
- [ ] All existing tests pass, content creation flow unchanged

## Scope Boundaries

### In Scope
- System prompt changes for intent clarification and 3 topic types
- New tools: `researchTrendingTopics`, `analyzeFollowUpTopics`
- Modified tool: `suggestArtifactIdeas` with topic type support
- Frontend grouped rendering + card badges
- Tavily client extension + Hacker News client
- Deletion of unused `topicTools.ts`

### Out of Scope
- Content creation flow (everything after "Create content:")
- New UI components (chat conversation only)
- Topic persistence/management
- Database schema changes
- Social post / showcase interview flows

### Future Considerations
- Topic persistence (save for later review)
- Cross-format adaptation as a follow-up type
- Analytics on topic type preferences
- Custom trending domains beyond PM
