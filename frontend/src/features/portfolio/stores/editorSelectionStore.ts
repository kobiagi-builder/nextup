/**
 * Editor Selection Store (Zustand)
 *
 * Stores the current text or image selection from the Tiptap editor.
 * Used by the Content Improvement feature to pass selection context
 * to the AI backend for surgical edits.
 *
 * Key design decisions:
 * - Persists selection when editor loses focus (Zustand is independent of editor state)
 * - Stores both position AND text for resilient position tracking
 * - Surrounding context (2 paragraphs + heading) keeps token usage low
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export interface SurroundingContext {
  /** Up to 2 paragraphs before selection */
  before: string
  /** Up to 2 paragraphs after selection */
  after: string
  /** Nearest section heading above selection, if any */
  sectionHeading: string | null
}

export interface EditorSelectionState {
  /** Selection type: text, image, or null (no selection) */
  type: 'text' | 'image' | null

  // Text selection fields
  selectedText: string | null
  startPos: number | null
  endPos: number | null
  surroundingContext: SurroundingContext | null

  // Image selection fields
  imageSrc: string | null
  imageNodePos: number | null

  // Shared
  artifactId: string | null
}

interface EditorSelectionActions {
  setTextSelection: (params: {
    selectedText: string
    startPos: number
    endPos: number
    surroundingContext: SurroundingContext
    artifactId: string
  }) => void

  setImageSelection: (params: {
    imageSrc: string
    imageNodePos: number
    artifactId: string
  }) => void

  clearSelection: () => void
}

type EditorSelectionStore = EditorSelectionState & EditorSelectionActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: EditorSelectionState = {
  type: null,
  selectedText: null,
  startPos: null,
  endPos: null,
  surroundingContext: null,
  imageSrc: null,
  imageNodePos: null,
  artifactId: null,
}

// =============================================================================
// Store
// =============================================================================

export const useEditorSelectionStore = create<EditorSelectionStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setTextSelection: ({ selectedText, startPos, endPos, surroundingContext, artifactId }) =>
        set(
          {
            type: 'text',
            selectedText,
            startPos,
            endPos,
            surroundingContext,
            artifactId,
            // Clear image fields
            imageSrc: null,
            imageNodePos: null,
          },
          false,
          'setTextSelection',
        ),

      setImageSelection: ({ imageSrc, imageNodePos, artifactId }) =>
        set(
          {
            type: 'image',
            imageSrc,
            imageNodePos,
            artifactId,
            // Clear text fields
            selectedText: null,
            startPos: null,
            endPos: null,
            surroundingContext: null,
          },
          false,
          'setImageSelection',
        ),

      clearSelection: () => set(initialState, false, 'clearSelection'),
    }),
    { name: 'EditorSelectionStore' },
  ),
)

// =============================================================================
// Editor Instance Reference (module-level, not in Zustand to avoid serialization)
// =============================================================================

/**
 * Module-level reference to the active Tiptap editor instance.
 * RichTextEditor registers/unregisters the editor via these functions.
 * ArtifactPage reads the ref to apply content improvement tool results.
 *
 * This avoids prop-drilling the Editor instance through multiple components.
 */
let _editorRef: unknown = null

/** Register the active editor instance (called by RichTextEditor on mount) */
export function registerEditorRef(editor: unknown) {
  _editorRef = editor
}

/** Unregister the editor (called by RichTextEditor on unmount) */
export function unregisterEditorRef() {
  _editorRef = null
}

/** Get the current editor instance (returns unknown, cast to Editor at call site) */
export function getEditorRef(): unknown {
  return _editorRef
}

// =============================================================================
// Selectors
// =============================================================================

export const selectSelectionType = (state: EditorSelectionStore) => state.type
export const selectHasSelection = (state: EditorSelectionStore) => state.type !== null

/**
 * Get selection context for sending to backend.
 * Returns null if no selection active.
 */
export function getSelectionContext(): EditorSelectionState | null {
  const state = useEditorSelectionStore.getState()
  if (!state.type) return null
  return {
    type: state.type,
    selectedText: state.selectedText,
    startPos: state.startPos,
    endPos: state.endPos,
    surroundingContext: state.surroundingContext,
    imageSrc: state.imageSrc,
    imageNodePos: state.imageNodePos,
    artifactId: state.artifactId,
  }
}
