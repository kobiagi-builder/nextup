/**
 * Hacker News Client
 *
 * Simple client for the HN Firebase API (free, no auth required).
 * Used to discover trending community discussions for topic suggestions.
 *
 * API docs: https://github.com/HackerNewsAPI/API
 */

import { logger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

export interface HNStory {
  title: string;
  url: string;
  score: number;
  commentCount: number;
  author: string;
  publishedAt: string;
  hnUrl: string;
}

interface HNItem {
  id: number;
  type: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  by?: string;
  time?: number;
}

// =============================================================================
// Constants
// =============================================================================

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

const DEFAULT_PM_KEYWORDS = [
  'product', 'pm', 'roadmap', 'saas', 'b2b',
  'agile', 'ux', 'analytics', 'startup', 'growth',
  'onboarding', 'retention', 'churn', 'metrics', 'okr',
  'discovery', 'user research', 'mvp', 'feature', 'priorit',
];

// =============================================================================
// Client
// =============================================================================

class HackerNewsClient {
  /**
   * Get trending stories filtered by domain keywords.
   *
   * Fetches top stories from HN and filters by title/URL containing
   * any of the provided keywords.
   */
  async getTrendingByDomain(
    keywords: string[] = DEFAULT_PM_KEYWORDS,
    limit: number = 10
  ): Promise<HNStory[]> {
    try {
      // Fetch top story IDs (returns ~500 IDs)
      const topIdsRes = await fetch(`${HN_API_BASE}/topstories.json`);
      if (!topIdsRes.ok) {
        throw new Error(`HN API error: ${topIdsRes.status}`);
      }

      const topIds: number[] = await topIdsRes.json();

      // Fetch first 50 stories in parallel for filtering
      const storyPromises = topIds.slice(0, 50).map((id) =>
        fetch(`${HN_API_BASE}/item/${id}.json`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null) as Promise<HNItem | null>
      );

      const stories = await Promise.all(storyPromises);

      // Filter by keywords and transform
      const lowerKeywords = keywords.map((k) => k.toLowerCase());
      const filtered: HNStory[] = [];

      for (const story of stories) {
        if (!story || story.type !== 'story' || !story.title) continue;

        const titleLower = story.title.toLowerCase();
        const urlLower = (story.url || '').toLowerCase();

        const matches = lowerKeywords.some(
          (kw) => titleLower.includes(kw) || urlLower.includes(kw)
        );

        if (matches) {
          filtered.push({
            title: story.title,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            score: story.score || 0,
            commentCount: story.descendants || 0,
            author: story.by || 'unknown',
            publishedAt: story.time
              ? new Date(story.time * 1000).toISOString()
              : new Date().toISOString(),
            hnUrl: `https://news.ycombinator.com/item?id=${story.id}`,
          });
        }
      }

      // Sort by score descending
      filtered.sort((a, b) => b.score - a.score);

      logger.debug('[HackerNewsClient] Filtered stories', {
        totalFetched: stories.filter(Boolean).length,
        matchedCount: filtered.length,
        keywordCount: keywords.length,
      });

      return filtered.slice(0, limit);
    } catch (error) {
      logger.error(
        `[HackerNewsClient] ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export const hackerNewsClient = new HackerNewsClient();

export { DEFAULT_PM_KEYWORDS };
