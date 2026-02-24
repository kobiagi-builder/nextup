/**
 * Portfolio Feature Hooks
 *
 * Re-exports all React Query hooks for the portfolio feature.
 * Import from '@/features/portfolio/hooks' for cleaner imports.
 */

// Artifacts
export {
  artifactKeys,
  useArtifacts,
  useArtifact,
  useCreateArtifact,
  useUpdateArtifact,
  useDeleteArtifact,
  usePublishArtifact,
} from './useArtifacts'

// Skills
export {
  skillKeys,
  useSkills,
  useSkill,
  useSkillsGroupedByCategory,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
} from './useSkills'

// User Context
export {
  userContextKeys,
  useUserContext,
  useProfileCompletion,
  useUpdateUserContext,
  useUpdateUserContextSection,
} from './useUserContext'

// Preferences
export {
  preferencesKeys,
  usePreferences,
  useUpdatePreferences,
  useUpdateTheme,
  useUpdateInteractionMode,
} from './usePreferences'

// AI Chat
export {
  useAIChat,
  type UseAIChatOptions,
  type UseAIChatReturn,
} from './useAIChat'

// Structured Chat (with topic suggestion cards)
export {
  useStructuredChat,
  type UseStructuredChatOptions,
  type UseStructuredChatReturn,
} from './useStructuredChat'

// Research
export { useResearch, useAddResearch, useDeleteResearch } from './useResearch'

// Image Generation
export { useImageGeneration } from './useImageGeneration'

// Phase 4: Writing Characteristics
export {
  writingCharacteristicsKeys,
  useWritingCharacteristics,
} from './useWritingCharacteristics'

// Phase 4: Writing Examples
export {
  writingExamplesKeys,
  useWritingExamples,
  useWritingExample,
  useCreateWritingExample,
  useUpdateWritingExample,
  useDeleteWritingExample,
  useUploadWritingExample,
  useExtractFromUrl,
  useRetryExtraction,
  useExtractPublication,
} from './useWritingExamples'

// Phase 4: Foundations Approval
export { useFoundationsApproval } from './useFoundationsApproval'
