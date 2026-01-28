/**
 * Tests for HTML Formatter
 */

import { describe, it, expect } from 'vitest'
import { formatListsInHtml } from './htmlFormatter'

describe('formatListsInHtml', () => {
  it('converts plain text numbered lists to HTML ordered lists', () => {
    const input = `
      <p>Introduction text</p>
      <p>1. First item</p>
      <p>2. Second item</p>
      <p>3. Third item</p>
      <p>Conclusion text</p>
    `

    const result = formatListsInHtml(input)

    expect(result).toContain('<ol>')
    expect(result).toContain('<li>First item</li>')
    expect(result).toContain('<li>Second item</li>')
    expect(result).toContain('<li>Third item</li>')
    expect(result).toContain('</ol>')
    expect(result).toContain('Introduction text')
    expect(result).toContain('Conclusion text')
  })

  it('converts plain text bulleted lists to HTML unordered lists', () => {
    const input = `
      <p>Here are some items:</p>
      <p>- First bullet</p>
      <p>- Second bullet</p>
      <p>- Third bullet</p>
    `

    const result = formatListsInHtml(input)

    expect(result).toContain('<ul>')
    expect(result).toContain('<li>First bullet</li>')
    expect(result).toContain('<li>Second bullet</li>')
    expect(result).toContain('<li>Third bullet</li>')
    expect(result).toContain('</ul>')
  })

  it('handles asterisk bullets', () => {
    const input = `
      <p>* First item</p>
      <p>* Second item</p>
    `

    const result = formatListsInHtml(input)

    expect(result).toContain('<ul>')
    expect(result).toContain('<li>First item</li>')
    expect(result).toContain('<li>Second item</li>')
  })

  it('handles bullet points (•)', () => {
    const input = `
      <p>• First item</p>
      <p>• Second item</p>
    `

    const result = formatListsInHtml(input)

    expect(result).toContain('<ul>')
    expect(result).toContain('<li>First item</li>')
    expect(result).toContain('<li>Second item</li>')
  })

  it('handles multiple separate list groups', () => {
    const input = `
      <p>First list:</p>
      <p>1. Item one</p>
      <p>2. Item two</p>
      <p>Some text between lists</p>
      <p>- Bullet one</p>
      <p>- Bullet two</p>
    `

    const result = formatListsInHtml(input)

    // Should have both ordered and unordered lists
    expect(result).toContain('<ol>')
    expect(result).toContain('</ol>')
    expect(result).toContain('<ul>')
    expect(result).toContain('</ul>')
    expect(result).toContain('Some text between lists')
  })

  it('preserves content without list patterns', () => {
    const input = `
      <p>This is regular text.</p>
      <p>No lists here.</p>
      <p>Just paragraphs.</p>
    `

    const result = formatListsInHtml(input)

    expect(result).not.toContain('<ol>')
    expect(result).not.toContain('<ul>')
    expect(result).toContain('This is regular text.')
    expect(result).toContain('No lists here.')
  })

  it('handles real-world AI-generated content', () => {
    const input = `
      <p>Most people will still be manually doing tasks that AI can handle in seconds. Here are 5 AI productivity tips:</p>
      <p>1. Build your own AI team for recurring work</p>
      <p>2. Start every project with a 30-minute planning session with AI</p>
      <p>3. Never write a first draft yourself again</p>
      <p>4. If you're doing it twice, automate it</p>
      <p>5. Think of AI as your thinking partner</p>
      <p>Which of these will you try first?</p>
    `

    const result = formatListsInHtml(input)

    expect(result).toContain('<ol>')
    expect(result).toContain('<li>Build your own AI team for recurring work</li>')
    expect(result).toContain('<li>Start every project with a 30-minute planning session with AI</li>')
    expect(result).toContain('<li>Never write a first draft yourself again</li>')
    expect(result).toContain('<li>If you\'re doing it twice, automate it</li>')
    expect(result).toContain('<li>Think of AI as your thinking partner</li>')
    expect(result).toContain('Which of these will you try first?')
  })

  it('handles empty or null input', () => {
    expect(formatListsInHtml('')).toBe('')
    expect(formatListsInHtml('<p></p>')).toContain('<p></p>')
  })

  it('stops list grouping when non-list paragraph is encountered', () => {
    const input = `
      <p>1. First item</p>
      <p>2. Second item</p>
      <p>This breaks the list</p>
      <p>3. This starts a new list</p>
      <p>4. Fourth item</p>
    `

    const result = formatListsInHtml(input)

    // Should have TWO separate ordered lists
    const olMatches = result.match(/<ol>/g)
    expect(olMatches).toHaveLength(2)
  })
})
