import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Screen context — discriminated union for portfolio vs customer pages */
export type ScreenContext =
  | { currentPage: 'portfolio' | 'artifact' | 'dashboard' | 'profile' | 'settings'; artifactId?: string; artifactType?: string; artifactTitle?: string; artifactStatus?: string }
  | { currentPage: 'customer'; customerId: string; customerName?: string; customerStatus?: string; activeTab?: string }

/** Configuration for opening the chat panel */
export interface ChatConfig {
  contextKey: string
  title?: string
  screenContext?: ScreenContext
  initialMessage?: string
  onContentImproved?: (toolName: string, result: unknown) => void
  /** Override API endpoint (default: /api/ai/chat/stream) */
  endpoint?: string
  /** Context-specific chat suggestions */
  suggestions?: Array<{ text: string }>
}

/** Panel size constraints — must match ResizablePanel props in AppShell */
const PANEL_MIN = 20
const PANEL_MAX = 50
const PANEL_DEFAULT = 30

const clampPanelSize = (size: number) =>
  Math.min(PANEL_MAX, Math.max(PANEL_MIN, size))

interface ChatLayoutState {
  // Persisted state
  panelSize: number // Chat panel size as percentage (default: 30)

  // Transient state (not persisted)
  isOpen: boolean
  chatConfig: ChatConfig | null
  configVersion: number // Counter to force ChatPanel re-mount via key prop

  // Actions
  openChat: (config: ChatConfig) => void
  closeChat: () => void
  setPanelSize: (size: number) => void
}

export const useChatLayoutStore = create<ChatLayoutState>()(
  persist(
    (set) => ({
      // Persisted defaults
      panelSize: PANEL_DEFAULT,

      // Transient defaults
      isOpen: false,
      chatConfig: null,
      configVersion: 0,

      // Actions
      openChat: (config) =>
        set((state) => ({
          isOpen: true,
          chatConfig: config,
          configVersion: state.configVersion + 1,
        })),

      closeChat: () =>
        set({
          isOpen: false,
          chatConfig: null,
        }),

      setPanelSize: (size) => set({ panelSize: clampPanelSize(size) }),
    }),
    {
      name: 'chat-layout-storage',
      partialize: (state) => ({
        panelSize: state.panelSize,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ChatLayoutState>),
        // Clamp persisted panelSize to valid range (handles stale localStorage values)
        panelSize: clampPanelSize(
          (persisted as Partial<ChatLayoutState>)?.panelSize ?? PANEL_DEFAULT
        ),
      }),
    },
  ),
)
