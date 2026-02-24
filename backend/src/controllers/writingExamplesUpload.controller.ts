/**
 * Writing Examples Upload Controller (Phase 2)
 *
 * Handles file upload, URL-based extraction, and retry for writing examples.
 * Works with ContentExtractorService for DOCX, PDF, MD, TXT extraction.
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { getSupabase } from '../lib/requestContext.js';
import { createClientWithAuth } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { extractFromBuffer } from '../services/contentExtractor.js';
import { scrapePublication, detectPlatform } from '../services/publicationScraper.js';
import type { ArtifactType } from '../types/portfolio.js';

// =============================================================================
// Multer Configuration
// =============================================================================

const ALLOWED_MIMES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['.md', '.txt', '.docx', '.pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() || '');
    if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Accepted: .md, .txt, .docx, .pdf'));
    }
  },
});

export const uploadMiddleware = upload.single('file');

// =============================================================================
// Validation Helpers
// =============================================================================

const VALID_ARTIFACT_TYPES: ArtifactType[] = ['blog', 'social_post', 'showcase'];

function validateArtifactType(artifactType: unknown): artifactType is ArtifactType {
  return typeof artifactType === 'string' && VALID_ARTIFACT_TYPES.includes(artifactType as ArtifactType);
}

function isPrivateUrl(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.2') ||
    hostname.startsWith('172.3') ||
    hostname === '0.0.0.0' ||
    hostname === '[::]' ||
    hostname === '[::1]'
  );
}

// =============================================================================
// POST /api/user/writing-examples/upload
// =============================================================================

export const handleFileUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const file = req.file;

    if (!userId || !req.accessToken) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'Validation error', message: 'No file provided' });
      return;
    }

    const { name, artifact_type } = req.body;

    if (!validateArtifactType(artifact_type)) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid artifact_type. Must be one of: ${VALID_ARTIFACT_TYPES.join(', ')}`,
      });
      return;
    }

    const displayName = (name && typeof name === 'string' && name.trim())
      ? name.trim()
      : file.originalname.replace(/\.[^/.]+$/, '');

    logger.info('[WritingExamplesUpload] Processing file upload', {
      hasFile: true,
      mimeType: file.mimetype,
      fileSizeKB: Math.round(file.size / 1024),
      hasArtifactType: true,
    });

    // Infer MIME from extension when browser sends a generic type (e.g., .md → application/octet-stream)
    let mimeType = file.mimetype;
    if (!ALLOWED_MIMES.includes(mimeType)) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      const EXT_TO_MIME: Record<string, string> = {
        md: 'text/markdown',
        txt: 'text/plain',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf: 'application/pdf',
      };
      mimeType = (ext && EXT_TO_MIME[ext]) || mimeType;
    }

    // Extract content
    const result = await extractFromBuffer(file.buffer, mimeType);

    // Multer's busboy streams break AsyncLocalStorage context, so we create
    // the user-scoped Supabase client directly from the request token.
    const supabase = createClientWithAuth(req.accessToken);

    // Insert with extraction result
    const { data, error } = await supabase
      .from('user_writing_examples')
      .insert({
        user_id: userId,
        name: displayName,
        content: result.content,
        word_count: result.wordCount,
        source_type: 'file_upload',
        artifact_type,
        extraction_status: result.success ? 'success' : 'failed',
        is_active: true,
        analyzed_characteristics: {},
      })
      .select()
      .single();

    if (error) {
      logger.error('[WritingExamplesUpload] Database error in handleFileUpload', {
        sourceCode: 'handleFileUpload',
        error,
      });
      res.status(500).json({ error: 'Database error', message: 'Failed to create writing example' });
      return;
    }

    logger.info('[WritingExamplesUpload] File upload complete', {
      hasExampleId: !!data.id,
      extractionSuccess: result.success,
      wordCount: result.wordCount,
    });

    res.status(201).json(data);
  } catch (error) {
    logger.error('[WritingExamplesUpload] Error in handleFileUpload', {
      sourceCode: 'handleFileUpload',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

// =============================================================================
// POST /api/user/writing-examples/extract-url
// =============================================================================

export const handleFileUrlExtraction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' });
      return;
    }

    const { url, name, artifact_type } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
      res.status(400).json({ error: 'Validation error', message: 'URL must use HTTPS' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: 'Validation error', message: 'Invalid URL format' });
      return;
    }

    // SSRF prevention
    if (isPrivateUrl(parsedUrl.hostname)) {
      res.status(400).json({ error: 'Validation error', message: 'Private URLs are not allowed' });
      return;
    }

    if (!validateArtifactType(artifact_type)) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid artifact_type. Must be one of: ${VALID_ARTIFACT_TYPES.join(', ')}`,
      });
      return;
    }

    const displayName = (name && typeof name === 'string' && name.trim())
      ? name.trim()
      : parsedUrl.pathname.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'URL Reference';

    logger.info('[WritingExamplesUpload] Starting URL extraction', {
      hasUrl: true,
      hostname: parsedUrl.hostname,
      hasArtifactType: true,
    });

    // Create row with extracting status
    const { data: row, error: insertError } = await getSupabase()
      .from('user_writing_examples')
      .insert({
        user_id: userId,
        name: displayName,
        content: '',
        word_count: 0,
        source_type: 'url',
        source_url: url,
        artifact_type,
        extraction_status: 'extracting',
        is_active: true,
        analyzed_characteristics: {},
      })
      .select()
      .single();

    if (insertError || !row) {
      logger.error('[WritingExamplesUpload] Database error creating extraction row', {
        sourceCode: 'handleFileUrlExtraction',
        error: insertError,
      });
      res.status(500).json({ error: 'Database error', message: 'Failed to create writing example' });
      return;
    }

    // Respond 202 immediately — extraction continues async
    res.status(202).json(row);

    // Async extraction (after response sent)
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
        headers: { 'User-Agent': 'NextUp/1.0 Content Extractor' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const buffer = Buffer.from(await response.arrayBuffer());
      const result = await extractFromBuffer(buffer, contentType.split(';')[0]);

      await getSupabase()
        .from('user_writing_examples')
        .update({
          content: result.content,
          word_count: result.wordCount,
          extraction_status: result.success ? 'success' : 'failed',
        })
        .eq('id', row.id);

      logger.info('[WritingExamplesUpload] URL extraction complete', {
        hasExampleId: !!row.id,
        extractionSuccess: result.success,
        wordCount: result.wordCount,
      });
    } catch (asyncError) {
      logger.error('[WritingExamplesUpload] Async URL extraction failed', {
        sourceCode: 'handleFileUrlExtraction:async',
        hasExampleId: !!row.id,
        error: asyncError instanceof Error ? asyncError : new Error(String(asyncError)),
      });

      await getSupabase()
        .from('user_writing_examples')
        .update({ extraction_status: 'failed' })
        .eq('id', row.id);
    }
  } catch (error) {
    logger.error('[WritingExamplesUpload] Error in handleFileUrlExtraction', {
      sourceCode: 'handleFileUrlExtraction',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

// =============================================================================
// POST /api/user/writing-examples/:id/retry
// =============================================================================

export const handleRetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' });
      return;
    }

    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Writing example ID is required' });
      return;
    }

    // Fetch existing row and verify ownership
    const { data: existing, error: fetchError } = await getSupabase()
      .from('user_writing_examples')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Not found', message: 'Writing example not found' });
      return;
    }

    if (existing.extraction_status !== 'failed') {
      res.status(400).json({
        error: 'Invalid state',
        message: 'Can only retry failed extractions',
      });
      return;
    }

    // Only URL-based refs can be retried
    if (existing.source_type !== 'url' || !existing.source_url) {
      res.status(400).json({
        error: 'Cannot retry',
        message: 'File uploads cannot be retried. Please re-upload the file.',
      });
      return;
    }

    logger.info('[WritingExamplesUpload] Retrying extraction', {
      hasExampleId: !!id,
      sourceType: existing.source_type,
    });

    // Reset status to extracting
    await getSupabase()
      .from('user_writing_examples')
      .update({ extraction_status: 'extracting' })
      .eq('id', id);

    // Respond 202
    res.status(202).json({ ...existing, extraction_status: 'extracting' });

    // Async re-extraction — detect whether to use publication scraper or file extractor
    const isFileUrl = /\.(md|txt|docx|pdf)(\?|$)/i.test(existing.source_url);

    try {
      let content: string;
      let wordCount: number;
      let success: boolean;
      let updatedName: string | undefined;

      if (isFileUrl) {
        // File URL — download and extract via contentExtractor
        const response = await fetch(existing.source_url, {
          signal: AbortSignal.timeout(30_000),
          headers: { 'User-Agent': 'NextUp/1.0 Content Extractor' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const buffer = Buffer.from(await response.arrayBuffer());
        const result = await extractFromBuffer(buffer, contentType.split(';')[0]);

        content = result.content;
        wordCount = result.wordCount;
        success = result.success;
      } else {
        // Publication URL — use publication scraper
        const result = await scrapePublication(existing.source_url);

        content = result.content;
        wordCount = result.wordCount;
        success = result.success;
        updatedName = result.title || undefined;
      }

      await getSupabase()
        .from('user_writing_examples')
        .update({
          ...(updatedName ? { name: updatedName } : {}),
          content,
          word_count: wordCount,
          extraction_status: success ? 'success' : 'failed',
        })
        .eq('id', id);

      logger.info('[WritingExamplesUpload] Retry extraction complete', {
        hasExampleId: !!id,
        extractionSuccess: success,
        isFileUrl,
      });
    } catch (asyncError) {
      logger.error('[WritingExamplesUpload] Retry extraction failed', {
        sourceCode: 'handleRetry:async',
        hasExampleId: !!id,
        error: asyncError instanceof Error ? asyncError : new Error(String(asyncError)),
      });

      await getSupabase()
        .from('user_writing_examples')
        .update({ extraction_status: 'failed' })
        .eq('id', id);
    }
  } catch (error) {
    logger.error('[WritingExamplesUpload] Error in handleRetry', {
      sourceCode: 'handleRetry',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

// =============================================================================
// POST /api/user/writing-examples/extract-publication
// =============================================================================

export const handlePublicationExtraction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' });
      return;
    }

    const { url, name, artifact_type } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
      res.status(400).json({ error: 'Validation error', message: 'URL must use HTTPS' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: 'Validation error', message: 'Invalid URL format' });
      return;
    }

    // SSRF prevention
    if (isPrivateUrl(parsedUrl.hostname)) {
      res.status(400).json({ error: 'Validation error', message: 'Private URLs are not allowed' });
      return;
    }

    if (!validateArtifactType(artifact_type)) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid artifact_type. Must be one of: ${VALID_ARTIFACT_TYPES.join(', ')}`,
      });
      return;
    }

    const platform = detectPlatform(url);
    const displayName = (name && typeof name === 'string' && name.trim())
      ? name.trim()
      : `${platform.charAt(0).toUpperCase() + platform.slice(1)} reference`;

    logger.info('[WritingExamplesUpload] Starting publication extraction', {
      hasUrl: true,
      platform,
      hasArtifactType: true,
    });

    // Create row with extracting status
    const { data: row, error: insertError } = await getSupabase()
      .from('user_writing_examples')
      .insert({
        user_id: userId,
        name: displayName,
        content: '',
        word_count: 0,
        source_type: 'url',
        source_url: url,
        artifact_type,
        extraction_status: 'extracting',
        is_active: true,
        analyzed_characteristics: {},
      })
      .select()
      .single();

    if (insertError || !row) {
      logger.error('[WritingExamplesUpload] Database error creating publication row', {
        sourceCode: 'handlePublicationExtraction',
        error: insertError,
      });
      res.status(500).json({ error: 'Database error', message: 'Failed to create writing example' });
      return;
    }

    // Respond 202 immediately — scraping continues async
    res.status(202).json(row);

    // Async scraping (after response sent)
    try {
      const result = await scrapePublication(url);

      // Update name from scraped title if user didn't provide one
      const updatedName = (name && typeof name === 'string' && name.trim())
        ? undefined
        : result.title || undefined;

      await getSupabase()
        .from('user_writing_examples')
        .update({
          ...(updatedName ? { name: updatedName } : {}),
          content: result.content,
          word_count: result.wordCount,
          extraction_status: result.success ? 'success' : 'failed',
        })
        .eq('id', row.id);

      logger.info('[WritingExamplesUpload] Publication extraction complete', {
        hasExampleId: !!row.id,
        platform,
        extractionSuccess: result.success,
        wordCount: result.wordCount,
      });
    } catch (asyncError) {
      logger.error('[WritingExamplesUpload] Async publication extraction failed', {
        sourceCode: 'handlePublicationExtraction:async',
        hasExampleId: !!row.id,
        error: asyncError instanceof Error ? asyncError : new Error(String(asyncError)),
      });

      await getSupabase()
        .from('user_writing_examples')
        .update({ extraction_status: 'failed' })
        .eq('id', row.id);
    }
  } catch (error) {
    logger.error('[WritingExamplesUpload] Error in handlePublicationExtraction', {
      sourceCode: 'handlePublicationExtraction',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
