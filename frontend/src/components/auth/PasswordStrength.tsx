import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PasswordStrengthProps {
  hasMinLength: boolean
  hasUppercase: boolean
  hasNumber: boolean
  strength: 'weak' | 'fair' | 'strong'
  strengthPercent: number
  show: boolean
}

const strengthColors: Record<string, string> = {
  weak: 'bg-destructive',
  fair: 'bg-amber-500',
  strong: 'bg-green-600',
}

const strengthTextColors: Record<string, string> = {
  weak: 'text-destructive',
  fair: 'text-amber-500',
  strong: 'text-green-600',
}

function RequirementItem({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={cn(met ? 'text-green-600' : 'text-muted-foreground')}>
        {children}
      </span>
    </li>
  )
}

export function PasswordStrength({
  hasMinLength,
  hasUppercase,
  hasNumber,
  strength,
  strengthPercent,
  show,
}: PasswordStrengthProps) {
  if (!show) return null

  return (
    <div className="space-y-3 pt-2">
      {/* Strength bar */}
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', strengthColors[strength])}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
        <span className={cn('text-xs font-medium capitalize', strengthTextColors[strength])}>
          {strength}
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1.5">
        <RequirementItem met={hasMinLength}>At least 8 characters</RequirementItem>
        <RequirementItem met={hasUppercase}>At least 1 uppercase letter</RequirementItem>
        <RequirementItem met={hasNumber}>At least 1 number</RequirementItem>
      </ul>
    </div>
  )
}
