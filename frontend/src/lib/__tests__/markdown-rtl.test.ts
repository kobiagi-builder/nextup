import { describe, it, expect } from 'vitest'
import { htmlToMarkdown, markdownToHTML } from '../markdown'

describe('markdown RTL direction preservation', () => {
  it('preserves dir="rtl" attribute on paragraphs during HTML→Markdown conversion', () => {
    const html = '<p dir="rtl">שלום עולם</p>'
    const markdown = htmlToMarkdown(html)
    expect(markdown).toContain('dir="rtl"')
    expect(markdown).toContain('שלום עולם')
  })

  it('preserves dir="rtl" attribute on headings during HTML→Markdown conversion', () => {
    const html = '<h1 dir="rtl">כותרת בעברית</h1>'
    const markdown = htmlToMarkdown(html)
    expect(markdown).toContain('dir="rtl"')
    expect(markdown).toContain('כותרת בעברית')
  })

  it('does not add dir attribute to LTR-only content', () => {
    const html = '<p>Hello world</p>'
    const markdown = htmlToMarkdown(html)
    expect(markdown).not.toContain('dir=')
    expect(markdown).toContain('Hello world')
  })

  it('preserves mixed direction content (RTL paragraph + LTR paragraph)', () => {
    const html = '<p dir="rtl">שלום</p><p>Hello</p>'
    const markdown = htmlToMarkdown(html)
    expect(markdown).toContain('dir="rtl"')
    expect(markdown).toContain('שלום')
    expect(markdown).toContain('Hello')
  })

  it('round-trips RTL content through markdown conversion', () => {
    const originalHtml = '<p dir="rtl">שלום עולם</p>'
    const markdown = htmlToMarkdown(originalHtml)
    const resultHtml = markdownToHTML(markdown)
    expect(resultHtml).toContain('dir="rtl"')
    expect(resultHtml).toContain('שלום עולם')
  })

  it('preserves dir on blockquote elements', () => {
    const html = '<blockquote dir="rtl">ציטוט בעברית</blockquote>'
    const markdown = htmlToMarkdown(html)
    expect(markdown).toContain('dir="rtl"')
    expect(markdown).toContain('ציטוט בעברית')
  })
})
