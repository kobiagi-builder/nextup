/**
 * Tiptap extension that intercepts copy events and writes inline-styled HTML
 * to the clipboard. This ensures formatting (headings, lists, tables, colors,
 * highlights) is preserved when pasting into external apps like LinkedIn,
 * Gmail, Outlook, and Google Docs.
 *
 * The editor's stored content and rendering are unaffected — only the
 * clipboard output is modified.
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMSerializer } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import type { Schema } from '@tiptap/pm/model'
import { INLINE_STYLE_MAP } from './inlineStyleMap'

const pluginKey = new PluginKey('inlineStyleCopy')

export const InlineStyleCopy = Extension.create({
  name: 'inlineStyleCopy',

  addProseMirrorPlugins() {
    const schema = this.editor.schema

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            copy(view: EditorView, event: ClipboardEvent) {
              return handleCopyEvent(view, event, schema)
            },
          },
        },
      }),
    ]
  },
})

function handleCopyEvent(
  view: EditorView,
  event: ClipboardEvent,
  schema: Schema,
): boolean {
  const { state } = view
  const { selection } = state

  if (selection.empty) return false
  if (!event.clipboardData) return false

  // Serialize the selected content to a DOM fragment
  const slice = selection.content()
  const serializer = DOMSerializer.fromSchema(schema)
  const tempDoc = document.implementation.createHTMLDocument()
  const container = tempDoc.createElement('div')
  container.appendChild(
    serializer.serializeFragment(slice.content, { document: tempDoc }),
  )

  // Strip research reference indicators before copy
  container.querySelectorAll('.ref-indicator').forEach(el => el.remove())

  // Apply inline styles for external paste targets
  applyInlineStyles(container)

  // Build plain text from the slice content
  const plainText = slice.content.textBetween(
    0,
    slice.content.size,
    '\n\n',
    '\n',
  )

  // Write both formats to clipboard
  event.clipboardData.setData('text/html', container.innerHTML)
  event.clipboardData.setData('text/plain', plainText)
  event.preventDefault()

  return true
}

/**
 * Walks a DOM tree and applies inline styles from the style map.
 * Merges with any existing inline styles (e.g., color from TextStyle extension).
 * Strips class attributes since they are meaningless outside the app.
 *
 * Exported for unit testing.
 */
export function applyInlineStyles(container: HTMLElement): void {
  const elements: HTMLElement[] = []

  // Collect all element nodes
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
  )

  let current: Node | null = walker.currentNode
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      elements.push(current as HTMLElement)
    }
    current = walker.nextNode()
  }

  for (const el of elements) {
    const tag = el.tagName.toLowerCase()
    const resolver = INLINE_STYLE_MAP[tag]

    if (resolver) {
      const newStyle = typeof resolver === 'function' ? resolver(el) : resolver
      const existing = el.getAttribute('style') || ''
      // Append mapped styles after existing ones so they don't override
      // user-set inline styles (e.g., text color, highlight color)
      el.setAttribute('style', existing ? `${existing} ${newStyle}` : newStyle)
    }

    // Strip class attributes — Tailwind classes won't work in external apps
    el.removeAttribute('class')
  }
}
