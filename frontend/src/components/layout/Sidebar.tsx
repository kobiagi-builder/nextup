/**
 * Sidebar Navigation Component
 *
 * Features:
 * - Collapsed by default (icons only)
 * - Expands on hover to show labels
 * - Active route highlighting with cyan accent
 * - Theme toggle at bottom
 * - Responsive: Hidden on mobile (replaced by drawer/bottom nav)
 */

import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  FileText,
  User,
  Settings,
  Moon,
  Sun,
  Monitor,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/ThemeProvider'

// Navigation item type
interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
}

// Main navigation items
const mainNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: FileText, label: 'Portfolio', href: '/portfolio' },
]

// Footer navigation items
const footerNavItems: NavItem[] = [
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

/**
 * Navigation Item Component
 */
function NavItemComponent({
  item,
  isCollapsed,
}: {
  item: NavItem
  isCollapsed: boolean
}) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          // Base styles
          'flex items-center gap-3 rounded-lg transition-all duration-200',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-surface-hover',
          // Size based on collapsed state
          isCollapsed ? 'justify-center p-3' : 'px-3 py-2',
          // Active state
          isActive && [
            'bg-surface-selected text-foreground',
            'border-l-[3px] border-brand-300',
            '-ml-[3px] pl-[calc(0.75rem+3px)]',
          ]
        )
      }
      title={isCollapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && (
        <span className="font-medium text-sm">{item.label}</span>
      )}
      {item.badge !== undefined && !isCollapsed && (
        <span className="ml-auto bg-brand-300 text-brand-900 text-xs font-semibold px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

/**
 * Theme Toggle Button
 */
function ThemeToggle({ isCollapsed }: { isCollapsed: boolean }) {
  const { theme, setTheme } = useTheme()

  // Cycle through themes: system -> light -> dark -> system
  const cycleTheme = () => {
    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(nextTheme)
  }

  // Get current icon based on theme
  const ThemeIcon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-all duration-200',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-surface-hover',
        isCollapsed ? 'justify-center p-3' : 'px-3 py-2 w-full'
      )}
      title={`Theme: ${theme}`}
    >
      <ThemeIcon className="h-5 w-5 shrink-0" />
      {!isCollapsed && (
        <span className="font-medium text-sm capitalize">{theme}</span>
      )}
    </button>
  )
}

/**
 * Sidebar Component
 */
export function Sidebar() {
  // Local hover state - collapsed by default, expands on hover
  const [isHovered, setIsHovered] = useState(false)
  const isCollapsed = !isHovered

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen',
        'flex flex-col bg-card border-r border-border',
        'transition-all duration-300 ease-in-out',
        // Hidden on mobile
        'hidden md:flex',
        // Width based on state
        isCollapsed ? 'w-14' : 'w-44'
      )}
      style={{
        // Use CSS custom property for sidebar width
        width: isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-expanded)',
      }}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-border shrink-0',
          isCollapsed ? 'justify-center' : 'px-4'
        )}
      >
        {/* Logo icon - always visible */}
        <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
          <span className="text-white font-bold text-sm">CT</span>
        </div>
        {/* Brand name - hidden when collapsed */}
        {!isCollapsed && (
          <span className="ml-3 font-semibold text-sm text-foreground">
            Toolkit
          </span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-2 border-t border-border" />

      {/* Footer Navigation */}
      <nav className="flex flex-col gap-1 p-2">
        {footerNavItems.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Theme Toggle */}
        <ThemeToggle isCollapsed={isCollapsed} />
      </nav>
    </aside>
  )
}

export default Sidebar
