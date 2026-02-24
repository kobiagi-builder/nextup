# Implementation Spec: Writing References Redesign - Phase 2

**PRD**: ./prd-phase-2.md
**Estimated Effort**: L (Large)

## Technical Approach

Phase 2 introduces binary file parsing and URL-based file extraction. The core addition is a `ContentExtractorService` on the backend that handles DOCX (via `mammoth`) and PDF (via `pdf-parse`) extraction. Two new endpoints handle file upload (multipart) and file URL extraction (async with polling).

For file uploads, we use `multer` middleware for multipart handling with memory storage (no disk writes). Files under 5MB are extracted synchronously in the request; larger files get a 202 response and async processing. For file URLs, we download via `undici`, detect format, and extract — always async with 202 response.

The frontend extends the upload dialog with a new "Upload File" tab (drag-and-drop with format support) and "File URL" tab (URL input). References with `extraction_status: 'extracting'` auto-poll every 2s via React Query's `refetchInterval`.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/services/contentExtractor.ts` | ContentExtractorService — DOCX, PDF, MD, TXT extraction |
| `backend/src/controllers/writingExamplesUpload.controller.ts` | File upload + file URL extraction endpoints |
| `backend/src/routes/writingExamplesUpload.routes.ts` | Routes for upload and extract-url endpoints |
| `frontend/src/features/portfolio/components/writing-references/FileDropZone.tsx` | Drag-and-drop file upload component |
| `frontend/src/features/portfolio/components/writing-references/FileUrlInput.tsx` | URL input with validation for file URLs |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/routes/index.ts` | Register new upload routes |
| `backend/package.json` | Add `mammoth`, `pdf-parse`, `multer`, `@types/multer` |
| `frontend/src/features/portfolio/components/writing-references/ReferenceUploadDialog.tsx` | Add "Upload File" and "File URL" method tabs |
| `frontend/src/features/portfolio/hooks/useWritingExamples.ts` | Add upload mutation, extract-url mutation, retry mutation, polling for extracting status |
| `frontend/src/features/portfolio/components/writing-references/ReferenceCard.tsx` | Add retry button for failed status |
| `frontend/src/features/portfolio/types/portfolio.ts` | Add upload/extract input types |
| `backend/src/types/portfolio.ts` | Add extraction result types |

## Implementation Details

### 1. ContentExtractorService

**Overview**: Stateless service with format-specific extraction methods.

```typescript
// backend/src/services/contentExtractor.ts

export interface ExtractionResult {
  success: boolean;
  content: string;
  wordCount: number;
  error?: string;
}

export class ContentExtractorService {
  async extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value.trim();
    return {
      success: true,
      content,
      wordCount: this.countWords(content),
    };
  }

  async extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    const content = result.text.trim();

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
      wordCount: this.countWords(content),
    };
  }

  async extractFromText(text: string): Promise<ExtractionResult> {
    const content = text.trim();
    return {
      success: true,
      content,
      wordCount: this.countWords(content),
    };
  }

  async extractFromBuffer(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return this.extractFromDocx(buffer);
    }
    if (mimeType === 'application/pdf') {
      return this.extractFromPdf(buffer);
    }
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return this.extractFromText(buffer.toString('utf-8'));
    }
    return { success: false, content: '', wordCount: 0, error: `Unsupported format: ${mimeType}` };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}

export const contentExtractor = new ContentExtractorService();
```

**Key decisions**:
- Dynamic imports for `mammoth` and `pdf-parse` to keep startup fast
- Stateless singleton — no instance state, easy to test
- Image-based PDF detection via empty text result

**Implementation steps**:
1. Install `mammoth`, `pdf-parse` packages
2. Create service with 4 extraction methods
3. Add unit tests for each format

### 2. File Upload Endpoint

**Pattern to follow**: Existing controller patterns in `backend/src/controllers/`

```typescript
// backend/src/controllers/writingExamplesUpload.controller.ts

import multer from 'multer';
import { contentExtractor } from '../services/contentExtractor.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Accepted: .md, .txt, .docx, .pdf'));
    }
  },
});

export const uploadMiddleware = upload.single('file');

export const handleFileUpload = async (req: Request, res: Response) => {
  const file = req.file;
  const { name, artifact_type } = req.body;

  // 1. Create DB row with status 'extracting'
  const { data: row } = await getSupabase()
    .from('user_writing_examples')
    .insert({
      user_id: userId,
      name: name || file.originalname.replace(/\.[^/.]+$/, ''),
      content: '',
      word_count: 0,
      source_type: 'file_upload',
      artifact_type,
      extraction_status: 'extracting',
      is_active: true,
      analyzed_characteristics: {},
    })
    .select()
    .single();

  // 2. Extract content
  const result = await contentExtractor.extractFromBuffer(file.buffer, file.mimetype);

  // 3. Update row with result
  await getSupabase()
    .from('user_writing_examples')
    .update({
      content: result.content,
      word_count: result.wordCount,
      extraction_status: result.success ? 'success' : 'failed',
    })
    .eq('id', row.id);

  // 4. Return the updated row
  const { data: updated } = await getSupabase()
    .from('user_writing_examples')
    .select('*')
    .eq('id', row.id)
    .single();

  res.status(201).json(updated);
};
```

**Implementation steps**:
1. Create controller with multer middleware
2. Create route file and register in `routes/index.ts`
3. Handle sync extraction (file is in memory, extraction is fast)

### 3. File URL Extraction Endpoint

```typescript
export const handleFileUrlExtraction = async (req: Request, res: Response) => {
  const { url, name, artifact_type } = req.body;

  // 1. Validate URL
  if (!url.startsWith('https://')) {
    return res.status(400).json({ error: 'URL must use HTTPS' });
  }

  // SSRF prevention
  const hostname = new URL(url).hostname;
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
    return res.status(400).json({ error: 'Private URLs are not allowed' });
  }

  // 2. Create DB row with status 'extracting'
  const { data: row } = await getSupabase()
    .from('user_writing_examples')
    .insert({
      user_id: userId,
      name: name || new URL(url).pathname.split('/').pop() || 'URL Reference',
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

  // 3. Respond immediately with 202
  res.status(202).json(row);

  // 4. Download and extract asynchronously
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'User-Agent': 'NextUp/1.0 Content Extractor' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await contentExtractor.extractFromBuffer(buffer, contentType.split(';')[0]);

    await getSupabase()
      .from('user_writing_examples')
      .update({
        content: result.content,
        word_count: result.wordCount,
        extraction_status: result.success ? 'success' : 'failed',
      })
      .eq('id', row.id);
  } catch (error) {
    await getSupabase()
      .from('user_writing_examples')
      .update({ extraction_status: 'failed' })
      .eq('id', row.id);
  }
};
```

**Key decisions**:
- 202 response for async processing — client polls for status
- SSRF prevention: block private IPs and non-HTTPS
- 30s timeout on download
- Content-Type detection for format routing

### 4. Retry Endpoint

```typescript
export const handleRetry = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Fetch existing row
  const { data: existing } = await getSupabase()
    .from('user_writing_examples')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!existing || existing.extraction_status !== 'failed') {
    return res.status(400).json({ error: 'Can only retry failed extractions' });
  }

  // Reset status
  await getSupabase()
    .from('user_writing_examples')
    .update({ extraction_status: 'extracting' })
    .eq('id', id);

  res.status(202).json({ ...existing, extraction_status: 'extracting' });

  // Re-extract based on source_type
  if (existing.source_type === 'url' && existing.source_url) {
    // Re-download and extract (same as handleFileUrlExtraction step 4)
  }
  // file_upload retry requires stored file — defer to Phase 2.18 Supabase Storage
};
```

### 5. Frontend — Polling Hook

```typescript
// Add to useWritingExamples.ts

export function useWritingExamples(options: UseWritingExamplesOptions = {}) {
  return useQuery<UserWritingExample[]>({
    queryKey: [...writingExamplesKeys.list(), options],
    queryFn: async () => { /* ... existing ... */ },
    // Poll every 2s if any reference is still extracting
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasExtracting = data?.some(
        (r) => r.extraction_status === 'extracting' || r.extraction_status === 'pending'
      );
      return hasExtracting ? 2000 : false;
    },
  });
}
```

### 6. Frontend — FileDropZone Component

```typescript
// Drag-and-drop zone with visual feedback
interface FileDropZoneProps {
  onFile: (file: File) => void;
  accept: string; // ".md,.txt,.docx,.pdf"
  maxSize: number; // bytes
}

function FileDropZone({ onFile, accept, maxSize }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  // Handle drag events, file validation, size check
  // Show accepted formats and size limit
  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
        isDragging ? 'border-brand-300 bg-brand-300/5' : 'border-border'
      )}
      onDragOver={...}
      onDrop={...}
    >
      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      <p>Drag & drop or click to upload</p>
      <p className="text-xs text-muted-foreground">.md, .txt, .docx, .pdf (max 10MB)</p>
    </div>
  );
}
```

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user/writing-examples/upload` | Multipart file upload with extraction |
| `POST` | `/api/user/writing-examples/extract-url` | Download file from URL and extract |
| `POST` | `/api/user/writing-examples/:id/retry` | Retry failed extraction |

### Request/Response Examples

```typescript
// POST /api/user/writing-examples/upload
// Request: multipart/form-data
// - file: <binary>
// - name: "My Strategy Doc"
// - artifact_type: "showcase"

// Response (201)
{
  "id": "uuid",
  "name": "My Strategy Doc",
  "extraction_status": "success",
  "word_count": 2340,
  "content": "Extracted text...",
  ...
}

// POST /api/user/writing-examples/extract-url
// Request
{ "url": "https://example.com/doc.pdf", "artifact_type": "blog" }

// Response (202)
{
  "id": "uuid",
  "extraction_status": "extracting",
  ...
}

// POST /api/user/writing-examples/:id/retry
// Response (202)
{
  "id": "uuid",
  "extraction_status": "extracting",
  ...
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `testing/unit/backend/contentExtractor.test.ts` | DOCX extraction, PDF extraction, text extraction, error cases |
| `testing/unit/backend/writingExamplesUpload.test.ts` | Upload endpoint, URL extraction, retry logic |

**Key test cases**:
- DOCX with text content extracts correctly
- PDF with text layer extracts correctly
- Image-based PDF returns meaningful error
- File over 10MB is rejected
- Non-HTTPS URL is rejected
- Private IP URL is rejected (SSRF)
- Retry on failed extraction resets status and re-processes
- Invalid file type returns 400

### Manual Testing

- [ ] Upload a .docx file — extracted text appears in preview
- [ ] Upload a .pdf file — extracted text appears in preview
- [ ] Upload an image-based PDF — clear "image-based" error message
- [ ] Paste a URL to a hosted .docx — extraction completes, content shown
- [ ] See spinner while extraction is in progress
- [ ] See red badge + retry button for failed extraction
- [ ] Click retry — extraction re-attempts
- [ ] Drag-and-drop a file onto the drop zone

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| File too large (>10MB) | Return 413 `"File size exceeds 10MB limit"` |
| Unsupported file type | Return 400 `"Unsupported file type. Accepted: .md, .txt, .docx, .pdf"` |
| Image-based PDF | Set `extraction_status: 'failed'`, error: `"PDF appears to be image-based"` |
| URL download timeout | Set `extraction_status: 'failed'`, error: `"Download timed out after 30 seconds"` |
| URL download 404 | Set `extraction_status: 'failed'`, error: `"File not found at the provided URL"` |
| SSRF attempt | Return 400 `"Private URLs are not allowed"` |
| Mammoth/pdf-parse crash | Catch, set `extraction_status: 'failed'`, log error |

## Validation Commands

```bash
# Install new packages
cd backend && npm install mammoth pdf-parse multer @types/multer

# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Build
npm run build

# Tests
npm run test
```

## Rollout Considerations

- **Monitoring**: Log extraction durations and failure rates per format
- **Rollback plan**: New endpoints are additive — can disable routes without affecting Phase 1 functionality

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
