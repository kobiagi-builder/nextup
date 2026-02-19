/**
 * Connection Banner Component
 *
 * Displays a persistent banner when the backend API or Supabase is unreachable.
 * Auto-dismisses when connectivity is restored.
 */

import { WifiOff, Database, RefreshCw } from 'lucide-react'
import { useConnectionStatus, type ConnectionState } from '@/hooks/use-connection-status'
import { cn } from '@/lib/utils'

const bannerConfig: Record<Exclude<ConnectionState, 'connected'>, {
  icon: typeof WifiOff
  title: string
  className: string
}> = {
  api_down: {
    icon: WifiOff,
    title: 'Server Unreachable',
    className: 'bg-destructive text-destructive-foreground',
  },
  supabase_down: {
    icon: Database,
    title: 'Database Unavailable',
    className: 'bg-amber-600 text-white',
  },
}

export function ConnectionBanner() {
  const status = useConnectionStatus()

  // Don't render when connected
  if (status.state === 'connected') return null

  const config = bannerConfig[status.state]
  const Icon = config.icon

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium',
        config.className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1">
        <span className="font-semibold">{config.title}</span>
        {status.errorMessage && (
          <span className="ml-2 font-normal opacity-90">
            {status.errorMessage}
          </span>
        )}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium opacity-90 hover:opacity-100 hover:bg-white/10 transition-opacity"
        title="Reload page"
      >
        <RefreshCw className="h-3 w-3" />
        Reload
      </button>
    </div>
  )
}
