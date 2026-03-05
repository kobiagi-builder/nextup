/**
 * Customer Rich Text Editor
 *
 * Simplified TipTap editor for customer artifacts.
 * No portfolio-specific dependencies (ToneSelector, ImageBubbleMenu, etc.).
 */

import { useCallback, useEffect, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
  Code,
  Baseline,
  Highlighter,
  Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface CustomerRichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8',
        isActive && 'bg-muted text-primary'
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  )
}

const TEXT_COLORS = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'White', value: '#ffffff' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Red', value: '#7f1d1d' },
  { label: 'Orange', value: '#78350f' },
  { label: 'Yellow', value: '#713f12' },
  { label: 'Green', value: '#14532d' },
  { label: 'Blue', value: '#1e3a5f' },
  { label: 'Purple', value: '#4c1d95' },
  { label: 'Pink', value: '#831843' },
  { label: 'Gray', value: '#374151' },
]

function ColorPickerButton({
  editor,
  type,
}: {
  editor: Editor
  type: 'textColor' | 'highlight'
}) {
  const [open, setOpen] = useState(false)
  const isTextColor = type === 'textColor'
  const colors = isTextColor ? TEXT_COLORS : HIGHLIGHT_COLORS
  const title = isTextColor ? 'Text Color' : 'Highlight Color'

  const activeColor = isTextColor
    ? (editor.getAttributes('textStyle').color as string | undefined)
    : (editor.getAttributes('highlight').color as string | undefined)

  const applyColor = (color: string | null) => {
    if (isTextColor) {
      if (color) {
        editor.chain().focus().setColor(color).run()
      } else {
        editor.chain().focus().unsetColor().run()
      }
    } else {
      if (color) {
        editor.chain().focus().toggleHighlight({ color }).run()
      } else {
        editor.chain().focus().unsetHighlight().run()
      }
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', activeColor && 'bg-muted text-primary')}
          title={title}
        >
          <div className="flex flex-col items-center gap-0">
            {isTextColor ? (
              <Baseline className="h-3.5 w-3.5" />
            ) : (
              <Highlighter className="h-3.5 w-3.5" />
            )}
            <div
              className="h-0.5 w-3.5 rounded-full"
              style={{ backgroundColor: activeColor || 'currentColor' }}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-portal-ignore-click-outside
        className="w-auto p-2"
        align="start"
        sideOffset={8}
      >
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border hover:ring-2 hover:ring-primary/50"
            onClick={() => applyColor(null)}
            title={isTextColor ? 'Default' : 'None'}
          >
            <Ban className="h-3 w-3 text-muted-foreground" />
          </button>
          {colors.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={cn(
                'h-6 w-6 rounded-full hover:ring-2 hover:ring-primary/50',
                activeColor === value && 'ring-2 ring-primary'
              )}
              style={{ backgroundColor: value }}
              onClick={() => applyColor(value)}
              title={label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex items-center gap-0.5 border-b border-border/50 p-2 bg-muted/30">
      <div className="flex flex-wrap items-center gap-0.5">
        {/* History */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        {/* Text color & highlight */}
        <ColorPickerButton editor={editor} type="textColor" />
        <ColorPickerButton editor={editor} type="highlight" />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  )
}

export function CustomerRichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  editable = true,
}: CustomerRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-none',
          'focus:outline-none min-h-[200px] p-6',
          // Headings
          'prose-h1:text-3xl prose-h1:font-bold prose-h1:text-foreground prose-h1:mt-10 prose-h1:mb-4 prose-h1:leading-tight',
          'prose-h2:text-2xl prose-h2:font-semibold prose-h2:text-foreground prose-h2:mt-8 prose-h2:mb-3 prose-h2:leading-snug',
          'prose-h3:text-xl prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-6 prose-h3:mb-2 prose-h3:leading-snug',
          '[&>*:first-child]:mt-0',
          // Paragraphs
          'prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-p:mb-6',
          // Links
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          // Emphasis
          'prose-strong:text-foreground prose-strong:font-semibold',
          'prose-em:text-foreground prose-em:italic',
          // Code
          'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
          // Blockquotes
          'prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-6',
          // Lists
          'prose-ul:text-foreground prose-ul:my-6 prose-ul:pl-6',
          'prose-ol:text-foreground prose-ol:my-6 prose-ol:pl-6',
          'prose-li:text-foreground prose-li:text-base prose-li:leading-7 prose-li:mb-3',
          'prose-li>ul:mt-3 prose-li>ul:mb-0',
          'prose-li>ol:mt-3 prose-li>ol:mb-0'
        ),
      },
    },
  })

  // Sync editable state
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  // Update content when prop changes (without disrupting active editing)
  useEffect(() => {
    if (!editor) return
    if (editor.isFocused) return

    const normalize = (html: string) => html.replace(/\s+/g, ' ').trim()
    if (normalize(editor.getHTML()) !== normalize(content || '')) {
      editor.commands.setContent(content || '', { emitUpdate: false })
    }
  }, [content, editor])

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-card',
        'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50',
        className
      )}
    >
      {editable && (
        <div className="sticky top-0 z-10 bg-card">
          <EditorToolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
