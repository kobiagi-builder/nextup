/**
 * Onboarding Wizard Store
 *
 * Zustand store for onboarding wizard state. No persist middleware —
 * re-hydrates from server on every page load via hydrateFromServer().
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  OnboardingFormData,
  ExtractedProfileFields,
  ExtractionStatus,
  FieldProvenance,
} from '../types/onboarding'
import { EMPTY_FORM_DATA } from '../types/onboarding'

// =============================================================================
// Store Interface
// =============================================================================

interface OnboardingWizardStore {
  // Navigation
  currentStep: number
  navigationDirection: 'forward' | 'backward' | null

  // Extraction lifecycle
  extractionStatus: ExtractionStatus

  // URL inputs (persisted in store only, not in DB step_data)
  linkedInUrl: string
  websiteUrl: string

  // Form state (hydrated from server step_data + extraction_results)
  formData: OnboardingFormData
  fieldProvenance: Record<string, FieldProvenance>

  // Waterfall animation tracking (ephemeral, never persisted)
  revealedFieldIndices: Record<string, boolean>

  // Reference tracking (Step 4)
  addedReferenceIds: string[]

  // Actions
  setStep: (step: number) => void
  setNavigationDirection: (dir: 'forward' | 'backward') => void
  setExtractionStatus: (status: ExtractionStatus) => void
  setLinkedInUrl: (url: string) => void
  setWebsiteUrl: (url: string) => void
  updateField: <S extends keyof OnboardingFormData>(
    section: S,
    field: string,
    value: unknown
  ) => void
  applyExtractionResults: (results: ExtractedProfileFields) => void
  markFieldRevealed: (fieldKey: string) => void
  addReferenceId: (id: string) => void
  removeReferenceId: (id: string) => void
  hydrateFromServer: (
    step: number,
    stepData: Partial<OnboardingFormData>,
    extractionResults: ExtractedProfileFields | null
  ) => void
  reset: () => void
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build provenance map from existing form data.
 * Non-empty fields are marked as 'user', empty fields as 'empty'.
 */
function buildProvenanceFromData(data: OnboardingFormData): Record<string, FieldProvenance> {
  const provenance: Record<string, FieldProvenance> = {}

  for (const [section, fields] of Object.entries(data)) {
    if (typeof fields === 'object' && fields !== null) {
      for (const [field, value] of Object.entries(fields)) {
        const key = `${section}.${field}`
        if (Array.isArray(value)) {
          provenance[key] = value.length > 0 ? 'user' : 'empty'
        } else if (typeof value === 'string') {
          provenance[key] = value.trim() ? 'user' : 'empty'
        } else if (typeof value === 'number') {
          provenance[key] = 'user'
        } else {
          provenance[key] = 'empty'
        }
      }
    }
  }

  return provenance
}

/**
 * Deep merge form data: values from `source` are applied to `target`
 * only for fields where provenance is 'empty' or 'ai'.
 * Fields with provenance 'user' are never overwritten.
 */
function mergeExtractionIntoForm(
  target: OnboardingFormData,
  source: ExtractedProfileFields,
  provenance: Record<string, FieldProvenance>
): { merged: OnboardingFormData; updatedProvenance: Record<string, FieldProvenance> } {
  const merged = structuredClone(target)
  const updatedProvenance = { ...provenance }

  for (const [section, fields] of Object.entries(source)) {
    if (section.startsWith('__')) continue // Skip __error, __message
    if (typeof fields !== 'object' || fields === null) continue

    const sectionKey = section as keyof OnboardingFormData
    if (!(sectionKey in merged)) continue

    for (const [field, value] of Object.entries(fields)) {
      const key = `${section}.${field}`
      const currentProvenance = provenance[key]

      // Never overwrite user-edited fields
      if (currentProvenance === 'user') continue

      // Apply the extracted value
      if (value !== undefined && value !== null && value !== '') {
        ;(merged[sectionKey] as Record<string, unknown>)[field] = value
        updatedProvenance[key] = 'ai'
      }
    }
  }

  return { merged, updatedProvenance }
}

// =============================================================================
// Store
// =============================================================================

export const useOnboardingWizardStore = create<OnboardingWizardStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentStep: 0,
      navigationDirection: null,
      extractionStatus: 'idle',
      linkedInUrl: '',
      websiteUrl: '',
      formData: structuredClone(EMPTY_FORM_DATA),
      fieldProvenance: {},
      revealedFieldIndices: {},
      addedReferenceIds: [],

      // Actions
      setStep: (step) => set({ currentStep: step }, false, 'setStep'),

      setNavigationDirection: (dir) =>
        set({ navigationDirection: dir }, false, 'setNavigationDirection'),

      setExtractionStatus: (status) =>
        set({ extractionStatus: status }, false, 'setExtractionStatus'),

      setLinkedInUrl: (url) => set({ linkedInUrl: url }, false, 'setLinkedInUrl'),

      setWebsiteUrl: (url) => set({ websiteUrl: url }, false, 'setWebsiteUrl'),

      updateField: (section, field, value) => {
        const state = get()
        const updatedSection = {
          ...state.formData[section],
          [field]: value,
        }
        const updatedFormData = {
          ...state.formData,
          [section]: updatedSection,
        }
        const updatedProvenance = {
          ...state.fieldProvenance,
          [`${section}.${field}`]: 'user' as FieldProvenance,
        }
        set(
          { formData: updatedFormData, fieldProvenance: updatedProvenance },
          false,
          'updateField'
        )
      },

      markFieldRevealed: (fieldKey) =>
        set(
          (state) => ({
            revealedFieldIndices: { ...state.revealedFieldIndices, [fieldKey]: true },
          }),
          false,
          'markFieldRevealed'
        ),

      applyExtractionResults: (results) => {
        if (results.__error) {
          set({ extractionStatus: 'failed' }, false, 'applyExtractionResults:failed')
          return
        }

        const state = get()
        const { merged, updatedProvenance } = mergeExtractionIntoForm(
          state.formData,
          results,
          state.fieldProvenance
        )

        set(
          {
            formData: merged,
            fieldProvenance: updatedProvenance,
            extractionStatus: 'complete',
          },
          false,
          'applyExtractionResults'
        )
      },

      addReferenceId: (id) =>
        set(
          (state) => ({
            addedReferenceIds: [...state.addedReferenceIds, id],
          }),
          false,
          'addReferenceId'
        ),

      removeReferenceId: (id) =>
        set(
          (state) => ({
            addedReferenceIds: state.addedReferenceIds.filter((rid) => rid !== id),
          }),
          false,
          'removeReferenceId'
        ),

      hydrateFromServer: (step, stepData, extractionResults) => {
        const formData = {
          ...structuredClone(EMPTY_FORM_DATA),
          ...stepData,
        } as OnboardingFormData

        const provenance = buildProvenanceFromData(formData)

        // If extraction results exist and are valid, apply them
        let extractionStatus: ExtractionStatus = 'idle'
        if (extractionResults && !extractionResults.__error) {
          const { merged, updatedProvenance } = mergeExtractionIntoForm(
            formData,
            extractionResults,
            provenance
          )
          set(
            {
              currentStep: step,
              formData: merged,
              fieldProvenance: updatedProvenance,
              extractionStatus: 'complete',
            },
            false,
            'hydrateFromServer:withExtraction'
          )
          return
        }

        if (extractionResults?.__error) {
          extractionStatus = 'failed'
        } else if (extractionResults === null && step >= 2) {
          // Row exists (step ≥ 2) but no extraction results yet — extraction
          // may still be running in the background (e.g., user refreshed).
          // Only restart polling if user didn't explicitly skip extraction.
          const currentStatus = get().extractionStatus
          if (currentStatus !== 'skipped') {
            extractionStatus = 'extracting'
          } else {
            extractionStatus = 'skipped'
          }
        }

        set(
          {
            currentStep: step,
            formData,
            fieldProvenance: provenance,
            extractionStatus,
          },
          false,
          'hydrateFromServer'
        )
      },

      reset: () =>
        set(
          {
            currentStep: 0,
            navigationDirection: null,
            extractionStatus: 'idle',
            linkedInUrl: '',
            websiteUrl: '',
            formData: structuredClone(EMPTY_FORM_DATA),
            fieldProvenance: {},
            revealedFieldIndices: {},
            addedReferenceIds: [],
          },
          false,
          'reset'
        ),
    }),
    { name: 'onboarding-wizard' }
  )
)
