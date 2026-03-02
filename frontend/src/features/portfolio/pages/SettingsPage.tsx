/**
 * Settings Page
 *
 * User preferences including theme, interaction mode, and writing references.
 * Writing references management is embedded directly via WritingReferencesManager.
 */

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { WritingReferencesManager } from '../components/writing-references/WritingReferencesManager'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

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

      {/* Writing References Section — full embedded management UI */}
      <section className="space-y-4">
        <div>
          <h2 className="text-heading-md font-semibold text-foreground">
            Writing References
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add examples of your writing to teach the AI your voice for each content type.
          </p>
        </div>
        <WritingReferencesManager />
      </section>

    </div>
  )
}

export default SettingsPage
