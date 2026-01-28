/**
 * Intent Detection Module
 *
 * Hybrid approach for detecting user intent:
 * 1. Regex patterns for high-confidence matches (>0.9)
 * 2. Claude Haiku for ambiguous cases (fast classification)
 *
 * Confidence-based routing prevents asking for clarification on clear intents.
 */

import { logger } from '../../../lib/logger.js';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// =============================================================================
// Types
// =============================================================================

/**
 * User intent categories for content agent
 */
export enum UserIntent {
  /** Generate topic ideas for content */
  GENERATE_TOPICS = 'GENERATE_TOPICS',

  /** Research a specific topic */
  RESEARCH_TOPIC = 'RESEARCH_TOPIC',

  /** Create content skeleton/outline */
  CREATE_SKELETON = 'CREATE_SKELETON',

  /** Write or expand content */
  WRITE_CONTENT = 'WRITE_CONTENT',

  /** Apply humanization to content */
  HUMANIZE_CONTENT = 'HUMANIZE_CONTENT',

  /** Create visuals for content */
  CREATE_VISUALS = 'CREATE_VISUALS',

  /** Run full pipeline (research → skeleton → write → humanize → visuals) */
  FULL_PIPELINE = 'FULL_PIPELINE',

  /** Get status or information */
  STATUS_CHECK = 'STATUS_CHECK',

  /** General conversation or unclear intent */
  UNCLEAR = 'UNCLEAR',
}

/**
 * Confidence thresholds for intent detection
 */
export const CONFIDENCE_THRESHOLD = {
  /** Execute immediately - regex match */
  HIGH: 0.9,
  /** Proceed with caution - strong AI signal */
  MEDIUM: 0.7,
  /** Ask for clarification - weak signal */
  LOW: 0.5,
  /** Must clarify - no clear intent */
  UNCLEAR: 0.0,
} as const;

/**
 * Intent detection result
 */
export interface IntentDetectionResult {
  /** Primary detected intent */
  intent: UserIntent;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Alternative intents if ambiguous */
  alternativeIntents?: Array<{ intent: UserIntent; confidence: number }>;
  /** Whether clarification is needed */
  clarificationNeeded: boolean;
  /** Suggested clarification question */
  suggestedClarification?: string;
  /** Detection method used */
  method: 'regex' | 'ai';
}

/**
 * Screen context from UI
 */
export interface ScreenContext {
  currentPage?: 'portfolio' | 'artifact' | 'dashboard' | 'chat';
  artifactId?: string;
  artifactType?: 'blog' | 'social_post' | 'showcase';
  artifactStatus?: string;
  artifactTitle?: string;
}

// =============================================================================
// Regex Patterns (High Confidence)
// =============================================================================

/**
 * Regex patterns for high-confidence intent matching
 * These patterns return confidence >= 0.9
 */
const INTENT_PATTERNS: Array<{ intent: UserIntent; patterns: RegExp[] }> = [
  {
    intent: UserIntent.GENERATE_TOPICS,
    patterns: [
      /\b(suggest|generate|give me|what are)\s+(some\s+)?topic(s)?\b/i,
      /\btopic\s+(ideas?|suggestions?)\b/i,
      /\bwhat should i write about\b/i,
    ],
  },
  {
    intent: UserIntent.RESEARCH_TOPIC,
    patterns: [
      /\bresearch\s+(this\s+)?topic\b/i,
      /\bfind\s+(information|sources|articles)\s+(about|on)\b/i,
      /\bgather\s+(research|sources|data)\b/i,
      /\bconduct\s+research\b/i,
    ],
  },
  {
    intent: UserIntent.CREATE_SKELETON,
    patterns: [
      /\bcreate\s+(a\s+)?(skeleton|outline|structure)\b/i,
      /\bgenerate\s+(an?\s+)?(outline|structure)\b/i,
      /\bsketch\s+out\s+the\s+content\b/i,
    ],
  },
  {
    intent: UserIntent.WRITE_CONTENT,
    patterns: [
      /\bwrite\s+(the\s+)?(content|article|post|blog)\b/i,
      /\bgenerate\s+(the\s+)?(content|text|copy)\b/i,
      /\bexpand\s+(on\s+)?(this|the\s+outline)\b/i,
      /\bfill\s+in\s+the\s+(content|sections?)\b/i,
    ],
  },
  {
    intent: UserIntent.HUMANIZE_CONTENT,
    patterns: [
      /\b(humanize|make it sound more human)\b/i,
      /\bremove\s+ai\s+patterns\b/i,
      /\bmake it (less|more)\s+(robotic|natural)\b/i,
      /\bimprove\s+(the\s+)?humanity\b/i,
    ],
  },
  {
    intent: UserIntent.CREATE_VISUALS,
    patterns: [
      /\bcreate\s+(the\s+)?(visuals?|images?)\b/i,
      /\bgenerate\s+(the\s+)?(graphics?|pictures?)\b/i,
      /\badd\s+images?\b/i,
    ],
  },
  {
    intent: UserIntent.FULL_PIPELINE,
    patterns: [
      /\bcreate\s+content\b/i,
      /\bgenerate\s+(everything|complete\s+content)\b/i,
      /\brun\s+(the\s+)?(full\s+)?pipeline\b/i,
      /\bstart\s+from\s+scratch\b/i,
      /\bdo\s+it\s+all\b/i,
    ],
  },
  {
    intent: UserIntent.STATUS_CHECK,
    patterns: [
      /\bwhat('?s|\s+is)\s+(the\s+)?status\b/i,
      /\bhow('?s|\s+is)\s+(it\s+)?going\b/i,
      /\bshow\s+me\s+(the\s+)?progress\b/i,
      /\bwhere\s+are\s+we\b/i,
    ],
  },
];

// =============================================================================
// Intent Detection Functions
// =============================================================================

/**
 * Detect intent using regex patterns (high confidence)
 *
 * @param message - User message
 * @returns Detection result or null if no match
 */
function detectWithRegex(message: string): IntentDetectionResult | null {
  const normalizedMessage = message.trim().toLowerCase();

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedMessage)) {
        logger.debug('IntentDetection', 'Regex match found', {
          intent,
          pattern: pattern.source,
        });

        return {
          intent,
          confidence: 0.95, // High confidence for regex matches
          clarificationNeeded: false,
          method: 'regex',
        };
      }
    }
  }

  return null;
}

/**
 * Classify intent using Claude Haiku (for ambiguous cases)
 *
 * @param message - User message
 * @param context - Screen context from UI
 * @returns Detection result
 */
async function classifyWithHaiku(
  message: string,
  context: ScreenContext
): Promise<IntentDetectionResult> {
  try {
    const contextInfo = context.artifactId
      ? `Current artifact: ${context.artifactTitle || 'Untitled'} (${context.artifactType}, status: ${context.artifactStatus})`
      : 'No artifact selected';

    const prompt = `You are an intent classifier for a content creation agent. Analyze the user's message and determine their intent.

Context: ${contextInfo}

User message: "${message}"

Available intents:
- GENERATE_TOPICS: User wants topic ideas/suggestions
- RESEARCH_TOPIC: User wants to research a specific topic
- CREATE_SKELETON: User wants to create content outline/structure
- WRITE_CONTENT: User wants to write or expand content
- HUMANIZE_CONTENT: User wants to make content sound more human
- CREATE_VISUALS: User wants to create images/visuals
- FULL_PIPELINE: User wants complete end-to-end content creation
- STATUS_CHECK: User wants to know current status/progress
- UNCLEAR: Intent is unclear or conversational

Respond with ONLY the intent name and confidence (0.0-1.0), separated by a pipe.
Example: "WRITE_CONTENT|0.8"`;

    const { text } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'),
      prompt,
      maxTokens: 50,
      temperature: 0.1, // Low temperature for consistent classification
    });

    // Parse response: "INTENT|0.8"
    const [intentStr, confidenceStr] = text.trim().split('|');
    const intent = (intentStr?.trim() as UserIntent) || UserIntent.UNCLEAR;
    const confidence = parseFloat(confidenceStr?.trim() || '0.0');

    logger.info('IntentDetection', 'Haiku classification completed', {
      intent,
      confidence,
      message: message.substring(0, 100),
    });

    return {
      intent,
      confidence: Math.min(Math.max(confidence, 0.0), 1.0), // Clamp 0-1
      clarificationNeeded: confidence < CONFIDENCE_THRESHOLD.MEDIUM,
      suggestedClarification:
        confidence < CONFIDENCE_THRESHOLD.MEDIUM ? generateClarificationQuestion(intent, context) : undefined,
      method: 'ai',
    };
  } catch (error) {
    logger.error('IntentDetection', error instanceof Error ? error : new Error(String(error)), {
      message: message.substring(0, 100),
    });

    // Fallback to UNCLEAR on error
    return {
      intent: UserIntent.UNCLEAR,
      confidence: 0.0,
      clarificationNeeded: true,
      suggestedClarification: "I'm not sure what you'd like me to do. Could you clarify?",
      method: 'ai',
    };
  }
}

/**
 * Generate clarification question based on intent and context
 */
function generateClarificationQuestion(intent: UserIntent, context: ScreenContext): string {
  switch (intent) {
    case UserIntent.GENERATE_TOPICS:
      return 'Would you like me to suggest topic ideas for your content?';

    case UserIntent.RESEARCH_TOPIC:
      return context.artifactTitle
        ? `Would you like me to research "${context.artifactTitle}"?`
        : 'What topic would you like me to research?';

    case UserIntent.CREATE_SKELETON:
      return 'Would you like me to create a content outline/skeleton?';

    case UserIntent.WRITE_CONTENT:
      return context.artifactStatus === 'skeleton'
        ? 'Would you like me to write the content based on the skeleton?'
        : 'Would you like me to write content? Do you have a skeleton/outline ready?';

    case UserIntent.HUMANIZE_CONTENT:
      return 'Would you like me to humanize the content (remove AI patterns)?';

    case UserIntent.CREATE_VISUALS:
      return 'Would you like me to create visuals/images for your content?';

    case UserIntent.FULL_PIPELINE:
      return 'Would you like me to run the full content creation pipeline (research → skeleton → write → humanize → visuals)?';

    case UserIntent.STATUS_CHECK:
      return 'Would you like to see the current status of your content?';

    case UserIntent.UNCLEAR:
    default:
      return "I'm not sure what you'd like me to do. Could you clarify your request?";
  }
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Detect user intent using hybrid approach
 *
 * Flow:
 * 1. Try regex patterns first (fast, high confidence)
 * 2. Fall back to Claude Haiku for ambiguous cases
 * 3. Use screen context to improve accuracy
 *
 * @param message - User message
 * @param context - Screen context from UI
 * @returns Intent detection result
 */
export async function detectIntent(
  message: string,
  context: ScreenContext = {}
): Promise<IntentDetectionResult> {
  if (!message || message.trim().length === 0) {
    return {
      intent: UserIntent.UNCLEAR,
      confidence: 0.0,
      clarificationNeeded: true,
      suggestedClarification: 'Please provide a message or request.',
      method: 'regex',
    };
  }

  // Step 1: Try regex patterns (fast path)
  const regexResult = detectWithRegex(message);
  if (regexResult && regexResult.confidence >= CONFIDENCE_THRESHOLD.HIGH) {
    logger.debug('IntentDetection', 'High confidence regex match', {
      intent: regexResult.intent,
      confidence: regexResult.confidence,
    });
    return regexResult;
  }

  // Step 2: Fall back to Haiku for ambiguous cases
  logger.debug('IntentDetection', 'No high-confidence regex match, using Haiku', {
    message: message.substring(0, 100),
    hasContext: Boolean(context.artifactId),
  });

  return await classifyWithHaiku(message, context);
}

/**
 * Batch detect intents for multiple messages
 * Useful for analyzing conversation patterns
 */
export async function detectIntentsBatch(
  messages: Array<{ text: string; context: ScreenContext }>
): Promise<IntentDetectionResult[]> {
  return await Promise.all(messages.map((m) => detectIntent(m.text, m.context)));
}
