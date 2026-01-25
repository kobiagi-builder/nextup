/**
 * Settings Page
 *
 * User preferences including theme, interaction mode, etc.
 * Placeholder - full implementation in Step 15.
 */

import { Moon, Sun, Monitor, MessageSquare, Zap, Edit3 } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  const interactionModes = [
    {
      value: 'chat',
      label: 'Chat Mode',
      description: 'Conversational AI assistance in a side panel',
      icon: MessageSquare,
    },
    {
      value: 'inline',
      label: 'Inline Mode',
      description: 'AI suggestions appear as you type',
      icon: Zap,
    },
    {
      value: 'direct',
      label: 'Direct Mode',
      description: 'AI writes full content based on topic',
      icon: Edit3,
    },
  ]

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-display-md font-semibold text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Customize your experience.
        </p>
      </div>

      {/* Theme Section */}
      <section className="space-y-4">
        <h2 className="text-heading-md font-semibold text-foreground">
          Appearance
        </h2>
        <div className="rounded-xl bg-card border border-border p-4">
          <label className="text-sm font-medium text-foreground mb-3 block">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    theme === option.value
                      ? 'border-brand-300 bg-surface-selected'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <Icon className={cn(
                    'h-6 w-6',
                    theme === option.value ? 'text-brand-300' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    theme === option.value ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* AI Interaction Mode */}
      <section className="space-y-4">
        <h2 className="text-heading-md font-semibold text-foreground">
          AI Interaction
        </h2>
        <div className="space-y-3">
          {interactionModes.map((mode) => {
            const Icon = mode.icon
            const isSelected = mode.value === 'chat' // Default to chat for now
            return (
              <button
                key={mode.value}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-brand-300 bg-surface-selected'
                    : 'border-border hover:border-border-strong bg-card'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isSelected ? 'bg-brand-300/20' : 'bg-secondary'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    isSelected ? 'text-brand-300' : 'text-muted-foreground'
                  )} />
                </div>
                <div>
                  <h3 className={cn(
                    'font-semibold',
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {mode.label}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Writing Style Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-md font-semibold text-foreground">
            Writing Style
          </h2>
          <a href="/settings/style" className="text-sm text-brand-300 hover:underline">
            Manage Examples →
          </a>
        </div>
        <div className="rounded-xl bg-card border border-border p-6 text-center">
          <p className="text-muted-foreground">
            Add 4-5 writing samples to teach the AI your voice.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-2 w-2 rounded-full bg-muted" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">0 / 5 examples</p>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
