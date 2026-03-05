/**
 * SkipConfirmationDialog
 *
 * Non-judgmental skip confirmation using shadcn AlertDialog.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SkipConfirmationDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SkipConfirmationDialog({
  open,
  onConfirm,
  onCancel,
}: SkipConfirmationDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        data-portal-ignore-click-outside
        className="max-w-sm"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Skip setup for now?</AlertDialogTitle>
          <AlertDialogDescription>
            You can finish this anytime in Settings. NextUp's AI uses your
            profile to generate content in your voice — the more you add, the
            better your results.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onConfirm}
            className="border-border text-muted-foreground hover:bg-muted/80"
          >
            Skip for now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onCancel}>Keep going</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
