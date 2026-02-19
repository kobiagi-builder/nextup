/**
 * TextSelectionAIButton Component
 *
 * Floating AI button that appears when text is selected in the Tiptap editor.
 * Clicking it captures the selection context and opens the chat sidebar
 * for content improvement feedback.
 */

import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorSelectionStore } from '../../stores/editorSelectionStore'

interface TextSelectionAIButtonProps {
  editor: Editor
  artifactId: string
  onAIClick: () => void
}

/**
 * Extract surrounding context (2 paragraphs before/after + nearest heading)
 * from the editor document around the given selection range.
 */
function getSurroundingContext(editor: Editor, from: number, to: number) {
  const doc = editor.state.doc
  let before = ''
  let after = ''
  let sectionHeading: string | null = null

  // Walk backwards from selection to collect preceding text (up to ~2 blocks)
  let blocksBeforeCount = 0
  const beforeParts: string[] = []
  doc.nodesBetween(0, from, (node, pos) => {
    if (blocksBeforeCount >= 2) return false
    if (node.isBlock && node.textContent.trim()) {
      const nodeEnd = pos + node.nodeSize
      if (nodeEnd <= from) {
        // Check if it's a heading - capture nearest one
        if (node.type.name === 'heading' && !sectionHeading) {
          sectionHeading = node.textContent.trim()
        }
        beforeParts.push(node.textContent.trim())
        blocksBeforeCount++
      }
    }
  })
  // Take last 2 blocks (closest to selection)
  before = beforeParts.slice(-2).join('\n\n')

  // Walk forward from selection to collect following text (up to ~2 blocks)
  let blocksAfterCount = 0
  doc.nodesBetween(to, doc.content.size, (node, pos) => {
    if (blocksAfterCount >= 2) return false
    if (node.isBlock && node.textContent.trim() && pos >= to) {
      after += (after ? '\n\n' : '') + node.textContent.trim()
      blocksAfterCount++
    }
  })

  // If no heading found walking backwards, try resolving from position
  if (!sectionHeading) {
    doc.nodesBetween(0, from, (node) => {
      if (node.type.name === 'heading') {
        sectionHeading = node.textContent.trim()
      }
    })
  }

  return { before, after, sectionHeading }
}

export function TextSelectionAIButton({ editor, artifactId, onAIClick }: TextSelectionAIButtonProps) {
  const setTextSelection = useEditorSelectionStore((s) => s.setTextSelection)

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e }: { editor: Editor }) => {
        // Show only when text is selected (not empty selection) and NOT on an image
        const { from, to } = e.state.selection
        const hasTextSelection = from !== to
        const isImageActive = e.isActive('image')
        return hasTextSelection && !isImageActive
      }}
      options={{
        placement: 'left-start',
        offset: 8,
      }}
      className="text-ai-button"
    >
      <Button
        type="button"
        size="icon"
        className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        title="Improve with AI"
        onClick={() => {
          const { from, to } = editor.state.selection
          const selectedText = editor.state.doc.textBetween(from, to, ' ')
          if (selectedText.trim().length < 3) return

          const surroundingContext = getSurroundingContext(editor, from, to)

          setTextSelection({
            selectedText,
            startPos: from,
            endPos: to,
            surroundingContext,
            artifactId,
          })

          onAIClick()
        }}
      >
        <Sparkles className="h-4 w-4" />
      </Button>
    </BubbleMenu>
  )
}
