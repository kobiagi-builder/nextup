import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Subscribe to onAuthStateChange FIRST, then call getSession().
    // This prevents a race condition where onAuthStateChange fires before
    // getSession() resolves, causing stale state overwrites.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle password recovery flow
        if (event === 'PASSWORD_RECOVERY') {
          window.location.href = '/auth/reset-password?recovery=true'
        }

        // Trigger first-user data migration on sign-in
        if (event === 'SIGNED_IN' && session) {
          const migrated = localStorage.getItem('data-migrated')
          if (!migrated) {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/migrate-data`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                }
              })
              const result = await res.json()
              localStorage.setItem('data-migrated', 'true')
              if (result.migrated) {
                sessionStorage.setItem('show-migration-toast', 'true')
              }
            } catch {
              // Silent failure — migration is non-critical
            }
          }
        }
      }
    )

    // Get initial session (after subscription is set up)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
