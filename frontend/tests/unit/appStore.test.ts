import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/stores/appStore'

describe('appStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      sidebarOpen: true,
      theme: 'system',
    })
  })

  it('should have default values', () => {
    const state = useAppStore.getState()
    expect(state.sidebarOpen).toBe(true)
    expect(state.theme).toBe('system')
  })

  it('should toggle sidebar', () => {
    const { toggleSidebar } = useAppStore.getState()

    toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)

    toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('should set sidebar open state', () => {
    const { setSidebarOpen } = useAppStore.getState()

    setSidebarOpen(false)
    expect(useAppStore.getState().sidebarOpen).toBe(false)

    setSidebarOpen(true)
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('should set theme', () => {
    const { setTheme } = useAppStore.getState()

    setTheme('dark')
    expect(useAppStore.getState().theme).toBe('dark')

    setTheme('light')
    expect(useAppStore.getState().theme).toBe('light')

    setTheme('system')
    expect(useAppStore.getState().theme).toBe('system')
  })
})
