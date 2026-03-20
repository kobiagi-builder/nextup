/**
 * OnboardingField
 *
 * Wraps each form field with label, AI badge, skeleton, and waterfall visibility.
 * Handles the skeleton-to-content transition coordinated by useExtractionWaterfall.
 */

import { useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ExtractionStatus, FieldProvenance } from '../../types/onboarding'
import { AiExtractedBadge } from './AiExtractedBadge'
import { ExtractionSkeletonField } from './ExtractionSkeletonField'

interface OnboardingFieldProps {
  label: string
  fieldKey: string
  provenance: FieldProvenance | undefined
  extractionStatus: ExtractionStatus
  visible: boolean
  skeletonType?: 'textarea' | 'input' | 'chips'
  description?: string
  children: React.ReactNode
}

export function OnboardingField({
  label,
  fieldKey,
  provenance,
  extractionStatus,
  visible,
  skeletonType = 'textarea',
  description,
  children,
}: OnboardingFieldProps) {
  const showSkeleton = extractionStatus === 'extracting' && !visible
  const showAiBadge = provenance === 'ai'

  const handleFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 100)
  }, [])

  if (showSkeleton) {
    return <ExtractionSkeletonField type={skeletonType} />
  }

  return (
    <div
      className={cn(
        'space-y-1.5',
        visible && extractionStatus === 'complete' && 'onboarding-animate-fade-up'
      )}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldKey}>{label}</Label>
        <div className="flex items-center gap-1.5">
          {showAiBadge && <AiExtractedBadge />}
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div onFocusCapture={handleFocus}>{children}</div>
    </div>
  )
}
