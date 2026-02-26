/**
 * AppShell Layout Component
 *
 * The main application layout wrapper that handles:
 * - Desktop sidebar navigation
 * - Mobile header, drawer, and bottom navigation
 * - Content area with proper padding
 * - Responsive behavior at all breakpoints
 * - Side-by-side chat panel with resizable divider (desktop)
 *
 * Layout Structure:
 * ```
 * Desktop (>= 768px), chat closed:
 * ┌─────────┬────────────────────────────────────┐
 * │ Sidebar │  Content Area (max-w-7xl)          │
 * │  72px   │  (with left padding for sidebar)   │
 * └─────────┴────────────────────────────────────┘
 *
 * Desktop (>= 768px), chat open:
 * ┌─────────┬─────────────┬──────────────────────┐
 * │ Sidebar │  Chat Panel  │  Content Area        │
 * │  72px   │  (resizable) │◄──►  (resizable)     │
 * └─────────┴─────────────┴──────────────────────┘
 *
 * Mobile (< 768px):
 * ┌────────────────────────────────────────────────┐
 * │ Mobile Header (56px)                           │
 * ├────────────────────────────────────────────────┤
 * │ Content Area                                   │
 * ├────────────────────────────────────────────────┤
 * │ Bottom Navigation (64px)                       │
 * └────────────────────────────────────────────────┘
 * (Chat opens as Sheet overlay on mobile)
 * ```
 */

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-media-query'
import { Sidebar } from './Sidebar'
import { MobileHeader, MobileNavDrawer, BottomNav } from './MobileNav'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useChatLayoutStore, type ChatConfig } from '@/stores/chatLayoutStore'

import { ChatPanel } from '@/features/portfolio/components'
import { CustomerChatPanel } from '@/features/customers/components/chat'

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

/**
 * ChatPanelWrapper renders the ChatPanel inside the resizable split view
 * with a header containing the title.
 */
function ChatPanelWrapper({
  config,
  configVersion,
}: {
  config: ChatConfig
  configVersion: number
}) {
  const isCustomerChat = config.screenContext?.currentPage === 'customer'

  return (
    <div className="flex h-full flex-col border-r bg-background">
      {/* Chat header */}
      <div className="flex items-center border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{config.title || 'AI Assistant'}</h2>
        </div>
      </div>
      {/* Chat body — keyed by configVersion to force re-mount on config change */}
      <div className="flex-1 overflow-hidden">
        {isCustomerChat ? (
          <CustomerChatPanel
            key={configVersion}
            contextKey={config.contextKey}
            customerId={config.screenContext?.currentPage === 'customer' ? config.screenContext.customerId : ''}
            screenContext={config.screenContext}
            endpoint={config.endpoint}
            suggestions={config.suggestions}
            height="100%"
          />
        ) : (
          <ChatPanel
            key={configVersion}
            contextKey={config.contextKey}
            title={config.title}
            showHeader={false}
            height="100%"
            initialMessage={config.initialMessage}
            screenContext={config.screenContext}
            onContentImproved={config.onContentImproved}
          />
        )}
      </div>
    </div>
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
 * When chat is open on desktop, renders a resizable split view.
 */
export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Chat layout state (split view)
  const { isOpen: isChatOpen, chatConfig, configVersion, panelSize, setPanelSize, closeChat } = useChatLayoutStore()
  const isDesktopChatOpen = !isMobile && isChatOpen && chatConfig

  // Close chat when navigating between pages (safe here — AppShell never unmounts)
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname
      closeChat()
    }
  }, [location.pathname, closeChat])

  // Persist panel size when user drags the divider
  // v4 Layout is { [panelId: string]: number } — we extract the chat panel size
  const handleLayoutChanged = useCallback((layout: Record<string, number>) => {
    const chatSize = layout['chat-panel']
    if (chatSize !== undefined) {
      setPanelSize(chatSize)
    }
  }, [setPanelSize])

  return (
    <div className="min-h-screen bg-background">
      {/* Connection status banner - shows when API/Supabase is down */}
      <ConnectionBanner />

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
        {isDesktopChatOpen ? (
          /* Split view: content + chat side by side */
          <div className="h-screen px-2 py-6">
            <ResizablePanelGroup
              orientation="horizontal"
              onLayoutChanged={handleLayoutChanged}
              defaultLayout={{ 'content-panel': 100 - panelSize, 'chat-panel': panelSize }}
            >
              <ResizablePanel id="chat-panel" minSize="20%" maxSize="50%">
                <ChatPanelWrapper
                  config={chatConfig}
                  configVersion={configVersion}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="content-panel" minSize="50%">
                <div className="h-full overflow-auto px-2 sm:px-4 lg:px-6">
                  {children || <Outlet />}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : (
          /* Normal view: content with max-width constraint */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children || <Outlet />}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      {isMobile && <BottomNav />}
    </div>
  )
}

export default AppShell
