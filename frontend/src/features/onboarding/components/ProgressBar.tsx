/**
 * ProgressBar
 *
 * Custom animated progress bar with gradient fill for the onboarding wizard.
 * Uses a 6-step percentage table with 600ms cubic-bezier transition.
 */

export const STEP_PROGRESS: Record<number, number> = {
  0: 15,   // Welcome (endowed progress)
  1: 36,   // Step 1 of 4: Import
  2: 57,   // Step 2 of 4: Your Profile
  3: 78,   // Step 3 of 4: Your Market
  4: 93,   // Step 4 of 4: Your Voice
  5: 100,  // Completion
}

export const STEP_LABELS: Record<number, string | null> = {
  0: null,
  1: 'Step 1 of 4: Import',
  2: 'Step 2 of 4: Your Profile',
  3: 'Step 3 of 4: Your Market',
  4: 'Step 4 of 4: Your Voice',
  5: null,
}

interface ProgressBarProps {
  stepIndex: number
}

export function ProgressBar({ stepIndex }: ProgressBarProps) {
  const progress = STEP_PROGRESS[stepIndex] ?? 0

  return (
    <div
      className="h-1.5 w-full rounded-full bg-border/30 overflow-hidden"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Onboarding progress: ${progress}%`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[hsl(214,83%,39%)] to-[hsl(187,89%,49%)] dark:from-[#025EC4] dark:to-[#0ECCED]"
        style={{
          width: `${progress}%`,
          transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  )
}
