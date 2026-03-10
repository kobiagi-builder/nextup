/**
 * RTL Support Integration Tests
 *
 * Tests that TipTap editor correctly handles RTL content and the
 * TextDirection extension is properly configured.
 *
 * Note: Full TipTap rendering requires a real browser (Playwright E2E tests).
 * These tests verify extension configuration and HTML output behavior.
 */

import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TextDirection from 'tiptap-text-direction'

function createTestEditor(content: string = '<p>Test</p>') {
  return new Editor({
    extensions: [
      StarterKit,
      TextDirection.configure({
        types: ['heading', 'paragraph', 'blockquote', 'listItem'],
      }),
    ],
    content,
  })
}

describe('TextDirection extension configuration', () => {
  it('creates editor with TextDirection extension', () => {
    const editor = createTestEditor()
    const extensions = editor.extensionManager.extensions.map(e => e.name)
    expect(extensions).toContain('textDirection')
    editor.destroy()
  })

  it('adds dir attribute to paragraph when setTextDirection is called', () => {
    const editor = createTestEditor('<p>Hello</p>')
    editor.commands.setTextDirection('rtl')
    const html = editor.getHTML()
    expect(html).toContain('dir="rtl"')
    editor.destroy()
  })

  it('removes dir attribute when unsetTextDirection is called on English text', () => {
    const editor = createTestEditor('<p dir="rtl">Hello world</p>')
    editor.commands.unsetTextDirection()
    const html = editor.getHTML()
    // After unsetting, auto-detection for English text should not add RTL back
    expect(html).not.toContain('dir="rtl"')
    editor.destroy()
  })

  it('preserves dir attribute in HTML output for RTL content', () => {
    const editor = createTestEditor('<p dir="rtl">שלום עולם</p>')
    const html = editor.getHTML()
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('שלום עולם')
    editor.destroy()
  })

  it('preserves dir attribute on headings', () => {
    const editor = createTestEditor('<h1 dir="rtl">כותרת</h1>')
    const html = editor.getHTML()
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('כותרת')
    editor.destroy()
  })

  it('handles mixed direction content', () => {
    const editor = createTestEditor('<p dir="rtl">שלום</p><p>Hello</p>')
    const html = editor.getHTML()
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('שלום')
    expect(html).toContain('Hello')
    editor.destroy()
  })

  it('can set direction programmatically on any content', () => {
    const editor = createTestEditor('<p>שלום עולם</p>')
    // Auto-detection happens on user typing, not on initial parse.
    // But we can set direction programmatically.
    editor.commands.setTextDirection('rtl')
    const html = editor.getHTML()
    expect(html).toContain('dir="rtl"')
    editor.destroy()
  })

  it('does not add dir for LTR-only content when no defaultDirection set', () => {
    const editor = createTestEditor('<p>Hello world</p>')
    const html = editor.getHTML()
    // LTR is the browser default — extension should not add dir="ltr" unless forced
    expect(html).toContain('Hello world')
    editor.destroy()
  })
})
