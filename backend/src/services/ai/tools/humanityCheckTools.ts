import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool } from "ai";
import { z } from "zod";
import { logger, logToFile } from "../../../lib/logger.js";
import { supabaseAdmin } from "../../../lib/supabase.js";
import { mockService, type HumanityApplyResponse, type HumanityCheckResponse } from "../mocks/index.js";
import { generateMockTraceId } from '../mocks/utils/dynamicReplacer.js';
import type { ToolOutput } from '../types/contentAgent.js';

/**
 * Humanity Check Tools for Content Creation Agent (Phase 2)
 *
 * Removes AI-sounding patterns from generated content using Claude.
 * Based on Wikipedia's "Signs of AI writing" guide and the humanizer skill.
 *
 * Reference: https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
 * Credits: Original humanizer skill by @blader - https://github.com/blader/humanizer
 */

// =============================================================================
// Logging Helpers
// =============================================================================

/**
 * Log to file with Phase 2 Humanity Check context
 */
function logPhase2(
  stage: string,
  message: string,
  context: Record<string, unknown> = {}
): void {
  const timestamp = new Date().toISOString();
  logToFile(`[PHASE2:HUMANITY_CHECK:${stage}] ${message}`, {
    ...context,
    timestamp,
  });
}

// =============================================================================
// Comprehensive AI Patterns (24 Categories)
// =============================================================================

/**
 * Build the comprehensive humanity check prompt based on the humanizer skill
 */
function buildHumanityCheckPrompt(content: string, tone: string): string {
  return `You are a writing editor that identifies and removes signs of AI-generated text to make writing sound more natural and human. This guide is based on Wikipedia's "Signs of AI writing" page.

## Your Task

1. **Identify AI patterns** - Scan for the patterns listed below
2. **Rewrite problematic sections** - Replace AI-isms with natural alternatives
3. **Preserve meaning** - Keep the core message intact
4. **Maintain voice** - Match the intended "${tone}" tone
5. **Add soul** - Don't just remove bad patterns; inject actual personality

---

## PERSONALITY AND SOUL

Avoiding AI patterns is only half the job. Sterile, voiceless writing is just as obvious as slop.

### Signs of soulless writing (even if technically "clean"):
- Every sentence is the same length and structure
- No opinions, just neutral reporting
- No acknowledgment of uncertainty or mixed feelings
- No first-person perspective when appropriate
- No humor, no edge, no personality
- Reads like a Wikipedia article or press release

### How to add voice:
- **Have opinions.** Don't just report facts - react to them
- **Vary your rhythm.** Short punchy sentences. Then longer ones that take their time
- **Acknowledge complexity.** Real humans have mixed feelings
- **Use "I" when it fits.** First person isn't unprofessional - it's honest
- **Let some mess in.** Perfect structure feels algorithmic
- **Be specific about feelings.** Not "this is concerning" but specific reactions

---

## CONTENT PATTERNS

### 1. Undue Emphasis on Significance, Legacy, and Broader Trends
**Words to watch:** stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal/key role/moment, underscores/highlights its importance/significance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the, setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted

**Fix:** Remove puffed-up importance statements. Let facts speak for themselves.

### 2. Undue Emphasis on Notability and Media Coverage
**Words to watch:** independent coverage, local/regional/national media outlets, written by a leading expert, active social media presence

**Fix:** Instead of listing sources, quote specific insights from them.

### 3. Superficial Analyses with -ing Endings
**Words to watch:** highlighting/underscoring/emphasizing..., ensuring..., reflecting/symbolizing..., contributing to..., cultivating/fostering..., encompassing..., showcasing...

**Fix:** Remove these tacked-on present participle phrases. State facts directly.

### 4. Promotional and Advertisement-like Language
**Words to watch:** boasts a, vibrant, rich (figurative), profound, enhancing its, showcasing, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning

**Fix:** Use neutral, specific descriptions instead.

### 5. Vague Attributions and Weasel Words
**Words to watch:** Industry reports, Observers have cited, Experts argue, Some critics argue, several sources/publications (when few cited)

**Fix:** Either cite specific sources or remove the claim.

### 6. Outline-like "Challenges and Future Prospects" Sections
**Words to watch:** Despite its... faces several challenges..., Despite these challenges, Challenges and Legacy, Future Outlook

**Fix:** Replace with specific, concrete information.

---

## LANGUAGE AND GRAMMAR PATTERNS

### 7. Overused "AI Vocabulary" Words
**High-frequency AI words:** Additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate/intricacies, key (adjective), landscape (abstract noun), pivotal, showcase, tapestry (abstract noun), testament, underscore (verb), valuable, vibrant

**Fix:** Replace with simpler, more specific alternatives.

### 8. Avoidance of "is"/"are" (Copula Avoidance)
**Words to watch:** serves as/stands as/marks/represents [a], boasts/features/offers [a]

**Fix:** Use simple "is", "are", "has" constructions.
- "serves as a reminder" → "is a reminder" or just state the fact
- "features four rooms" → "has four rooms"

### 9. Negative Parallelisms
**Problem:** "Not only...but..." or "It's not just about..., it's..." overuse

**Fix:** State the positive directly without the negative setup.

### 10. Rule of Three Overuse
**Problem:** Forcing ideas into groups of three to appear comprehensive.

**Fix:** Use natural groupings - sometimes two, sometimes four.

### 11. Elegant Variation (Synonym Cycling)
**Problem:** Excessive synonym substitution (protagonist, main character, central figure, hero)

**Fix:** Repeat the same term when it's clear - repetition is natural.

### 12. False Ranges
**Problem:** "from X to Y" where X and Y aren't on a meaningful scale.

**Fix:** List items directly without pretending they form a range.

---

## STYLE PATTERNS

### 13. Em Dash Overuse
**Problem:** Too many em dashes (—) mimicking "punchy" sales writing.

**Fix:** Use commas, periods, or parentheses instead.

### 14. Overuse of Boldface
**Problem:** Mechanical emphasis on phrases.

**Fix:** Remove most boldface - let important ideas stand on their own.

### 15. Inline-Header Vertical Lists
**Problem:** Lists where items start with bolded headers followed by colons.

**Fix:** Write as flowing prose, or use a simpler list format.

### 16. Title Case in Headings
**Problem:** Capitalizing all main words in headings.

**Fix:** Use sentence case (capitalize only first word and proper nouns).

### 17. Emojis
**Problem:** Decorating headings or bullet points with emojis.

**Fix:** Remove emojis unless tone specifically requires them.

### 18. Curly Quotation Marks
**Problem:** Using curly quotes ("...") instead of straight quotes ("...").

**Fix:** Replace with straight quotes for consistency.

---

## COMMUNICATION PATTERNS

### 19. Collaborative Communication Artifacts
**Words to watch:** I hope this helps, Of course!, Certainly!, You're absolutely right!, Would you like..., let me know, here is a...

**Fix:** Remove chatbot-style phrases entirely.

### 20. Knowledge-Cutoff Disclaimers
**Words to watch:** as of [date], Up to my last training update, While specific details are limited/scarce..., based on available information...

**Fix:** Remove disclaimers - either know the fact or don't include it.

### 21. Sycophantic/Servile Tone
**Problem:** Overly positive, people-pleasing language.

**Fix:** State points neutrally without excessive agreement.

---

## FILLER AND HEDGING

### 22. Filler Phrases
**Remove these:**
- "In order to achieve this goal" → "To achieve this"
- "Due to the fact that" → "Because"
- "At this point in time" → "Now"
- "In the event that" → "If"
- "has the ability to" → "can"
- "It is important to note that" → just state it

### 23. Excessive Hedging
**Problem:** Over-qualifying: "could potentially possibly be argued that might"

**Fix:** Pick one hedging word or commit to the statement.

### 24. Generic Positive Conclusions
**Problem:** "The future looks bright" / "Exciting times lie ahead" / "a major step in the right direction"

**Fix:** End with specific, concrete next steps or observations.

---

## Content to Humanize

${content}

---

## Instructions

1. Read through the content carefully
2. Identify all AI-sounding patterns from the 24 categories above
3. Rewrite naturally without those patterns
4. Preserve all factual information and key points
5. Maintain the original structure and the "${tone}" tone
6. Add natural variation in sentence length and structure
7. Include specific details instead of generic statements

## Output

Return ONLY the humanized content. No explanations, no meta-commentary, no "Here is the rewritten version" - just the improved content itself.`;
}

/**
 * Build analysis prompt for checking content without modifying
 */
function buildAnalysisPrompt(content: string): string {
  return `You are an expert at detecting AI-generated content patterns. Analyze the following content for signs of AI writing.

## Known AI Pattern Categories

1. **Significance/Legacy inflation** - pivotal, testament, landmark, shaping the, reflects broader
2. **Promotional language** - vibrant, stunning, nestled, breathtaking, must-visit
3. **-ing analyses** - showcasing, highlighting, emphasizing, fostering, cultivating
4. **Vague attributions** - experts believe, studies show, many argue
5. **AI vocabulary** - delve, tapestry, multifaceted, nuanced, landscape, paradigm, robust
6. **Copula avoidance** - serves as, stands as, features, boasts
7. **Negative parallelisms** - not only...but, it's not just...it's
8. **Rule of three** - repeated groups of exactly three items
9. **Em dash overuse** - multiple em dashes (—) per paragraph
10. **Filler phrases** - in order to, due to the fact that, it is important to note
11. **Excessive hedging** - could potentially, might possibly, perhaps arguably
12. **Generic conclusions** - future looks bright, exciting times ahead

## Content to Analyze

${content}

## Output Format (JSON)

Return a JSON object:
{
  "detectedPatterns": [
    {"category": "category name", "example": "exact quote from text", "fix": "suggestion"}
  ],
  "humanityScore": 0-100,
  "topIssues": ["issue 1", "issue 2", "issue 3"],
  "suggestions": ["specific suggestion 1", "specific suggestion 2"]
}

Return ONLY the JSON object, no other text.`;
}

// =============================================================================
// Tools
// =============================================================================

/**
 * Apply Humanity Check Tool
 *
 * Uses Claude to remove AI-sounding patterns from content.
 * This is the final step before content is ready for user review.
 *
 * Based on Wikipedia's "Signs of AI writing" guide with 24 pattern categories.
 */
export const applyHumanityCheck = tool({
  description: `Remove AI-sounding patterns from content using Claude. Applies 24 known AI writing patterns (vocabulary, structure, style, tone) based on Wikipedia's "Signs of AI writing" guide. Updates artifact status to 'ready' when complete.`,

  inputSchema: z.object({
    artifactId: z.string().uuid().describe("ID of the artifact to humanize"),
    content: z.string().min(10).describe("Content to humanize"),
    tone: z
      .enum([
        "formal",
        "casual",
        "professional",
        "conversational",
        "technical",
        "friendly",
        "authoritative",
        "humorous",
      ])
      .describe("Tone to maintain during humanization"),
  }),

  execute: async ({ artifactId, content, tone }) => {
    const traceId = generateMockTraceId('humanity-check');
    const startTime = Date.now();

    // =========================================================================
    // TRACE: Entry Point
    // =========================================================================
    logPhase2('HUMANITY_CHECK_START', '='.repeat(80));
    logPhase2('HUMANITY_CHECK_START', 'ApplyHumanityCheck tool invoked', {
      traceId,
      artifactId,
      contentLength: content.length,
      tone,
      patternCategories: 24,
    });

    logger.info("ApplyHumanityCheck", "Starting humanity check", {
      traceId,
      artifactId,
      contentLength: content.length,
      tone,
    });

    // =========================================================================
    // Mock Check - Return mock response if mocking is enabled
    // =========================================================================
    if (mockService.shouldMock('humanityCheckTools')) {
      logPhase2('MOCK_MODE', 'Using mock response for humanity check', {
        traceId,
        artifactId,
        contentLength: content.length,
        tone,
      });

      const mockResponse = await mockService.getMockResponse<HumanityApplyResponse>(
        'applyHumanityCheck',
        'default',
        { artifactId, tone, traceId, originalLength: content.length }
      );

      // Update database to maintain workflow
      if (mockResponse.success) {
        await supabaseAdmin
          .from("artifacts")
          .update({
            status: mockResponse.status || "creating_visuals",
            updated_at: new Date().toISOString()
          })
          .eq("id", artifactId);
      }

      return mockResponse;
    }

    try {
      // =======================================================================
      // TRACE: Step 1 - Build Humanity Check Prompt
      // =======================================================================
      logPhase2('PROMPT_BUILD', 'Building comprehensive humanity check prompt', {
        traceId,
        contentLength: content.length,
        tone,
      });

      const promptStartTime = Date.now();
      const prompt = buildHumanityCheckPrompt(content, tone);
      const promptDuration = Date.now() - promptStartTime;

      logPhase2('PROMPT_BUILD', 'Prompt built successfully', {
        traceId,
        promptLength: prompt.length,
        duration: promptDuration,
        patternCategories: 24,
        includesPersonalitySection: true,
      });

      logger.debug("ApplyHumanityCheck", "Prompt built", {
        traceId,
        promptLength: prompt.length,
        patternCategories: 24,
      });

      // =======================================================================
      // TRACE: Step 2 - Call Claude API for Humanization
      // =======================================================================
      const modelConfig = {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: Math.ceil(content.length * 1.5),
      };

      logPhase2('CLAUDE_API_CALL', 'Calling Claude API for humanization', {
        traceId,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        inputContentLength: content.length,
      });

      const claudeStartTime = Date.now();

      const { text: humanizedContent } = await generateText({
        model: anthropic(modelConfig.model),
        prompt,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });

      const claudeDuration = Date.now() - claudeStartTime;
      const lengthChange = humanizedContent.length - content.length;
      const lengthChangePercent = Math.round((lengthChange / content.length) * 100);

      logPhase2('CLAUDE_API_RESPONSE', 'Claude API responded successfully', {
        traceId,
        originalLength: content.length,
        humanizedLength: humanizedContent.length,
        lengthChange,
        lengthChangePercent: `${lengthChangePercent}%`,
        duration: claudeDuration,
        tokensPerSecond: Math.round((humanizedContent.length / 4) / (claudeDuration / 1000)),
      });

      logger.debug("ApplyHumanityCheck", "Content humanized", {
        traceId,
        originalLength: content.length,
        humanizedLength: humanizedContent.length,
        lengthChange,
        lengthChangePercent,
      });

      // =======================================================================
      // TRACE: Step 3 - Analyze Content Changes (Before/After)
      // =======================================================================
      logPhase2('CONTENT_ANALYSIS', 'Analyzing humanization changes', {
        traceId,
        originalLength: content.length,
        humanizedLength: humanizedContent.length,
        contentReduced: lengthChange < 0,
        contentExpanded: lengthChange > 0,
      });

      // Pattern detection for both original and humanized content
      const aiVocabWords = [
        'delve', 'tapestry', 'multifaceted', 'nuanced', 'landscape', 'pivotal',
        'crucial', 'vibrant', 'testament', 'showcase'
      ];

      const aiVocabBefore = aiVocabWords.filter(word => content.toLowerCase().includes(word)).length;
      const aiVocabAfter = aiVocabWords.filter(word => humanizedContent.toLowerCase().includes(word)).length;

      const emDashCountBefore = (content.match(/—/g) || []).length;
      const emDashCountAfter = (humanizedContent.match(/—/g) || []).length;

      const ruleOfThreeBefore = (content.match(/(\w+,\s\w+,\s(and|&)\s\w+)/g) || []).length;
      const ruleOfThreeAfter = (humanizedContent.match(/(\w+,\s\w+,\s(and|&)\s\w+)/g) || []).length;

      // Calculate rough humanity scores (0-100 scale)
      // Lower pattern count = higher score
      const humanityScoreBefore = Math.max(0, Math.min(100,
        100 - (aiVocabBefore * 5) - (emDashCountBefore * 3) - (ruleOfThreeBefore * 2)
      ));
      const humanityScoreAfter = Math.max(0, Math.min(100,
        100 - (aiVocabAfter * 5) - (emDashCountAfter * 3) - (ruleOfThreeAfter * 2)
      ));

      const patternsFixed = (aiVocabBefore - aiVocabAfter) + (emDashCountBefore - emDashCountAfter) + (ruleOfThreeBefore - ruleOfThreeAfter);

      logPhase2('CONTENT_ANALYSIS', 'Pattern detection summary', {
        traceId,
        before: {
          aiVocab: aiVocabBefore,
          emDashes: emDashCountBefore,
          ruleOfThree: ruleOfThreeBefore,
          humanityScore: humanityScoreBefore,
        },
        after: {
          aiVocab: aiVocabAfter,
          emDashes: emDashCountAfter,
          ruleOfThree: ruleOfThreeAfter,
          humanityScore: humanityScoreAfter,
        },
        patternsFixed,
      });

      // =======================================================================
      // TRACE: Step 4 - Update Artifact with Humanized Content
      // =======================================================================
      logPhase2('DATABASE_UPDATE', 'Updating artifact with humanized content', {
        traceId,
        artifactId,
        contentLength: humanizedContent.length,
        fromStatus: 'humanity_checking',
        toStatus: 'creating_visuals',
      });

      const dbStartTime = Date.now();

      const { error: updateError } = await supabaseAdmin
        .from("artifacts")
        .update({
          content: humanizedContent,
          status: "creating_visuals",
          writing_metadata: {
            traceId,
            humanityCheckApplied: true,
            originalLength: content.length,
            humanizedLength: humanizedContent.length,
            lengthChange,
            lengthChangePercent,
            patternsChecked: 24,
            humanityScoreBefore,
            humanityScoreAfter,
            patternsFixed,
            aiVocabBefore,
            aiVocabAfter,
            emDashCountBefore,
            emDashCountAfter,
            claudeDuration,
            completedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", artifactId);

      const dbDuration = Date.now() - dbStartTime;

      if (updateError) {
        const duration = Date.now() - startTime;
        logPhase2('DATABASE_UPDATE', 'FAILED to update artifact', {
          traceId,
          artifactId,
          error: updateError.message,
          duration: dbDuration,
        });

        logger.error("ApplyHumanityCheck", updateError, {
          traceId,
          artifactId,
          stage: "update_artifact",
        });

        return {
          success: false,
          traceId,
          duration,
          data: {
            originalLength: content.length,
            humanizedLength: humanizedContent.length,
            lengthChange: 0,
            humanityScoreBefore: 0,
            humanityScoreAfter: 0,
            patternsFixed: 0,
            patternsChecked: 24,
            message: '',
          },
          error: {
            category: 'TOOL_EXECUTION_FAILED' as const,
            message: `Failed to update artifact: ${updateError.message}`,
            recoverable: false,
          },
        };
      }

      logPhase2('DATABASE_UPDATE', 'Artifact updated successfully', {
        traceId,
        artifactId,
        newStatus: 'creating_visuals',
        duration: dbDuration,
      });

      // =======================================================================
      // TRACE: Exit Point - Success
      // =======================================================================
      const totalDuration = Date.now() - startTime;

      logPhase2('HUMANITY_CHECK_COMPLETE', 'Humanity check completed successfully', {
        traceId,
        artifactId,
        success: true,
        originalLength: content.length,
        humanizedLength: humanizedContent.length,
        lengthChange,
        lengthChangePercent: `${lengthChangePercent}%`,
        patternsChecked: 24,
        humanityScoreBefore,
        humanityScoreAfter,
        patternsFixed,
        totalDuration,
        breakdown: {
          promptBuild: promptDuration,
          claudeApi: claudeDuration,
          databaseUpdate: dbDuration,
        },
        nextStatus: 'creating_visuals',
      });
      logPhase2('HUMANITY_CHECK_COMPLETE', '='.repeat(80));

      logger.info("ApplyHumanityCheck", "Humanity check completed", {
        traceId,
        artifactId,
        originalLength: content.length,
        humanizedLength: humanizedContent.length,
        humanityScoreBefore,
        humanityScoreAfter,
        patternsFixed,
        status: "creating_visuals",
      });

      const response: ToolOutput<{
        originalLength: number;
        humanizedLength: number;
        lengthChange: number;
        humanityScoreBefore: number;
        humanityScoreAfter: number;
        patternsFixed: number;
        patternsChecked: number;
        message: string;
      }> = {
        success: true,
        traceId,
        duration: totalDuration,
        statusTransition: { from: 'humanity_checking', to: 'creating_visuals' },
        data: {
          originalLength: content.length,
          humanizedLength: humanizedContent.length,
          lengthChange,
          humanityScoreBefore,
          humanityScoreAfter,
          patternsFixed,
          patternsChecked: 24,
          message: "Content humanized successfully. Removed AI patterns and added natural voice.",
        },
      };

      // Capture response for mock generation
      await mockService.captureRealResponse(
        'applyHumanityCheck',
        'default',
        { artifactId, tone },
        response
      );

      return response;

    } catch (error) {
      // =======================================================================
      // TRACE: Exit Point - Error with Rollback
      // =======================================================================
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      logPhase2('HUMANITY_CHECK_ERROR', 'Humanity check FAILED, initiating rollback', {
        traceId,
        artifactId,
        error: errorMessage,
        totalDuration,
      });

      logger.error(
        "ApplyHumanityCheck",
        error instanceof Error ? error : new Error(errorMessage),
        {
          traceId,
          artifactId,
        }
      );

      // Rollback status
      logPhase2('STATUS_ROLLBACK', 'Rolling back status to "humanity_checking"', {
        traceId,
        artifactId,
      });

      await supabaseAdmin
        .from("artifacts")
        .update({
          status: "humanity_checking",
          updated_at: new Date().toISOString(),
        })
        .eq("id", artifactId);

      logPhase2('STATUS_ROLLBACK', 'Status rolled back to "humanity_checking"', {
        traceId,
        artifactId,
      });
      logPhase2('HUMANITY_CHECK_ERROR', '='.repeat(80));

      return {
        success: false,
        traceId,
        duration: totalDuration,
        data: {
          originalLength: content.length,
          humanizedLength: 0,
          lengthChange: 0,
          humanityScoreBefore: 0,
          humanityScoreAfter: 0,
          patternsFixed: 0,
          patternsChecked: 24,
          message: '',
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
 * Check Content Humanity Tool
 *
 * Analyzes content for AI patterns without modifying it.
 * Returns detailed breakdown of detected patterns with examples and fixes.
 */
export const checkContentHumanity = tool({
  description: `Analyze content for AI-sounding patterns without modifying it. Returns detected patterns with specific examples, humanity score (0-100), and actionable suggestions. Use this to preview what humanity check will address.`,

  inputSchema: z.object({
    content: z.string().min(10).describe("Content to analyze for AI patterns"),
  }),

  execute: async ({ content }) => {
    const traceId = generateMockTraceId('humanity-analysis');
    const startTime = Date.now();

    // =========================================================================
    // TRACE: Entry Point
    // =========================================================================
    logPhase2('CONTENT_ANALYSIS_START', '='.repeat(60));
    logPhase2('CONTENT_ANALYSIS_START', 'CheckContentHumanity tool invoked', {
      traceId,
      contentLength: content.length,
    });

    logger.info("CheckContentHumanity", "Analyzing content for AI patterns", {
      traceId,
      contentLength: content.length,
    });

    // =========================================================================
    // Mock Check - Return mock response if mocking is enabled
    // =========================================================================
    if (mockService.shouldMock('humanityCheckTools')) {
      logPhase2('MOCK_MODE', 'Using mock response for content analysis', {
        traceId,
        contentLength: content.length,
      });

      const mockResponse = await mockService.getMockResponse<HumanityCheckResponse>(
        'checkContentHumanity',
        'default',
        { traceId, contentLength: content.length }
      );

      return mockResponse;
    }

    try {
      // =======================================================================
      // TRACE: Step 1 - Build Analysis Prompt
      // =======================================================================
      logPhase2('PROMPT_BUILD', 'Building analysis prompt', {
        traceId,
        contentLength: content.length,
      });

      const analysisPrompt = buildAnalysisPrompt(content);

      logPhase2('PROMPT_BUILD', 'Analysis prompt built', {
        traceId,
        promptLength: analysisPrompt.length,
        patternCategories: 12,
      });

      // =======================================================================
      // TRACE: Step 2 - Call Claude API for Analysis
      // =======================================================================
      const modelConfig = {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.3,
        maxTokens: 2000,
      };

      logPhase2('CLAUDE_API_CALL', 'Calling Claude API for analysis', {
        traceId,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });

      const claudeStartTime = Date.now();

      const { text: analysisResult } = await generateText({
        model: anthropic(modelConfig.model),
        prompt: analysisPrompt,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });

      const claudeDuration = Date.now() - claudeStartTime;

      logPhase2('CLAUDE_API_RESPONSE', 'Claude API responded', {
        traceId,
        responseLength: analysisResult.length,
        duration: claudeDuration,
      });

      // =======================================================================
      // TRACE: Step 3 - Parse JSON Response
      // =======================================================================
      logPhase2('JSON_PARSE', 'Parsing analysis JSON response', {
        traceId,
        responseLength: analysisResult.length,
      });

      let analysis;
      try {
        const cleanedResult = analysisResult
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        analysis = JSON.parse(cleanedResult);

        logPhase2('JSON_PARSE', 'JSON parsed successfully', {
          traceId,
          patternCount: analysis.detectedPatterns?.length || 0,
          humanityScore: analysis.humanityScore,
          topIssueCount: analysis.topIssues?.length || 0,
          suggestionCount: analysis.suggestions?.length || 0,
        });

      } catch (parseError) {
        logPhase2('JSON_PARSE', 'WARNING: Failed to parse JSON, using defaults', {
          traceId,
          error: parseError instanceof Error ? parseError.message : 'Parse error',
          responsePreview: analysisResult.substring(0, 200),
        });

        logger.warn("CheckContentHumanity", "Failed to parse analysis JSON", {
          traceId,
          result: analysisResult.substring(0, 200),
        });

        analysis = {
          detectedPatterns: [],
          humanityScore: 50,
          topIssues: ["Unable to parse detailed analysis"],
          suggestions: ["Run humanity check to improve content"],
        };
      }

      // =======================================================================
      // TRACE: Step 4 - Prepare Results
      // =======================================================================
      const patternCount = analysis.detectedPatterns?.length || 0;
      const humanityScore = analysis.humanityScore || 50;

      let verdict: string;
      if (humanityScore >= 80) {
        verdict = "Content sounds mostly human";
      } else if (humanityScore >= 60) {
        verdict = "Content has noticeable AI patterns";
      } else if (humanityScore >= 40) {
        verdict = "Content has significant AI patterns";
      } else {
        verdict = "Content sounds heavily AI-generated";
      }

      logPhase2('RESULTS_PREPARED', 'Analysis results prepared', {
        traceId,
        patternCount,
        humanityScore,
        verdict,
        topIssues: analysis.topIssues,
      });

      // =======================================================================
      // TRACE: Exit Point - Success
      // =======================================================================
      const totalDuration = Date.now() - startTime;

      logPhase2('CONTENT_ANALYSIS_COMPLETE', 'Content analysis completed successfully', {
        traceId,
        contentLength: content.length,
        patternCount,
        humanityScore,
        verdict,
        totalDuration,
        breakdown: {
          claudeApi: claudeDuration,
        },
      });
      logPhase2('CONTENT_ANALYSIS_COMPLETE', '='.repeat(60));

      logger.info("CheckContentHumanity", "Analysis completed", {
        traceId,
        patternCount,
        humanityScore,
        topIssueCount: analysis.topIssues?.length || 0,
      });

      const response: ToolOutput<{
        detectedPatterns: Array<{ category: string; example: string; fix: string }>;
        patternCount: number;
        humanityScore: number;
        topIssues: string[];
        suggestions: string[];
        contentLength: number;
        verdict: string;
      }> = {
        success: true,
        traceId,
        duration: totalDuration,
        data: {
          detectedPatterns: analysis.detectedPatterns || [],
          patternCount,
          humanityScore,
          topIssues: analysis.topIssues || [],
          suggestions: analysis.suggestions || [],
          contentLength: content.length,
          verdict,
        },
      };

      // Capture response for mock generation
      await mockService.captureRealResponse(
        'checkContentHumanity',
        'default',
        { contentLength: content.length },
        response
      );

      return response;

    } catch (error) {
      // =======================================================================
      // TRACE: Exit Point - Error
      // =======================================================================
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      logPhase2('CONTENT_ANALYSIS_ERROR', 'Content analysis FAILED', {
        traceId,
        error: errorMessage,
        totalDuration,
      });

      logger.error(
        "CheckContentHumanity",
        error instanceof Error ? error : new Error(errorMessage),
        { traceId }
      );

      return {
        success: false,
        traceId,
        duration: totalDuration,
        data: {
          detectedPatterns: [],
          patternCount: 0,
          humanityScore: 0,
          topIssues: [],
          suggestions: [],
          contentLength: content.length,
          verdict: 'Analysis failed',
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
