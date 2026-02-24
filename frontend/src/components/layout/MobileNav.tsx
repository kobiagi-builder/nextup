/**
 * Mobile Navigation Components
 *
 * Includes:
 * - MobileNavDrawer: Slide-in drawer for full navigation (hamburger menu)
 * - BottomNav: Fixed bottom navigation bar for quick access
 *
 * Design:
 * - Only visible on mobile (< 640px)
 * - Bottom nav has 5 items max with icons + labels
 * - Drawer slides in from left, covers 80% of screen
 */

import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import {
  Home,
  FileText,
  User,
  Settings,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'

// Navigation item type
interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

// Bottom navigation items (max 5)
const bottomNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: FileText, label: 'Portfolio', href: '/portfolio' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

// Full navigation items for drawer
const drawerNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: FileText, label: 'Portfolio', href: '/portfolio' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

// =============================================================================
// Mobile Navigation Drawer
// =============================================================================

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * MobileNavDrawer Component
 *
 * Slide-in drawer from the left side. Uses portal for proper z-index stacking.
 */
export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const { signOut } = useAuth()

  // Render nothing on server or when closed
  if (typeof window === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'transition-opacity duration-250',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        data-portal-ignore-click-outside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-4/5 max-w-xs',
          'bg-card border-r border-border',
          'flex flex-col',
          'transition-transform duration-250 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">NU</span>
            </div>
            <span className="font-semibold text-foreground">
              NextUp
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {drawerNavItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg',
                        'text-muted-foreground transition-colors',
                        'hover:bg-surface-hover hover:text-foreground',
                        // Touch-friendly: 48px min height
                        'min-h-[48px]',
                        isActive && [
                          'bg-surface-selected text-foreground',
                          'border-l-[3px] border-brand-300',
                          '-ml-[3px] pl-[calc(1rem+3px)]',
                        ]
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => {
              onClose()
              signOut()
            }}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg w-full',
              'text-muted-foreground transition-colors',
              'hover:bg-surface-hover hover:text-foreground',
              'min-h-[48px]'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// =============================================================================
// Bottom Navigation Bar
// =============================================================================

/**
 * BottomNav Component
 *
 * Fixed bottom navigation bar for mobile. Shows 5 items with icons and labels.
 * Includes safe area padding for iOS devices.
 */
export function BottomNav() {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-card border-t border-border',
        'flex justify-around items-center',
        'h-16 safe-area-inset-bottom',
        // Only visible on mobile
        'md:hidden'
      )}
    >
      {bottomNavItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1',
                'min-w-[64px] px-3 py-2',
                'text-muted-foreground transition-colors',
                isActive && 'text-brand-300'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

// =============================================================================
// Mobile Header
// =============================================================================

interface MobileHeaderProps {
  onMenuClick: () => void
}

/**
 * MobileHeader Component
 *
 * Top header bar for mobile with hamburger menu button.
 */
export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40',
        'h-14 px-4',
        'bg-card border-b border-border',
        'flex items-center justify-between',
        'safe-area-inset-top',
        // Only visible on mobile
        'md:hidden'
      )}
    >
      {/* Menu button */}
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
        aria-label="Open navigation menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center">
          <span className="text-white font-bold text-xs">NU</span>
        </div>
        <span className="font-semibold text-sm text-foreground">
          NextUp
        </span>
      </div>

      {/* Placeholder for right side (e.g., avatar) */}
      <div className="w-10" />
    </header>
  )
}

export default BottomNav
