/**
 * Declarative mapping from HTML tag names to inline CSS styles.
 * Used by InlineStyleCopy extension to produce clipboard HTML that
 * renders correctly when pasted into external apps (LinkedIn, Gmail, Outlook).
 *
 * Colors are hardcoded light-mode values (not CSS variables) because
 * paste targets have no access to our theme variables.
 */

export type StyleResolver = string | ((el: HTMLElement) => string)

export const INLINE_STYLE_MAP: Record<string, StyleResolver> = {
  // Headings
  h1: 'font-size:30px; font-weight:700; margin-top:40px; margin-bottom:16px; line-height:1.2;',
  h2: 'font-size:24px; font-weight:600; margin-top:32px; margin-bottom:12px; line-height:1.3;',
  h3: 'font-size:20px; font-weight:600; margin-top:24px; margin-bottom:8px; line-height:1.3;',

  // Paragraphs
  p: 'font-size:16px; line-height:1.75; margin-bottom:24px;',

  // Inline marks
  strong: 'font-weight:600;',
  em: 'font-style:italic;',
  code: 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:14px; background-color:#f3f4f6; padding:2px 6px; border-radius:4px;',

  // Links
  a: 'color:#2563eb; text-decoration:none;',

  // Blockquotes
  blockquote: 'border-left:4px solid #2563eb; padding-left:16px; font-style:italic; margin:24px 0; color:#6b7280;',

  // Lists
  ul: 'margin:24px 0; padding-left:24px; list-style-type:disc;',
  ol: 'margin:24px 0; padding-left:24px; list-style-type:decimal;',
  li: 'font-size:16px; line-height:1.75; margin-bottom:12px;',

  // Tables
  table: 'width:100%; border-collapse:collapse; margin:24px 0; border:1px solid #d1d5db;',
  th: 'border:1px solid #d1d5db; padding:8px 12px; font-weight:600; background-color:#f3f4f6; text-align:left;',
  td: 'border:1px solid #d1d5db; padding:8px 12px; vertical-align:top;',

  // Horizontal rule
  hr: 'border:none; border-top:1px solid #d1d5db; margin:24px 0;',

  // Code block
  pre: 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:14px; background-color:#1f2937; color:#f3f4f6; padding:16px; border-radius:8px; overflow-x:auto; margin:24px 0;',

  // Highlight — reads existing color from data-color or inline style
  mark: (el: HTMLElement) => {
    const color = el.getAttribute('data-color') || el.style.backgroundColor || '#fef08a'
    return `background-color:${color}; padding:2px 4px; border-radius:2px;`
  },

  // Images — converts data-align to CSS margin alignment
  img: (el: HTMLElement) => {
    const align = el.getAttribute('data-align')
    const base = 'max-width:100%; height:auto; border-radius:8px; margin:16px 0;'
    if (align === 'center') return base + ' display:block; margin-left:auto; margin-right:auto;'
    if (align === 'right') return base + ' display:block; margin-left:auto;'
    return base
  },
}
