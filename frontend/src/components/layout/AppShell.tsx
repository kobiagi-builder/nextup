/**
 * AppShell Layout Component
 *
 * The main application layout wrapper that handles:
 * - Desktop sidebar navigation
 * - Mobile header, drawer, and bottom navigation
 * - Content area with proper padding
 * - Responsive behavior at all breakpoints
 *
 * Layout Structure:
 * ```
 * Desktop (>= 768px):
 * ┌─────────┬────────────────────────────────────┐
 * │ Sidebar │  Content Area                      │
 * │  72px   │  (with left padding for sidebar)   │
 * └─────────┴────────────────────────────────────┘
 *
 * Mobile (< 768px):
 * ┌────────────────────────────────────────────────┐
 * │ Mobile Header (56px)                           │
 * ├────────────────────────────────────────────────┤
 * │                                                │
 * │ Content Area                                   │
 * │ (with top padding for header,                  │
 * │  bottom padding for nav)                       │
 * │                                                │
 * ├────────────────────────────────────────────────┤
 * │ Bottom Navigation (64px)                       │
 * └────────────────────────────────────────────────┘
 * ```
 */

import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-media-query'
import { Sidebar } from './Sidebar'
import { MobileHeader, MobileNavDrawer, BottomNav } from './MobileNav'

/**
 * Skip to main content link for accessibility.
 * Visible only when focused via keyboard navigation.
 */
function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
                 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2
                 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  )
}

interface AppShellProps {
  children?: ReactNode
}

/**
 * AppShell Component
 *
 * Wraps the entire application and provides the navigation shell.
 * Automatically switches between desktop and mobile layouts.
 */
export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link for accessibility */}
      <SkipToMain />

      {/* Desktop Sidebar - Hidden on mobile */}
      {!isMobile && <Sidebar />}

      {/* Mobile Header - Visible only on mobile */}
      {isMobile && (
        <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
      )}

      {/* Mobile Navigation Drawer */}
      {isMobile && (
        <MobileNavDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={cn(
          'min-h-screen',
          'focus:outline-none', // Remove focus ring when skipped to
          // Mobile: padding for header and bottom nav
          isMobile && 'pt-14 pb-16',
          // Desktop: fixed left margin for collapsed sidebar (sidebar expands over content on hover)
          !isMobile && 'md:ml-[var(--sidebar-collapsed)]'
        )}
      >
        {/* Page content wrapper with max width and padding */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Render children or Outlet for nested routes */}
          {children || <Outlet />}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      {isMobile && <BottomNav />}
    </div>
  )
}

export default AppShell
