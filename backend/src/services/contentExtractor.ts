/**
 * Content Extractor Service (Phase 2)
 *
 * Extracts text content from various file formats:
 * - DOCX via mammoth
 * - PDF via pdf-parse
 * - Plain text / Markdown (passthrough)
 *
 * All imports are dynamic to keep startup fast.
 */

import { logger } from '../lib/logger.js';

// =============================================================================
// Types
// =============================================================================

export interface ExtractionResult {
  success: boolean;
  content: string;
  wordCount: number;
  error?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// =============================================================================
// Format-Specific Extractors
// =============================================================================

export async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value.trim();

    if (!content || content.length < 10) {
      return {
        success: false,
        content: '',
        wordCount: 0,
        error: 'DOCX file appears to be empty or contains no extractable text.',
      };
    }

    return {
      success: true,
      content,
      wordCount: countWords(content),
    };
  } catch (error) {
    logger.error('[ContentExtractor] DOCX extraction failed', {
      sourceCode: 'extractFromDocx',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return {
      success: false,
      content: '',
      wordCount: 0,
      error: 'Failed to extract text from DOCX file.',
    };
  }
}

export async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const content = result.text.trim();

    // Clean up resources
    await parser.destroy();

    if (!content || content.length < 10) {
      return {
        success: false,
        content: '',
        wordCount: 0,
        error: 'PDF appears to be image-based. Please use a text-based PDF.',
      };
    }

    return {
      success: true,
      content,
      wordCount: countWords(content),
    };
  } catch (error) {
    logger.error('[ContentExtractor] PDF extraction failed', {
      sourceCode: 'extractFromPdf',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return {
      success: false,
      content: '',
      wordCount: 0,
      error: 'Failed to extract text from PDF file.',
    };
  }
}

export async function extractFromText(text: string): Promise<ExtractionResult> {
  const content = text.trim();
  return {
    success: true,
    content,
    wordCount: countWords(content),
  };
}

// =============================================================================
// MIME Type Router
// =============================================================================

export async function extractFromBuffer(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const normalizedMime = mimeType.split(';')[0].trim().toLowerCase();

  if (normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractFromDocx(buffer);
  }

  if (normalizedMime === 'application/pdf') {
    return extractFromPdf(buffer);
  }

  if (normalizedMime === 'text/plain' || normalizedMime === 'text/markdown') {
    return extractFromText(buffer.toString('utf-8'));
  }

  return {
    success: false,
    content: '',
    wordCount: 0,
    error: `Unsupported format: ${normalizedMime}`,
  };
}
