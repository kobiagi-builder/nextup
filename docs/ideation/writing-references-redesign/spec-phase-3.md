# Implementation Spec: Writing References Redesign - Phase 3

**PRD**: ./prd-phase-3.md
**Estimated Effort**: L (Large)

## Technical Approach

Phase 3 adds publication URL scraping for LinkedIn, Medium, Substack, and Reddit. The approach uses `cheerio` for HTML parsing (no headless browser) and platform-specific extraction logic. Reddit uses its public JSON API. All scraping is async with the 202-and-poll pattern from Phase 2.

The `PublicationScraperService` is modular: each platform has its own scraper function, and a router detects the platform from the URL and dispatches accordingly. Unrecognized URLs get a generic Readability-style extraction attempt.

Rate limiting (5 requests/user/minute) is implemented as Express middleware using an in-memory store (sufficient for single-server deployment). URL-hash caching prevents re-scraping the same URL within 1 hour.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/services/publicationScraper.ts` | PublicationScraperService — platform-specific scrapers |
| `backend/src/services/scrapers/linkedinScraper.ts` | LinkedIn post + article extraction |
| `backend/src/services/scrapers/mediumScraper.ts` | Medium article extraction |
| `backend/src/services/scrapers/substackScraper.ts` | Substack post extraction |
| `backend/src/services/scrapers/redditScraper.ts` | Reddit post extraction (JSON API) |
| `backend/src/services/scrapers/genericScraper.ts` | Generic Readability-style fallback |
| `backend/src/services/scrapers/index.ts` | Barrel exports + platform detection |
| `backend/src/middleware/scrapeRateLimiter.ts` | Per-user rate limiting for scrape endpoints |
| `frontend/src/features/portfolio/components/writing-references/PublicationUrlInput.tsx` | URL input with platform auto-detection and icons |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/controllers/writingExamplesUpload.controller.ts` | Add `handlePublicationExtraction` handler |
| `backend/src/routes/writingExamplesUpload.routes.ts` | Add `/extract-publication` route with rate limiter |
| `backend/package.json` | Add `cheerio` |
| `frontend/src/features/portfolio/components/writing-references/ReferenceUploadDialog.tsx` | Add "Publication URL" method tab |
| `frontend/src/features/portfolio/components/writing-references/ReferenceCard.tsx` | Add platform-specific icons, clickable source URL |
| `frontend/src/features/portfolio/types/portfolio.ts` | Add `platform` field, platform type |

## Implementation Details

### 1. Platform Detection

**Overview**: Detect platform from URL pattern before dispatching to scraper.

```typescript
// backend/src/services/scrapers/index.ts

export type Platform = 'linkedin' | 'medium' | 'substack' | 'reddit' | 'generic';

const PLATFORM_PATTERNS: { platform: Platform; patterns: RegExp[] }[] = [
  {
    platform: 'linkedin',
    patterns: [
      /linkedin\.com\/posts\//,
      /linkedin\.com\/pulse\//,
      /linkedin\.com\/feed\/update\//,
    ],
  },
  {
    platform: 'medium',
    patterns: [
      /medium\.com\//,
      /\.medium\.com\//,
      // Custom domain Medium blogs detected by meta tags during scraping
    ],
  },
  {
    platform: 'substack',
    patterns: [
      /\.substack\.com\/p\//,
      // Custom domain Substacks detected by meta tags during scraping
    ],
  },
  {
    platform: 'reddit',
    patterns: [
      /reddit\.com\/r\/.*\/comments\//,
      /old\.reddit\.com\/r\/.*\/comments\//,
    ],
  },
];

export function detectPlatform(url: string): Platform {
  for (const { platform, patterns } of PLATFORM_PATTERNS) {
    if (patterns.some((p) => p.test(url))) return platform;
  }
  return 'generic';
}
```

**Key decisions**:
- Regex-based detection is fast and deterministic
- `generic` fallback ensures any URL gets attempted
- Custom domain detection deferred to scraper-level meta tag inspection

### 2. LinkedIn Scraper

```typescript
// backend/src/services/scrapers/linkedinScraper.ts
import * as cheerio from 'cheerio';

export interface ScrapeResult {
  success: boolean;
  content: string;
  wordCount: number;
  title?: string;
  platform: Platform;
  error?: string;
}

export async function scrapeLinkedIn(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    return { success: false, content: '', wordCount: 0, platform: 'linkedin', error: `HTTP ${response.status}` };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // LinkedIn articles (pulse) have <article> tags
  let content = $('article').text().trim();

  // LinkedIn posts - extract from meta description or structured data
  if (!content) {
    content = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }

  // Try JSON-LD structured data
  if (!content) {
    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd);
        content = data.articleBody || data.description || '';
      } catch { /* ignore parse errors */ }
    }
  }

  if (!content) {
    return {
      success: false,
      content: '',
      wordCount: 0,
      platform: 'linkedin',
      error: 'Could not extract content from this LinkedIn post. The post may require authentication to view.',
    };
  }

  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || undefined;

  return {
    success: true,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    title,
    platform: 'linkedin',
  };
}
```

**Key decisions**:
- No auth — only works for public posts. Private/connection-only posts will fail gracefully.
- Multiple extraction strategies: `<article>` → OG description → JSON-LD
- Clear error message when content can't be extracted

### 3. Medium Scraper

```typescript
// backend/src/services/scrapers/mediumScraper.ts
import * as cheerio from 'cheerio';

export async function scrapeMedium(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)' },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Medium articles use <article> tag
  const article = $('article');
  let content = '';

  if (article.length) {
    // Extract paragraphs, excluding UI elements
    content = article.find('p, h1, h2, h3, h4, blockquote, li')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join('\n\n');
  }

  // Fallback: meta description
  if (!content) {
    content = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }

  if (!content) {
    return {
      success: false, content: '', wordCount: 0, platform: 'medium',
      error: 'Could not extract content from this Medium article. It may be behind a paywall.',
    };
  }

  const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text() || undefined;

  return {
    success: true,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    title,
    platform: 'medium',
  };
}
```

### 4. Substack Scraper

```typescript
// backend/src/services/scrapers/substackScraper.ts
import * as cheerio from 'cheerio';

export async function scrapeSubstack(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)' },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Substack post body
  const postBody = $('.post-content, .body.markup, [class*="post-content"]');
  let content = '';

  if (postBody.length) {
    content = postBody.find('p, h1, h2, h3, h4, blockquote, li')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join('\n\n');
  }

  if (!content) {
    content = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }

  if (!content) {
    return {
      success: false, content: '', wordCount: 0, platform: 'substack',
      error: 'Could not extract content from this Substack post.',
    };
  }

  const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text() || undefined;

  return { success: true, content, wordCount: content.split(/\s+/).filter(Boolean).length, title, platform: 'substack' };
}
```

### 5. Reddit Scraper

```typescript
// backend/src/services/scrapers/redditScraper.ts

export async function scrapeReddit(url: string): Promise<ScrapeResult> {
  // Use Reddit's JSON API: append .json to the URL
  const jsonUrl = url.replace(/\/?$/, '.json');

  const response = await fetch(jsonUrl, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'NextUp/1.0 Content Extractor' },
  });

  if (!response.ok) {
    return {
      success: false, content: '', wordCount: 0, platform: 'reddit',
      error: `Reddit API returned ${response.status}`,
    };
  }

  const data = await response.json();

  // Reddit JSON structure: [listing, comments]
  // listing.data.children[0].data contains the post
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) {
    return {
      success: false, content: '', wordCount: 0, platform: 'reddit',
      error: 'Could not parse Reddit post data.',
    };
  }

  const content = post.selftext || '';
  const title = post.title || undefined;

  if (!content) {
    return {
      success: false, content: '', wordCount: 0, platform: 'reddit',
      error: 'This Reddit post has no text content (may be a link or image post).',
    };
  }

  return {
    success: true,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    title,
    platform: 'reddit',
  };
}
```

**Key decisions**:
- Reddit JSON API is public, no auth needed, returns markdown selftext
- Only extracts original post, not comments
- Link/image posts return clear error

### 6. Generic Fallback Scraper

```typescript
// backend/src/services/scrapers/genericScraper.ts
import * as cheerio from 'cheerio';

export async function scrapeGeneric(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)' },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Try article tag first
  let content = $('article').text().trim();

  // Try main content area
  if (!content) content = $('main').text().trim();

  // Try largest text block (Readability heuristic)
  if (!content) {
    let largestBlock = '';
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > largestBlock.length) largestBlock = text;
    });
    // Collect all substantial paragraphs
    content = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 50)
      .join('\n\n');
  }

  if (!content || content.length < 50) {
    return {
      success: false, content: '', wordCount: 0, platform: 'generic',
      error: 'Could not extract meaningful content from this URL.',
    };
  }

  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || undefined;

  return {
    success: true,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    title,
    platform: 'generic',
  };
}
```

### 7. PublicationScraperService (Router)

```typescript
// backend/src/services/publicationScraper.ts
import { detectPlatform } from './scrapers/index.js';
import { scrapeLinkedIn } from './scrapers/linkedinScraper.js';
import { scrapeMedium } from './scrapers/mediumScraper.js';
import { scrapeSubstack } from './scrapers/substackScraper.js';
import { scrapeReddit } from './scrapers/redditScraper.js';
import { scrapeGeneric } from './scrapers/genericScraper.js';
import { createHash } from 'crypto';
import type { ScrapeResult } from './scrapers/linkedinScraper.js';

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { result: ScrapeResult; expiry: number }>();

export class PublicationScraperService {
  async scrape(url: string): Promise<ScrapeResult> {
    // Check cache
    const cacheKey = createHash('md5').update(url).digest('hex');
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    const platform = detectPlatform(url);

    let result: ScrapeResult;
    switch (platform) {
      case 'linkedin': result = await scrapeLinkedIn(url); break;
      case 'medium':   result = await scrapeMedium(url); break;
      case 'substack':  result = await scrapeSubstack(url); break;
      case 'reddit':    result = await scrapeReddit(url); break;
      default:          result = await scrapeGeneric(url); break;
    }

    // Cache successful results for 1 hour
    if (result.success) {
      cache.set(cacheKey, { result, expiry: Date.now() + 60 * 60 * 1000 });
    }

    return result;
  }
}

export const publicationScraper = new PublicationScraperService();
```

### 8. Rate Limiter Middleware

```typescript
// backend/src/middleware/scrapeRateLimiter.ts

const userRequests = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

export function scrapeRateLimiter(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const now = Date.now();
  const entry = userRequests.get(userId);

  if (!entry || entry.resetAt < now) {
    userRequests.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Maximum ${MAX_REQUESTS} scrape requests per minute. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
    });
  }

  entry.count++;
  next();
}
```

### 9. Publication Extraction Endpoint

```typescript
// Added to writingExamplesUpload.controller.ts

export const handlePublicationExtraction = async (req: Request, res: Response) => {
  const { url, name, artifact_type } = req.body;

  // Validate URL
  if (!url || !url.startsWith('https://')) {
    return res.status(400).json({ error: 'URL must use HTTPS' });
  }

  // Detect platform for display
  const platform = detectPlatform(url);

  // Create DB row
  const { data: row } = await getSupabase()
    .from('user_writing_examples')
    .insert({
      user_id: userId,
      name: name || `${platform} reference`,
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

  res.status(202).json(row);

  // Scrape asynchronously
  try {
    const result = await publicationScraper.scrape(url);

    await getSupabase()
      .from('user_writing_examples')
      .update({
        name: name || result.title || `${platform} reference`,
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

### 10. Frontend — PublicationUrlInput Component

```typescript
interface PublicationUrlInputProps {
  onSubmit: (url: string, name?: string) => void;
  isSubmitting: boolean;
}

const PLATFORM_ICONS: Record<Platform, { icon: React.ComponentType; label: string; color: string }> = {
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'text-blue-600' },
  medium: { icon: BookOpen, label: 'Medium', color: 'text-foreground' },
  substack: { icon: Mail, label: 'Substack', color: 'text-orange-500' },
  reddit: { icon: MessageCircle, label: 'Reddit', color: 'text-orange-600' },
  generic: { icon: Globe, label: 'Website', color: 'text-muted-foreground' },
};

function PublicationUrlInput({ onSubmit, isSubmitting }: PublicationUrlInputProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  // Auto-detect platform from URL
  const detectedPlatform = useMemo(() => detectPlatformClient(url), [url]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Publication URL</label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://linkedin.com/posts/... or https://medium.com/..."
        />
        {/* Platform detection badge */}
        {detectedPlatform && url.length > 10 && (
          <div className="flex items-center gap-2 text-sm">
            <PlatformIcon platform={detectedPlatform} />
            <span>{PLATFORM_ICONS[detectedPlatform].label} detected</span>
          </div>
        )}
      </div>

      {/* Supported platforms chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PLATFORM_ICONS).filter(([k]) => k !== 'generic').map(([key, { label }]) => (
          <span key={key} className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
            {label}
          </span>
        ))}
      </div>

      {/* Optional name override */}
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reference name (auto-detected from title)" />

      <Button onClick={() => onSubmit(url, name || undefined)} disabled={!url || isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Extract Content
      </Button>
    </div>
  );
}
```

### 11. Frontend — Platform Icons on ReferenceCard

```typescript
// Add to ReferenceCard.tsx

function getSourceIcon(reference: UserWritingExample) {
  if (reference.source_type === 'url' && reference.source_url) {
    const platform = detectPlatformClient(reference.source_url);
    return PLATFORM_ICONS[platform];
  }
  if (reference.source_type === 'file_upload') return { icon: FileText, label: 'File', color: 'text-blue-500' };
  return { icon: Type, label: 'Pasted', color: 'text-muted-foreground' };
}

// In the card JSX, add clickable source URL:
{reference.source_url && (
  <a
    href={reference.source_url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-brand-300 hover:underline truncate max-w-[200px] inline-block"
    onClick={(e) => e.stopPropagation()}
  >
    {new URL(reference.source_url).hostname}
  </a>
)}
```

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user/writing-examples/extract-publication` | Scrape content from publication URL |

### Request/Response Examples

```typescript
// POST /api/user/writing-examples/extract-publication
// Request
{
  "url": "https://linkedin.com/pulse/my-article-about-strategy-12345",
  "artifact_type": "showcase"
}

// Response (202)
{
  "id": "uuid",
  "name": "linkedin reference",
  "extraction_status": "extracting",
  "source_url": "https://linkedin.com/pulse/my-article-about-strategy-12345",
  "artifact_type": "showcase",
  ...
}

// After polling (GET /api/user/writing-examples?artifact_type=showcase):
{
  "id": "uuid",
  "name": "My Article About Strategy",
  "extraction_status": "success",
  "content": "Full extracted article text...",
  "word_count": 1850,
  ...
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `testing/unit/backend/scrapers/linkedinScraper.test.ts` | LinkedIn post + article extraction |
| `testing/unit/backend/scrapers/mediumScraper.test.ts` | Medium article extraction |
| `testing/unit/backend/scrapers/redditScraper.test.ts` | Reddit JSON API extraction |
| `testing/unit/backend/scrapers/platformDetection.test.ts` | URL → platform detection |
| `testing/unit/backend/scrapeRateLimiter.test.ts` | Rate limiting behavior |

**Key test cases**:
- LinkedIn article URL correctly routes to LinkedIn scraper
- Medium custom domain detected as Medium
- Reddit URL returns selftext, not comments
- Unknown URL falls through to generic scraper
- Rate limiter blocks 6th request within 1 minute
- Cache returns cached result for same URL within 1 hour
- SSRF prevention blocks private IPs

### Manual Testing

- [ ] Paste a public LinkedIn post URL — content extracted
- [ ] Paste a LinkedIn Pulse article URL — content extracted
- [ ] Paste a Medium article URL — content extracted
- [ ] Paste a Substack post URL — content extracted
- [ ] Paste a Reddit self-post URL — post text extracted (no comments)
- [ ] Paste an unknown blog URL — generic extraction attempted
- [ ] Platform detected and shown before submission
- [ ] Platform icon shows on reference card after extraction
- [ ] Source URL is clickable on reference card
- [ ] 6th scrape request within 1 minute shows rate limit error

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| LinkedIn post requires auth | `extraction_status: 'failed'`, error: `"Could not extract content. The post may require authentication."` |
| Medium paywall | `extraction_status: 'failed'`, error: `"Could not extract content. It may be behind a paywall."` |
| Reddit link/image post | `extraction_status: 'failed'`, error: `"This Reddit post has no text content."` |
| Rate limit exceeded | Return 429 with seconds until reset |
| Scrape timeout (30s) | `extraction_status: 'failed'`, error: `"Request timed out. The website may be slow or blocking requests."` |
| Generic extraction fails | `extraction_status: 'failed'`, error: `"Could not extract meaningful content from this URL."` |

## Validation Commands

```bash
# Install new packages
cd backend && npm install cheerio

# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Build
npm run build

# Tests
npm run test
```

## Rollout Considerations

- **Monitoring**: Log scrape success/failure rates per platform to identify broken scrapers
- **Maintenance**: Platform HTML changes may break scrapers — log failures with URL patterns for quick identification
- **Rollback plan**: Disable the `/extract-publication` route — Phase 1 and 2 functionality unaffected

## Open Items

- [ ] LinkedIn frequently changes their HTML structure. May need periodic scraper updates.
- [ ] Medium paywalled articles may return partial content or nothing — needs testing with real URLs.
- [ ] Consider Puppeteer/Playwright headless browser as future upgrade if Cheerio-based scraping proves unreliable for LinkedIn.

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
