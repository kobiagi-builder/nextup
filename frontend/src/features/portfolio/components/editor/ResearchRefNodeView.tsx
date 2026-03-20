/**
 * ResearchRefNodeView
 *
 * React NodeView wrapper for the ResearchRef TipTap node.
 * Renders the ResearchRefCard (superscript number + hover card) inline.
 */

import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { ResearchRefCard } from './ResearchRefCard'

export function ResearchRefNodeView({ node }: ReactNodeViewProps) {
  const refId = node.attrs.refId as string
  const refIndex = node.attrs.refIndex as string

  return (
    <NodeViewWrapper as="span" className="inline" style={{ lineHeight: 0 }}>
      <ResearchRefCard refId={refId} refIndex={refIndex} />
    </NodeViewWrapper>
  )
}
