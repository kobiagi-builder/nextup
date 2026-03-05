/**
 * Onboarding Wizard Store Unit Tests
 *
 * Tests for applyExtractionResults (provenance merge) and hydrateFromServer.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboardingWizardStore } from './onboardingWizardStore'
import type { ExtractedProfileFields, OnboardingFormData } from '../types/onboarding'
import { EMPTY_FORM_DATA } from '../types/onboarding'

// Reset store between tests
beforeEach(() => {
  useOnboardingWizardStore.getState().reset()
})

// =============================================================================
// applyExtractionResults
// =============================================================================

describe('applyExtractionResults', () => {
  it('merges extraction results into empty form fields', () => {
    const store = useOnboardingWizardStore.getState()

    const results: ExtractedProfileFields = {
      about_me: { bio: 'AI-extracted bio', value_proposition: 'Great value' },
      profession: { expertise_areas: '• Product\n• Strategy' },
    }

    store.applyExtractionResults(results)

    const state = useOnboardingWizardStore.getState()
    expect(state.formData.about_me.bio).toBe('AI-extracted bio')
    expect(state.formData.about_me.value_proposition).toBe('Great value')
    expect(state.formData.profession.expertise_areas).toBe('• Product\n• Strategy')
    expect(state.extractionStatus).toBe('complete')
  })

  it('sets provenance to "ai" for merged fields', () => {
    const store = useOnboardingWizardStore.getState()

    store.applyExtractionResults({
      about_me: { bio: 'AI bio' },
    })

    const state = useOnboardingWizardStore.getState()
    expect(state.fieldProvenance['about_me.bio']).toBe('ai')
  })

  it('never overwrites user-edited fields', () => {
    const store = useOnboardingWizardStore.getState()

    // User edits bio first
    store.updateField('about_me', 'bio', 'User wrote this')

    // Then extraction results arrive with different bio
    store.applyExtractionResults({
      about_me: { bio: 'AI wants to replace this', value_proposition: 'AI value' },
    })

    const state = useOnboardingWizardStore.getState()
    // User field preserved
    expect(state.formData.about_me.bio).toBe('User wrote this')
    expect(state.fieldProvenance['about_me.bio']).toBe('user')
    // Empty field filled by AI
    expect(state.formData.about_me.value_proposition).toBe('AI value')
    expect(state.fieldProvenance['about_me.value_proposition']).toBe('ai')
  })

  it('allows AI fields to be updated by newer extraction', () => {
    const store = useOnboardingWizardStore.getState()

    // First extraction
    store.applyExtractionResults({
      about_me: { bio: 'First AI bio' },
    })
    expect(useOnboardingWizardStore.getState().formData.about_me.bio).toBe('First AI bio')

    // Reset status to allow second application
    store.setExtractionStatus('extracting')

    // Second extraction with updated value
    store.applyExtractionResults({
      about_me: { bio: 'Updated AI bio' },
    })
    expect(useOnboardingWizardStore.getState().formData.about_me.bio).toBe('Updated AI bio')
  })

  it('sets extractionStatus to "failed" when results have __error', () => {
    const store = useOnboardingWizardStore.getState()

    store.applyExtractionResults({ __error: true, __message: 'Failed' })

    const state = useOnboardingWizardStore.getState()
    expect(state.extractionStatus).toBe('failed')
    // Form data unchanged
    expect(state.formData).toEqual(EMPTY_FORM_DATA)
  })

  it('skips __error and __message meta fields during merge', () => {
    const store = useOnboardingWizardStore.getState()

    store.applyExtractionResults({
      about_me: { bio: 'Valid bio' },
      __error: false,
      __message: 'Some message',
    } as ExtractedProfileFields)

    const state = useOnboardingWizardStore.getState()
    expect(state.formData.about_me.bio).toBe('Valid bio')
    expect(state.extractionStatus).toBe('complete')
  })

  it('ignores empty string values from extraction', () => {
    const store = useOnboardingWizardStore.getState()

    store.applyExtractionResults({
      about_me: { bio: '', value_proposition: 'Useful value' },
    })

    const state = useOnboardingWizardStore.getState()
    // Empty string should not be applied
    expect(state.formData.about_me.bio).toBe('')
    expect(state.fieldProvenance['about_me.bio']).toBeUndefined()
    // Non-empty value should be applied
    expect(state.formData.about_me.value_proposition).toBe('Useful value')
    expect(state.fieldProvenance['about_me.value_proposition']).toBe('ai')
  })
})

// =============================================================================
// hydrateFromServer
// =============================================================================

describe('hydrateFromServer', () => {
  it('sets currentStep and formData from server data', () => {
    const store = useOnboardingWizardStore.getState()
    const stepData: Partial<OnboardingFormData> = {
      about_me: {
        bio: 'Saved bio',
        background: '',
        years_experience: 5,
        value_proposition: '',
      },
    }

    store.hydrateFromServer(2, stepData, null)

    const state = useOnboardingWizardStore.getState()
    expect(state.currentStep).toBe(2)
    expect(state.formData.about_me.bio).toBe('Saved bio')
    expect(state.formData.about_me.years_experience).toBe(5)
  })

  it('builds correct provenance from non-empty step_data fields', () => {
    const store = useOnboardingWizardStore.getState()
    const stepData: Partial<OnboardingFormData> = {
      about_me: {
        bio: 'Has content',
        background: '',
        years_experience: null,
        value_proposition: 'Also has content',
      },
    }

    store.hydrateFromServer(2, stepData, null)

    const state = useOnboardingWizardStore.getState()
    expect(state.fieldProvenance['about_me.bio']).toBe('user')
    expect(state.fieldProvenance['about_me.background']).toBe('empty')
    expect(state.fieldProvenance['about_me.value_proposition']).toBe('user')
  })

  it('merges extraction results when available', () => {
    const store = useOnboardingWizardStore.getState()
    const stepData: Partial<OnboardingFormData> = {}
    const extractionResults: ExtractedProfileFields = {
      about_me: { bio: 'Extracted bio' },
      profession: { expertise_areas: '• Product' },
    }

    store.hydrateFromServer(2, stepData, extractionResults)

    const state = useOnboardingWizardStore.getState()
    expect(state.formData.about_me.bio).toBe('Extracted bio')
    expect(state.formData.profession.expertise_areas).toBe('• Product')
    expect(state.extractionStatus).toBe('complete')
    expect(state.fieldProvenance['about_me.bio']).toBe('ai')
  })

  it('does not overwrite user step_data with extraction results', () => {
    const store = useOnboardingWizardStore.getState()
    const stepData: Partial<OnboardingFormData> = {
      about_me: {
        bio: 'User typed this',
        background: '',
        years_experience: null,
        value_proposition: '',
      },
    }
    const extractionResults: ExtractedProfileFields = {
      about_me: { bio: 'AI extracted this', value_proposition: 'AI value' },
    }

    store.hydrateFromServer(2, stepData, extractionResults)

    const state = useOnboardingWizardStore.getState()
    // User's bio is preserved (provenance 'user')
    expect(state.formData.about_me.bio).toBe('User typed this')
    // Empty field gets AI value
    expect(state.formData.about_me.value_proposition).toBe('AI value')
  })

  it('sets extractionStatus to "failed" when results have __error', () => {
    const store = useOnboardingWizardStore.getState()

    store.hydrateFromServer(2, {}, { __error: true })

    const state = useOnboardingWizardStore.getState()
    expect(state.extractionStatus).toBe('failed')
  })

  it('sets extractionStatus to "extracting" when results are null and step >= 2', () => {
    const store = useOnboardingWizardStore.getState()

    store.hydrateFromServer(3, {}, null)

    const state = useOnboardingWizardStore.getState()
    expect(state.extractionStatus).toBe('extracting')
  })

  it('sets extractionStatus to "idle" when results are null and step < 2', () => {
    const store = useOnboardingWizardStore.getState()

    store.hydrateFromServer(1, {}, null)

    const state = useOnboardingWizardStore.getState()
    expect(state.extractionStatus).toBe('idle')
  })

  it('handles empty stepData gracefully', () => {
    const store = useOnboardingWizardStore.getState()

    store.hydrateFromServer(0, {}, null)

    const state = useOnboardingWizardStore.getState()
    expect(state.currentStep).toBe(0)
    expect(state.formData).toEqual(EMPTY_FORM_DATA)
    expect(state.extractionStatus).toBe('idle')
  })
})

// =============================================================================
// updateField
// =============================================================================

describe('updateField', () => {
  it('sets field value and provenance to "user"', () => {
    const store = useOnboardingWizardStore.getState()

    store.updateField('about_me', 'bio', 'User bio')

    const state = useOnboardingWizardStore.getState()
    expect(state.formData.about_me.bio).toBe('User bio')
    expect(state.fieldProvenance['about_me.bio']).toBe('user')
  })
})
