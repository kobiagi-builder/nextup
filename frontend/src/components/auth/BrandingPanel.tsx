import { Sparkles, Check } from 'lucide-react'

const features = [
  'AI-powered content creation in your voice',
  'Client & engagement management',
  'Built for advisors and fractional leaders',
]

export function BrandingPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 px-12">
      {/* App icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
        <Sparkles className="h-7 w-7 text-white" />
      </div>

      {/* App name */}
      <h1 className="max-w-[280px] text-center text-[28px] font-bold tracking-tight text-white">
        NextUp
      </h1>

      {/* Tagline */}
      <p className="text-base text-white/80">
        Your AI-powered advisory practice OS.
      </p>

      {/* Separator */}
      <div className="h-px w-16 bg-white/20" />

      {/* Feature callouts */}
      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3">
            <Check className="h-4 w-4 text-white" />
            <span className="text-sm text-white/80">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
