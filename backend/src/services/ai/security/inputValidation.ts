/**
 * Input Validation
 *
 * Validates and sanitizes user input to prevent security issues.
 * Includes prompt injection detection and content filtering.
 */

import { logger } from '../../../lib/logger.js';

// =============================================================================
// Constants
// =============================================================================

const MAX_MESSAGE_LENGTH = 10000;
const MAX_TOPIC_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;

// =============================================================================
// Prompt Injection Patterns
// =============================================================================

const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction injection
  /ignore (all )?previous (instructions?|prompts?)/i,
  /disregard (all )?previous (instructions?|prompts?)/i,
  /forget (all )?(previous|earlier) (instructions?|prompts?)/i,

  // System prompt override attempts
  /you are now/i,
  /new instructions?:/i,
  /system:?\s*(prompt|message|instructions?)/i,
  /act as (if you (are|were) )?a/i,

  // Role manipulation
  /pretend (you are|to be)/i,
  /your (new |actual )?role is/i,
  /you must (now )?respond/i,

  // Data extraction attempts
  /show (me )?(your|the) (prompt|instructions?|system message)/i,
  /what (are|were) your (original )?(instructions?|prompts?)/i,
  /repeat (your|the) (prompt|instructions?|system message)/i,

  // Command injection
  /\$\{.*\}/,  // Template literal injection
  /`.*`/,      // Backtick command execution
  /<script\b/i, // Script tag injection

  // Unicode confusion attacks
  /\u200B|\u200C|\u200D|\uFEFF/, // Zero-width characters

  // Encoding attacks
  /\\x[0-9a-f]{2}/i,    // Hex encoding
  /\\u[0-9a-f]{4}/i,    // Unicode encoding
  /&#x?[0-9a-f]+;/i,    // HTML entity encoding

  // SQL injection patterns (in case content reaches DB without sanitization)
  /(['";])\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+(TABLE|DATABASE)/i,

  // Path traversal
  /\.\.\/|\.\.\\/, // Directory traversal

  // Jailbreak attempts
  /dan mode/i,
  /developer mode/i,
  /god mode/i,
];

// =============================================================================
// Validation Functions
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: string;
}

/**
 * Validate message length
 */
export function validateLength(input: string, maxLength: number = MAX_MESSAGE_LENGTH): ValidationResult {
  if (input.length === 0) {
    return {
      valid: false,
      errors: ['Input cannot be empty'],
    };
  }

  if (input.length > maxLength) {
    return {
      valid: false,
      errors: [`Input exceeds maximum length of ${maxLength} characters`],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): ValidationResult {
  const detectedPatterns: string[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  }

  if (detectedPatterns.length > 0) {
    logger.warn('[InputValidation] Prompt injection attempt detected', {
      patternCount: detectedPatterns.length,
      inputLength: input.length,
    });

    return {
      valid: false,
      errors: ['Input contains suspicious patterns'],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Sanitize content for AI providers
 */
export function sanitizeForAI(input: string): string {
  // Remove zero-width characters
  let sanitized = input.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // Normalize excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate topic input
 */
export function validateTopic(topic: string): ValidationResult {
  // Length check
  const lengthResult = validateLength(topic, MAX_TOPIC_LENGTH);
  if (!lengthResult.valid) {
    return lengthResult;
  }

  // Prompt injection check
  const injectionResult = detectPromptInjection(topic);
  if (!injectionResult.valid) {
    return injectionResult;
  }

  // Sanitize
  const sanitized = sanitizeForAI(topic);

  return {
    valid: true,
    errors: [],
    sanitized,
  };
}

/**
 * Validate title input
 */
export function validateTitle(title: string): ValidationResult {
  // Length check
  const lengthResult = validateLength(title, MAX_TITLE_LENGTH);
  if (!lengthResult.valid) {
    return lengthResult;
  }

  // Prompt injection check
  const injectionResult = detectPromptInjection(title);
  if (!injectionResult.valid) {
    return injectionResult;
  }

  // Sanitize
  const sanitized = sanitizeForAI(title);

  return {
    valid: true,
    errors: [],
    sanitized,
  };
}

/**
 * Validate message input (user messages to ContentAgent)
 */
export function validateMessage(message: string): ValidationResult {
  // Length check
  const lengthResult = validateLength(message, MAX_MESSAGE_LENGTH);
  if (!lengthResult.valid) {
    return lengthResult;
  }

  // Prompt injection check
  const injectionResult = detectPromptInjection(message);
  if (!injectionResult.valid) {
    return injectionResult;
  }

  // Sanitize
  const sanitized = sanitizeForAI(message);

  return {
    valid: true,
    errors: [],
    sanitized,
  };
}

/**
 * Validate artifact ID format (UUID v4)
 */
export function validateArtifactId(id: string): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return {
      valid: false,
      errors: ['Invalid artifact ID format (must be UUID v4)'],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Validate tone parameter
 */
export function validateTone(tone: string): ValidationResult {
  const validTones = ['professional', 'casual', 'enthusiastic'];

  if (!validTones.includes(tone)) {
    return {
      valid: false,
      errors: [`Invalid tone. Must be one of: ${validTones.join(', ')}`],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Validate artifact type parameter
 */
export function validateArtifactType(type: string): ValidationResult {
  const validTypes = ['blog', 'social_post', 'showcase'];

  if (!validTypes.includes(type)) {
    return {
      valid: false,
      errors: [`Invalid content type. Must be one of: ${validTypes.join(', ')}`],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}
