# Humanity Check

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The Humanity Check removes AI-sounding patterns from generated content using a 24-category pattern detection system based on Wikipedia's "Signs of AI writing" guide. It runs as pipeline step 5 between content writing and image generation.

---

## How It Works

### Tool: `applyHumanityCheck`

**Trigger:** Pipeline step 5 (after `writeContentSections`)
**Status transition:** `writing` → `humanity_checking`
**AI Provider:** Claude Sonnet (temperature 0.5)

### 24 Pattern Categories

| # | Pattern | Example |
|---|---------|---------|
| 1 | Undue emphasis on significance/legacy | "This groundbreaking approach revolutionized..." |
| 2 | Emphasis on notability/media coverage | "Widely recognized as a leader in..." |
| 3 | Superficial -ing analyses | "Leveraging cutting-edge technology..." |
| 4 | Promotional/advertisement language | "This game-changing solution..." |
| 5 | Vague attributions (weasel words) | "Many experts believe...", "Studies show..." |
| 6 | Outline-like "Challenges and Future" | Generic conclusion sections |
| 7 | Overused AI vocabulary | delve, tapestry, multifaceted, landscape, myriad |
| 8 | Copula avoidance | "serves as", "stands as", "acts as" |
| 9 | Negative parallelisms | "not only...but also" |
| 10 | Rule of three overuse | Three-item lists everywhere |
| 11 | Elegant variation (synonym cycling) | Using different words for the same concept |
| 12 | False ranges | "from X to Y" without real range |
| 13 | Em dash overuse | Excessive — interjections |
| 14 | Boldface overuse | **Too many** bold phrases |
| 15 | Inline-header vertical lists | Formatted lists that read unnaturally |
| 16 | Title case in headings | Every Word Capitalized |
| 17 | Emojis in headings | Section headers with emoji |
| 18 | Curly quotation marks | Smart quotes vs straight |
| 19 | Collaborative communication artifacts | "As we discussed...", "Let me explain..." |
| 20 | Knowledge-cutoff disclaimers | "As of my last update..." |
| 21 | Sycophantic/servile tone | "Great question!", "Absolutely!" |
| 22 | Filler phrases | "It's worth noting that...", "In today's world..." |
| 23 | Excessive hedging | "It could potentially perhaps..." |
| 24 | Generic positive conclusions | "In conclusion, the future looks bright..." |

### Output

```typescript
{
  humanityScoreBefore: number   // 0-100
  humanityScoreAfter: number    // 0-100
  patternsFixed: number
  patternsChecked: 24
}
```

Scores and pattern counts are stored in `artifacts.metadata.writing_metadata`.

### Analysis-Only Tool: `checkContentHumanity`

A read-only variant that analyzes content without modifying it:

```typescript
{
  detectedPatterns: Array<{ category, example, fix }>
  humanityScore: number
  topIssues: string[]
  suggestions: string[]
  verdict: string   // "Content sounds mostly human" | "has noticeable AI patterns"
}
```

---

## Known Limitations

- Fixed 24-pattern list (new AI patterns may emerge)
- Single-pass humanization (no iterative refinement)
- May occasionally change meaning while removing patterns
- Author brief from interview helps preserve intent (when available)

---

## Related Documentation

- [artifact-creation-flow.md](../flows/artifact-creation-flow.md) - Pipeline position
- [content-creation-agent.md](./content-creation-agent.md) - Pipeline overview
