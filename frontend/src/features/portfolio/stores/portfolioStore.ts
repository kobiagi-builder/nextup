/**
 * Portfolio Store (Zustand)
 *
 * Manages UI state for the portfolio feature:
 * - Selected artifact ID
 * - Filter states
 * - Interaction mode
 * - Hydration tracking
 *
 * Server state (actual data) is managed by React Query hooks.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  ArtifactType,
  ArtifactStatus,
  InteractionMode,
} from '../types/portfolio'

// =============================================================================
// Types
// =============================================================================

/** Filter state for artifacts list */
interface ArtifactFilters {
  type: ArtifactType | 'all'
  status: ArtifactStatus | 'all'
  search: string
}

/** Portfolio store state */
interface PortfolioState {
  // Selection state
  selectedArtifactId: string | null

  // AI interaction mode
  interactionMode: InteractionMode

  // Filter state
  artifactFilters: ArtifactFilters

  // UI state
  isAIChatOpen: boolean
  isSidebarCollapsed: boolean

  // Hydration tracking (for SSR safety)
  _hasHydrated: boolean
}

/** Portfolio store actions */
interface PortfolioActions {
  // Selection actions
  setSelectedArtifactId: (id: string | null) => void
  clearSelection: () => void

  // Interaction mode
  setInteractionMode: (mode: InteractionMode) => void

  // Filter actions
  setArtifactFilters: (filters: Partial<ArtifactFilters>) => void
  resetArtifactFilters: () => void

  // UI actions
  setAIChatOpen: (open: boolean) => void
  toggleAIChat: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // Hydration
  setHasHydrated: (state: boolean) => void
}

/** Combined store type */
type PortfolioStore = PortfolioState & PortfolioActions

// =============================================================================
// Initial State
// =============================================================================

const initialFilters: ArtifactFilters = {
  type: 'all',
  status: 'all',
  search: '',
}

const initialState: PortfolioState = {
  selectedArtifactId: null,
  interactionMode: 'chat',
  artifactFilters: initialFilters,
  isAIChatOpen: false,
  isSidebarCollapsed: false,
  _hasHydrated: false,
}

// =============================================================================
// Store
// =============================================================================

/**
 * Portfolio Store
 *
 * Usage:
 * ```tsx
 * const selectedId = usePortfolioStore((state) => state.selectedArtifactId)
 * const setSelectedId = usePortfolioStore((state) => state.setSelectedArtifactId)
 * ```
 */
export const usePortfolioStore = create<PortfolioStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        ...initialState,

        // Selection actions
        setSelectedArtifactId: (id) =>
          set({ selectedArtifactId: id }, false, 'setSelectedArtifactId'),

        clearSelection: () =>
          set(
            { selectedArtifactId: null },
            false,
            'clearSelection'
          ),

        // Interaction mode
        setInteractionMode: (mode) =>
          set({ interactionMode: mode }, false, 'setInteractionMode'),

        // Filter actions
        setArtifactFilters: (filters) =>
          set(
            (state) => ({
              artifactFilters: { ...state.artifactFilters, ...filters },
            }),
            false,
            'setArtifactFilters'
          ),

        resetArtifactFilters: () =>
          set({ artifactFilters: initialFilters }, false, 'resetArtifactFilters'),

        // UI actions
        setAIChatOpen: (open) =>
          set({ isAIChatOpen: open }, false, 'setAIChatOpen'),

        toggleAIChat: () =>
          set(
            (state) => ({ isAIChatOpen: !state.isAIChatOpen }),
            false,
            'toggleAIChat'
          ),

        setSidebarCollapsed: (collapsed) =>
          set({ isSidebarCollapsed: collapsed }, false, 'setSidebarCollapsed'),

        toggleSidebar: () =>
          set(
            (state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }),
            false,
            'toggleSidebar'
          ),

        // Hydration
        setHasHydrated: (state) =>
          set({ _hasHydrated: state }, false, 'setHasHydrated'),
      }),
      {
        name: 'portfolio-storage',
        // Only persist these fields
        partialize: (state) => ({
          interactionMode: state.interactionMode,
          isSidebarCollapsed: state.isSidebarCollapsed,
        }),
        // Mark hydration complete
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true)
        },
      }
    ),
    { name: 'PortfolioStore' }
  )
)

// =============================================================================
// Selectors (for performance optimization)
// =============================================================================

/**
 * Get selected artifact ID
 */
export const selectSelectedArtifactId = (state: PortfolioStore) =>
  state.selectedArtifactId

/**
 * Get artifact filters
 */
export const selectArtifactFilters = (state: PortfolioStore) =>
  state.artifactFilters

/**
 * Check if any artifact filters are active
 */
export const selectHasActiveArtifactFilters = (state: PortfolioStore) =>
  state.artifactFilters.type !== 'all' ||
  state.artifactFilters.status !== 'all' ||
  state.artifactFilters.search !== ''

/**
 * Check if store has hydrated (for SSR safety)
 */
export const selectHasHydrated = (state: PortfolioStore) =>
  state._hasHydrated

export default usePortfolioStore
