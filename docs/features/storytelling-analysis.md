# Storytelling Analysis

**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Version:** 1.0.0
**Status:** Complete

## Overview

The Storytelling Analysis tool generates narrative guidance for content artifacts. It runs as a pipeline step during the `foundations` phase, producing structured storytelling recommendations that shape both **skeleton structure** (narrative arc) and **content writing** (section-level storytelling).

Stories are 22x more memorable than facts alone, drive 30% higher conversion rates, and produce 306% higher customer lifetime value. This tool ensures every artifact leverages storytelling principles tailored to its type.

---

## Storytelling Frameworks

### Primary Frameworks (Selected by AI Per Artifact)

| Framework | Creator | Best For | Structure |
|-----------|---------|----------|-----------|
| **StoryBrand SB7** | Donald Miller | Blog, Showcase | Customer as Hero > Problem > Guide > Plan > Action > Failure > Success |
| **Hero's Journey** | Joseph Campbell / Christopher Vogler | Showcase | Ordinary World > Call > Threshold > Trials > Ordeal > Reward > Return |
| **Story Spine** | Kenn Adams | Blog, Social Post | "Once upon a time... Every day... Until one day... Because of that..." |
| **Before-After-Bridge (BAB)** | Copywriting tradition | Blog, Social Post | Before state > After state > Bridge (how to get there) |
| **Problem-Agitate-Solve (PAS)** | Copywriting tradition | Blog, Social Post | Problem > Agitate emotions > Present solution |
| **STAR Method** | Interview tradition | Showcase | Situation > Task > Action > Result |
| **Resonate** | Nancy Duarte | Blog | "Today vs Tomorrow" oscillation, Sparkline structure |
| **McKee's Story Structure** | Robert McKee | Showcase | Inciting Incident > Progressive Complications > Crisis > Climax > Resolution |
| **Stories That Stick** | Kindra Hall | Blog, Showcase | Four story types: Value, Founder, Purpose, Customer |
| **Moth Method** | The Moth | Social Post, Blog | Personal, true, vulnerable micro-stories |

### Platform-Specific Techniques

#### Blog Storytelling
- Full 3-act narrative arcs within articles
- In medias res hooks (start in the middle of the action)
- Argument-as-story: each section advances a narrative, not just a topic
- Anecdotes per section to illustrate abstract concepts
- Earned naming: show the concept through example before naming it
- Counter-arguments as narrative tension

#### Social Post Storytelling
- Micro-storytelling: complete narrative in 150-280 characters
- Hook-first (3-second attention window)
- LinkedIn carousels get 278% more engagement with story-driven slides
- Twitter/X thread sweet spot: 7 tweets for a complete narrative arc
- Emotional triggers: curiosity gaps, surprising contrasts, relatable moments
- Cliffhanger-resolution pattern

#### Showcase/Case Study Storytelling
- 4-part narrative arc: Before > Tipping Point > Journey > After
- Customer as hero (not the product/company)
- Transformation focus: emphasize the change, not the features
- STAR method integration for credibility
- Anonymization with narrative preservation (role-based references)
- Framework elements follow: What it answers > How to run it > How it played out > Common pitfall

---

## Tool Output Schema

The `analyzeStorytellingStructure` tool produces a `StorytellingGuidance` object:

```typescript
interface StorytellingGuidance {
  narrative_framework: {
    name: string;               // e.g., 'storybrand', 'star', 'bab'
    description: string;        // Why this framework fits this artifact
    confidence: number;         // 0-1
  };
  story_arc: {
    beginning: string;          // Setup/hook strategy
    middle: string;             // Tension/development approach
    end: string;                // Resolution/CTA strategy
    section_mapping: Array<{
      section_role: string;     // e.g., 'setup', 'rising_action', 'climax'
      guidance: string;         // What this section achieves narratively
      emotional_target: string; // e.g., 'curiosity', 'tension', 'relief'
    }>;
  };
  emotional_journey: Array<{
    stage: string;              // e.g., 'opening', 'problem', 'insight'
    emotion: string;            // e.g., 'curiosity', 'frustration', 'confidence'
    intensity: number;          // 1-10
    technique: string;          // How to evoke this emotion
  }>;
  hook_strategy: {
    type: string;               // e.g., 'in_medias_res', 'provocative_question'
    guidance: string;
  };
  protagonist: {
    type: string;               // e.g., 'reader_as_hero', 'customer_as_hero'
    guidance: string;
  };
  tension_points: Array<{
    location: string;           // Where in the content
    type: string;               // e.g., 'counter_argument', 'stakes_raise'
    description: string;
  }>;
  resolution_strategy: {
    type: string;               // e.g., 'transformation_reveal', 'call_to_action'
    guidance: string;
  };
}
```

---

## How It Integrates

### Pipeline Position

```
conductDeepResearch (draft -> research)
  |
analyzeWritingCharacteristics (research -> foundations)
  |
analyzeStorytellingStructure (foundations -> foundations)  <-- THIS TOOL
  |
generateContentSkeleton (foundations -> foundations_approval)
  |
writeFullContent (foundations_approval -> writing -> humanity_checking)
  |
identifyImageNeeds (humanity_checking -> ready)
```

The tool runs within the `foundations` status without adding a new status to the workflow.

### Skeleton Generation

Storytelling guidance is fetched from `artifact_storytelling` and injected into `buildSkeletonPrompt()`. It shapes:
- H2 section ordering to follow the narrative arc
- Hook strategy for the opening section
- Tension/resolution placement across sections
- Protagonist framing

### Content Writing

Storytelling guidance is fetched and injected into `buildContentPrompt()` per section, with **section-aware** instructions:
- Emotional journey stage mapped to current section position
- Hook strategy applied to first section only
- Tension points applied to mid-content sections
- Resolution strategy applied to last section only

---

## Best Practices (from Research)

1. **Character development**: Even in B2B content, identify a protagonist (reader, customer, author)
2. **Conflict as engine**: Every good story needs tension — use counter-arguments, challenges, or status quo problems
3. **Sensory details**: Concrete, specific details make stories memorable
4. **Emotional arcs**: Plan the emotional journey — don't stay at one emotional register
5. **"One thing" principle**: Each section should advance one clear narrative beat
6. **Pacing**: Vary sentence length and paragraph density to control reader pace
7. **Show, don't tell**: Use examples and anecdotes before abstract statements

### Anti-Patterns to Avoid

- Forced stories that don't connect to the content's purpose
- Generic narratives (the "journey" metaphor applied to everything)
- Over-dramatization of mundane topics
- Missing the business point — stories must serve the content goal
- Starting with "In today's fast-paced world..." (throat-clearing)

---

## Statistics

| Metric | Impact | Source |
|--------|--------|--------|
| Memorability | Stories are 22x more memorable than facts alone | Stanford research |
| Conversion | 30% higher conversion rates with story-driven content | Various marketing studies |
| Lifetime Value | 306% higher customer lifetime value | Brand storytelling research |
| Consumer Preference | 92% of consumers want ads that feel like stories | Marketing surveys |
| Engagement | LinkedIn carousels with stories get 278% more engagement | LinkedIn analytics |

---

## Database

**Table:** `artifact_storytelling`
- `id` (UUID, PK)
- `artifact_id` (UUID, FK to artifacts, UNIQUE)
- `storytelling_guidance` (JSONB) — `StorytellingGuidance` object
- `narrative_framework` (TEXT) — framework name for quick queries
- `summary` (TEXT) — human-readable summary
- `recommendations` (TEXT) — specific narrative recommendations
- `created_at`, `updated_at` (TIMESTAMPTZ)

---

## Related Documentation

- [content-creation-agent.md](content-creation-agent.md) — Content agent overview
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) — Pipeline details
- [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md) — All tools reference
- [artifact-creation-flow.md](../flows/artifact-creation-flow.md) — User flow
