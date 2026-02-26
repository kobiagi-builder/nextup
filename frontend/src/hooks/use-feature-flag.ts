import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export const featureFlagKeys = {
  all: ['feature-flags'] as const,
  flag: (name: string) => [...featureFlagKeys.all, name] as const,
}

/**
 * Check if a feature flag is active for the current user.
 * Uses the database function is_feature_active(uid, flag_name).
 */
export function useFeatureFlag(featureName: string) {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: featureFlagKeys.flag(featureName),
    queryFn: async () => {
      if (!user?.id) return false
      const { data, error } = await supabase.rpc('is_feature_active', {
        p_uid: user.id,
        p_feature_name: featureName,
      })
      if (error) return false
      return data as boolean
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes - flags don't change often
    gcTime: 10 * 60 * 1000,
  })

  return { isEnabled: data ?? false, isLoading }
}
