# Social Post Generation

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

Social Post Generation creates viral social media posts that promote existing blog or showcase artifacts. It reads the source content, generates a social post with hashtags, applies a humanization pass, and delivers a ready-to-publish post.

---

## How It Works

### Tool: `writeSocialPostContent`

**AI Provider:** Claude Sonnet (temperature 0.8)

### Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `artifactId` | uuid | New social post artifact ID |
| `sourceArtifactId` | uuid | Source article to promote |
| `sourceTitle` | string | Title of source article |
| `sourceType` | `blog` or `showcase` | Type of source |
| `sourceTags` | string[] | Tags from source |
| `tone` | ArtifactTone | Desired tone |

### Flow

1. Fetch source artifact content from DB
2. Extract hero image URL from HTML/markdown
3. Strip HTML tags, extract plain text (first 15k chars)
4. Generate social post with Claude Sonnet (high creativity, temp 0.8)
5. Apply humanization pass (remove AI patterns)
6. Post-process to clean remaining artifacts (em dashes, etc.)
7. Attach hero image markdown if available
8. Save content to social post artifact
9. Update status to `ready`
10. Store hashtags in artifact metadata

### Output

```typescript
{
  content: string       // Social post with [LINK_PLACEHOLDER]
  hashtags: string[]    // Array of #hashtags
  characterCount: number
}
```

### Eligibility

```typescript
canCreateSocialPost(artifact) =
  artifact.type IN ('blog', 'showcase') AND
  artifact.status IN ('ready', 'published')
```

---

## Entry Point

From PortfolioPage or ArtifactPage:
1. Three-dot menu on artifact card → "Create Social Post"
2. Creates new artifact with `type: social_post` and `metadata.sourceArtifactId`
3. Navigates to new artifact page with `?createSocialPost=true&sourceId=...`
4. Auto-triggers `writeSocialPostContent` tool

---

## Known Limitations

- Requires source to be `ready` or `published`
- Hero image extraction is heuristic (first `<img>` or markdown image)
- `[LINK_PLACEHOLDER]` must be replaced manually with actual URL
- Single-pass generation (no iterative refinement)

---

## Related Documentation

- [portfolio-management-flow.md](../flows/portfolio-management-flow.md) - Social post creation flow
- [content-creation-agent.md](./content-creation-agent.md) - Tool reference
