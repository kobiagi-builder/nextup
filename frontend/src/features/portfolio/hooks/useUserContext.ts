/**
 * User Context React Query Hooks
 *
 * Data hooks for user profile/context management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TableInsert, TableUpdate } from '@/types/supabase'
import type { UserContext, UpdateUserContextInput } from '../types/portfolio'

// =============================================================================
// Query Keys
// =============================================================================

export const userContextKeys = {
  all: ['userContext'] as const,
  current: () => [...userContextKeys.all, 'current'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch current user's context
 */
export function useUserContext() {
  return useQuery({
    queryKey: userContextKeys.current(),
    queryFn: async () => {
      // Get the current user context (one per user)
      const { data, error } = await supabase
        .from('user_context')
        .select('*')
        .limit(1)
        .single()

      // If no context exists, return null (we'll create on first update)
      if (error?.code === 'PGRST116') {
        return null
      }

      if (error) throw error
      return data as UserContext
    },
  })
}

/**
 * Calculate profile completion percentage
 */
export function useProfileCompletion() {
  const { data: context } = useUserContext()

  if (!context) return 0

  const sections = [
    // About Me
    !!context.about_me?.bio ||
    !!context.about_me?.background ||
    !!context.about_me?.value_proposition,
    // Profession
    !!context.profession?.expertise_areas ||
    !!context.profession?.industries ||
    !!context.profession?.methodologies ||
    !!context.profession?.certifications,
    // Customers (ICP settings checked separately in ProfilePage)
    !!context.customers?.ideal_client,
    // Goals
    !!context.goals?.content_goals ||
    !!context.goals?.business_goals,
  ]

  const completedSections = sections.filter(Boolean).length
  return Math.round((completedSections / sections.length) * 100)
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update user context (upsert - creates if doesn't exist)
 */
export function useUpdateUserContext() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateUserContextInput) => {
      // First, try to get existing context
      const { data: existing, error: fetchError } = await supabase
        .from('user_context')
        .select('id, about_me, profession, customers, goals')
        .limit(1)
        .single()

      // If there's an error OTHER than "no rows found", throw it
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      // If we have existing data, update it
      if (existing) {
        // Merge updates with existing data
        const existingData = existing as {
          id: string
          about_me: Record<string, unknown> | null
          profession: Record<string, unknown> | null
          customers: Record<string, unknown> | null
          goals: Record<string, unknown> | null
        }

        const updates: TableUpdate<'user_context'> = {}

        if (input.about_me) {
          updates.about_me = { ...existingData.about_me, ...input.about_me }
        }
        if (input.profession) {
          updates.profession = { ...existingData.profession, ...input.profession }
        }
        if (input.customers) {
          updates.customers = { ...existingData.customers, ...input.customers }
        }
        if (input.goals) {
          updates.goals = { ...existingData.goals, ...input.goals }
        }

        const { data, error } = await supabase
          .from('user_context')
          .update(updates)
          .eq('id', existingData.id)
          .select()
          .single()

        if (error) throw error
        return data as UserContext
      } else {
        // Create new context (no existing row found)
        const insertData: TableInsert<'user_context'> = {
          about_me: input.about_me ?? {},
          profession: input.profession ?? {},
          customers: input.customers ?? {},
          goals: input.goals ?? {},
        }

        const { data, error } = await supabase
          .from('user_context')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        return data as UserContext
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userContextKeys.current(), data)
    },
  })
}

/**
 * Update a specific section of user context
 */
export function useUpdateUserContextSection<
  K extends keyof UpdateUserContextInput
>(section: K) {
  const queryClient = useQueryClient()
  const updateUserContext = useUpdateUserContext()

  return useMutation({
    mutationFn: async (input: NonNullable<UpdateUserContextInput[K]>) => {
      return updateUserContext.mutateAsync({
        [section]: input,
      } as UpdateUserContextInput)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userContextKeys.current(), data)
    },
  })
}
