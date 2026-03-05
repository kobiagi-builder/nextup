/**
 * Unit Tests: URL Validators & Hidden Member Filtering
 *
 * Tests for Phase 2 LinkedIn Team Extraction frontend utilities.
 */

import { describe, it, expect } from 'vitest'
import { isValidLinkedInCompanyUrl, isValidWebsiteUrl } from '../CustomerInfoSection'
import type { TeamMember } from '../../../types'

// =============================================================================
// isValidLinkedInCompanyUrl
// =============================================================================

describe('isValidLinkedInCompanyUrl', () => {
  it('accepts valid company URLs', () => {
    expect(isValidLinkedInCompanyUrl('https://linkedin.com/company/acme')).toBe(true)
    expect(isValidLinkedInCompanyUrl('https://www.linkedin.com/company/acme')).toBe(true)
    expect(isValidLinkedInCompanyUrl('https://linkedin.com/company/acme-corp')).toBe(true)
    expect(isValidLinkedInCompanyUrl('http://linkedin.com/company/acme')).toBe(true)
  })

  it('accepts company URLs with trailing slash', () => {
    expect(isValidLinkedInCompanyUrl('https://linkedin.com/company/acme/')).toBe(true)
  })

  it('accepts company URLs with subpages', () => {
    expect(isValidLinkedInCompanyUrl('https://linkedin.com/company/acme/people')).toBe(true)
  })

  it('rejects personal profile URLs', () => {
    expect(isValidLinkedInCompanyUrl('https://linkedin.com/in/person')).toBe(false)
  })

  it('rejects company URL without slug', () => {
    expect(isValidLinkedInCompanyUrl('https://linkedin.com/company/')).toBe(false)
  })

  it('rejects non-LinkedIn URLs', () => {
    expect(isValidLinkedInCompanyUrl('https://example.com/company/acme')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidLinkedInCompanyUrl('')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isValidLinkedInCompanyUrl('not-a-url')).toBe(false)
  })

  it('rejects URLs with linkedin.com in query params', () => {
    expect(isValidLinkedInCompanyUrl('https://evil.com/?r=linkedin.com/company/foo')).toBe(false)
  })
})

// =============================================================================
// isValidWebsiteUrl
// =============================================================================

describe('isValidWebsiteUrl', () => {
  it('accepts valid https URLs', () => {
    expect(isValidWebsiteUrl('https://example.com')).toBe(true)
    expect(isValidWebsiteUrl('https://sub.example.org/path')).toBe(true)
  })

  it('accepts valid http URLs', () => {
    expect(isValidWebsiteUrl('http://example.com')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidWebsiteUrl('')).toBe(false)
  })

  it('rejects plain text', () => {
    expect(isValidWebsiteUrl('not-a-url')).toBe(false)
  })

  it('rejects strings without protocol', () => {
    expect(isValidWebsiteUrl('example.com')).toBe(false)
  })
})

// =============================================================================
// Hidden Member Filtering
// =============================================================================

describe('hidden member filtering', () => {
  const team: TeamMember[] = [
    { name: 'Alice', hidden: true, source: 'linkedin_scrape' },
    { name: 'Bob', hidden: false, source: 'linkedin_scrape' },
    { name: 'Charlie', source: 'manual' },
    { name: 'Diana' },
  ]

  it('filters out hidden members', () => {
    const visible = team.filter(m => !m.hidden)
    expect(visible).toHaveLength(3)
    expect(visible.map(m => m.name)).toEqual(['Bob', 'Charlie', 'Diana'])
  })

  it('preserves hidden members separately', () => {
    const hidden = team.filter(m => m.hidden)
    expect(hidden).toHaveLength(1)
    expect(hidden[0].name).toBe('Alice')
  })

  it('preserves hidden members on team save', () => {
    const visible = team.filter(m => !m.hidden)
    const hidden = team.filter(m => m.hidden)

    // Simulate editing visible team (add a new member)
    const editedVisible = [...visible, { name: 'Eve', source: 'manual' as const }]

    // Merge back — same logic as OverviewTab.handleTeamSave
    const saved = [...editedVisible, ...hidden]

    expect(saved).toHaveLength(5)
    expect(saved.find(m => m.name === 'Alice')?.hidden).toBe(true)
    expect(saved.find(m => m.name === 'Eve')).toBeDefined()
  })

  it('handles team with no hidden members', () => {
    const noHidden: TeamMember[] = [
      { name: 'X' },
      { name: 'Y' },
    ]
    const visible = noHidden.filter(m => !m.hidden)
    expect(visible).toHaveLength(2)
  })

  it('handles empty team', () => {
    const empty: TeamMember[] = []
    const visible = empty.filter(m => !m.hidden)
    expect(visible).toHaveLength(0)
  })
})
