import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Mail, RefreshCw, Clock, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

export function EmailConfirmationPage() {
  const location = useLocation()
  const email = (location.state as { email?: string })?.email || ''
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function handleResend() {
    if (!email) return
    setSending(true)

    const { error } = await supabase.auth.resend({ type: 'signup', email })

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to send',
        description: 'Please try again.',
      })
      setSending(false)
      return
    }

    toast({ title: 'Confirmation email sent' })
    setCooldown(60)
    setSending(false)
  }

  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-[480px] rounded-xl border bg-card p-10 shadow-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-9 w-9 text-primary" />
        </div>

        <h1 className="mt-6 text-[22px] font-semibold">Check your email</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          We sent a confirmation link to{' '}
          {email ? <span className="font-medium text-foreground">{email}</span> : 'your email'}
        </p>

        <div className="mt-8">
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleResend}
            disabled={cooldown > 0 || sending || !email}
          >
            {cooldown > 0 ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Resend in {formatCooldown(cooldown)}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend confirmation email
              </>
            )}
          </Button>
        </div>

        <Separator className="my-6" />

        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <p className="mt-6 text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </div>
    </div>
  )
}
