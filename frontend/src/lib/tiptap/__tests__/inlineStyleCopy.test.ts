import { describe, it, expect } from 'vitest'
import { applyInlineStyles } from '../inlineStyleCopy'

/**
 * Helper to create a DOM container from an HTML string.
 * Only used in tests with hardcoded strings — no user input, no XSS risk.
 */
function createFragment(html: string): HTMLElement {
  const template = document.createElement('template')
  template.innerHTML = html // safe: test-only with hardcoded strings
  const div = document.createElement('div')
  div.appendChild(template.content.cloneNode(true))
  return div
}

describe('applyInlineStyles', () => {
  it('applies font-size and font-weight to headings', () => {
    const container = createFragment('<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>')
    applyInlineStyles(container)

    const h1 = container.querySelector('h1')!
    expect(h1.getAttribute('style')).toContain('font-size:30px')
    expect(h1.getAttribute('style')).toContain('font-weight:700')

    const h2 = container.querySelector('h2')!
    expect(h2.getAttribute('style')).toContain('font-size:24px')
    expect(h2.getAttribute('style')).toContain('font-weight:600')

    const h3 = container.querySelector('h3')!
    expect(h3.getAttribute('style')).toContain('font-size:20px')
  })

  it('applies line-height and margin to paragraphs', () => {
    const container = createFragment('<p>Hello world</p>')
    applyInlineStyles(container)

    const p = container.querySelector('p')!
    expect(p.getAttribute('style')).toContain('line-height:1.75')
    expect(p.getAttribute('style')).toContain('margin-bottom:24px')
  })

  it('applies border styles to table cells', () => {
    const container = createFragment(
      '<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>',
    )
    applyInlineStyles(container)

    const table = container.querySelector('table')!
    expect(table.getAttribute('style')).toContain('border-collapse:collapse')

    const th = container.querySelector('th')!
    expect(th.getAttribute('style')).toContain('border:1px solid #d1d5db')
    expect(th.getAttribute('style')).toContain('background-color:#f3f4f6')

    const td = container.querySelector('td')!
    expect(td.getAttribute('style')).toContain('border:1px solid #d1d5db')
    expect(td.getAttribute('style')).toContain('padding:8px 12px')
  })

  it('preserves data-color on mark elements', () => {
    const container = createFragment('<mark data-color="#ff0000">highlighted</mark>')
    applyInlineStyles(container)

    const mark = container.querySelector('mark')!
    expect(mark.getAttribute('style')).toContain('background-color:#ff0000')
  })

  it('uses default highlight color when no data-color', () => {
    const container = createFragment('<mark>highlighted</mark>')
    applyInlineStyles(container)

    const mark = container.querySelector('mark')!
    expect(mark.getAttribute('style')).toContain('background-color:#fef08a')
  })

  it('merges with existing inline styles instead of replacing', () => {
    const container = createFragment('<p style="color: red;">Colored text</p>')
    applyInlineStyles(container)

    const p = container.querySelector('p')!
    const style = p.getAttribute('style')!
    expect(style).toContain('color: red')
    expect(style).toContain('line-height:1.75')
  })

  it('strips class attributes', () => {
    const container = createFragment(
      '<p class="prose-p text-foreground">Text</p><h1 class="prose-h1">Title</h1>',
    )
    applyInlineStyles(container)

    expect(container.querySelector('p')!.hasAttribute('class')).toBe(false)
    expect(container.querySelector('h1')!.hasAttribute('class')).toBe(false)
  })

  it('preserves dir attribute for RTL', () => {
    const container = createFragment('<p dir="rtl">Hebrew text</p>')
    applyInlineStyles(container)

    const p = container.querySelector('p')!
    expect(p.getAttribute('dir')).toBe('rtl')
    expect(p.getAttribute('style')).toContain('line-height:1.75')
  })

  it('applies list styles', () => {
    const container = createFragment(
      '<ul><li>Item 1</li><li>Item 2</li></ul>',
    )
    applyInlineStyles(container)

    const ul = container.querySelector('ul')!
    expect(ul.getAttribute('style')).toContain('list-style-type:disc')
    expect(ul.getAttribute('style')).toContain('padding-left:24px')

    const li = container.querySelector('li')!
    expect(li.getAttribute('style')).toContain('margin-bottom:12px')
  })

  it('applies ordered list styles', () => {
    const container = createFragment(
      '<ol><li>First</li><li>Second</li></ol>',
    )
    applyInlineStyles(container)

    const ol = container.querySelector('ol')!
    expect(ol.getAttribute('style')).toContain('list-style-type:decimal')
  })

  it('applies blockquote styles', () => {
    const container = createFragment('<blockquote>A quote</blockquote>')
    applyInlineStyles(container)

    const bq = container.querySelector('blockquote')!
    expect(bq.getAttribute('style')).toContain('border-left:4px solid #2563eb')
    expect(bq.getAttribute('style')).toContain('font-style:italic')
  })

  it('applies link styles', () => {
    const container = createFragment('<a href="https://example.com">Link</a>')
    applyInlineStyles(container)

    const a = container.querySelector('a')!
    expect(a.getAttribute('style')).toContain('color:#2563eb')
    expect(a.getAttribute('href')).toBe('https://example.com')
  })

  it('applies code block styles', () => {
    const container = createFragment('<pre><code>const x = 1</code></pre>')
    applyInlineStyles(container)

    const pre = container.querySelector('pre')!
    expect(pre.getAttribute('style')).toContain('font-family:')
    expect(pre.getAttribute('style')).toContain('background-color:#1f2937')
  })

  it('handles image alignment via data-align', () => {
    const container = createFragment('<img src="test.jpg" data-align="center" />')
    applyInlineStyles(container)

    const img = container.querySelector('img')!
    expect(img.getAttribute('style')).toContain('margin-left:auto')
    expect(img.getAttribute('style')).toContain('margin-right:auto')
  })
})
