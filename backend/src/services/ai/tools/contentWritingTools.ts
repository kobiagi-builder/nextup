import { tool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger, logToFile } from '../../../lib/logger.js';
import { mockService, type ContentSectionResponse, type FullContentResponse } from '../mocks/index.js';
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import type { ToolOutput } from '../types/contentAgent.js';
import type { WritingCharacteristics } from '../../../types/portfolio.js';

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
  showcase: 1500,    // ~1125 words per section
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

  if (guidance.length === 1) {
    return ''; // Only header, no actual characteristics
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
  characteristics?: WritingCharacteristics
): string {
  const toneModifier = toneModifiers[tone];
  const characteristicsGuidance = getWritingCharacteristicsGuidance(characteristics);

  // Determine image placeholder type based on section position
  const imageType = isFirstSection ? 'Featured/Hero' : 'Section';
  const imageExample = isFirstSection
    ? '[IMAGE: Featured image - Split-screen showing traditional approach on one side and modern AI-enhanced solution on the other, with data streams connecting them]'
    : '[IMAGE: Professional photo showing a healthcare worker using a tablet with AI-powered diagnostic software, with patient data visualizations on screen]';

  return `You are a professional content writer creating ${artifactType} content.

## Your Task
Write compelling content for this section of a ${artifactType}.

## Section to Write
Heading: ${sectionHeading}
Placeholder/Notes: ${sectionPlaceholder}

## Research Context (incorporate naturally)
${researchContext || 'No specific research available. Write based on general knowledge.'}

## Tone Requirements
${toneModifier}
${characteristicsGuidance}
## Writing Guidelines
- Write engaging, well-researched content
- Reference research findings naturally (don't cite sources explicitly)
- Use specific details, not vague claims
- Vary sentence structure for readability
- Stay focused on the section topic
- Match the tone consistently throughout
${artifactType === 'blog' ? '- Aim for 200-400 words per section' : ''}
${artifactType === 'social_post' ? '- Keep it concise and punchy (150-280 characters)' : ''}
${artifactType === 'showcase' ? '- Balance technical detail with accessibility' : ''}

## Image Placeholders (CRITICAL)
Add ONE ${imageType} image placeholder at the end of this section using the format:
[IMAGE: ${isFirstSection ? 'Featured image - ' : ''}Detailed description of what the image should show]

The image description should:
- Be specific to THIS section's content
- Describe a visual that would enhance the reader's understanding
- Include style hints (e.g., "professional photo showing...", "diagram illustrating...", "infographic displaying...")
- Be 1-2 sentences describing exactly what should appear in the image
${isFirstSection ? '- For the featured/hero image: Create a visually striking image that captures the overall theme of the article' : ''}

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

    logger.info('WriteContentSection', 'Starting content generation', {
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
        logger.info('WriteContentSection', 'Using mock response', {
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
      const { data: researchResults, error: researchError } = await supabaseAdmin
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
        logger.warn('WriteContentSection', 'Failed to fetch research', {
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

      logger.debug('WriteContentSection', 'Research context prepared', {
        traceId,
        sourceCount: researchResults?.length || 0,
        hasContext: !!researchContext,
      });

      // =======================================================================
      // TRACE: Step 3 - Build Content Generation Prompt
      // =======================================================================
      const prompt = buildContentPrompt(
        sectionHeading,
        sectionPlaceholder,
        tone,
        artifactType,
        researchContext
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
        maxTokens: tokenLimits[artifactType],
      });

      const geminiDuration = Date.now() - geminiStartTime;

      logPhase2('GEMINI_API_RESPONSE', 'Gemini API responded successfully', {
        traceId,
        generatedContentLength: generatedContent.length,
        duration: geminiDuration,
        tokensPerSecond: Math.round((generatedContent.length / 4) / (geminiDuration / 1000)),
      });

      logger.info('WriteContentSection', 'Content generated successfully', {
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

      logger.error('WriteContentSection', error instanceof Error ? error : new Error(errorMessage), {
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

    logger.info('WriteFullContent', 'Starting full content writing', {
      traceId,
      artifactId,
      artifactType,
      tone,
    });

    try {
      // =======================================================================
      // DEBUG: Log runtime mock configuration
      // =======================================================================
      const shouldMockResult = mockService.shouldMock('contentWritingTools');
      console.log('[DEBUG] WriteFullContent mock check:', {
        shouldMock: shouldMockResult,
        mockConfig: mockService.getConfig(),
        envVars: {
          MOCK_ALL_AI_TOOLS: process.env.MOCK_ALL_AI_TOOLS,
          MOCK_CONTENT_WRITING_TOOLS: process.env.MOCK_CONTENT_WRITING_TOOLS,
        },
        traceId,
        artifactId,
      });

      // =======================================================================
      // MOCK CHECK: Return mock response if mocking is enabled
      // =======================================================================
      if (shouldMockResult) {
        logger.info('WriteFullContent', 'Using mock response', {
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
          await supabaseAdmin
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

      const { error: statusError } = await supabaseAdmin
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
        logger.error('WriteFullContent', statusError, {
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

      const { data: artifact, error: fetchError } = await supabaseAdmin
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

      logger.debug('WriteFullContent', 'Parsed skeleton sections', {
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
        logger.warn('WriteFullContent', 'No H2 sections found in skeleton', {
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
      const { data: researchResults } = await supabaseAdmin
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

        const { data: charData } = await supabaseAdmin
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
          logger.debug('WriteFullContent', 'Writing characteristics loaded', {
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
            writingCharacteristics  // Phase 4: Pass writing characteristics
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
            maxTokens: tokenLimits[artifactType],
          });

          const sectionDuration = Date.now() - sectionStartTime;
          const wordCount = Math.round(generatedContent.split(/\s+/).length);

          writtenSections.push({
            heading: section.heading,
            content: generatedContent,
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

          logger.debug('WriteFullContent', 'Section written', {
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

          logger.error('WriteFullContent', sectionError instanceof Error ? sectionError : new Error(errorMsg), {
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
      // TRACE: Step 7 - Update Artifact Content (Keep Status as 'writing' for Phase 3)
      // =======================================================================
      logPhase2('STATUS_UPDATE', 'Updating artifact with content (keeping status "writing" for Phase 3 image generation)', {
        traceId,
        artifactId,
        contentLength: fullContent.length,
        fromStatus: 'writing',
        toStatus: 'writing', // Keep 'writing' to trigger Phase 3 identifyImageNeeds
      });

      const { error: updateError } = await supabaseAdmin
        .from('artifacts')
        .update({
          content: fullContent,
          status: 'writing',
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

      logPhase2('STATUS_UPDATE', 'Artifact updated successfully, status remains "writing"', {
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
        nextStatus: 'creating_visuals',
      });
      logPhase2('FULL_CONTENT_COMPLETE', '='.repeat(80));

      logger.info('WriteFullContent', 'Full content writing completed', {
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
        statusTransition: { from: 'skeleton', to: 'writing' },
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

      logger.error('WriteFullContent', error instanceof Error ? error : new Error(errorMessage), {
        traceId,
        artifactId,
      });

      // Rollback status
      logPhase2('STATUS_ROLLBACK', 'Rolling back status to "skeleton"', {
        traceId,
        artifactId,
      });

      await supabaseAdmin
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
