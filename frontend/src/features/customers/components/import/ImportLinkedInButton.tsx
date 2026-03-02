/**
 * Import LinkedIn Button
 *
 * Feature-flagged button for the Customers page header.
 * Only renders when the 'linkedin_import' flag is active.
 */

import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFeatureFlag } from '@/hooks/use-feature-flag'

interface ImportLinkedInButtonProps {
  onClick: () => void
}

export function ImportLinkedInButton({ onClick }: ImportLinkedInButtonProps) {
  const { isEnabled, isLoading } = useFeatureFlag('linkedin_import')

  if (!isEnabled || isLoading) return null

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="gap-2 border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10"
    >
      <Upload className="h-4 w-4" />
      Import LinkedIn
    </Button>
  )
}
