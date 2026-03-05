/**
 * Onboarding Types
 *
 * TypeScript interfaces for the onboarding wizard feature.
 */

// =============================================================================
// Database Row
// =============================================================================

export interface OnboardingProgress {
  id: string
  user_id: string
  current_step: number
  extraction_results: ExtractedProfileFields | null
  step_data: Partial<OnboardingFormData>
  completed_at: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Extraction
// =============================================================================

export interface ExtractedProfileFields {
  about_me?: {
    bio?: string
    background?: string
    value_proposition?: string
  }
  profession?: {
    expertise_areas?: string
    industries?: string
    methodologies?: string
  }
  customers?: {
    target_audience?: string
    ideal_client?: string
  }
  goals?: {
    content_goals?: string
  }
  __error?: boolean
  __message?: string
}

// =============================================================================
// Form Data
// =============================================================================

export interface OnboardingFormData {
  about_me: {
    bio: string
    background: string
    years_experience: number | null
    value_proposition: string
  }
  profession: {
    expertise_areas: string
    industries: string
    methodologies: string
    certifications: string
  }
  customers: {
    ideal_client: string
    industries_served: string[]
  }
  goals: {
    content_goals: string
    business_goals: string
    priorities: string[]
  }
}

export const EMPTY_FORM_DATA: OnboardingFormData = {
  about_me: {
    bio: '',
    background: '',
    years_experience: null,
    value_proposition: '',
  },
  profession: {
    expertise_areas: '',
    industries: '',
    methodologies: '',
    certifications: '',
  },
  customers: {
    ideal_client: '',
    industries_served: [],
  },
  goals: {
    content_goals: '',
    business_goals: '',
    priorities: [],
  },
}

// =============================================================================
// State Machine
// =============================================================================

export type ExtractionStatus =
  | 'idle'       // No extraction attempted
  | 'submitted'  // HTTP call in flight
  | 'extracting' // 202 received, background job running
  | 'complete'   // extraction_results arrived, applied to formData
  | 'failed'     // extraction_results.__error = true
  | 'timeout'    // 15s elapsed without results
  | 'skipped'    // User clicked "Skip this step"

export type FieldProvenance = 'ai' | 'user' | 'empty'
