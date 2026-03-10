import { describe, it, expect } from 'vitest'
import { detectTextDirection, containsRTL } from '../text-direction'

describe('detectTextDirection', () => {
  it('returns rtl for Hebrew text', () => {
    expect(detectTextDirection('שלום עולם')).toBe('rtl')
  })

  it('returns ltr for English text', () => {
    expect(detectTextDirection('Hello world')).toBe('ltr')
  })

  it('returns rtl for mixed text starting with Hebrew', () => {
    expect(detectTextDirection('שלום Hello')).toBe('rtl')
  })

  it('returns ltr for mixed text starting with English', () => {
    expect(detectTextDirection('Hello שלום')).toBe('ltr')
  })

  it('returns ltr for numbers-only text (no strong directional char)', () => {
    expect(detectTextDirection('12345')).toBe('ltr')
  })

  it('returns ltr for empty string', () => {
    expect(detectTextDirection('')).toBe('ltr')
  })

  it('returns rtl for Arabic text', () => {
    expect(detectTextDirection('مرحبا بالعالم')).toBe('rtl')
  })
})

describe('containsRTL', () => {
  it('returns true for Hebrew text', () => {
    expect(containsRTL('שלום')).toBe(true)
  })

  it('returns false for English text', () => {
    expect(containsRTL('Hello')).toBe(false)
  })

  it('returns true for mixed text with Hebrew', () => {
    expect(containsRTL('Hello שלום world')).toBe(true)
  })
})
