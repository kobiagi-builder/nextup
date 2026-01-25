import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // UI State
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'

  // Actions
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      theme: 'system',

      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
