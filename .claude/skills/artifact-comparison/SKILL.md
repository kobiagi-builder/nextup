---
name: artifact-comparison
description: Deep comparative analysis of two content artifacts (blog posts, articles, showcases) using a 72-characteristic evaluation framework. Scores both pieces across structure, voice, narrative, persuasion, and human voice markers. Use when comparing AI-generated content vs human-written reference, evaluating content quality, or benchmarking article improvements.
---

# Artifact Comparison Skill

You are now in **Comparative Content Analysis Mode**. You will evaluate two content artifacts against a rigorous 72-characteristic framework, producing a structured scorecard and actionable gap analysis.

## Workflow

### Step 1: Load Both Artifacts

Accept two articles in any combination of:
- File path (read from disk)
- URL (fetch via WebFetch)
- Pasted text (inline in chat)
- Artifact from database (fetch via Supabase query on the `artifacts` table)

Label them:
- **Article A** — typically the AI-generated or "under review" piece
- **Article B** — typically the human-written reference or benchmark

If the user only provides one article and asks for a quality evaluation (not a comparison), run the framework as a solo audit — score the single article on all 72 characteristics without a comparator.

### Step 2: Build Quantitative Measurements

Before any subjective scoring, extract hard metrics from both articles:

```
Word count, heading counts (H2/H3), paragraph count,
paragraph length distribution (mean/median/min/max),
section length distribution, image count,
sentence length (mean + variety), pronoun ratios,
contraction frequency, type-token ratio
```

Present these in a side-by-side table. These numbers ground the qualitative analysis.

### Step 3: Score All 72 Characteristics

Rate each characteristic on a 1-5 scale for both articles:

| Score | Meaning |
|-------|---------|
| 1 | Absent or counterproductive |
| 2 | Present but weak/generic |
| 3 | Competent, meets expectations |
| 4 | Strong, above average |
| 5 | Exceptional, best-in-class |

Use the full framework below. For each category, provide:
- Individual scores per characteristic (table format)
- Category subtotal (sum and percentage of max)
- 1-2 sentence commentary on the most significant gap in that category

### Step 4: Comparative Analysis Report

After scoring, produce:

1. **Score Summary Table** — category totals side by side with delta
2. **Core Difference** — one paragraph describing the fundamental strategic difference between the two pieces (e.g., "A optimizes for assertion density, B optimizes for comprehension depth")
3. **Top 5 Gaps** — the 5 characteristics with the largest score delta, with specific evidence from the text
4. **Top 5 Strengths of Article A** — where A scores higher or equal
5. **Actionable Improvements** — concrete, specific changes to Article A to close the gaps, referencing exact sections/paragraphs

### Step 5: Sub-Agent Peer Review (Optional but Recommended)

For high-stakes comparisons, launch a sub-agent to challenge the analysis:
- Are any scores inflated or deflated?
- Are there blind spots in the analysis?
- Does the "core difference" hold up under scrutiny?

Incorporate feedback and adjust scores if warranted.

---

## The 72-Characteristic Framework

### A. Structure & Layout (1-12)

| # | Characteristic | What to Evaluate |
|---|---------------|-----------------|
| 1 | Total word count | Raw length — is it appropriate for the topic depth? |
| 2 | Number of H2 headings | Major section divisions |
| 3 | Number of H3 headings | Sub-section granularity |
| 4 | Paragraph count | Pacing and visual rhythm |
| 5 | Paragraph length distribution | Mean, median, min, max, std dev — variety vs monotony |
| 6 | Section length distribution | Mean, min, max, variance — balanced vs lopsided |
| 7 | Number of images | Visual support |
| 8 | Image placement pattern & purpose | Decorative vs illustrative vs data-driven |
| 9 | Use of blockquotes | External voices, emphasis |
| 10 | Use of numbered/bulleted lists | Scannable structure |
| 11 | Bold text usage pattern | Emphasis strategy — structural vs scattered |
| 12 | Italic text usage pattern | Tone markers, terms of art |

### B. Opening & Hook (13-19)

| # | Characteristic | What to Evaluate |
|---|---------------|-----------------|
| 13 | Title specificity and intrigue | Does it promise something specific? Would you click? |
| 14 | Opening sentence type | Question, provocation, statement, story, statistic? |
| 15 | Opening paragraph word count | Tight vs sprawling entry |
| 16 | Curiosity gap specificity | Precise puzzle vs vague intrigue |
| 17 | First section purpose | Thesis setup, cold open, scene-setting? |
| 18 | Time to first concrete example | How many words before something tangible appears? |
| 19 | Promise clarity | What does the reader know they'll get within first 100 words? |

### C. Narrative Architecture (20-33)

| # | Characteristic | What to Evaluate |
|---|---------------|-----------------|
| 20 | Central metaphor/concept clarity | Is the core idea crisp and memorable? |
| 21 | Narrative arc type | Linear, thesis-proof, problem-solution-framework, journey? |
| 22 | Argument momentum | Do stakes escalate section over section? |
| 23 | Named concrete examples count | How many real companies/products/people are cited? |
| 24 | Example depth | Name-drop vs detailed mechanics breakdown |
| 25 | Example selection logic | Famous/safe vs revealing/specific |
| 26 | Example freshness | Personal experience vs business-book canon |
| 27 | Data/statistics specificity | Vague ("studies show") vs precise ("37% increase in Q3") |
| 28 | Counter-argument handling | Does it address the skeptic? |
| 29 | Transition inevitability | Does the next section feel like the only possible next move? |
| 30 | Concept evolution vs repetition | Does the core idea develop or just restate? |
| 31 | Distinguishing from prior art | How does it differentiate from existing frameworks? |
| 32 | Information sequencing logic | Discovery order vs taxonomic listing |
| 33 | Per-section "so what" clarity | Does each section justify its existence? |

### D. Voice & Tone (34-47)

| # | Characteristic | What to Evaluate |
|---|---------------|-----------------|
| 34 | Average sentence length | Baseline rhythm |
| 35 | Sentence length variety | Fragments, short, medium, long — musical variation |
| 36 | Pronoun strategy | I/we/you/they ratio and deliberate shifts |
| 37 | Conversational register level | How close to spoken language? |
| 38 | Register breaks | Deliberate shifts between formal and colloquial |
| 39 | Syntactic rule-breaking | Rhetorical questions, fragments, one-sentence paragraphs |
| 40 | Contractions frequency | "Don't" vs "do not" — warmth indicator |
| 41 | Epistemic hedging pattern | Where does certainty vs uncertainty appear? |
| 42 | Assertiveness level | Hedging vs confident claims |
| 43 | Em dash / parenthetical usage | Aside frequency and style |
| 44 | Attitude toward subject | Reverent, irreverent, complex, playful? |
| 45 | Humor type and placement | Absent, dry, self-deprecating, observational? |
| 46 | Emotional texture variation | Does tone shift across the piece or stay flat? |
| 47 | Vocabulary distinctiveness | Type-token ratio, signature phrases, unusual word choices |

### E. Persuasion & Value (48-58)

| # | Characteristic | What to Evaluate |
|---|---------------|-----------------|
| 48 | Novel insight rate | Genuinely new ideas per 1000 words |
| 49 | Reframing moves | Moments that flip the reader's existing understanding |
| 50 | Actionability | Can the reader apply this immediately after reading? |
| 51 | Framework: earned vs imposed | Does the structure emerge from the argument or feel bolted on? |
| 52 | Original concept definition clarity | Is the new idea precisely defined? |
| 53 | Problem definition specificity | Is the pain point concrete or abstract? |
| 54 | Solution specificity | Abstract advice vs concrete steps |
| 55 | Reader benefit articulation | Is it clear what the reader gains? |
| 56 | Intellectual generosity | Best thinking given freely vs withheld for a CTA |
| 57 | Stakes escalation pattern | Does urgency build through the piece? |
| 58 | Reader model sophistication | Assumed knowledge level — too basic or too advanced? |

### F. Closing & CTA (59-63)

| # | Characteristic | What to Evaluate |
|---|---------------|-----------------|
| 59 | Closing paragraph type | Summary, provocation, CTA, open question, callback? |
| 60 | CTA specificity | Vague "follow me" vs precise next step |
| 61 | Final sentence memorability | Would someone quote it? |
| 62 | Circular closure | Does the ending echo or resolve the opening? |
| 63 | Closing confidence level | Tentative vs authoritative sign-off |

### G. Human Voice Markers (64-72)

| # | Characteristic | What to Evaluate |
|---|---------------|-----------------|
| 64 | Specificity gradient | Irregular oscillation between abstract and concrete — human writing is uneven, AI writing is uniform |
| 65 | Digression and return pattern | Tangents that enrich then snap back — a hallmark of authentic voice |
| 66 | Unresolved tension | Comfort with ambiguity — not everything tied in a bow |
| 67 | Concession authenticity | Genuine "I was wrong" vs rhetorical "some might say" |
| 68 | Temporal anchoring | Specific moments in time, personal timeline references |
| 69 | Source/attribution behavior variety | Mix of "I heard", "research shows", "my client said" vs uniform citation style |
| 70 | Negative space | What is deliberately NOT discussed — editorial restraint |
| 71 | Paragraph-level transition mechanics variety | Mix of conjunctions, callbacks, jumps, white space |
| 72 | Information density vs insight density ratio | Facts-per-paragraph vs "aha moments"-per-paragraph |

---

## Output Format

Present the full analysis in this structure:

```markdown
# Artifact Comparison Report

## Quantitative Snapshot
[Side-by-side metrics table]

## Scoring: A. Structure & Layout
[Table with scores + commentary]

## Scoring: B. Opening & Hook
[Table with scores + commentary]

## Scoring: C. Narrative Architecture
[Table with scores + commentary]

## Scoring: D. Voice & Tone
[Table with scores + commentary]

## Scoring: E. Persuasion & Value
[Table with scores + commentary]

## Scoring: F. Closing & CTA
[Table with scores + commentary]

## Scoring: G. Human Voice Markers
[Table with scores + commentary]

## Score Summary
| Category | Article A | Article B | Delta | Max |
|----------|-----------|-----------|-------|-----|
| A. Structure & Layout | X/60 | Y/60 | +/-N | 60 |
| B. Opening & Hook | X/35 | Y/35 | +/-N | 35 |
| C. Narrative Architecture | X/70 | Y/70 | +/-N | 70 |
| D. Voice & Tone | X/70 | Y/70 | +/-N | 70 |
| E. Persuasion & Value | X/55 | Y/55 | +/-N | 55 |
| F. Closing & CTA | X/25 | Y/25 | +/-N | 25 |
| G. Human Voice Markers | X/45 | Y/45 | +/-N | 45 |
| **TOTAL** | **X/360** | **Y/360** | **+/-N** | **360** |

## Core Difference
[One paragraph]

## Top 5 Gaps (Largest Deltas)
[Numbered list with evidence]

## Top 5 Strengths of Article A
[Numbered list with evidence]

## Actionable Improvements
[Specific, implementable changes to Article A]
```

## Important Notes

- **Be harsh and honest.** Inflated scores are useless. A score of 3 is "competent" — most AI-generated content should land at 2-3 on voice and human markers.
- **Always cite evidence.** Every score must reference a specific passage, paragraph, or pattern from the text. No score without proof.
- **Category G is the differentiator.** Human Voice Markers are where AI content consistently underperforms. Pay special attention here.
- **Context matters.** A 500-word LinkedIn post shouldn't be penalized for low word count if that's the target format. Evaluate against the article's apparent intent.
- **The framework was designed for long-form blog/showcase content** but can be adapted. For short-form (social posts), skip characteristics that don't apply and note the reduced max score.
