/**
 * FoundationsApprovedButton Component (Phase 4)
 *
 * Large primary CTA button to approve foundations and continue pipeline.
 * Shows loading state during approval process.
 */

import { CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FoundationsApprovedButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

export function FoundationsApprovedButton({
  onClick,
  loading = false,
  disabled = false,
  className,
}: FoundationsApprovedButtonProps) {
  return (
    <div className={cn('pt-4', className)}>
      <Button
        onClick={onClick}
        disabled={disabled || loading}
        size="lg"
        className={cn(
          'w-full h-12 text-base font-semibold',
          'bg-primary hover:bg-primary/90',
          'transition-all duration-200',
          loading && 'opacity-80'
        )}
        data-testid="foundations-approved-button"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Starting content writing...
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5 mr-2" />
            Foundations Approved - Start Writing
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center mt-2">
        {loading
          ? 'Please wait while the AI begins writing your content...'
          : 'Review the skeleton above, then click to start content generation'}
      </p>
    </div>
  )
}

export default FoundationsApprovedButton
