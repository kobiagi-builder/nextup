/**
 * Dynamic Variable Replacer
 *
 * Handles replacement of placeholders in mock data with actual runtime values.
 * Supports built-in replacements (traceId, timestamp) and context-based replacements.
 */

import crypto from 'crypto';

/**
 * Generate a unique trace ID for mock responses
 * Format: mock-{timestamp}-{random9chars}
 */
export function generateMockTraceId(prefix: string = 'mock'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a random relevance score between min and max
 */
export function generateRandomScore(min: number = 0.6, max: number = 1.0): number {
  return Math.random() * (max - min) + min;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply dynamic variable replacements to mock data
 *
 * Supports:
 * - {{traceId}} - Generate unique trace ID
 * - {{timestamp}} - Current ISO timestamp
 * - {{updated_at}} - Current ISO timestamp
 * - {{created_at}} - Current ISO timestamp
 * - {{uuid}} - Generate new UUID
 * - {{randomScore}} - Random number 0.6-1.0
 * - {{contextKey}} - Any key from the context object
 *
 * @param data - The mock data object to process
 * @param context - Dynamic context with actual values
 * @returns Processed mock data with replacements applied
 */
export function applyDynamicReplacements<T>(
  data: T,
  context: Record<string, unknown>
): T {
  // Convert to string for replacement
  const stringified = JSON.stringify(data);

  // Built-in replacements (functions that generate values)
  const builtInReplacements: Record<string, () => string> = {
    '{{traceId}}': () => generateMockTraceId(),
    '{{timestamp}}': () => new Date().toISOString(),
    '{{updated_at}}': () => new Date().toISOString(),
    '{{created_at}}': () => new Date().toISOString(),
    '{{uuid}}': () => generateUUID(),
    '{{randomScore}}': () => generateRandomScore().toFixed(2),
    '{{duration}}': () => String(Math.floor(Math.random() * 2000) + 500),
  };

  // Add context-based replacements
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string') {
        builtInReplacements[`{{${key}}}`] = () => value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        builtInReplacements[`{{${key}}}`] = () => String(value);
      } else if (typeof value === 'object') {
        // For objects, stringify them
        builtInReplacements[`{{${key}}}`] = () => JSON.stringify(value);
      }
    }
  }

  // Apply all replacements
  let result = stringified;
  for (const [pattern, replacer] of Object.entries(builtInReplacements)) {
    const regex = new RegExp(escapeRegex(pattern), 'g');
    result = result.replace(regex, replacer);
  }

  return JSON.parse(result) as T;
}

/**
 * Extract all placeholder patterns from mock data
 * Useful for identifying which dynamic fields exist in a mock file
 */
export function extractPlaceholders(data: unknown): string[] {
  const stringified = JSON.stringify(data);
  const regex = /\{\{(\w+)\}\}/g;
  const placeholders: Set<string> = new Set();

  let match;
  while ((match = regex.exec(stringified)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

/**
 * Validate that all required placeholders have values in context
 */
export function validateContext(
  data: unknown,
  context: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const placeholders = extractPlaceholders(data);
  const builtInKeys = ['traceId', 'timestamp', 'updated_at', 'created_at', 'uuid', 'randomScore', 'duration'];
  const missing: string[] = [];

  for (const placeholder of placeholders) {
    // Skip built-in replacements
    if (builtInKeys.includes(placeholder)) {
      continue;
    }

    // Check if context has this key
    if (!(placeholder in context) || context[placeholder] === undefined) {
      missing.push(placeholder);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
