/**
 * ProfileExtractionService Unit Tests
 *
 * Tests for the stripFences utility function.
 */

import { describe, it, expect } from 'vitest';
import { stripFences } from '../../../services/ProfileExtractionService.js';

describe('stripFences', () => {
  it('removes ```json ... ``` fences', () => {
    const input = '```json\n{"bio": "Hello"}\n```';
    expect(stripFences(input)).toBe('{"bio": "Hello"}');
  });

  it('removes bare ``` ... ``` fences (no language tag)', () => {
    const input = '```\n{"bio": "Hello"}\n```';
    expect(stripFences(input)).toBe('{"bio": "Hello"}');
  });

  it('returns plain JSON unchanged', () => {
    const input = '{"bio": "Hello"}';
    expect(stripFences(input)).toBe('{"bio": "Hello"}');
  });

  it('trims whitespace around and inside fences', () => {
    const input = '  ```json\n  {"bio": "Hello"}  \n```  ';
    expect(stripFences(input)).toBe('{"bio": "Hello"}');
  });

  it('handles multi-line JSON inside fences', () => {
    const json = '{\n  "about_me": {\n    "bio": "Expert"\n  }\n}';
    const input = `\`\`\`json\n${json}\n\`\`\``;
    const result = stripFences(input);
    expect(JSON.parse(result)).toEqual({
      about_me: { bio: 'Expert' },
    });
  });

  it('returns empty string for empty input', () => {
    expect(stripFences('')).toBe('');
    expect(stripFences('  ')).toBe('');
  });

  it('handles fences with extra whitespace after language tag', () => {
    const input = '```json   \n{"key": "value"}\n```';
    expect(stripFences(input)).toBe('{"key": "value"}');
  });
});
