import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { usePasswordValidation } from '@/features/auth/hooks/usePasswordValidation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function PasswordResetPage() {
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const isRecoveryMode = searchParams.get('recovery') === 'true'

  if (isRecoveryMode) {
    return <NewPasswordForm navigate={navigate} />
  }

  return <RequestResetForm />
}

function RequestResetForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    // Always show success to prevent email enumeration
    setShowSuccess(true)
    setLoading(false)
  }

  if (showSuccess) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>

          <h1 className="mt-6 text-[22px] font-semibold">Check your email</h1>

          <p className="mt-3 text-sm text-muted-foreground">
            We sent a password reset link to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>

          <p className="mt-2 text-xs text-muted-foreground">The link expires in 24 hours.</p>

          <Link to="/auth/login">
            <Button className="w-full h-11 mt-8">Back to sign in</Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Link
        to="/auth/login"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleResetRequest} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11"
              required
              disabled={loading}
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link to="/auth/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

function NewPasswordForm({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { hasMinLength, hasUppercase, hasNumber, strength, strengthPercent, isValid } =
    usePasswordValidation(newPassword)

  const passwordsMatch = newPassword === confirmPassword
  const canSubmit = isValid && passwordsMatch && confirmPassword.length > 0

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError('Failed to update password. Please try again.')
      setLoading(false)
      return
    }

    navigate('/auth/login', { state: { passwordReset: true } })
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Choose a strong password for your account
      </p>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handlePasswordUpdate} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10 h-11"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <PasswordStrength
            hasMinLength={hasMinLength}
            hasUppercase={hasUppercase}
            hasNumber={hasNumber}
            strength={strength}
            strengthPercent={strengthPercent}
            show={newPassword.length > 0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword">Confirm new password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmNewPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              className={`pl-10 pr-10 h-11 ${
                confirmTouched && !passwordsMatch && confirmPassword
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmTouched && confirmPassword && (
            <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full h-11" disabled={!canSubmit || loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating password...
            </>
          ) : (
            'Update password'
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}
