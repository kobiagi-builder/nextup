import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { Loader2 } from 'lucide-react'

/**
 * OAuth callback page. Shows a spinner while Supabase SDK processes
 * the hash fragment tokens. Relies on AuthProvider's onAuthStateChange
 * to detect when the session is established.
 *
 * Data migration is handled in AuthProvider's SIGNED_IN handler.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/portfolio', { replace: true })
      } else {
        navigate('/auth/login', { replace: true })
      }
    }
  }, [user, loading, navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
