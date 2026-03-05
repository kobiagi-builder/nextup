/**
 * Shared Zod Schemas for User Context
 *
 * Extracted from UserContextForm.tsx for reuse in onboarding wizard.
 * Both the settings profile form and onboarding steps use these schemas.
 */

import { z } from 'zod'

// =============================================================================
// Section Schemas
// =============================================================================

export const aboutMeSchema = z.object({
  bio: z.string().max(1000).optional(),
  background: z.string().max(5000).optional(),
  years_experience: z.number().min(0).max(50).optional().nullable(),
  value_proposition: z.string().max(500).optional(),
})

export const professionSchema = z.object({
  expertise_areas: z.string().max(2000).optional(),
  industries: z.string().max(2000).optional(),
  methodologies: z.string().max(2000).optional(),
  certifications: z.string().max(2000).optional(),
})

export const customersSchema = z.object({
  ideal_client: z.string().max(2000).optional(),
  industries_served: z.array(z.string()).optional(),
})

export const goalsSchema = z.object({
  content_goals: z.string().max(2000).optional(),
  business_goals: z.string().max(2000).optional(),
  priorities: z.array(z.string()).optional(),
})

// =============================================================================
// Inferred Types
// =============================================================================

export type AboutMeFormData = z.infer<typeof aboutMeSchema>
export type ProfessionFormData = z.infer<typeof professionSchema>
export type CustomersFormData = z.infer<typeof customersSchema>
export type GoalsFormData = z.infer<typeof goalsSchema>
