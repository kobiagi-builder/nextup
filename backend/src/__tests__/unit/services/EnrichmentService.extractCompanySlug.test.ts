import { describe, it, expect } from 'vitest'
import { EnrichmentService } from '../../../services/EnrichmentService.js'

describe('EnrichmentService.extractCompanySlug', () => {
  it('extracts slug from standard company URL', () => {
    expect(EnrichmentService.extractCompanySlug('https://www.linkedin.com/company/acme-corp'))
      .toBe('acme-corp')
  })

  it('extracts slug from URL with trailing slash', () => {
    expect(EnrichmentService.extractCompanySlug('https://linkedin.com/company/acme-corp/'))
      .toBe('acme-corp')
  })

  it('extracts slug from URL with /people/ suffix', () => {
    expect(EnrichmentService.extractCompanySlug('https://linkedin.com/company/acme-corp/people/'))
      .toBe('acme-corp')
  })

  it('extracts slug from URL with /about/ suffix', () => {
    expect(EnrichmentService.extractCompanySlug('https://linkedin.com/company/acme-corp/about/'))
      .toBe('acme-corp')
  })

  it('extracts slug from URL with query params', () => {
    expect(EnrichmentService.extractCompanySlug('https://linkedin.com/company/acme-corp?ref=nav'))
      .toBe('acme-corp')
  })

  it('extracts slug from URL without www', () => {
    expect(EnrichmentService.extractCompanySlug('https://linkedin.com/company/my-startup'))
      .toBe('my-startup')
  })

  it('returns null for personal profile URL', () => {
    expect(EnrichmentService.extractCompanySlug('https://linkedin.com/in/john-doe'))
      .toBeNull()
  })

  it('returns null for invalid URL', () => {
    expect(EnrichmentService.extractCompanySlug('https://example.com/company/test'))
      .toBeNull()
  })

  it('returns null for empty string', () => {
    expect(EnrichmentService.extractCompanySlug('')).toBeNull()
  })

  it('returns null for URL missing slug', () => {
    expect(EnrichmentService.extractCompanySlug('https://linkedin.com/company/'))
      .toBeNull()
  })
})
