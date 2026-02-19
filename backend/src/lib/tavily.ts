/**
 * Tavily API Client
 *
 * Provides web search capabilities using Tavily API.
 * Documentation: https://docs.tavily.com/docs/tavily-api/rest_api
 */

import { logger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

export interface TavilySearchOptions {
  /** Search depth: 'basic' for quick results, 'advanced' for comprehensive search */
  searchDepth?: 'basic' | 'advanced';
  /** Maximum number of results to return (default: 5, max: 20) */
  maxResults?: number;
  /** Only include results from these domains */
  includeDomains?: string[];
  /** Exclude results from these domains */
  excludeDomains?: string[];
  /** Include raw content in response (default: true) */
  includeRawContent?: boolean;
  /** Include images in response (default: false) */
  includeImages?: boolean;
}

export interface TavilySearchResult {
  /** Title of the result */
  title: string;
  /** URL of the result */
  url: string;
  /** Extracted content from the page */
  content: string;
  /** Relevance score (0.0 - 1.0) */
  score: number;
  /** Raw HTML content (if includeRawContent: true) */
  rawContent?: string;
  /** Publication date if available */
  publishedDate?: string;
}

export interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  responseTime: number;
}

export interface TavilyError {
  error: string;
  message: string;
}

// =============================================================================
// Tavily Client Class
// =============================================================================

class TavilyClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.tavily.com';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('TavilyClient initialized without API key. Set TAVILY_API_KEY environment variable.');
    }
  }

  /**
   * Perform a web search using Tavily API
   *
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results
   */
  async search(query: string, options: TavilySearchOptions = {}): Promise<TavilySearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Tavily API key not configured. Set TAVILY_API_KEY environment variable.');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const {
      searchDepth = 'basic',
      maxResults = 5,
      includeDomains = [],
      excludeDomains = [],
      includeRawContent = true,
      includeImages = false,
    } = options;

    try {
      const requestBody = {
        api_key: this.apiKey,
        query: query.trim(),
        search_depth: searchDepth,
        max_results: Math.min(maxResults, 20), // API max is 20
        include_domains: includeDomains.length > 0 ? includeDomains : undefined,
        exclude_domains: excludeDomains.length > 0 ? excludeDomains : undefined,
        include_raw_content: includeRawContent,
        include_images: includeImages,
      };

      logger.debug('[TavilyClient] Executing search', {
        query: query.substring(0, 100),
        searchDepth,
        maxResults,
        hasDomainFilters: includeDomains.length > 0 || excludeDomains.length > 0,
      });

      const startTime = Date.now();

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = (await response.json()) as TavilyError;
        logger.error(`[TavilyClient] Tavily API error: ${errorData.message}`, {
          status: response.status,
          error: errorData.error,
        });
        throw new Error(`Tavily API error: ${errorData.message}`);
      }

      const data = (await response.json()) as TavilyResponse;

      logger.info('[TavilyClient] Search completed', {
        query: query.substring(0, 100),
        resultsCount: data.results?.length || 0,
        duration,
      });

      return data.results || [];
    } catch (error) {
      logger.error(`[TavilyClient] ${error instanceof Error ? error.message : String(error)}`, {
        query: query.substring(0, 100),
      });

      // Re-throw for caller to handle
      throw error;
    }
  }

  /**
   * Check if the client is configured with an API key
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Get API usage statistics (if available)
   * Note: This is a placeholder - Tavily may add usage endpoints in the future
   */
  async getUsageStats(): Promise<{ message: string }> {
    logger.warn('[TavilyClient] Usage stats not yet available from Tavily API');
    return { message: 'Usage statistics endpoint not yet available' };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton Tavily client instance
 * Use this for all Tavily API operations
 */
export const tavilyClient = new TavilyClient();

/**
 * Create a new Tavily client with a specific API key
 * Useful for testing or multi-tenant scenarios
 */
export function createTavilyClient(apiKey: string): TavilyClient {
  return new TavilyClient(apiKey);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Filter search results by domain
 * Useful for post-processing when API domain filtering isn't sufficient
 */
export function filterResultsByDomain(
  results: TavilySearchResult[],
  includeDomains: string[] = [],
  excludeDomains: string[] = []
): TavilySearchResult[] {
  return results.filter((result) => {
    const domain = extractDomain(result.url);

    // Check exclusions first
    if (excludeDomains.length > 0 && excludeDomains.some((d) => domain.includes(d))) {
      return false;
    }

    // Check inclusions
    if (includeDomains.length > 0) {
      return includeDomains.some((d) => domain.includes(d));
    }

    return true;
  });
}

/**
 * Sort results by relevance score
 */
export function sortByRelevance(results: TavilySearchResult[]): TavilySearchResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}

/**
 * Get top N results
 */
export function getTopResults(results: TavilySearchResult[], n: number): TavilySearchResult[] {
  return sortByRelevance(results).slice(0, n);
}
