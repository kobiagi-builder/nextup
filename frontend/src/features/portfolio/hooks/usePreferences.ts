/**
 * User Preferences React Query Hooks
 *
 * Data hooks for user preferences (theme, interaction mode, etc.).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TableInsert, TableUpdate } from '@/types/supabase'
import type { UserPreferences, UpdatePreferencesInput } from '../types/portfolio'

// =============================================================================
// Query Keys
// =============================================================================

export const preferencesKeys = {
  all: ['preferences'] as const,
  current: () => [...preferencesKeys.all, 'current'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch current user's preferences
 */
export function usePreferences() {
  return useQuery({
    queryKey: preferencesKeys.current(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .limit(1)
        .single()

      // If no preferences exist, return defaults
      if (error?.code === 'PGRST116') {
        return {
          id: '',
          user_id: '',
          account_id: '',
          theme: 'system',
          preferred_interaction_mode: 'chat',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserPreferences
      }

      if (error) throw error
      return data as UserPreferences
    },
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update user preferences (upsert)
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      // First, try to get existing preferences
      const { data: existing, error: fetchError } = await supabase
        .from('user_preferences')
        .select('id')
        .limit(1)
        .single()

      // Ignore "no rows returned" error
      const hasExisting = existing && !fetchError

      if (hasExisting) {
        // Update existing
        const existingId = (existing as { id: string }).id
        const { data, error } = await supabase
          .from('user_preferences')
          .update(input as TableUpdate<'user_preferences'>)
          .eq('id', existingId)
          .select()
          .single()

        if (error) throw error
        return data as UserPreferences
      } else {
        // Create new
        const insertData: TableInsert<'user_preferences'> = {
          theme: input.theme ?? 'system',
          preferred_interaction_mode: input.preferred_interaction_mode ?? 'chat',
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        return data as UserPreferences
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(preferencesKeys.current(), data)
    },
  })
}

/**
 * Shorthand to update theme preference
 */
export function useUpdateTheme() {
  const updatePreferences = useUpdatePreferences()

  return useMutation({
    mutationFn: async (theme: UserPreferences['theme']) => {
      return updatePreferences.mutateAsync({ theme })
    },
  })
}

/**
 * Shorthand to update interaction mode
 */
export function useUpdateInteractionMode() {
  const updatePreferences = useUpdatePreferences()

  return useMutation({
    mutationFn: async (mode: UserPreferences['preferred_interaction_mode']) => {
      return updatePreferences.mutateAsync({ preferred_interaction_mode: mode })
    },
  })
}
