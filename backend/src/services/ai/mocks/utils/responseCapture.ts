/**
 * Response Capture Utility
 *
 * Captures real API responses for mock data generation.
 * Automatically identifies dynamic fields and creates mock templates.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../../../../lib/logger.js';

/**
 * Dynamic field patterns that should be replaced with placeholders
 */
const DYNAMIC_FIELD_PATTERNS = [
  'traceId',
  'trace_id',
  'id',
  'artifactId',
  'artifact_id',
  'timestamp',
  'created_at',
  'updated_at',
  'completedAt',
  'duration',
  'uuid',
];

/**
 * Capture a real API response for mock data generation
 *
 * @param captureDir - Directory to save captured responses
 * @param toolName - Name of the tool (e.g., 'generateContentSkeleton')
 * @param variant - Variant identifier (e.g., 'blog', 'professional')
 * @param input - Input parameters used for the API call
 * @param response - The actual API response
 */
export async function captureResponse(
  captureDir: string,
  toolName: string,
  variant: string,
  input: Record<string, unknown>,
  response: unknown
): Promise<void> {
  try {
    // Create directory structure
    const toolDir = path.join(captureDir, toolName);
    if (!fs.existsSync(toolDir)) {
      fs.mkdirSync(toolDir, { recursive: true });
    }

    // Generate filename with timestamp and input hash
    const inputHash = crypto
      .createHash('md5')
      .update(JSON.stringify(input))
      .digest('hex')
      .substring(0, 8);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${variant}_${timestamp}_${inputHash}.json`;
    const filePath = path.join(toolDir, filename);

    // Identify dynamic fields
    const dynamicFields = identifyDynamicFields(response);

    // Create mock template
    const mockTemplate = createMockTemplate(response, dynamicFields);

    // Prepare capture data
    const captureData = {
      capturedAt: new Date().toISOString(),
      toolName,
      variant,
      input: sanitizeInput(input),
      response,
      metadata: {
        dynamicFields,
        inputHash,
      },
      mockTemplate,
    };

    fs.writeFileSync(filePath, JSON.stringify(captureData, null, 2));

    logger.info('[ResponseCapture] Captured API response', {
      toolName,
      variant,
      filePath,
      dynamicFieldCount: dynamicFields.length,
    });
  } catch (error) {
    logger.error('[ResponseCapture] ' + (error instanceof Error ? error.message : String(error)), {
      toolName,
      variant,
    });
  }
}

/**
 * Identify fields that should be dynamic in mock data
 */
function identifyDynamicFields(response: unknown): string[] {
  const foundFields: string[] = [];

  function walk(obj: unknown, currentPath: string = ''): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const fieldPath = currentPath ? `${currentPath}.${key}` : key;

        // Check if key matches any dynamic pattern
        const isDynamic = DYNAMIC_FIELD_PATTERNS.some(pattern =>
          key.toLowerCase().includes(pattern.toLowerCase())
        );

        if (isDynamic) {
          foundFields.push(fieldPath);
        }

        // Recurse into nested objects
        walk(value, fieldPath);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        walk(item, `${currentPath}[${index}]`);
      });
    }
  }

  walk(response);
  return foundFields;
}

/**
 * Create a mock template with placeholders for dynamic fields
 */
function createMockTemplate(response: unknown, dynamicFields: string[]): unknown {
  const template = JSON.parse(JSON.stringify(response));

  for (const fieldPath of dynamicFields) {
    // Extract the field name from the path
    const fieldName = fieldPath.split('.').pop()?.replace(/\[\d+\]/g, '') || fieldPath;
    setNestedValue(template, fieldPath, `{{${fieldName}}}`);
  }

  return template;
}

/**
 * Set a value at a nested path in an object
 */
function setNestedValue(
  obj: Record<string, unknown>,
  pathStr: string,
  value: unknown
): void {
  // Parse path like "metadata.completedAt" or "items[0].id"
  const pathParts: (string | number)[] = [];
  const regex = /([^.[\]]+)|\[(\d+)\]/g;
  let match;

  while ((match = regex.exec(pathStr)) !== null) {
    if (match[1]) {
      pathParts.push(match[1]);
    } else if (match[2]) {
      pathParts.push(parseInt(match[2], 10));
    }
  }

  let current: unknown = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (current === undefined || current === null) return;

    if (typeof part === 'number') {
      current = (current as unknown[])[part];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  const lastPart = pathParts[pathParts.length - 1];
  if (current !== undefined && current !== null) {
    if (typeof lastPart === 'number') {
      (current as unknown[])[lastPart] = value;
    } else {
      (current as Record<string, unknown>)[lastPart] = value;
    }
  }
}

/**
 * Sanitize input by removing sensitive data
 */
function sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['token', 'apiKey', 'api_key', 'password', 'secret', 'key'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const isSensitive = sensitiveKeys.some(s =>
      key.toLowerCase().includes(s.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = `[TRUNCATED: ${value.length} chars]`;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * List all captured responses for a tool
 */
export function listCapturedResponses(
  captureDir: string,
  toolName: string
): string[] {
  const toolDir = path.join(captureDir, toolName);

  if (!fs.existsSync(toolDir)) {
    return [];
  }

  return fs.readdirSync(toolDir).filter(f => f.endsWith('.json'));
}

/**
 * Load a captured response from file
 */
export function loadCapturedResponse<T>(
  captureDir: string,
  toolName: string,
  filename: string
): T | null {
  const filePath = path.join(captureDir, toolName, filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}
