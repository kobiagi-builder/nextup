/**
 * TableToolbarDropdown Component
 *
 * Toolbar dropdown for table operations. Shows a dimension picker grid
 * when no table is active, and row/column editing operations when the
 * cursor is inside a table.
 */

import { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  Rows3,
  Columns3,
  TableCellsMerge,
  TableCellsSplit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface TableToolbarDropdownProps {
  editor: Editor
}

const MAX_ROWS = 8
const MAX_COLS = 8

/**
 * Interactive grid for selecting table dimensions by hovering over cells.
 */
function DimensionPicker({
  onSelect,
}: {
  onSelect: (rows: number, cols: number) => void
}) {
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)

  return (
    <div className="p-2">
      <p className="text-xs text-muted-foreground mb-2 text-center">
        {hoverRow > 0 && hoverCol > 0
          ? `${hoverRow} x ${hoverCol}`
          : 'Select table size'}
      </p>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
        onMouseLeave={() => {
          setHoverRow(0)
          setHoverCol(0)
        }}
      >
        {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
          const row = Math.floor(i / MAX_COLS) + 1
          const col = (i % MAX_COLS) + 1
          const isHighlighted = row <= hoverRow && col <= hoverCol

          return (
            <button
              key={i}
              type="button"
              className={cn(
                'w-5 h-5 rounded-sm border transition-colors',
                isHighlighted
                  ? 'bg-primary/30 border-primary/50'
                  : 'bg-muted/30 border-border/50 hover:border-border'
              )}
              onMouseEnter={() => {
                setHoverRow(row)
                setHoverCol(col)
              }}
              onClick={() => onSelect(row, col)}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Table editing operations shown when cursor is inside a table.
 */
function TableEditOperations({ editor }: { editor: Editor }) {
  return (
    <div className="p-1.5 flex flex-col gap-0.5">
      {/* Row operations */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs"
          disabled={!editor.can().addRowBefore()}
          onClick={() => editor.chain().focus().addRowBefore().run()}
        >
          <Plus className="h-3.5 w-3.5" />
          <Rows3 className="h-3.5 w-3.5" />
          <span>Row above</span>
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs"
          disabled={!editor.can().addRowAfter()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <Rows3 className="h-3.5 w-3.5" />
          <Plus className="h-3.5 w-3.5" />
          <span>Row below</span>
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs text-muted-foreground"
          disabled={!editor.can().deleteRow()}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <Minus className="h-3.5 w-3.5" />
          <Rows3 className="h-3.5 w-3.5" />
          <span>Delete row</span>
        </Button>
      </div>

      <div className="h-px bg-border my-0.5" />

      {/* Column operations */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs"
          disabled={!editor.can().addColumnBefore()}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
          <Plus className="h-3.5 w-3.5" />
          <Columns3 className="h-3.5 w-3.5" />
          <span>Column left</span>
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs"
          disabled={!editor.can().addColumnAfter()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <Columns3 className="h-3.5 w-3.5" />
          <Plus className="h-3.5 w-3.5" />
          <span>Column right</span>
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs text-muted-foreground"
          disabled={!editor.can().deleteColumn()}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <Minus className="h-3.5 w-3.5" />
          <Columns3 className="h-3.5 w-3.5" />
          <span>Delete column</span>
        </Button>
      </div>

      <div className="h-px bg-border my-0.5" />

      {/* Cell & header operations */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs"
          disabled={!editor.can().toggleHeaderRow()}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          <Rows3 className="h-3.5 w-3.5" />
          <span>Toggle header row</span>
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs"
          disabled={!editor.can().mergeCells()}
          onClick={() => editor.chain().focus().mergeCells().run()}
        >
          <TableCellsMerge className="h-3.5 w-3.5" />
          <span>Merge cells</span>
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs"
          disabled={!editor.can().splitCell()}
          onClick={() => editor.chain().focus().splitCell().run()}
        >
          <TableCellsSplit className="h-3.5 w-3.5" />
          <span>Split cell</span>
        </Button>
      </div>

      <div className="h-px bg-border my-0.5" />

      {/* Delete table */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-start gap-2 text-xs text-destructive hover:text-destructive"
          disabled={!editor.can().deleteTable()}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete table</span>
        </Button>
      </div>
    </div>
  )
}

export function TableToolbarDropdown({ editor }: TableToolbarDropdownProps) {
  const [open, setOpen] = useState(false)
  const isInTable = editor.isActive('table')

  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
      setOpen(false)
    },
    [editor]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', isInTable && 'bg-muted text-primary')}
          title={isInTable ? 'Table options' : 'Insert Table'}
        >
          <TableIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-portal-ignore-click-outside
        className="w-auto p-0"
        align="start"
        sideOffset={8}
      >
        {isInTable ? (
          <TableEditOperations editor={editor} />
        ) : (
          <DimensionPicker onSelect={handleInsertTable} />
        )}
      </PopoverContent>
    </Popover>
  )
}
