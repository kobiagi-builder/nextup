import { tool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getSupabase } from '../../../lib/requestContext.js';
import { logger, logToFile } from '../../../lib/logger.js';
import { mockService, type ContentSectionResponse, type FullContentResponse } from '../mocks/index.js';
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import type { ToolOutput } from '../types/contentAgent.js';
import type { WritingCharacteristics, StorytellingGuidance } from '../../../types/portfolio.js';
import { buildHumanityCheckPrompt } from './humanityCheckTools.js';

/**
 * Content Writing Tools for Content Creation Agent (Phase 2)
 *
 * Generates full content from skeleton sections using Gemini.
 * Applies user-selected tone and incorporates research findings.
 *
 * Uses Gemini 2.0 Flash (NOT Claude) for content generation as specified in PRD.
 */

// =============================================================================
// Types & Constants
// =============================================================================

// Tone options (8 presets)
type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous';

/**
 * Tone Modifiers - Applied to content generation prompts
 * Reused from skeletonTools.ts for consistency
 */
const toneModifiers: Record<ToneOption, string> = {
  formal: 'Use academic language, passive voice where appropriate, complex sentence structures, and sophisticated vocabulary. Maintain professional distance.',
  casual: 'Use contractions, simple everyday language, active voice, and short sentences. Write as if talking to a friend.',
  professional: 'Use clear and direct language, industry-appropriate terminology, confident statements, and balanced sentence structures.',
  conversational: 'Use first-person frequently, rhetorical questions, friendly asides, and natural speech patterns. Engage the reader directly.',
  technical: 'Use precise technical terminology, detailed explanations, active voice, and evidence-based statements. Prioritize accuracy over accessibility.',
  friendly: 'Use warm and supportive language, personal anecdotes where appropriate, encouraging tone, and inclusive pronouns.',
  authoritative: 'Use strong declarative statements, expert positioning, evidence-based claims, and confident assertions. Establish credibility.',
  humorous: 'Include light jokes, wordplay, entertaining examples, and self-deprecating humor where appropriate. Keep it professional.',
};

/**
 * Temperature mapping by tone
 * Lower = more deterministic, Higher = more creative
 */
const toneTemperatures: Record<ToneOption, number> = {
  formal: 0.5,
  casual: 0.7,
  professional: 0.6,
  conversational: 0.7,
  technical: 0.4,
  friendly: 0.7,
  authoritative: 0.5,
  humorous: 0.8,
};

/**
 * Token limits by artifact type
 * Approximate word counts: 1 token ~0.75 words
 */
const tokenLimits: Record<'blog' | 'social_post' | 'showcase', number> = {
  blog: 2000,        // ~1500 words per section
  social_post: 500,  // ~375 words (entire post)
  showcase: 2000,    // ~1500 words per section (framework elements need depth)
};

// =============================================================================
// Logging Helpers
// =============================================================================

/**
 * Log to file with Phase 2 context
 */
function logPhase2(
  stage: string,
  message: string,
  context: Record<string, unknown> = {}
): void {
  const timestamp = new Date().toISOString();
  logToFile(`[PHASE2:CONTENT_WRITING:${stage}] ${message}`, {
    ...context,
    timestamp,
  });
}

// =============================================================================
// Prompt Building
// =============================================================================

/**
 * Extract characteristics guidance for content writing (Phase 4)
 */
function getWritingCharacteristicsGuidance(characteristics?: WritingCharacteristics): string {
  if (!characteristics || Object.keys(characteristics).length === 0) {
    return '';
  }

  const guidance: string[] = ['## Writing Style Characteristics (apply throughout)'];

  // Extract relevant characteristics for content writing
  const toneChar = characteristics.tone;
  if (toneChar) {
    guidance.push(`- Tone: ${toneChar.value}`);
  }

  const voiceChar = characteristics.voice;
  if (voiceChar) {
    guidance.push(`- Voice: ${voiceChar.value} (e.g., first-person, we/our, third-person)`);
  }

  const sentenceChar = characteristics.sentence_structure;
  if (sentenceChar) {
    guidance.push(`- Sentence structure: ${sentenceChar.value}`);
  }

  const vocabChar = characteristics.vocabulary_complexity;
  if (vocabChar) {
    guidance.push(`- Vocabulary: ${vocabChar.value}`);
  }

  const pacingChar = characteristics.pacing;
  if (pacingChar) {
    guidance.push(`- Pacing: ${pacingChar.value}`);
  }

  const evidenceChar = characteristics.use_of_evidence;
  if (evidenceChar) {
    guidance.push(`- Evidence usage: ${evidenceChar.value}`);
  }

  const examplesChar = characteristics.use_of_examples;
  if (examplesChar) {
    guidance.push(`- Examples usage: ${examplesChar.value}`);
  }

  const ctaChar = characteristics.cta_style;
  if (ctaChar) {
    guidance.push(`- Call-to-action style: ${ctaChar.value}`);
  }

  const emotionalChar = characteristics.emotional_appeal;
  if (emotionalChar) {
    guidance.push(`- Emotional appeal: ${emotionalChar.value}`);
  }

  const audienceChar = characteristics.audience_assumption;
  if (audienceChar) {
    guidance.push(`- Target audience level: ${audienceChar.value}`);
  }

  const honestyChar = characteristics.intellectual_honesty_level;
  if (honestyChar) guidance.push(`- Intellectual honesty: ${honestyChar.value}`);

  const vulnerabilityChar = characteristics.vulnerability_frequency;
  if (vulnerabilityChar) guidance.push(`- Vulnerability/admissions: ${vulnerabilityChar.value}`);

  const humorChar = characteristics.humor_level;
  if (humorChar) guidance.push(`- Humor: ${humorChar.value}`);

  const rhetoricalChar = characteristics.rhetorical_question_usage;
  if (rhetoricalChar) guidance.push(`- Rhetorical questions: ${rhetoricalChar.value}`);

  const conversationalChar = characteristics.conversational_markers;
  if (conversationalChar) guidance.push(`- Conversational markers: ${conversationalChar.value}`);

  const peerChar = characteristics.reader_as_peer_level;
  if (peerChar) guidance.push(`- Reader treatment: ${peerChar.value}`);

  const exampleDepthChar = characteristics.example_development_depth;
  if (exampleDepthChar) guidance.push(`- Example development: ${exampleDepthChar.value}`);

  const phrasesChar = characteristics.distinctive_phrasing;
  if (phrasesChar) guidance.push(`- Signature phrases: ${Array.isArray(phrasesChar.value) ? phrasesChar.value.join('; ') : phrasesChar.value}`);

  if (guidance.length === 1) {
    return ''; // Only header, no actual characteristics
  }

  return '\n' + guidance.join('\n') + '\n';
}

/**
 * Extract storytelling guidance for section-level content writing
 */
function getStorytellingWritingGuidance(
  storytelling?: StorytellingGuidance,
  isFirstSection?: boolean,
  sectionIndex?: number,
  totalSections?: number
): string {
  if (!storytelling) return '';

  const guidance: string[] = ['## Storytelling Guidance (weave narrative throughout this section)'];

  // Framework context
  guidance.push(`- Narrative Framework: ${storytelling.narrative_framework.name}`);

  // Protagonist framing
  guidance.push(`- Protagonist: ${storytelling.protagonist.type} — ${storytelling.protagonist.guidance}`);

  // Section-specific emotional target from emotional journey
  if (storytelling.emotional_journey?.length > 0 && sectionIndex !== undefined && totalSections) {
    const journeyIndex = Math.floor((sectionIndex / totalSections) * storytelling.emotional_journey.length);
    const currentStage = storytelling.emotional_journey[Math.min(journeyIndex, storytelling.emotional_journey.length - 1)];
    guidance.push(`- Emotional Target for This Section: ${currentStage.emotion} (intensity: ${currentStage.intensity}/10)`);
    guidance.push(`  Technique: ${currentStage.technique}`);
  }

  // Hook strategy (first section only)
  if (isFirstSection) {
    guidance.push(`- Hook Strategy: ${storytelling.hook_strategy.type} — ${storytelling.hook_strategy.guidance}`);
    guidance.push(`- Story Arc Beginning: ${storytelling.story_arc.beginning}`);
  }

  // Section role from section mapping (if available)
  if (storytelling.story_arc.section_mapping?.length > 0 && sectionIndex !== undefined && totalSections) {
    const mappingIndex = Math.floor((sectionIndex / totalSections) * storytelling.story_arc.section_mapping.length);
    const role = storytelling.story_arc.section_mapping[Math.min(mappingIndex, storytelling.story_arc.section_mapping.length - 1)];
    guidance.push(`- This Section's Narrative Role: [${role.section_role}] ${role.guidance}`);
  }

  // Tension points relevant to this section position
  if (storytelling.tension_points?.length > 0 && sectionIndex !== undefined && totalSections) {
    const positionRatio = sectionIndex / totalSections;
    const relevantTensions = storytelling.tension_points.filter(tp => {
      if (positionRatio < 0.3) return tp.location === 'opening' || tp.location === 'after_setup';
      if (positionRatio > 0.7) return tp.location === 'before_resolution';
      return tp.location === 'mid_argument' || tp.location === 'mid_content';
    });
    if (relevantTensions.length > 0) {
      guidance.push(`- Tension Point for This Section:`);
      for (const tp of relevantTensions) {
        guidance.push(`  - ${tp.type}: ${tp.description}`);
      }
    }
  }

  // Resolution (last section only)
  if (sectionIndex !== undefined && totalSections && sectionIndex === totalSections - 1) {
    guidance.push(`- Resolution Strategy: ${storytelling.resolution_strategy.type} — ${storytelling.resolution_strategy.guidance}`);
    guidance.push(`- Story Arc End: ${storytelling.story_arc.end}`);
  }

  if (guidance.length === 1) {
    return '';
  }

  return '\n' + guidance.join('\n') + '\n';
}

/**
 * Build content generation prompt
 */
function buildContentPrompt(
  sectionHeading: string,
  sectionPlaceholder: string,
  tone: ToneOption,
  artifactType: 'blog' | 'social_post' | 'showcase',
  researchContext: string,
  isFirstSection: boolean = false,
  characteristics?: WritingCharacteristics,
  authorBrief?: string,
  storytelling?: StorytellingGuidance,
  sectionIndex?: number,
  totalSections?: number
): string {
  const toneModifier = toneModifiers[tone];
  const characteristicsGuidance = getWritingCharacteristicsGuidance(characteristics);
  const storytellingWritingGuidance = getStorytellingWritingGuidance(storytelling, isFirstSection, sectionIndex, totalSections);

  const authorIntentSection = authorBrief
    ? `
## Author's Intent (your north star for this section)
The author has a specific narrative and angle in mind. Stay anchored to this intent - use research to support it, not replace it. If the author mentions specific examples, analogies, or arguments, weave them in naturally.

${authorBrief}

`
    : '';

  // Determine image placeholder type based on section position
  const imageType = isFirstSection ? 'Featured/Hero' : 'Section';
  const imageExample = isFirstSection
    ? '[IMAGE: Featured image - A lone climber standing at the edge of a vast canyon at golden hour, looking across to the other side where a futuristic city glows, representing the gap between current state and ambitious vision]'
    : '[IMAGE: Close-up of hands molding wet clay on a potter\'s wheel, with the emerging shape suggesting a unique form taking shape, representing the craft of building something distinctive]';

  return `You are a professional content writer creating ${artifactType} content.

## Your Task
Write compelling content for this section of a ${artifactType}.

## Section to Write
Heading: ${sectionHeading}
Placeholder/Notes: ${sectionPlaceholder}
${authorIntentSection}
## Research Context (incorporate naturally)
${researchContext || 'No specific research available. Write based on general knowledge.'}

## Tone Requirements
${toneModifier}
${characteristicsGuidance}
${storytellingWritingGuidance}
## Writing Guidelines

### Example Development (for every example used)
1. Claim: State the point
2. Named example: "When [specific company/person] did X..."
3. Mechanism: Explain WHY it worked/failed, not just THAT it did
4. Implication: "This means..." or "The lesson here is..."

### Paragraph Rhythm
- Mix short paragraphs (1-2 sentences for emphasis) with longer ones (3-5 sentences)
- After a bold claim, follow with a concrete example in the NEXT sentence
- Sentence fragments for emphasis. Like this. Sparingly.

### Voice and Honesty
- Credit sources by name: "As [Author] found in..." NOT "Research shows..."
- Include at least one honest caveat per section: "To be fair...", "This isn't always..."
- Treat the reader as a peer who is smart but hasn't considered this angle yet
- Occasional conversational markers: "Here's the thing.", "And yet.", "Look."

### What NOT to do
- No throat-clearing: "In today's rapidly evolving landscape..."
- No empty transitions: "Let's dive in", "Moving on to..."
- No summary sentences at the end of each section
- No generic conclusions: "The future looks bright"

${artifactType === 'blog' ? '- Aim for 250-450 words per section' : ''}
${artifactType === 'social_post' ? '- Keep it concise and punchy (150-280 characters)' : ''}
${artifactType === 'showcase' ? `### Showcase-Specific Writing Rules (CRITICAL)

**Content Architecture**:
- This is a NARRATIVE CASE STUDY, not a product showcase. Write as the author telling their own professional story.
- Content ratio: ~30% situation/context/outcome, ~70% implementable framework/toolbox.
- Each framework element must follow the template: What it answers → How to run it (step-by-step) → How it played out (personal case) → Common pitfall → Signal criteria.
- The reader should be able to IMPLEMENT this framework after reading. Be prescriptive, not descriptive.

**Anonymization (MANDATORY)**:
- NEVER use real company names, people names, product names, or identifying details.
- Use role-based references: "the head of sales", "our VP of Engineering", "the CEO".
- Use descriptive company references: "a B2B SaaS company", "a mid-market data analytics platform".
- Use descriptive segment references: "an adjacent enterprise segment", "our core vertical".

**No Specific Numbers (MANDATORY)**:
- Replace ALL specific numbers with relative language.
- "Several times our average deal size" NOT "$500K deals".
- "A few dozen customers" NOT "40 customers".
- "The company grew several times over" NOT "grew 4x".
- "Significantly longer sales cycles" NOT "18-month sales cycles".
- "Many months of dedicated work" NOT "9 months of engineering".
- Acceptable: relative terms like "substantially", "several", "a few", "significantly", percentages as ranges like ">40%", and framework-internal thresholds (these are prescriptive, not autobiographical).

**Stakeholder & Human Dimension**:
- Weave the human/political story throughout — NOT confined to one section.
- Show each stakeholder's perspective as legitimate: their fears, motivations, and what success looks like from their seat.
- Include emotional texture: "the head of sales paused", "the CEO sat with this data for a few days", "the room understood".
- Show how the process (not just the data) changed minds: "numbers he'd calculated himself", "because she owned the analysis".
- Include at least 3 genuine concession moments: "I was wrong about...", "we underestimated...", "the fear was valid".

**Voice & Tone**:
- Write in first person ("I") for narrative sections, shift to second person ("you") for instructional framework sections.
- Vary sentence length deliberately: mix short punchy sentences (5-8 words) with medium (15-20) and occasional long (25-30).
- Use sentence fragments sparingly for emphasis. Like this.
- Conversational register: contractions ("don't", "isn't"), occasional direct address ("Here's what nobody tells you"), epistemic hedging where honest ("in most cases", "often").
- Em dashes for asides — like this — to create a conversational rhythm.
- Emotional texture should VARY across the piece: analytical in framework sections, reflective in outcome, urgent in problem statement.

**Evidence & Attribution**:
- Use ONLY personal experience and direct observations. NO external quotes, research citations, or "studies show".
- Attribution variety: "I realized", "the head of sales later told me", "when we ran the numbers", "the finding was sobering".
- Replace any temptation to cite external sources with personal case evidence or direct stakeholder quotes (anonymized).

**Narrative Architecture**:
- Build an argument that EVOLVES — each section adds new understanding, not just new information.
- Use discovery order (how insights unfolded in practice) not taxonomic listing.
- Include controlled digressions that enrich then snap back: brief tangents about what you learned, then return to the main thread.
- Leave some tensions deliberately unresolved: "This is the part most frameworks skip, and it's the part that matters most."
- Distinguish from "just another framework" — acknowledge prior art implicitly and show what's different.

**Opening Requirements**:
- Start with a vivid, specific moment the reader can visualize — NOT a generic statement.
- Establish stakes and tension within first 100 words.
- Explicit reader promise: state what they'll walk away with (the complete framework, the process, and the lessons).
- Create curiosity through stakeholder tension, not clickbait.

**Closing Requirements**:
- Circular closure: resolve the opening tension explicitly.
- Include "when to use this" trigger scenarios — specific situations that call for this framework.
- End with an original memorable line — NOT an external quote or generic statement.
- Handle the aftermath: what happened to the stakeholders, the prospects, the company.
- The final insight should reframe the entire piece: "The best decision is one everyone helped build."

**Section Length Guidance**:
- Opening/Situation: 250-400 words (vivid but focused)
- Stakeholder Process: 400-600 words (detailed steps)
- Each Framework Element: 350-500 words (What/How/Case/Pitfall/Criteria)
- Running the Framework: 300-400 words (decision matrix and meeting format)
- Outcome: 200-300 words (brief, circular closure)
- When to Use: 100-200 words (trigger list)
- Total target: 2,500-3,500 words` : ''}

## Image Placeholders (CRITICAL)
Add ONE ${imageType} image placeholder at the end of this section using the format:
[IMAGE: ${isFirstSection ? 'Featured image - ' : ''}Detailed description of what the image should show]

STRICT RULES for image descriptions:
- NEVER request graphs, charts, infographics, data visualizations, presentation slides, dashboards, UI mockups, or screenshots
- AI image generators CANNOT render readable text - any text will be blurry, misspelled, or nonsensical
- Instead: describe VISUAL METAPHORS, scenes, or concepts that communicate the section's message through imagery alone
- Be specific to THIS section's core message (not generic stock imagery)
- Describe what the viewer SEES (objects, people, settings, lighting, mood) not abstract data
- 1-2 sentences describing the scene vividly
${isFirstSection ? '- For the featured/hero image: Create a visually striking scene that captures the article\'s central tension or theme' : ''}

GOOD examples (visual metaphors):
- "Two contrasting doors side by side - one weathered and rusty, the other sleek and modern - representing choosing between old and new approaches"
- "A chess piece (knight) casting a shadow shaped like a crown, on a marble surface with dramatic side lighting"

BAD examples (NEVER USE - will produce broken images):
- "Graph showing growth over time" (requires axis labels = broken text)
- "Comparison chart of features" (requires text columns = illegible)
- "Dashboard with metrics" (requires readable numbers = nonsense)
- "Slide showing key points" (requires bullet text = garbled)

Example: ${imageExample}

## Output Format (CRITICAL)
You MUST use proper HTML formatting:
- Paragraphs: Wrap text in <p> tags
- Ordered lists: <ol><li>Item text</li></ol>
- Unordered lists: <ul><li>Item text</li></ul>
- Bold: <strong>text</strong>
- Italic: <em>text</em>

Write ONLY the content for this section (plus the image placeholder at the end). Do not include section headings or meta-commentary.`;
}

// =============================================================================
// Tools
// =============================================================================

/**
 * Write Content Section Tool
 *
 * Uses Gemini 2.0 Flash to generate content for a single skeleton section.
 */
export const writeContentSection = tool({
  description: `Write content for a single skeleton section using Gemini AI. Applies user-selected tone and incorporates research findings. Returns generated content for the section.`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact'),
    sectionHeading: z.string().describe('H2 heading of the section'),
    sectionPlaceholder: z.string().describe('Placeholder text or notes for this section'),
    tone: z.enum([
      'formal',
      'casual',
      'professional',
      'conversational',
      'technical',
      'friendly',
      'authoritative',
      'humorous'
    ]).describe('Desired tone/voice for content'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact'),
  }),

  execute: async ({ artifactId, sectionHeading, sectionPlaceholder, tone, artifactType }) => {
    const traceId = generateMockTraceId('writing-section');
    const startTime = Date.now();

    // =========================================================================
    // TRACE: Entry Point
    // =========================================================================
    logPhase2('SECTION_START', '='.repeat(60));
    logPhase2('SECTION_START', 'WriteContentSection tool invoked', {
      traceId,
      artifactId,
      sectionHeading,
      tone,
      artifactType,
      placeholderLength: sectionPlaceholder.length,
    });

    logger.info('[WriteContentSection] Starting content generation', {
      traceId,
      artifactId,
      sectionHeading,
      artifactType,
      tone,
    });

    try {
      // =======================================================================
      // MOCK CHECK: Return mock response if mocking is enabled
      // =======================================================================
      if (mockService.shouldMock('contentWritingTools')) {
        logger.info('[WriteContentSection] Using mock response', {
          traceId,
          artifactId,
          sectionHeading,
          tone,
        });

        const mockResponse = await mockService.getMockResponse<ContentSectionResponse>(
          'writeContentSection',
          tone,
          { artifactId, sectionHeading, sectionPlaceholder, tone, artifactType, traceId }
        );

        return mockResponse;
      }

      // =======================================================================
      // TRACE: Step 1 - Fetch Research Context
      // =======================================================================
      logPhase2('RESEARCH_FETCH', 'Fetching research context from database', {
        traceId,
        artifactId,
      });

      const researchStartTime = Date.now();
      const { data: researchResults, error: researchError } = await getSupabase()
        .from('artifact_research')
        .select('*')
        .eq('artifact_id', artifactId)
        .order('relevance_score', { ascending: false })
        .limit(5);

      const researchDuration = Date.now() - researchStartTime;

      if (researchError) {
        logPhase2('RESEARCH_FETCH', 'WARNING: Failed to fetch research', {
          traceId,
          artifactId,
          error: researchError.message,
          duration: researchDuration,
        });
        logger.warn('[WriteContentSection] Failed to fetch research', {
          traceId,
          artifactId,
          error: researchError.message,
        });
      } else {
        logPhase2('RESEARCH_FETCH', 'Research fetched successfully', {
          traceId,
          artifactId,
          sourceCount: researchResults?.length || 0,
          duration: researchDuration,
        });
      }

      // =======================================================================
      // TRACE: Step 2 - Build Research Context Summary
      // =======================================================================
      const researchContext = researchResults && researchResults.length > 0
        ? researchResults
            .map((r, i) => `[${i + 1}] ${r.source_name}: ${r.excerpt}`)
            .join('\n\n')
        : '';

      logPhase2('RESEARCH_CONTEXT', 'Research context prepared', {
        traceId,
        sourceCount: researchResults?.length || 0,
        hasContext: !!researchContext,
        contextLength: researchContext.length,
      });

      logger.debug('[WriteContentSection] Research context prepared', {
        traceId,
        sourceCount: researchResults?.length || 0,
        hasContext: !!researchContext,
      });

      // =======================================================================
      // TRACE: Step 2.5 - Fetch Author's Brief from Metadata
      // =======================================================================
      let authorBriefForSection: string | undefined;
      {
        const { data: artifactMeta } = await getSupabase()
          .from('artifacts')
          .select('metadata')
          .eq('id', artifactId)
          .single();

        const metadata = artifactMeta?.metadata as Record<string, unknown> | null;
        if (metadata?.author_brief && typeof metadata.author_brief === 'string') {
          authorBriefForSection = metadata.author_brief;
          logPhase2('AUTHOR_BRIEF_FETCH', 'Author brief loaded for section writing', {
            traceId,
            briefLength: authorBriefForSection.length,
          });
        }
      }

      // =======================================================================
      // TRACE: Step 2.6 - Fetch Storytelling Guidance
      // =======================================================================
      let storytellingForSection: StorytellingGuidance | undefined;
      {
        const { data: stData } = await getSupabase()
          .from('artifact_storytelling')
          .select('storytelling_guidance')
          .eq('artifact_id', artifactId)
          .single();

        if (stData?.storytelling_guidance) {
          storytellingForSection = stData.storytelling_guidance as StorytellingGuidance;
          logPhase2('STORYTELLING_FETCH', 'Storytelling guidance loaded for section', {
            traceId,
            framework: storytellingForSection.narrative_framework?.name,
          });
        }
      }

      // =======================================================================
      // TRACE: Step 3 - Build Content Generation Prompt
      // =======================================================================
      const prompt = buildContentPrompt(
        sectionHeading,
        sectionPlaceholder,
        tone,
        artifactType,
        researchContext,
        false,  // isFirstSection - standalone tool doesn't know section position
        undefined,  // characteristics - not fetched in standalone mode
        authorBriefForSection,
        storytellingForSection
      );

      logPhase2('PROMPT_BUILD', 'Content generation prompt built', {
        traceId,
        promptLength: prompt.length,
        tone,
        temperature: toneTemperatures[tone],
        maxTokens: tokenLimits[artifactType],
      });

      // =======================================================================
      // TRACE: Step 4 - Call Gemini API
      // =======================================================================
      logPhase2('GEMINI_API_CALL', 'Calling Gemini 2.0 Flash API', {
        traceId,
        model: 'gemini-2.0-flash',
        temperature: toneTemperatures[tone],
        maxTokens: tokenLimits[artifactType],
      });

      const geminiStartTime = Date.now();

      const { text: generatedContent } = await generateText({
        model: google('gemini-2.0-flash'),
        prompt,
        temperature: toneTemperatures[tone],
        maxOutputTokens: tokenLimits[artifactType],
      });

      const geminiDuration = Date.now() - geminiStartTime;

      logPhase2('GEMINI_API_RESPONSE', 'Gemini API responded successfully', {
        traceId,
        generatedContentLength: generatedContent.length,
        duration: geminiDuration,
        tokensPerSecond: Math.round((generatedContent.length / 4) / (geminiDuration / 1000)),
      });

      logger.info('[WriteContentSection] Content generated successfully', {
        traceId,
        artifactId,
        sectionHeading,
        contentLength: generatedContent.length,
        duration: geminiDuration,
      });

      // =======================================================================
      // TRACE: Exit Point - Success
      // =======================================================================
      const totalDuration = Date.now() - startTime;
      const wordCount = Math.round(generatedContent.split(/\s+/).length);

      logPhase2('SECTION_COMPLETE', 'Section content generation completed', {
        traceId,
        artifactId,
        sectionHeading,
        success: true,
        contentLength: generatedContent.length,
        wordCount,
        researchSourcesUsed: researchResults?.length || 0,
        totalDuration,
        breakdown: {
          researchFetch: researchDuration,
          geminiGeneration: geminiDuration,
        },
      });
      logPhase2('SECTION_COMPLETE', '='.repeat(60));

      const response: ToolOutput<{
        content: string;
        sectionHeading: string;
        researchSourcesUsed: number;
        wordCount: number;
        tone: string;
      }> = {
        success: true,
        traceId,
        duration: totalDuration,
        data: {
          content: generatedContent,
          sectionHeading,
          researchSourcesUsed: researchResults?.length || 0,
          wordCount,
          tone,
        },
      };

      // Capture response for mock data generation (if enabled)
      await mockService.captureRealResponse(
        'writeContentSection',
        tone,
        { artifactId, sectionHeading, sectionPlaceholder, tone, artifactType },
        response
      );

      return response;

    } catch (error) {
      // =======================================================================
      // TRACE: Exit Point - Error
      // =======================================================================
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logPhase2('SECTION_ERROR', 'Section content generation FAILED', {
        traceId,
        artifactId,
        sectionHeading,
        error: errorMessage,
        totalDuration,
      });

      logger.error('[WriteContentSection] Content generation failed', {
        error: error instanceof Error ? error : new Error(errorMessage),
        traceId,
        artifactId,
        sectionHeading,
      });

      return {
        success: false,
        traceId,
        duration: totalDuration,
        data: {
          content: '',
          sectionHeading,
          researchSourcesUsed: 0,
          wordCount: 0,
          tone,
        },
        error: {
          category: 'TOOL_EXECUTION_FAILED' as const,
          message: errorMessage,
          recoverable: true,
        },
      };
    }
  },
});

/**
 * Write Full Content Tool
 *
 * Orchestrates writing content for all sections in a skeleton.
 * Parses skeleton to find H2 sections, writes each, and assembles final content.
 */
export const writeFullContent = tool({
  description: `Write content for all sections in an artifact skeleton. Parses skeleton for H2 headings, writes each section, and updates the artifact. Returns full generated content. Uses writing characteristics from Phase 4 analysis if available.`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe('ID of the artifact with skeleton'),
    tone: z.enum([
      'formal',
      'casual',
      'professional',
      'conversational',
      'technical',
      'friendly',
      'authoritative',
      'humorous'
    ]).describe('Desired tone/voice for content'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Type of artifact'),
    useWritingCharacteristics: z.boolean().optional().default(true).describe('Whether to fetch and use writing characteristics from Phase 4 analysis'),
  }),

  execute: async ({ artifactId, tone, artifactType, useWritingCharacteristics = true }) => {
    const traceId = generateMockTraceId('writing-full');
    const startTime = Date.now();

    // =========================================================================
    // TRACE: Entry Point
    // =========================================================================
    logPhase2('FULL_CONTENT_START', '='.repeat(80));
    logPhase2('FULL_CONTENT_START', 'WriteFullContent tool invoked', {
      traceId,
      artifactId,
      tone,
      artifactType,
    });

    logger.info('[WriteFullContent] Starting full content writing', {
      traceId,
      artifactId,
      artifactType,
      tone,
    });

    try {
      // =======================================================================
      // MOCK CHECK: Return mock response if mocking is enabled
      // =======================================================================
      const shouldMockResult = mockService.shouldMock('contentWritingTools');
      if (shouldMockResult) {
        logger.info('[WriteFullContent] Using mock response', {
          traceId,
          artifactId,
          artifactType,
          tone,
        });

        const mockResponse = await mockService.getMockResponse<FullContentResponse>(
          'writeFullContent',
          artifactType,
          { artifactId, tone, artifactType, traceId }
        );

        // Update database to maintain workflow
        if (mockResponse.success) {
          await getSupabase()
            .from('artifacts')
            .update({
              status: mockResponse.status || 'writing', // Keep 'writing' for Phase 3
              updated_at: new Date().toISOString()
            })
            .eq('id', artifactId);
        }

        return mockResponse;
      }

      // =======================================================================
      // TRACE: Step 1 - Update Status to 'writing'
      // =======================================================================
      logPhase2('STATUS_UPDATE', 'Updating artifact status to "writing"', {
        traceId,
        artifactId,
        fromStatus: 'skeleton',
        toStatus: 'writing',
      });

      const { error: statusError } = await getSupabase()
        .from('artifacts')
        .update({
          status: 'writing',
          updated_at: new Date().toISOString()
        })
        .eq('id', artifactId);

      if (statusError) {
        const duration = Date.now() - startTime;
        logPhase2('STATUS_UPDATE', 'FAILED to update status to "writing"', {
          traceId,
          artifactId,
          error: statusError.message,
        });
        logger.error('[WriteFullContent] Failed to update status', {
          error: statusError,
          traceId,
          artifactId,
          stage: 'update_status_writing',
        });
        return {
          success: false,
          traceId,
          duration,
          data: {
            totalLength: 0,
            sectionsWritten: 0,
            sectionResults: [],
          },
          error: {
            category: 'INVALID_STATUS' as const,
            message: `Failed to update status: ${statusError.message}`,
            recoverable: false,
          },
        };
      }

      logPhase2('STATUS_UPDATE', 'Status updated to "writing" successfully', {
        traceId,
        artifactId,
      });

      // =======================================================================
      // TRACE: Step 2 - Fetch Artifact Skeleton
      // =======================================================================
      logPhase2('SKELETON_FETCH', 'Fetching artifact skeleton from database', {
        traceId,
        artifactId,
      });

      const { data: artifact, error: fetchError } = await getSupabase()
        .from('artifacts')
        .select('content, title')
        .eq('id', artifactId)
        .single();

      if (fetchError || !artifact) {
        const duration = Date.now() - startTime;
        logPhase2('SKELETON_FETCH', 'FAILED to fetch artifact skeleton', {
          traceId,
          artifactId,
          error: fetchError?.message || 'Artifact not found',
        });
        return {
          success: false,
          traceId,
          duration,
          data: {
            totalLength: 0,
            sectionsWritten: 0,
            sectionResults: [],
          },
          error: {
            category: 'ARTIFACT_NOT_FOUND' as const,
            message: `Failed to fetch artifact: ${fetchError?.message || 'Not found'}`,
            recoverable: false,
          },
        };
      }

      const skeletonContent = artifact.content || '';

      logPhase2('SKELETON_FETCH', 'Artifact skeleton fetched successfully', {
        traceId,
        artifactId,
        hasTitle: !!artifact.title,
        skeletonLength: skeletonContent.length,
      });

      // =======================================================================
      // TRACE: Step 3 - Parse Skeleton for H2 Sections
      // =======================================================================
      logPhase2('SKELETON_PARSE', 'Parsing skeleton for H2 sections', {
        traceId,
        artifactId,
        skeletonLength: skeletonContent.length,
      });

      const sectionRegex = /^##\s+(.+)$/gm;
      const sections: { heading: string; placeholder: string; startIndex: number }[] = [];
      let match;

      while ((match = sectionRegex.exec(skeletonContent)) !== null) {
        sections.push({
          heading: match[1].trim(),
          placeholder: '',
          startIndex: match.index,
        });
      }

      // Extract placeholder content for each section
      for (let i = 0; i < sections.length; i++) {
        const startIndex = sections[i].startIndex;
        const endIndex = i < sections.length - 1
          ? sections[i + 1].startIndex
          : skeletonContent.length;

        const sectionContent = skeletonContent.slice(startIndex, endIndex);
        const placeholderMatch = sectionContent.match(/^##\s+.+\n([\s\S]*)/);
        sections[i].placeholder = placeholderMatch ? placeholderMatch[1].trim() : '';
      }

      logPhase2('SKELETON_PARSE', 'Skeleton parsed successfully', {
        traceId,
        sectionCount: sections.length,
        sectionHeadings: sections.map(s => s.heading),
        placeholderLengths: sections.map(s => s.placeholder.length),
      });

      logger.debug('[WriteFullContent] Parsed skeleton sections', {
        traceId,
        sectionCount: sections.length,
        headings: sections.map(s => s.heading),
      });

      // Handle case with no H2 sections
      if (sections.length === 0) {
        logPhase2('SKELETON_PARSE', 'WARNING: No H2 sections found, treating entire content as single section', {
          traceId,
          artifactId,
          fallbackHeading: artifact.title || 'Content',
        });
        logger.warn('[WriteFullContent] No H2 sections found in skeleton', {
          traceId,
          artifactId,
        });
        sections.push({
          heading: artifact.title || 'Content',
          placeholder: skeletonContent,
          startIndex: 0,
        });
      }

      // =======================================================================
      // TRACE: Step 4 - Fetch Research Context
      // =======================================================================
      logPhase2('RESEARCH_FETCH', 'Fetching research context for all sections', {
        traceId,
        artifactId,
      });

      const researchStartTime = Date.now();
      const { data: researchResults } = await getSupabase()
        .from('artifact_research')
        .select('*')
        .eq('artifact_id', artifactId)
        .order('relevance_score', { ascending: false })
        .limit(10);

      const researchDuration = Date.now() - researchStartTime;

      const researchContext = researchResults && researchResults.length > 0
        ? researchResults
            .map((r, i) => `[${i + 1}] ${r.source_name}: ${r.excerpt}`)
            .join('\n\n')
        : '';

      logPhase2('RESEARCH_FETCH', 'Research context prepared for all sections', {
        traceId,
        sourceCount: researchResults?.length || 0,
        contextLength: researchContext.length,
        duration: researchDuration,
      });

      // =======================================================================
      // TRACE: Step 4.5 - Fetch Writing Characteristics (Phase 4)
      // =======================================================================
      let writingCharacteristics: WritingCharacteristics | undefined;
      if (useWritingCharacteristics) {
        logPhase2('CHARACTERISTICS_FETCH', 'Fetching writing characteristics (Phase 4)', {
          traceId,
          artifactId,
        });

        const { data: charData } = await getSupabase()
          .from('artifact_writing_characteristics')
          .select('characteristics')
          .eq('artifact_id', artifactId)
          .single();

        if (charData?.characteristics) {
          writingCharacteristics = charData.characteristics as WritingCharacteristics;
          logPhase2('CHARACTERISTICS_FETCH', 'Writing characteristics loaded', {
            traceId,
            characteristicsCount: Object.keys(writingCharacteristics).length,
          });
          logger.debug('[WriteFullContent] Writing characteristics loaded', {
            traceId,
            characteristicsCount: Object.keys(writingCharacteristics).length,
          });
        } else {
          logPhase2('CHARACTERISTICS_FETCH', 'No writing characteristics found, using defaults', {
            traceId,
            artifactId,
          });
        }
      }

      // =======================================================================
      // TRACE: Step 4.6 - Fetch Author's Brief from Metadata
      // =======================================================================
      let authorBrief: string | undefined;
      {
        const { data: artifactMeta } = await getSupabase()
          .from('artifacts')
          .select('metadata')
          .eq('id', artifactId)
          .single();

        const metadata = artifactMeta?.metadata as Record<string, unknown> | null;
        if (metadata?.author_brief && typeof metadata.author_brief === 'string') {
          authorBrief = metadata.author_brief;
          logPhase2('AUTHOR_BRIEF_FETCH', 'Author brief loaded from metadata', {
            traceId,
            briefLength: authorBrief.length,
          });
          logger.debug('[WriteFullContent] Author brief loaded', {
            traceId,
            briefLength: authorBrief.length,
          });
        }
      }

      // =======================================================================
      // TRACE: Step 4.7 - Fetch Storytelling Guidance
      // =======================================================================
      let storytellingData: StorytellingGuidance | undefined;
      {
        const { data: stData } = await getSupabase()
          .from('artifact_storytelling')
          .select('storytelling_guidance')
          .eq('artifact_id', artifactId)
          .single();

        if (stData?.storytelling_guidance) {
          storytellingData = stData.storytelling_guidance as StorytellingGuidance;
          logPhase2('STORYTELLING_FETCH', 'Storytelling guidance loaded', {
            traceId,
            framework: storytellingData.narrative_framework?.name,
          });
          logger.debug('[WriteFullContent] Storytelling guidance loaded', {
            traceId,
            framework: storytellingData.narrative_framework?.name,
          });
        }
      }

      // =======================================================================
      // TRACE: Step 5 - Write Content for Each Section
      // =======================================================================
      logPhase2('SECTIONS_WRITE_START', `Starting to write ${sections.length} sections`, {
        traceId,
        artifactId,
        sectionCount: sections.length,
        tone,
        temperature: toneTemperatures[tone],
      });

      const writtenSections: { heading: string; content: string }[] = [];
      const errors: string[] = [];
      const sectionTimings: { heading: string; duration: number }[] = [];
      const sectionResults: { section: string; wordCount: number; success: boolean }[] = [];

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionStartTime = Date.now();

        logPhase2('SECTION_WRITE', `Writing section ${i + 1}/${sections.length}`, {
          traceId,
          artifactId,
          sectionIndex: i,
          sectionHeading: section.heading,
          placeholderLength: section.placeholder.length,
        });

        try {
          const prompt = buildContentPrompt(
            section.heading,
            section.placeholder,
            tone,
            artifactType,
            researchContext,
            i === 0,  // isFirstSection - first section gets featured/hero image
            writingCharacteristics,  // Phase 4: Pass writing characteristics
            authorBrief,  // Author's original intent as north star
            storytellingData,  // Storytelling guidance for narrative structure
            i,  // sectionIndex
            sections.length  // totalSections
          );

          logPhase2('GEMINI_API_CALL', `Calling Gemini for section "${section.heading}"`, {
            traceId,
            sectionIndex: i,
            promptLength: prompt.length,
          });

          const { text: generatedContent } = await generateText({
            model: google('gemini-2.0-flash'),
            prompt,
            temperature: toneTemperatures[tone],
            maxOutputTokens: tokenLimits[artifactType],
          });

          // =================================================================
          // Per-section humanization: remove AI patterns immediately
          // =================================================================
          let finalContent = generatedContent;
          try {
            logPhase2('SECTION_HUMANIZE', `Humanizing section ${i + 1}/${sections.length}`, {
              traceId,
              sectionHeading: section.heading,
              originalLength: generatedContent.length,
            });

            const humanizePrompt = buildHumanityCheckPrompt(generatedContent, tone, authorBrief);
            const { text: humanizedContent } = await generateText({
              model: anthropic('claude-sonnet-4-20250514'),
              prompt: humanizePrompt,
              temperature: 0.5,
              maxOutputTokens: Math.ceil(generatedContent.length * 1.5),
            });

            finalContent = humanizedContent;

            logPhase2('SECTION_HUMANIZE', `Section ${i + 1} humanized`, {
              traceId,
              sectionHeading: section.heading,
              originalLength: generatedContent.length,
              humanizedLength: humanizedContent.length,
              lengthChange: humanizedContent.length - generatedContent.length,
            });
          } catch (humanizeError) {
            // Non-fatal: keep original content if humanization fails
            logger.warn('[WriteFullContent] Section humanization failed, using original', {
              traceId,
              sectionHeading: section.heading,
              error: humanizeError instanceof Error ? humanizeError.message : String(humanizeError),
            });
          }

          const sectionDuration = Date.now() - sectionStartTime;
          const wordCount = Math.round(finalContent.split(/\s+/).length);

          writtenSections.push({
            heading: section.heading,
            content: finalContent,
          });

          sectionTimings.push({
            heading: section.heading,
            duration: sectionDuration,
          });

          sectionResults.push({
            section: section.heading,
            wordCount,
            success: true,
          });

          logPhase2('SECTION_WRITE', `Section ${i + 1}/${sections.length} completed`, {
            traceId,
            sectionIndex: i,
            sectionHeading: section.heading,
            contentLength: generatedContent.length,
            duration: sectionDuration,
          });

          logger.debug('[WriteFullContent] Section written', {
            traceId,
            heading: section.heading,
            contentLength: generatedContent.length,
          });

        } catch (sectionError) {
          const sectionDuration = Date.now() - sectionStartTime;
          const errorMsg = sectionError instanceof Error
            ? sectionError.message
            : 'Unknown error';

          errors.push(`Section "${section.heading}": ${errorMsg}`);

          sectionResults.push({
            section: section.heading,
            wordCount: 0,
            success: false,
          });

          logPhase2('SECTION_WRITE', `FAILED to write section ${i + 1}/${sections.length}`, {
            traceId,
            sectionIndex: i,
            sectionHeading: section.heading,
            error: errorMsg,
            duration: sectionDuration,
          });

          logger.error('[WriteFullContent] Section write failed', {
            error: sectionError instanceof Error ? sectionError : new Error(errorMsg),
            traceId,
            artifactId,
            sectionHeading: section.heading,
          });
        }
      }

      logPhase2('SECTIONS_WRITE_COMPLETE', 'All sections processed', {
        traceId,
        successCount: writtenSections.length,
        errorCount: errors.length,
        sectionTimings,
        totalSectionWriteTime: sectionTimings.reduce((acc, t) => acc + t.duration, 0),
      });

      // =======================================================================
      // TRACE: Step 6 - Assemble Final Content
      // =======================================================================
      logPhase2('CONTENT_ASSEMBLE', 'Assembling final content from sections', {
        traceId,
        sectionCount: writtenSections.length,
      });

      const fullContent = writtenSections
        .map(s => `## ${s.heading}\n\n${s.content}`)
        .join('\n\n---\n\n');

      logPhase2('CONTENT_ASSEMBLE', 'Final content assembled', {
        traceId,
        totalLength: fullContent.length,
        sectionCount: writtenSections.length,
      });

      // =======================================================================
      // CRITICAL: Abort if no content was generated (preserves skeleton in DB)
      // =======================================================================
      if (writtenSections.length === 0) {
        const totalDuration = Date.now() - startTime;
        const errorMsg = errors.length > 0
          ? errors[0]
          : 'All sections failed to generate content';

        logPhase2('FULL_CONTENT_ERROR', 'No content generated - aborting to preserve skeleton', {
          traceId,
          artifactId,
          sectionErrors: errors.length,
          totalDuration,
        });

        logger.error('[WriteFullContent] No content generated, aborting pipeline', {
          traceId,
          artifactId,
          errors: errors.length,
        });

        return {
          success: false,
          traceId,
          duration: totalDuration,
          data: {
            totalLength: 0,
            sectionsWritten: 0,
            sectionResults,
            ...(errors.length > 0 && { errors }),
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Content generation failed: ${errorMsg}`,
            recoverable: true,
          },
        };
      }

      // =======================================================================
      // TRACE: Step 7 - Update Artifact Content (Keep Status as 'writing' for Phase 3)
      // =======================================================================
      logPhase2('STATUS_UPDATE', 'Updating artifact with humanized content', {
        traceId,
        artifactId,
        contentLength: fullContent.length,
        fromStatus: 'writing',
        toStatus: 'humanity_checking',
      });

      const { error: updateError } = await getSupabase()
        .from('artifacts')
        .update({
          content: fullContent,
          status: 'humanity_checking',
          writing_metadata: {
            traceId,
            sectionsWritten: writtenSections.length,
            sectionErrors: errors.length,
            tone,
            sectionTimings,
            completedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', artifactId);

      if (updateError) {
        const duration = Date.now() - startTime;
        logPhase2('STATUS_UPDATE', 'FAILED to update artifact with content', {
          traceId,
          artifactId,
          error: updateError.message,
        });
        return {
          success: false,
          traceId,
          duration,
          data: {
            totalLength: fullContent.length,
            sectionsWritten: writtenSections.length,
            sectionResults,
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Failed to update artifact: ${updateError.message}`,
            recoverable: false,
          },
        };
      }

      logPhase2('STATUS_UPDATE', 'Artifact updated successfully, status set to "humanity_checking"', {
        traceId,
        artifactId,
      });

      // =======================================================================
      // TRACE: Exit Point - Success
      // =======================================================================
      const totalDuration = Date.now() - startTime;

      logPhase2('FULL_CONTENT_COMPLETE', 'WriteFullContent completed successfully', {
        traceId,
        artifactId,
        sectionsWritten: writtenSections.length,
        sectionErrors: errors.length,
        totalContentLength: fullContent.length,
        totalDuration,
        averageSectionTime: sectionTimings.length > 0
          ? Math.round(sectionTimings.reduce((acc, t) => acc + t.duration, 0) / sectionTimings.length)
          : 0,
        nextStatus: 'humanity_checking',
      });
      logPhase2('FULL_CONTENT_COMPLETE', '='.repeat(80));

      logger.info('[WriteFullContent] Full content writing completed', {
        traceId,
        artifactId,
        sectionsWritten: writtenSections.length,
        totalContentLength: fullContent.length,
        errors: errors.length,
      });

      const response: ToolOutput<{
        totalLength: number;
        sectionsWritten: number;
        sectionResults: Array<{ section: string; wordCount: number; success: boolean }>;
        errors?: string[];
      }> = {
        success: true,
        traceId,
        duration: totalDuration,
        statusTransition: { from: 'foundations_approval', to: 'humanity_checking' },
        data: {
          totalLength: fullContent.length,
          sectionsWritten: writtenSections.length,
          sectionResults,
          ...(errors.length > 0 && { errors }),
        },
      };

      // Capture response for mock generation
      await mockService.captureRealResponse(
        'writeFullContent',
        artifactType,
        { artifactId, tone, artifactType },
        response
      );

      return response;

    } catch (error) {
      // =======================================================================
      // TRACE: Exit Point - Error with Rollback
      // =======================================================================
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logPhase2('FULL_CONTENT_ERROR', 'WriteFullContent FAILED, initiating rollback', {
        traceId,
        artifactId,
        error: errorMessage,
        totalDuration,
      });

      logger.error('[WriteFullContent] Full content writing failed', {
        error: error instanceof Error ? error : new Error(errorMessage),
        traceId,
        artifactId,
      });

      // Rollback status
      logPhase2('STATUS_ROLLBACK', 'Rolling back status to "skeleton"', {
        traceId,
        artifactId,
      });

      await getSupabase()
        .from('artifacts')
        .update({
          status: 'skeleton',
          updated_at: new Date().toISOString()
        })
        .eq('id', artifactId);

      logPhase2('STATUS_ROLLBACK', 'Status rolled back to "skeleton"', {
        traceId,
        artifactId,
      });
      logPhase2('FULL_CONTENT_ERROR', '='.repeat(80));

      return {
        success: false,
        traceId,
        duration: totalDuration,
        data: {
          totalLength: 0,
          sectionsWritten: 0,
          sectionResults: [],
        },
        error: {
          category: 'TOOL_EXECUTION_FAILED' as const,
          message: errorMessage,
          recoverable: true,
        },
      };
    }
  },
});
