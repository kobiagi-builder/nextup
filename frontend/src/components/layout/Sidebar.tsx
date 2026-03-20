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
import { Link, useLocation } from 'react-router-dom'
import {
  FileText,
  Users,
  ListChecks,
  User,
  Settings,
  Moon,
  Sun,
  Monitor,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/ThemeProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Navigation item type
interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
}

// Base navigation items (always visible)
const baseNavItems: NavItem[] = [
  { icon: FileText, label: 'Portfolio', href: '/portfolio' },
]

// Feature-gated navigation items
const customerNavItem: NavItem = { icon: Users, label: 'Customers', href: '/customers' }
const actionItemsNavItem: NavItem = { icon: ListChecks, label: 'Action Items', href: '/action-items' }

// Footer navigation items
const footerNavItems: NavItem[] = [
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

/**
 * Navigation Item Component
 *
 * Uses Link + useLocation (not NavLink) for reliable active-state
 * detection on nested routes like /customers/:id.
 */
function NavItemComponent({
  item,
  isCollapsed,
}: {
  item: NavItem
  isCollapsed: boolean
}) {
  const Icon = item.icon
  const { pathname } = useLocation()
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  const link = (
    <Link
      to={item.href}
      className={cn(
        // Base styles
        'flex items-center rounded-lg transition-all duration-200',
        'hover:bg-surface-hover',
        // Size based on collapsed state
        isCollapsed
          ? 'justify-center h-10 w-10 mx-auto'
          : 'gap-3 px-3 py-2',
        // Active vs inactive text color
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground',
        // Active state — different indicator for collapsed vs expanded
        isActive && !isCollapsed && [
          'bg-surface-selected',
          'border-l-[3px] border-brand-300',
          '-ml-[3px] pl-[calc(0.75rem+3px)]',
        ],
        isActive && isCollapsed && [
          'bg-surface-selected',
          'border-l-[3px] border-brand-300',
        ]
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
      {!isCollapsed && (
        <span className="font-medium text-sm">{item.label}</span>
      )}
      {item.badge !== undefined && !isCollapsed && (
        <span className="ml-auto bg-brand-300 text-brand-900 text-xs font-semibold px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  )

  if (!isCollapsed) return link

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
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

  const btn = (
    <button
      onClick={cycleTheme}
      className={cn(
        'flex items-center rounded-lg transition-all duration-200',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-surface-hover',
        isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2 w-full'
      )}
    >
      <ThemeIcon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
      {!isCollapsed && (
        <span className="font-medium text-sm capitalize">{theme}</span>
      )}
    </button>
  )

  if (!isCollapsed) return btn

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right">Theme: {theme}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Sidebar Component
 */
export function Sidebar() {
  // Local hover state - collapsed by default, expands on hover
  const [isHovered, setIsHovered] = useState(false)
  const isCollapsed = !isHovered
  const { signOut } = useAuth()
  const { isEnabled: hasCustomers } = useFeatureFlag('customer_management')
  const { isEnabled: hasActionItemsKanban } = useFeatureFlag('action_items_kanban')

  const mainNavItems: NavItem[] = [
    ...baseNavItems,
    ...(hasCustomers ? [customerNavItem] : []),
    ...(hasActionItemsKanban ? [actionItemsNavItem] : []),
  ]

  return (
    <TooltipProvider>
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
          <span className="text-white font-bold text-sm">NU</span>
        </div>
        {/* Brand name - hidden when collapsed */}
        {!isCollapsed && (
          <span className="ml-3 font-semibold text-sm text-foreground">
            NextUp
          </span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-1.5 px-2 py-3 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-border" />

      {/* Footer Navigation */}
      <nav className="flex flex-col gap-1.5 px-2 py-3">
        {footerNavItems.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Theme Toggle */}
        <ThemeToggle isCollapsed={isCollapsed} />

        {/* Sign Out */}
        {isCollapsed ? (
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className={cn(
                  'flex items-center rounded-lg transition-all duration-200',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-surface-hover',
                  'justify-center h-10 w-10 mx-auto'
                )}
              >
                <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={signOut}
            className={cn(
              'flex items-center gap-3 rounded-lg transition-all duration-200',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-surface-hover',
              'px-3 py-2 w-full'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span className="font-medium text-sm">Sign out</span>
          </button>
        )}
      </nav>
    </aside>
    </TooltipProvider>
  )
}

export default Sidebar
