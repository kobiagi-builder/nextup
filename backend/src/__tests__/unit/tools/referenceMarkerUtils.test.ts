import { describe, it, expect } from 'vitest'
import {
  convertRefMarkersToHTML,
  stripRefMarkers,
  buildResearchItemsForRef,
  type ResearchItemForRef,
} from '../../../services/ai/agents/portfolio/tools/referenceMarkerUtils.js'

const mockResearchItems: ResearchItemForRef[] = [
  {
    id: 'uuid-001',
    index: 1,
    source_name: 'Reddit Thread',
    source_type: 'reddit',
    source_url: 'https://reddit.com/r/test',
    excerpt: 'This is the first research excerpt.',
  },
  {
    id: 'uuid-002',
    index: 2,
    source_name: 'LinkedIn Post',
    source_type: 'linkedin',
    source_url: 'https://linkedin.com/post/123',
    excerpt: 'This is the second research excerpt.',
  },
  {
    id: 'uuid-003',
    index: 3,
    source_name: 'Medium Article',
    source_type: 'medium',
    source_url: null,
    excerpt: 'This is the third research excerpt.',
  },
]

describe('convertRefMarkersToHTML', () => {
  it('converts a single {{ref:N}} marker to HTML span', () => {
    const content = 'Startups save 60% on costs.{{ref:1}} This is significant.'
    const result = convertRefMarkersToHTML(content, mockResearchItems)

    expect(result).toContain('data-ref-id="uuid-001"')
    expect(result).toContain('data-ref-index="1"')
    expect(result).toContain('class="ref-indicator"')
    expect(result).toContain('contenteditable="false"')
    expect(result).toContain('>1</span>')
    expect(result).not.toContain('{{ref:')
  })

  it('converts multiple markers on the same sentence', () => {
    const content = 'Growth is key.{{ref:1}}{{ref:2}} Next sentence.'
    const result = convertRefMarkersToHTML(content, mockResearchItems)

    expect(result).toContain('data-ref-id="uuid-001"')
    expect(result).toContain('data-ref-id="uuid-002"')
    expect(result).toContain('>1</span>')
    expect(result).toContain('>2</span>')
  })

  it('handles markers across different sentences', () => {
    const content = 'First point.{{ref:1}} Second point.{{ref:3}}'
    const result = convertRefMarkersToHTML(content, mockResearchItems)

    expect(result).toContain('data-ref-id="uuid-001"')
    expect(result).toContain('data-ref-id="uuid-003"')
  })

  it('silently strips invalid index (out of range)', () => {
    const content = 'Some claim.{{ref:99}} Next sentence.'
    const result = convertRefMarkersToHTML(content, mockResearchItems)

    expect(result).toBe('Some claim. Next sentence.')
    expect(result).not.toContain('{{ref:')
    expect(result).not.toContain('ref-indicator')
  })

  it('returns content unchanged when no markers present', () => {
    const content = 'A plain sentence without any markers.'
    const result = convertRefMarkersToHTML(content, mockResearchItems)

    expect(result).toBe(content)
  })

  it('strips all markers when research items array is empty', () => {
    const content = 'Some claim.{{ref:1}} Another.{{ref:2}}'
    const result = convertRefMarkersToHTML(content, [])

    expect(result).toBe('Some claim. Another.')
    expect(result).not.toContain('{{ref:')
  })

  it('handles markers adjacent to HTML tags', () => {
    const content = '<p>Important finding.{{ref:2}}</p>'
    const result = convertRefMarkersToHTML(content, mockResearchItems)

    expect(result).toContain('data-ref-id="uuid-002"')
    expect(result).toContain('<p>Important finding.')
    expect(result).toContain('</span></p>')
  })

  it('returns empty string for empty content', () => {
    const result = convertRefMarkersToHTML('', mockResearchItems)
    expect(result).toBe('')
  })

  it('handles null-ish content gracefully', () => {
    const result = convertRefMarkersToHTML(null as unknown as string, mockResearchItems)
    expect(result).toBe(null)
  })
})

describe('stripRefMarkers', () => {
  it('removes all {{ref:N}} markers', () => {
    const content = 'First.{{ref:1}} Second.{{ref:2}} Third.'
    const result = stripRefMarkers(content)

    expect(result).toBe('First. Second. Third.')
    expect(result).not.toContain('{{ref:')
  })

  it('returns content unchanged when no markers', () => {
    const content = 'No markers here.'
    expect(stripRefMarkers(content)).toBe(content)
  })

  it('handles empty string', () => {
    expect(stripRefMarkers('')).toBe('')
  })
})

describe('buildResearchItemsForRef', () => {
  it('builds items with 1-based indices', () => {
    const raw = [
      { id: 'a', source_name: 'S1', source_type: 'reddit', source_url: 'http://a', excerpt: 'E1' },
      { id: 'b', source_name: 'S2', source_type: 'linkedin', source_url: null, excerpt: 'E2' },
    ]

    const result = buildResearchItemsForRef(raw)

    expect(result).toHaveLength(2)
    expect(result[0].index).toBe(1)
    expect(result[0].id).toBe('a')
    expect(result[1].index).toBe(2)
    expect(result[1].id).toBe('b')
  })

  it('returns empty array for empty input', () => {
    expect(buildResearchItemsForRef([])).toEqual([])
  })
})
