# Hebrew & RTL Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full Hebrew language and RTL (Right-to-Left) support to all rich text editors in the NextUp application.

**Architecture:** Use TipTap's built-in `textDirection: 'auto'` for per-paragraph auto-detection, combined with the `tiptap-text-direction` community extension for explicit `dir` attribute persistence in HTML output. Replace all physical CSS properties with logical equivalents. Add Hebrew-friendly font (Heebo) alongside existing Plus Jakarta Sans. Add RTL/LTR toolbar toggle button for manual override. Update markdown conversion to preserve direction attributes.

**Tech Stack:** TipTap v3, tiptap-text-direction extension, Tailwind CSS logical properties, Google Fonts (Heebo), Vitest, Playwright

**Affected Editors (all 3 + read-only renderer):**
- `frontend/src/features/portfolio/components/editor/RichTextEditor.tsx` (main editor + `RichTextContent`)
- `frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx`
- `frontend/src/features/customers/components/projects/DocumentEditor.tsx` (wraps CustomerRichTextEditor)

---

## Phase 1: Foundation — Font & CSS Logical Properties

### Task 1: Add Hebrew font (Heebo) to Google Fonts import

**Files:**
- Modify: `frontend/src/index.css:17`

**Step 1: Update the Google Fonts import**

Change line 17 from:
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
```
to:
```css
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
```

**Step 2: Update CSS font-family custom properties**

Change `frontend/src/index.css:29-31` from:
```css
--font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
--font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```
to:
```css
--font-display: 'Plus Jakarta Sans', 'Heebo', system-ui, sans-serif;
--font-body: 'Plus Jakarta Sans', 'Heebo', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

This ensures Hebrew characters fall through to Heebo when Plus Jakarta Sans doesn't have Hebrew glyphs, while Latin text continues using Plus Jakarta Sans.

**Step 3: Run dev server and verify fonts load**

Run: `cd frontend && npm run dev`
Open browser DevTools → Network → filter "fonts" → verify Heebo fonts are loaded.

**Step 4: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(editor): add Heebo Hebrew font to font stack"
```

---

### Task 2: Replace physical CSS with logical properties in editor prose classes

**Files:**
- Modify: `frontend/src/features/portfolio/components/editor/RichTextEditor.tsx:533-540`
- Modify: `frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx:380-386`

Both files have identical prose class strings that use physical left-padding. These break in RTL.

**Step 1: Update RichTextEditor.tsx prose classes**

In `RichTextEditor.tsx`, change lines 533-540 from:
```typescript
'prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-6',
// Lists - improved spacing for readability
'prose-ul:text-foreground prose-ul:my-6 prose-ul:pl-6',
'prose-ol:text-foreground prose-ol:my-6 prose-ol:pl-6',
```
to:
```typescript
'prose-blockquote:border-s-4 prose-blockquote:border-s-primary prose-blockquote:ps-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-6',
// Lists - improved spacing for readability
'prose-ul:text-foreground prose-ul:my-6 prose-ul:ps-6',
'prose-ol:text-foreground prose-ol:my-6 prose-ol:ps-6',
```

Also update the `RichTextContent` read-only renderer in the same file (the prose classes around line 706-721 don't have explicit `pl-` on lists, so only check blockquote if present).

**Step 2: Update CustomerRichTextEditor.tsx prose classes**

In `CustomerRichTextEditor.tsx`, change lines 380-383 from:
```typescript
'prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-6',
// Lists
'prose-ul:text-foreground prose-ul:my-6 prose-ul:pl-6',
'prose-ol:text-foreground prose-ol:my-6 prose-ol:pl-6',
```
to:
```typescript
'prose-blockquote:border-s-4 prose-blockquote:border-s-primary prose-blockquote:ps-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-6',
// Lists
'prose-ul:text-foreground prose-ul:my-6 prose-ul:ps-6',
'prose-ol:text-foreground prose-ol:my-6 prose-ol:ps-6',
```

**Key Tailwind mappings:**
- `pl-*` → `ps-*` (padding-inline-start)
- `pr-*` → `pe-*` (padding-inline-end)
- `border-l-*` → `border-s-*` (border-inline-start)
- `border-r-*` → `border-e-*` (border-inline-end)

**Step 3: Update table header text-align in index.css**

Change `frontend/src/index.css:369` from:
```css
text-align: left;
```
to:
```css
text-align: start;
```

**Step 4: Verify LTR content still looks correct**

Run dev server, open an existing artifact with blockquotes and lists. Verify visual appearance is unchanged in LTR mode.

**Step 5: Commit**

```bash
git add frontend/src/features/portfolio/components/editor/RichTextEditor.tsx \
       frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx \
       frontend/src/index.css
git commit -m "refactor(editor): replace physical CSS with logical properties for RTL support"
```

---

## Phase 2: TipTap Text Direction Extension

### Task 3: Install tiptap-text-direction extension

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install the package**

```bash
cd frontend && npm install tiptap-text-direction
```

**Step 2: Verify installation**

```bash
ls node_modules/tiptap-text-direction/dist
```

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(deps): add tiptap-text-direction for RTL support"
```

---

### Task 4: Add TextDirection extension to RichTextEditor

**Files:**
- Modify: `frontend/src/features/portfolio/components/editor/RichTextEditor.tsx`

**Step 1: Add import**

Add after line 18 (after TableCell import):
```typescript
import TextDirection from 'tiptap-text-direction'
```

**Step 2: Add extension to main editor (line ~466-504)**

Add `TextDirection` to the extensions array in the `useEditor` call inside `RichTextEditor` component, after `TableCell`:
```typescript
TextDirection.configure({
  types: ['heading', 'paragraph', 'blockquote', 'listItem'],
}),
```

**Step 3: Add `textDirection: 'auto'` to editor options**

In the same `useEditor` call, add after `editable,` (line ~506):
```typescript
textDirection: 'auto',
```

Note: `textDirection: 'auto'` is a TipTap v3 built-in option. The `TextDirection` extension adds per-node `dir` attribute persistence.

**Step 4: Add extension to read-only RichTextContent editor (~line 675-726)**

Add the same `TextDirection` extension to the `RichTextContent` component's `useEditor` call:
```typescript
TextDirection.configure({
  types: ['heading', 'paragraph', 'blockquote', 'listItem'],
}),
```

And add `textDirection: 'auto'` to its editor options as well.

**Step 5: Verify**

Run dev server, open an artifact, type Hebrew text (e.g., "שלום עולם"). The paragraph should auto-detect and right-align.

**Step 6: Commit**

```bash
git add frontend/src/features/portfolio/components/editor/RichTextEditor.tsx
git commit -m "feat(editor): add TextDirection extension to RichTextEditor with auto-detection"
```

---

### Task 5: Add TextDirection extension to CustomerRichTextEditor

**Files:**
- Modify: `frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx`

**Step 1: Add import**

Add after line 19 (after TableCell import):
```typescript
import TextDirection from 'tiptap-text-direction'
```

**Step 2: Add extension to editor (~line 329-354)**

Add `TextDirection` to the extensions array after `TableCell`:
```typescript
TextDirection.configure({
  types: ['heading', 'paragraph', 'blockquote', 'listItem'],
}),
```

**Step 3: Add `textDirection: 'auto'` to editor options**

After `editable,` (~line 355):
```typescript
textDirection: 'auto',
```

**Step 4: Verify**

Open a customer document, type Hebrew text. Paragraph should auto-detect RTL.

**Step 5: Commit**

```bash
git add frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx
git commit -m "feat(editor): add TextDirection extension to CustomerRichTextEditor"
```

---

### Task 6: Add RTL toggle button to toolbars

**Files:**
- Modify: `frontend/src/features/portfolio/components/editor/RichTextEditor.tsx`
- Modify: `frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx`

**Step 1: Add Pilcrow icon import to RichTextEditor.tsx**

Update the lucide-react import (line 19-34) to add `TextCursorInput`:
```typescript
import { ..., TextCursorInput } from 'lucide-react'
```

Note: `TextCursorInput` from lucide is a good icon for direction toggle. Alternative: use a custom SVG with RTL indicator.

**Step 2: Add RTL toggle button to RichTextEditor EditorToolbar**

In the `EditorToolbar` component (~line 277-444), add after the Table dropdown section (~line 429) and before the closing `</div>` of the left side:

```tsx
{/* RTL toggle */}
<div className="w-px h-6 bg-border mx-1" />
<ToolbarButton
  onClick={() => {
    const currentDir = editor.getAttributes('paragraph').dir
    if (currentDir === 'rtl') {
      editor.commands.unsetTextDirection()
    } else {
      editor.commands.setTextDirection('rtl')
    }
  }}
  isActive={editor.getAttributes('paragraph').dir === 'rtl'}
  title="Toggle RTL (Right-to-Left)"
>
  <TextCursorInput className="h-4 w-4" />
</ToolbarButton>
```

**Step 3: Add RTL toggle button to CustomerRichTextEditor EditorToolbar**

Same pattern. Add after the Table dropdown section (~line 316) inside the toolbar:

```tsx
{/* RTL toggle */}
<div className="w-px h-6 bg-border mx-1" />
<ToolbarButton
  onClick={() => {
    const currentDir = editor.getAttributes('paragraph').dir
    if (currentDir === 'rtl') {
      editor.commands.unsetTextDirection()
    } else {
      editor.commands.setTextDirection('rtl')
    }
  }}
  isActive={editor.getAttributes('paragraph').dir === 'rtl'}
  title="Toggle RTL (Right-to-Left)"
>
  <TextCursorInput className="h-4 w-4" />
</ToolbarButton>
```

Also add `TextCursorInput` to the lucide-react import in CustomerRichTextEditor.tsx.

**Step 4: Verify**

- Open editor → click RTL button → cursor should jump to right side
- Type Hebrew → text flows RTL
- Click again → reverts to LTR
- Type English in RTL mode → English words embed as LTR islands within RTL paragraph (browser BiDi algorithm)

**Step 5: Commit**

```bash
git add frontend/src/features/portfolio/components/editor/RichTextEditor.tsx \
       frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx
git commit -m "feat(editor): add RTL toggle button to all editor toolbars"
```

---

## Phase 3: Markdown Conversion & HTML Direction Preservation

### Task 7: Update Turndown to preserve dir attributes

**Files:**
- Modify: `frontend/src/lib/markdown.ts`

**Step 1: Add Turndown rule for direction preservation**

After the `highlightMark` rule (~line 36), add:

```typescript
// Preserve dir attributes on block elements (RTL/LTR direction)
turndownService.addRule('preserveDirection', {
  filter: (node) => {
    return (
      node.nodeType === 1 &&
      !!(node as HTMLElement).getAttribute('dir')
    )
  },
  replacement: (content, node) => {
    const el = node as HTMLElement
    const dir = el.getAttribute('dir')
    const tag = el.tagName.toLowerCase()

    // For block elements, wrap in HTML with dir attribute
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li'].includes(tag)) {
      return `<${tag} dir="${dir}">${content.trim()}</${tag}>\n\n`
    }

    // For inline elements, pass through
    return content
  },
})
```

**Step 2: Update markdownToHTML to handle dir attributes in inline HTML**

The `marked` library already passes through inline HTML by default, so `<p dir="rtl">text</p>` in markdown will be rendered correctly. No changes needed to `markdownToHTML`.

**Step 3: Verify round-trip**

Write a quick test (see Task 10 for formal tests):
1. Create Hebrew content in customer editor
2. Close the document editor (triggers auto-save → HTML→Markdown)
3. Reopen → content should still be RTL

**Step 4: Commit**

```bash
git add frontend/src/lib/markdown.ts
git commit -m "feat(markdown): preserve dir attributes during HTML-to-Markdown conversion"
```

---

## Phase 4: Editor Container & Placeholder RTL Support

### Task 8: Add RTL-aware placeholder CSS

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: Add RTL placeholder styles**

Add after the table styles section (~after line 428):

```css
/* =============================================================================
   RTL / Hebrew Support
   ============================================================================= */

/* Placeholder inherits block direction from TipTap's textDirection: 'auto' */
.ProseMirror [dir="rtl"] p.is-editor-empty:first-child::before {
  text-align: right;
}

/* Ensure RTL blocks get correct text alignment */
.ProseMirror [dir="rtl"],
.ProseMirror[dir="rtl"] {
  text-align: right;
}

.ProseMirror [dir="ltr"],
.ProseMirror[dir="ltr"] {
  text-align: left;
}
```

**Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(editor): add RTL placeholder and text alignment CSS"
```

---

### Task 9: Build verification

**Step 1: Run TypeScript build**

```bash
cd frontend && npm run build
```

Expected: Clean build with no errors.

**Step 2: Fix any TypeScript errors**

If `tiptap-text-direction` doesn't ship types, create a declaration file at `frontend/src/types/tiptap-text-direction.d.ts`:

```typescript
declare module 'tiptap-text-direction' {
  import { Extension } from '@tiptap/core'

  interface TextDirectionOptions {
    types: string[]
    defaultDirection?: 'ltr' | 'rtl' | null
  }

  const TextDirection: Extension<TextDirectionOptions>
  export default TextDirection
}
```

Also add command type augmentation if needed:

```typescript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (direction: 'ltr' | 'rtl') => ReturnType
      unsetTextDirection: () => ReturnType
    }
  }
}
```

**Step 3: Commit if type declaration was needed**

```bash
git add frontend/src/types/tiptap-text-direction.d.ts
git commit -m "chore(types): add type declarations for tiptap-text-direction"
```

---

## Phase 5: Unit Tests

### Task 10: Unit tests for markdown direction preservation

**Files:**
- Create: `frontend/src/lib/__tests__/markdown-rtl.test.ts`

**Step 1: Write the test file**

```typescript
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
```

**Step 2: Run the test to verify it fails (TDD — before implementation, run to confirm)**

If Task 7 is already done, tests should pass. If running TDD strictly, write test first, then implement.

```bash
cd frontend && npx vitest run src/lib/__tests__/markdown-rtl.test.ts
```

Expected: All 6 tests PASS.

**Step 3: Commit**

```bash
git add frontend/src/lib/__tests__/markdown-rtl.test.ts
git commit -m "test(markdown): add unit tests for RTL direction preservation"
```

---

### Task 11: Unit tests for direction detection utility

**Files:**
- Create: `frontend/src/lib/__tests__/text-direction.test.ts`
- Create: `frontend/src/lib/text-direction.ts`

**Step 1: Create the utility (useful for future components)**

Create `frontend/src/lib/text-direction.ts`:
```typescript
/**
 * Detect text direction based on first strong directional character.
 * Uses Unicode ranges for Hebrew, Arabic, and other RTL scripts.
 */
export function detectTextDirection(text: string): 'rtl' | 'ltr' {
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\u0860-\u086F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  const ltrRegex = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/

  for (const char of text) {
    if (rtlRegex.test(char)) return 'rtl'
    if (ltrRegex.test(char)) return 'ltr'
  }
  return 'ltr'
}

/**
 * Check if a string contains any RTL characters.
 */
export function containsRTL(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/.test(text)
}
```

**Step 2: Write the test file**

Create `frontend/src/lib/__tests__/text-direction.test.ts`:
```typescript
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
```

**Step 3: Run the tests**

```bash
cd frontend && npx vitest run src/lib/__tests__/text-direction.test.ts
```

Expected: All 10 tests PASS.

**Step 4: Commit**

```bash
git add frontend/src/lib/text-direction.ts frontend/src/lib/__tests__/text-direction.test.ts
git commit -m "feat(utils): add text direction detection utility with tests"
```

---

## Phase 6: Integration Tests

### Task 12: Integration test for editor RTL behavior

**Files:**
- Create: `frontend/src/features/portfolio/components/editor/__tests__/RichTextEditor-rtl.test.tsx`

**Step 1: Write the integration test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RichTextEditor } from '../RichTextEditor'

// Mock useIsMobile
vi.mock('@/hooks/use-media-query', () => ({
  useIsMobile: () => false,
}))

describe('RichTextEditor RTL support', () => {
  it('renders with TextDirection extension configured', async () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content="<p>Hello world</p>"
        onChange={onChange}
      />
    )

    // Editor should render
    await waitFor(() => {
      expect(screen.getByRole('textbox') || document.querySelector('.ProseMirror')).toBeTruthy()
    })
  })

  it('renders Hebrew content with dir="rtl" attribute', async () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content='<p dir="rtl">שלום עולם</p>'
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const proseMirror = document.querySelector('.ProseMirror')
      expect(proseMirror).toBeTruthy()
      const rtlParagraph = proseMirror?.querySelector('[dir="rtl"]')
      expect(rtlParagraph).toBeTruthy()
      expect(rtlParagraph?.textContent).toContain('שלום')
    })
  })

  it('renders mixed direction content correctly', async () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content='<p dir="rtl">שלום</p><p>Hello</p>'
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const proseMirror = document.querySelector('.ProseMirror')
      const paragraphs = proseMirror?.querySelectorAll('p')
      expect(paragraphs?.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows RTL toggle button in toolbar', async () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content="<p>Test</p>"
        onChange={onChange}
        editable={true}
      />
    )

    await waitFor(() => {
      const rtlButton = screen.getByTitle('Toggle RTL (Right-to-Left)')
      expect(rtlButton).toBeTruthy()
    })
  })
})
```

**Step 2: Run the test**

```bash
cd frontend && npx vitest run src/features/portfolio/components/editor/__tests__/RichTextEditor-rtl.test.tsx
```

Note: TipTap tests may require JSDOM configuration. If tests fail due to missing DOM APIs, add to `vitest.config.ts`:
```typescript
test: {
  environment: 'jsdom',
}
```

**Step 3: Commit**

```bash
git add frontend/src/features/portfolio/components/editor/__tests__/RichTextEditor-rtl.test.tsx
git commit -m "test(editor): add integration tests for RTL support in RichTextEditor"
```

---

## Phase 7: E2E (Playwright) Tests

### Task 13: Playwright E2E test for Hebrew editing workflow

**Files:**
- Create: `frontend/tests/e2e/hebrew-rtl-editor.spec.ts`

**Step 1: Write the Playwright test**

```typescript
import { test, expect } from '@playwright/test'

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173'

test.describe('Hebrew RTL Editor Support', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TARGET_URL}/login`)
    await page.fill('input[name="email"]', 'kobiagi+nextuptest@gmail.com')
    await page.fill('input[name="password"]', 'Qwerty12345')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/portfolio')
  })

  test('can type Hebrew text in portfolio editor and it auto-detects RTL', async ({ page }) => {
    // Navigate to an artifact or create one
    // Click on first artifact in portfolio
    await page.click('[data-testid="artifact-card"]:first-child', { timeout: 10000 }).catch(() => {
      // If no artifact card, skip
      test.skip()
    })

    // Wait for editor to load
    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Click at the end of editor content
    await editor.click()

    // Type Hebrew text
    await page.keyboard.press('Enter')
    await page.keyboard.type('שלום עולם')

    // Verify RTL direction was applied
    const rtlParagraph = editor.locator('[dir="rtl"]')
    await expect(rtlParagraph).toBeVisible({ timeout: 5000 })
    await expect(rtlParagraph).toContainText('שלום')
  })

  test('RTL toggle button toggles direction in portfolio editor', async ({ page }) => {
    // Navigate to an artifact
    await page.click('[data-testid="artifact-card"]:first-child', { timeout: 10000 }).catch(() => {
      test.skip()
    })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Click in editor
    await editor.click()
    await page.keyboard.press('Enter')
    await page.keyboard.type('Test text')

    // Click RTL toggle button
    const rtlButton = page.getByTitle('Toggle RTL (Right-to-Left)')
    await expect(rtlButton).toBeVisible()
    await rtlButton.click()

    // Verify direction changed
    const rtlContent = editor.locator('[dir="rtl"]')
    await expect(rtlContent).toBeVisible({ timeout: 5000 })
  })

  test('blockquote border appears on correct side in RTL mode', async ({ page }) => {
    // Navigate to an artifact
    await page.click('[data-testid="artifact-card"]:first-child', { timeout: 10000 }).catch(() => {
      test.skip()
    })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Set RTL mode and create a blockquote
    await editor.click()
    const rtlButton = page.getByTitle('Toggle RTL (Right-to-Left)')
    await rtlButton.click()
    await page.keyboard.type('שלום')

    // Toggle blockquote
    const quoteButton = page.getByTitle('Quote')
    await quoteButton.click()

    // Verify blockquote exists
    const blockquote = editor.locator('blockquote')
    await expect(blockquote).toBeVisible({ timeout: 5000 })

    // CSS logical properties should handle the border side automatically
    // We verify the blockquote has border-inline-start (computed as border-right in RTL)
    const borderRight = await blockquote.evaluate((el) => {
      return window.getComputedStyle(el).borderInlineStartWidth
    })
    expect(borderRight).not.toBe('0px')
  })

  test('lists render correctly in RTL mode', async ({ page }) => {
    // Navigate to an artifact
    await page.click('[data-testid="artifact-card"]:first-child', { timeout: 10000 }).catch(() => {
      test.skip()
    })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Create RTL bullet list
    await editor.click()
    const rtlButton = page.getByTitle('Toggle RTL (Right-to-Left)')
    await rtlButton.click()

    const bulletButton = page.getByTitle('Bullet List')
    await bulletButton.click()

    await page.keyboard.type('פריט ראשון')
    await page.keyboard.press('Enter')
    await page.keyboard.type('פריט שני')

    // Verify list exists with RTL content
    const listItems = editor.locator('li')
    await expect(listItems).toHaveCount(2, { timeout: 5000 })
  })
})
```

**Step 2: Run the E2E test**

```bash
cd frontend && npx playwright test tests/e2e/hebrew-rtl-editor.spec.ts --headed
```

Note: Requires dev server running (`npm run dev` in another terminal) and the test account to be accessible.

**Step 3: Commit**

```bash
git add frontend/tests/e2e/hebrew-rtl-editor.spec.ts
git commit -m "test(e2e): add Playwright tests for Hebrew RTL editing workflow"
```

---

## Phase 8: Documentation Update

### Task 14: Update product documentation

**Files:**
- Modify: `docs/features/` (relevant feature doc)
- Modify: `docs/DOCUMENTATION_INDEX.md`

After implementation is complete, invoke the `product-documentation` skill to update all affected documentation layers. Key areas:

1. **Feature documentation** — Document Hebrew/RTL support as a feature
2. **Editor documentation** — Update editor docs with RTL capabilities
3. **Architecture documentation** — Note the tiptap-text-direction dependency

Use the `product-documentation` skill which will auto-detect changes from git diff and update appropriate docs.

**Step 1: Run product-documentation skill**

```
skill: "product-documentation"
```

**Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs: add Hebrew RTL support documentation"
```

---

## Summary

| Phase | Tasks | What |
|-------|-------|------|
| 1 | 1-2 | Font + CSS logical properties |
| 2 | 3-6 | TipTap TextDirection extension + toolbar toggle |
| 3 | 7 | Markdown direction preservation |
| 4 | 8-9 | Placeholder CSS + build verification |
| 5 | 10-11 | Unit tests (markdown + direction utility) |
| 6 | 12 | Integration tests (editor RTL behavior) |
| 7 | 13 | E2E Playwright tests |
| 8 | 14 | Documentation update |

**Total: 14 tasks across 8 phases**

**Editors affected:** All 3 (RichTextEditor, CustomerRichTextEditor via DocumentEditor, RichTextContent read-only)

**Key dependencies:**
- `tiptap-text-direction` (npm package)
- Google Fonts Heebo (CDN, no install)
- Tailwind CSS v3.4+ logical properties (already available)
