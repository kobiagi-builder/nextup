/**
 * Skill Badge Component
 *
 * Visual representation of a skill with proficiency level.
 */

import { Package, Code, Users, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Skill, SkillCategory, ProficiencyLevel } from '../../types/portfolio'

interface SkillBadgeProps {
  skill: Skill
  size?: 'sm' | 'md' | 'lg'
  showProficiency?: boolean
  className?: string
}

/** Icon mapping for skill categories */
const CATEGORY_ICONS: Record<SkillCategory, React.ElementType> = {
  product: Package,
  technical: Code,
  leadership: Users,
  industry: Building,
}

/** Color mapping for skill categories */
const CATEGORY_COLORS: Record<SkillCategory, string> = {
  product: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  technical: 'bg-green-500/10 text-green-400 border-green-500/20',
  leadership: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  industry: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

/** Proficiency level labels */
const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
}

/**
 * Badge component for displaying a skill
 */
export function SkillBadge({
  skill,
  size = 'md',
  showProficiency = true,
  className,
}: SkillBadgeProps) {
  const Icon = CATEGORY_ICONS[skill.category]

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-2.5 py-1.5 text-sm gap-1.5',
    lg: 'px-3 py-2 text-sm gap-2',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        CATEGORY_COLORS[skill.category],
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{skill.name}</span>
      {showProficiency && (
        <span className="opacity-60">
          ({PROFICIENCY_LABELS[skill.proficiency]})
        </span>
      )}
    </div>
  )
}

/**
 * Proficiency indicator dots
 */
export function ProficiencyDots({
  level,
  size = 'md',
}: {
  level: ProficiencyLevel
  size?: 'sm' | 'md'
}) {
  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full',
            dotSizes[size],
            i <= level ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Skill card for profile display
 */
export function SkillCard({
  skill,
  onEdit,
  onDelete,
}: {
  skill: Skill
  onEdit?: () => void
  onDelete?: () => void
}) {
  const Icon = CATEGORY_ICONS[skill.category]

  return (
    <div className="group flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'rounded-md p-2',
            CATEGORY_COLORS[skill.category].replace('text-', 'text-').split(' ')[0]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-sm">{skill.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <ProficiencyDots level={skill.proficiency} size="sm" />
            {skill.years_experience && (
              <span className="text-xs text-muted-foreground">
                {skill.years_experience}y exp
              </span>
            )}
          </div>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-muted-foreground hover:text-destructive rounded"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
