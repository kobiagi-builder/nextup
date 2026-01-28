/**
 * Portfolio Validators Index
 *
 * Re-exports all validation utilities.
 */

export {
  // Artifact validators
  validateArtifactTransition,
  getArtifactTransitions,
  canPublishArtifact,
  canEditArtifact,
  isProcessingState,
  // Display helpers
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  PROCESSING_STATES,
  // Types
  type ValidationResult,
} from './stateMachine'
