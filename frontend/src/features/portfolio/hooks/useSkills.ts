/**
 * Skills React Query Hooks
 *
 * Data hooks for CRUD operations on skills matrix.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TableInsert, TableUpdate } from '@/types/supabase'
import type {
  Skill,
  SkillCategory,
  CreateSkillInput,
  UpdateSkillInput,
} from '../types/portfolio'

// =============================================================================
// Query Keys
// =============================================================================

export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (filters: { category?: SkillCategory | 'all' }) =>
    [...skillKeys.lists(), filters] as const,
  details: () => [...skillKeys.all, 'detail'] as const,
  detail: (id: string) => [...skillKeys.details(), id] as const,
  byCategory: () => [...skillKeys.all, 'byCategory'] as const,
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all skills with optional category filter
 */
export function useSkills(options?: { category?: SkillCategory | 'all' }) {
  const { category = 'all' } = options ?? {}

  return useQuery({
    queryKey: skillKeys.list({ category }),
    queryFn: async () => {
      let query = supabase
        .from('skills')
        .select('*')
        .order('proficiency', { ascending: false })
        .order('name', { ascending: true })

      if (category !== 'all') {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Skill[]
    },
  })
}

/**
 * Fetch skills grouped by category
 */
export function useSkillsGroupedByCategory() {
  return useQuery({
    queryKey: skillKeys.byCategory(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('proficiency', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      // Group by category
      const grouped: Record<SkillCategory, Skill[]> = {
        product: [],
        technical: [],
        leadership: [],
        industry: [],
      }

      for (const skill of (data ?? []) as Skill[]) {
        grouped[skill.category].push(skill)
      }

      return grouped
    },
  })
}

/**
 * Fetch a single skill by ID
 */
export function useSkill(id: string | null) {
  return useQuery({
    queryKey: skillKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Skill
    },
    enabled: !!id,
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new skill
 */
export function useCreateSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSkillInput) => {
      const insertData: TableInsert<'skills'> = {
        name: input.name,
        category: input.category,
        proficiency: input.proficiency,
        years_experience: input.years_experience ?? null,
      }

      const { data, error } = await supabase
        .from('skills')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data as Skill
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      queryClient.invalidateQueries({ queryKey: skillKeys.byCategory() })
    },
  })
}

/**
 * Update a skill
 */
export function useUpdateSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateSkillInput
    }) => {
      const { data, error } = await supabase
        .from('skills')
        .update(updates as TableUpdate<'skills'>)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Skill
    },
    onSuccess: (data) => {
      queryClient.setQueryData(skillKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      queryClient.invalidateQueries({ queryKey: skillKeys.byCategory() })
    },
  })
}

/**
 * Delete a skill
 */
export function useDeleteSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: skillKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      queryClient.invalidateQueries({ queryKey: skillKeys.byCategory() })
    },
  })
}
