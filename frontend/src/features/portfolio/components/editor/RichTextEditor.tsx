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
import { ImageBubbleMenu } from './ImageBubbleMenu'
import { ImageCropModal } from './ImageCropModal'
import { TextSelectionAIButton } from './TextSelectionAIButton'
import { registerEditorRef, unregisterEditorRef } from '../../stores/editorSelectionStore'
import { useCallback, useEffect, useState } from 'react'
import type { ToneOption } from '../../types/portfolio'
import { formatListsInHtml } from '../../utils/htmlFormatter'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  tone?: ToneOption
  onToneChange?: (tone: ToneOption) => void
  artifactId?: string
  /** Called when user clicks AI button on text selection */
  onTextAIClick?: () => void
  /** Called when user clicks AI button on image selection */
  onImageAIClick?: () => void
}

/** Apply alignment as justify-content on the ResizableNodeView container (already display:flex). */
function syncAlignment(container: HTMLElement, align: string) {
  container.style.justifyContent =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
}

/**
 * Extended Image extension with alignment support and resize enabled.
 * Also fixes a Tiptap v3 bug where the ResizableNodeView's onUpdate callback
 * accepts attribute changes (returns true) but never syncs el.src to the DOM.
 * Our override intercepts update() to sync the <img> element directly.
 */
const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-align': {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: Record<string, string>) => {
          return { 'data-align': attributes['data-align'] || 'center' }
        },
      },
    }
  },

  addNodeView() {
    const parentFactory = this.parent?.()
    if (!parentFactory) return null
    return (props: Parameters<Exclude<typeof parentFactory, null>>[0]) => {
      const nodeView = parentFactory(props)
      if (!nodeView || typeof nodeView === 'function') return nodeView
      // Access ResizableNodeView internals: dom (container), element (<img>), node
      const view = nodeView as unknown as {
        dom: HTMLElement
        element: HTMLImageElement
        node: { attrs: Record<string, unknown> }
      }
      // Apply initial alignment on the container (already display:flex)
      syncAlignment(view.dom, (props.node.attrs['data-align'] as string) || 'center')
      const origUpdate = nodeView.update?.bind(nodeView)
      nodeView.update = (node, decorations, innerDecorations) => {
        // Sync el.src — the default onUpdate returns true but never updates it
        if (view.element && node.attrs.src !== view.node.attrs.src) {
          view.element.src = node.attrs.src as string
        }
        // Reset inline size styles when width/height are cleared (after crop)
        if (view.element && node.attrs.width == null) {
          view.element.style.width = ''
          view.element.style.height = ''
        }
        // Sync alignment on the container
        syncAlignment(view.dom, (node.attrs['data-align'] as string) || 'center')
        return origUpdate ? origUpdate(node, decorations, innerDecorations) : true
      }
      return nodeView
    }
  },
})

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
  artifactId,
  onTextAIClick,
  onImageAIClick,
}: RichTextEditorProps) {
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

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
      AlignableImage.configure({
        inline: false,
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ['bottom-right', 'bottom-left'],
          minWidth: 100,
          minHeight: 100,
          alwaysPreserveAspectRatio: true,
        },
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

  // Register editor ref for content improvement feature (ArtifactPage reads this)
  useEffect(() => {
    if (editor) {
      registerEditorRef(editor)
    }
    return () => unregisterEditorRef()
  }, [editor])

  // Sync editable state when prop changes (e.g., status transitions unlock the editor)
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  // Update editor content when prop changes (Phase 1: critical for skeleton display)
  useEffect(() => {
    if (!editor) return

    // Don't overwrite content while user is actively editing
    // This prevents cursor jumping during auto-save cycles
    if (editor.isFocused) return

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

  const handleCropComplete = useCallback((oldSrc: string, newUrl: string) => {
    if (!editor) return
    // Find the image node by its src and update attrs via setNodeMarkup.
    // The AlignableImage.addNodeView override syncs el.src to the DOM.
    const { tr } = editor.state
    let found = false
    editor.state.doc.descendants((node, pos) => {
      if (found) return false
      if (node.type.name === 'image' && node.attrs.src === oldSrc) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: newUrl,
          width: null,
          height: null,
        })
        found = true
        return false
      }
    })
    if (found) {
      editor.view.dispatch(tr)
    }
  }, [editor])

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
          <EditorToolbar editor={editor} tone={tone} onToneChange={onToneChange} />
        </div>
      )}
      <EditorContent editor={editor} />

      {/* Text selection AI button (content improvement) */}
      {editor && editable && artifactId && onTextAIClick && (
        <TextSelectionAIButton
          editor={editor}
          artifactId={artifactId}
          onAIClick={onTextAIClick}
        />
      )}

      {/* Image bubble menu (crop, align, delete, AI) */}
      {editor && editable && (
        <ImageBubbleMenu
          editor={editor}
          onCropClick={(src) => setCropImageSrc(src)}
          onAIClick={onImageAIClick}
          artifactId={artifactId}
        />
      )}

      {/* Image crop modal */}
      {cropImageSrc && artifactId && (
        <ImageCropModal
          isOpen={true}
          onClose={() => setCropImageSrc(null)}
          imageSrc={cropImageSrc}
          artifactId={artifactId}
          onCropComplete={(newUrl) => handleCropComplete(cropImageSrc!, newUrl)}
        />
      )}
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
