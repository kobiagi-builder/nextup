/**
 * Style Examples React Query Hooks
 *
 * Data hooks for managing writing style samples.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TableInsert, TableUpdate } from '@/types/supabase'
import type {
  StyleExample,
  CreateStyleExampleInput,
  UpdateStyleExampleInput,
} from '../types/portfolio'

// =============================================================================
// Query Keys
// =============================================================================

export const styleExampleKeys = {
  all: ['styleExamples'] as const,
  lists: () => [...styleExampleKeys.all, 'list'] as const,
  details: () => [...styleExampleKeys.all, 'detail'] as const,
  detail: (id: string) => [...styleExampleKeys.details(), id] as const,
}

// =============================================================================
// Constants
// =============================================================================

/** Target number of style examples for optimal AI personalization */
export const TARGET_STYLE_EXAMPLES = 5

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all style examples
 */
export function useStyleExamples() {
  return useQuery({
    queryKey: styleExampleKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('style_examples')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as StyleExample[]
    },
  })
}

/**
 * Fetch a single style example by ID
 */
export function useStyleExample(id: string | null) {
  return useQuery({
    queryKey: styleExampleKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('style_examples')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as StyleExample
    },
    enabled: !!id,
  })
}

/**
 * Get style examples progress (count / target)
 */
export function useStyleExamplesProgress() {
  const { data: examples = [] } = useStyleExamples()

  return {
    count: examples.length,
    target: TARGET_STYLE_EXAMPLES,
    percentage: Math.min(
      Math.round((examples.length / TARGET_STYLE_EXAMPLES) * 100),
      100
    ),
    isComplete: examples.length >= TARGET_STYLE_EXAMPLES,
  }
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new style example
 */
export function useCreateStyleExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateStyleExampleInput) => {
      const insertData: TableInsert<'style_examples'> = {
        label: input.label,
        content: input.content,
        analysis: null, // Will be populated by AI analysis
      }

      const { data, error } = await supabase
        .from('style_examples')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data as StyleExample
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: styleExampleKeys.lists() })
    },
  })
}

/**
 * Update a style example
 */
export function useUpdateStyleExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateStyleExampleInput
    }) => {
      const { data, error } = await supabase
        .from('style_examples')
        .update(updates as TableUpdate<'style_examples'>)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as StyleExample
    },
    onSuccess: (data) => {
      queryClient.setQueryData(styleExampleKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: styleExampleKeys.lists() })
    },
  })
}

/**
 * Delete a style example
 */
export function useDeleteStyleExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('style_examples')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: styleExampleKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: styleExampleKeys.lists() })
    },
  })
}
