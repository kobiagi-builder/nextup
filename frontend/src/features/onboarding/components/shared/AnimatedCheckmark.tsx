/**
 * AnimatedCheckmark
 *
 * SVG checkmark that draws itself using stroke-dashoffset animation.
 * Circle draws first (0-300ms), checkmark stroke draws second (300-600ms).
 * Total duration: 600ms.
 *
 * MUST be statically imported (not lazy-loaded) — it's the primary success signal.
 */

interface AnimatedCheckmarkProps {
  className?: string
  reducedMotion?: boolean
}

export function AnimatedCheckmark({ className, reducedMotion = false }: AnimatedCheckmarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="26"
        cy="26"
        r="25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="166"
        strokeDashoffset={reducedMotion ? 0 : 166}
        style={
          reducedMotion
            ? undefined
            : {
                animation:
                  'onboarding-checkmark-circle 300ms cubic-bezier(0.16, 1, 0.3, 1) 0ms forwards',
              }
        }
      />
      <path
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="48"
        strokeDashoffset={reducedMotion ? 0 : 48}
        style={
          reducedMotion
            ? undefined
            : {
                animation:
                  'onboarding-checkmark-stroke 300ms cubic-bezier(0.16, 1, 0.3, 1) 300ms forwards',
              }
        }
      />
    </svg>
  )
}
