import { Sparkles } from 'lucide-react'
import { BrandingPanel } from './BrandingPanel'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel - hidden on mobile/tablet */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center">
        <BrandingPanel />
      </div>

      {/* Mobile header strip - visible only below lg */}
      <div className="lg:hidden w-full h-20 bg-primary flex items-center justify-center gap-2 fixed top-0 z-10">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0a2540]/10">
          <Sparkles className="h-4 w-4 text-[#0a2540]" />
        </div>
        <span className="text-lg font-semibold text-[#0a2540]">
          NextUp
        </span>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-8 lg:px-12 pt-28 lg:pt-0">
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  )
}
