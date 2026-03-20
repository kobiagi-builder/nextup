/**
 * Reference Marker Utilities
 *
 * Parses {{ref:N}} markers from LLM output and converts them to semantic HTML
 * spans with artifact_research UUIDs. Also provides stripping for cleanup.
 */

export interface ResearchItemForRef {
  id: string;          // artifact_research UUID
  index: number;       // 1-based position in the research context
  source_name: string;
  source_type: string;
  source_url: string | null;
  excerpt: string;
}

const REF_MARKER_REGEX = /\{\{ref:(\d+)\}\}/g;

/**
 * Convert {{ref:N}} text markers to semantic HTML spans.
 *
 * Each marker is resolved to its artifact_research UUID via the 1-based index.
 * Invalid indices (out of range) are silently stripped.
 */
export function convertRefMarkersToHTML(
  content: string,
  researchItems: ResearchItemForRef[]
): string {
  if (!content || researchItems.length === 0) {
    return stripRefMarkers(content);
  }

  return content.replace(REF_MARKER_REGEX, (_match, indexStr) => {
    const index = parseInt(indexStr, 10);
    const item = researchItems.find(r => r.index === index);

    if (!item) {
      // Invalid index — silently strip
      return '';
    }

    // Defense-in-depth: escape HTML-special characters in id before interpolating
    const safeId = item.id.replace(/[&"'<>]/g, '');
    return `<span data-ref-id="${safeId}" data-ref-index="${index}" class="ref-indicator" contenteditable="false">${index}</span>`;
  });
}

/**
 * Strip all {{ref:N}} markers from content without converting.
 * Used for cleanup/fallback scenarios.
 */
export function stripRefMarkers(content: string): string {
  if (!content) return content;
  return content.replace(REF_MARKER_REGEX, '');
}

/**
 * Build ResearchItemForRef array from raw database results.
 * The index matches the 1-based position used in the research context
 * provided to the LLM (e.g., [1] SourceName: excerpt).
 */
export function buildResearchItemsForRef(
  researchResults: Array<{
    id: string;
    source_name: string;
    source_type: string;
    source_url: string | null;
    excerpt: string;
  }>
): ResearchItemForRef[] {
  return researchResults.map((r, i) => ({
    id: r.id,
    index: i + 1,
    source_name: r.source_name,
    source_type: r.source_type,
    source_url: r.source_url,
    excerpt: r.excerpt,
  }));
}
