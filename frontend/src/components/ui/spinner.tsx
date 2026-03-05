import { cn } from '@/lib/utils'

const sizes = {
  sm: 16,
  md: 24,
  lg: 32,
} as const

interface SpinnerProps {
  size?: keyof typeof sizes
  className?: string
}

export function Spinner({ size = 'sm', className }: SpinnerProps) {
  const px = sizes[size]

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
      style={{ animationDuration: '800ms' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeDasharray="40 60"
        strokeLinecap="round"
      />
    </svg>
  )
}
