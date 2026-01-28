/**
 * Rich Text Editor Component
 *
 * Tiptap-based rich text editor for artifact content.
 */

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ToneSelector } from '../artifact/ToneSelector'
import { useCallback, useEffect } from 'react'
import type { ToneOption } from '../../types/portfolio'
import { formatListsInHtml } from '../../utils/htmlFormatter'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  tone?: ToneOption // Phase 1: Content tone
  onToneChange?: (tone: ToneOption) => void // Phase 1: Tone change handler
}

/**
 * Toolbar button component
 */
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

/**
 * Editor toolbar component
 */
function EditorToolbar({
  editor,
  tone,
  onToneChange,
}: {
  editor: Editor | null
  tone?: ToneOption
  onToneChange?: (tone: ToneOption) => void
}) {
  if (!editor) return null

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="flex items-center gap-0.5 border-b border-border/50 p-2 bg-muted/30 justify-between">
      {/* Left side: Formatting buttons */}
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

      {/* Right side: Tone selector (Phase 1) */}
      {tone !== undefined && onToneChange && (
        <div className="ml-auto">
          <ToneSelector
            value={tone}
            onChange={onToneChange}
            layout="horizontal"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Rich text editor with Tiptap
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  editable = true,
  tone,
  onToneChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
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
          // Headings - distinct sizes with editorial spacing
          // More space above (separate sections), less below (connect to content)
          'prose-h1:text-3xl prose-h1:font-bold prose-h1:text-foreground prose-h1:mt-10 prose-h1:mb-4 prose-h1:leading-tight',
          'prose-h2:text-2xl prose-h2:font-semibold prose-h2:text-foreground prose-h2:mt-8 prose-h2:mb-3 prose-h2:leading-snug',
          'prose-h3:text-xl prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-6 prose-h3:mb-2 prose-h3:leading-snug',
          // First element no top margin
          '[&>*:first-child]:mt-0',
          // Paragraphs - generous spacing for readability (1.5em = 24px)
          // Line height 1.75 (28px) for comfortable reading
          'prose-p:text-foreground prose-p:text-base prose-p:leading-7 prose-p:mb-6',
          // Links
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          // Emphasis
          'prose-strong:text-foreground prose-strong:font-semibold',
          'prose-em:text-foreground prose-em:italic',
          // Code - inline code styling
          'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
          // Blockquotes - editorial spacing
          'prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-6',
          // Lists - improved spacing for readability
          'prose-ul:text-foreground prose-ul:my-6 prose-ul:pl-6',
          'prose-ol:text-foreground prose-ol:my-6 prose-ol:pl-6',
          'prose-li:text-foreground prose-li:text-base prose-li:leading-7 prose-li:mb-3',
          // Nested lists - slightly less spacing
          'prose-li>ul:mt-3 prose-li>ul:mb-0',
          'prose-li>ol:mt-3 prose-li>ol:mb-0'
        ),
      },
    },
  })

  // Update editor content when prop changes (Phase 1: critical for skeleton display)
  useEffect(() => {
    if (!editor) return

    const currentHTML = editor.getHTML()
    let newContent = content || ''

    // Format plain text lists into proper HTML lists
    // Converts "1. Item" -> <ol><li>Item</li></ol>
    // Converts "- Item" -> <ul><li>Item</li></ul>
    newContent = formatListsInHtml(newContent)

    // Normalize HTML for comparison (remove extra whitespace)
    const normalize = (html: string) => html.replace(/\s+/g, ' ').trim()
    const currentNormalized = normalize(currentHTML)
    const newNormalized = normalize(newContent)

    if (currentNormalized !== newNormalized) {
      console.log('[RichTextEditor] Updating editor content:', {
        currentLength: currentHTML.length,
        newLength: newContent.length,
        preview: newContent.substring(0, 100),
        hadPlainTextLists: newContent !== (content || ''),
      })
      editor.commands.setContent(newContent, { emitUpdate: false }) // Don't emit update event
    }
  }, [content, editor])

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-card overflow-hidden',
        'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50',
        className
      )}
    >
      {editable && <EditorToolbar editor={editor} tone={tone} onToneChange={onToneChange} />}
      <EditorContent editor={editor} />
    </div>
  )
}

/**
 * Read-only content renderer
 */
export function RichTextContent({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert prose-sm max-w-none',
          // Headings with editorial spacing
          'prose-h1:font-bold prose-h1:text-foreground prose-h1:mt-8 prose-h1:mb-3 prose-h1:leading-tight',
          'prose-h2:font-semibold prose-h2:text-foreground prose-h2:mt-6 prose-h2:mb-2.5 prose-h2:leading-snug',
          'prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-5 prose-h3:mb-2 prose-h3:leading-snug',
          '[&>*:first-child]:mt-0',
          // Paragraphs with generous spacing
          'prose-p:text-foreground prose-p:leading-7 prose-p:mb-5',
          // Links
          'prose-a:text-primary',
          // Lists with improved spacing
          'prose-ul:my-5 prose-ol:my-5',
          'prose-li:mb-2.5',
          // Nested lists
          'prose-li>ul:mt-2.5 prose-li>ul:mb-0',
          'prose-li>ol:mt-2.5 prose-li>ol:mb-0',
          className
        ),
      },
    },
  })

  return <EditorContent editor={editor} />
}
