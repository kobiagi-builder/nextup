import { describe, it, expect } from 'vitest'
import { mergeTeamMembers } from '../../../controllers/customer.controller.js'
import type { TeamMember } from '../../../types/customer.js'

describe('mergeTeamMembers', () => {
  it('adds new scraped members as linkedin_scrape', () => {
    const existing: TeamMember[] = []
    const scraped = [
      { name: 'Jane Smith', role: 'CEO' },
      { name: 'John Doe', role: 'CTO', linkedin_url: 'https://linkedin.com/in/johndoe' },
    ]

    const result = mergeTeamMembers(existing, scraped)

    expect(result.added).toBe(2)
    expect(result.removed).toBe(0)
    expect(result.mergedTeam).toHaveLength(2)
    expect(result.mergedTeam[0]).toEqual({
      name: 'Jane Smith',
      role: 'CEO',
      linkedin_url: undefined,
      source: 'linkedin_scrape',
    })
    expect(result.mergedTeam[1].source).toBe('linkedin_scrape')
    expect(result.mergedTeam[1].linkedin_url).toBe('https://linkedin.com/in/johndoe')
  })

  it('soft-deletes stale linkedin_scrape members not in new scrape', () => {
    const existing: TeamMember[] = [
      { name: 'Old Member', role: 'VP Sales', source: 'linkedin_scrape' },
    ]
    const scraped = [
      { name: 'New Member', role: 'CEO' },
    ]

    const result = mergeTeamMembers(existing, scraped)

    expect(result.removed).toBe(1)
    expect(result.added).toBe(1)
    const oldMember = result.mergedTeam.find(m => m.name === 'Old Member')
    expect(oldMember?.hidden).toBe(true)
  })

  it('never modifies manual members', () => {
    const existing: TeamMember[] = [
      { name: 'Manual Person', role: 'Advisor', source: 'manual' },
      { name: 'No Source Person', role: 'Partner' }, // no source = treated as manual
    ]
    const scraped = [
      { name: 'New Hire', role: 'CTO' },
    ]

    const result = mergeTeamMembers(existing, scraped)

    // Manual members untouched even though not in scrape
    const manual = result.mergedTeam.find(m => m.name === 'Manual Person')
    expect(manual?.hidden).toBeUndefined()
    expect(manual?.source).toBe('manual')

    const noSource = result.mergedTeam.find(m => m.name === 'No Source Person')
    expect(noSource?.hidden).toBeUndefined()
    expect(noSource?.source).toBeUndefined()

    expect(result.removed).toBe(0) // manual members are NOT counted as removed
  })

  it('un-hides previously hidden linkedin_scrape members that reappear', () => {
    const existing: TeamMember[] = [
      { name: 'Returning Person', role: 'Old Role', source: 'linkedin_scrape', hidden: true },
    ]
    const scraped = [
      { name: 'Returning Person', role: 'New Role', linkedin_url: 'https://linkedin.com/in/rp' },
    ]

    const result = mergeTeamMembers(existing, scraped)

    expect(result.added).toBe(0) // not counted as added since they already existed
    expect(result.removed).toBe(0)
    const member = result.mergedTeam.find(m => m.name === 'Returning Person')
    expect(member?.hidden).toBe(false)
    expect(member?.role).toBe('New Role') // role updated
    expect(member?.linkedin_url).toBe('https://linkedin.com/in/rp')
  })

  it('uses case-insensitive name matching', () => {
    const existing: TeamMember[] = [
      { name: 'JANE SMITH', role: 'CEO', source: 'linkedin_scrape' },
    ]
    const scraped = [
      { name: 'jane smith', role: 'CEO & Founder' },
    ]

    const result = mergeTeamMembers(existing, scraped)

    // Should NOT add a duplicate — matched by lowercase name
    expect(result.added).toBe(0)
    expect(result.removed).toBe(0)
    expect(result.mergedTeam).toHaveLength(1)
  })

  it('does not duplicate members already in team', () => {
    const existing: TeamMember[] = [
      { name: 'Jane Smith', role: 'CEO', source: 'linkedin_scrape' },
    ]
    const scraped = [
      { name: 'Jane Smith', role: 'CEO' },
      { name: 'New Person', role: 'CTO' },
    ]

    const result = mergeTeamMembers(existing, scraped)

    expect(result.added).toBe(1) // only New Person
    expect(result.mergedTeam).toHaveLength(2)
  })

  it('does not mutate the original team array', () => {
    const original: TeamMember[] = [
      { name: 'Stale', role: 'VP', source: 'linkedin_scrape' },
    ]
    const originalCopy = JSON.parse(JSON.stringify(original))

    mergeTeamMembers(original, [{ name: 'New', role: 'CEO' }])

    // Original should be unchanged
    expect(original).toEqual(originalCopy)
  })

  it('handles empty scraped list (soft-deletes all linkedin_scrape)', () => {
    const existing: TeamMember[] = [
      { name: 'Person A', role: 'CEO', source: 'linkedin_scrape' },
      { name: 'Person B', role: 'CTO', source: 'linkedin_scrape' },
      { name: 'Manual C', role: 'Advisor', source: 'manual' },
    ]

    const result = mergeTeamMembers(existing, [])

    expect(result.removed).toBe(2)
    expect(result.added).toBe(0)
    expect(result.mergedTeam.find(m => m.name === 'Person A')?.hidden).toBe(true)
    expect(result.mergedTeam.find(m => m.name === 'Person B')?.hidden).toBe(true)
    expect(result.mergedTeam.find(m => m.name === 'Manual C')?.hidden).toBeUndefined()
  })
})
